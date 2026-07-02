import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ai, MODEL } from "@/lib/ai";
import { buildLineage, buildFullRichLineage } from "@/lib/context";

export async function GET(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { searchParams } = new URL(req.url);
  const rich = searchParams.get("rich") === "1";

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  if (!branch.headMessageId) return NextResponse.json([]);

  const lineage = rich
    ? await buildFullRichLineage(branch.headMessageId)
    : await buildLineage(branch.headMessageId);

  return NextResponse.json(lineage);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { content, replyToId } = await req.json();

  const branch = await prisma.branch.findUnique({ where: { id: branchId }, include: { conversation: true } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const isFirstMessage = !branch.headMessageId;

  const userMsg = await prisma.message.create({
    data: { branchId, parentMessageId: branch.headMessageId, role: "user", content, replyToId: replyToId ?? null },
  });

  await prisma.branch.update({ where: { id: branchId }, data: { headMessageId: userMsg.id } });

  const history = await buildLineage(userMsg.id);

  // Resolve effective system instructions
  const conv = branch.conversation as { instructions: string | null; inheritFromConvId: string | null; title: string };
  let sysInstructions: string;
  if (conv.instructions !== null) {
    sysInstructions = conv.instructions;
  } else if (conv.inheritFromConvId) {
    const parent = await prisma.conversation.findUnique({ where: { id: conv.inheritFromConvId } });
    sysInstructions = parent?.instructions ?? "";
  } else {
    const global = await prisma.globalSetting.findUnique({ where: { key: "instructions" } });
    sysInstructions = global?.value ?? "";
  }
  const messagesForAI = sysInstructions.trim()
    ? [{ role: "system" as const, content: sysInstructions }, ...history]
    : history;

  const [completion, titleCompletion] = await Promise.all([
    ai.chat.completions.create({ model: MODEL, messages: messagesForAI }),
    isFirstMessage && branch.conversation.title === "New conversation"
      ? ai.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: "user",
              content: `Generate a short 4-6 word title for a conversation that starts with this message: "${content.slice(0, 200)}". Reply with only the title, no quotes, no punctuation at the end.`,
            },
          ],
          max_tokens: 20,
        })
      : null,
  ]);

  const assistantContent = completion.choices[0].message.content ?? "";

  const assistantMsg = await prisma.message.create({
    data: { branchId, parentMessageId: userMsg.id, role: "assistant", content: assistantContent },
  });

  const updates: Promise<unknown>[] = [
    prisma.branch.update({ where: { id: branchId }, data: { headMessageId: assistantMsg.id } }),
  ];

  if (titleCompletion) {
    const title = titleCompletion.choices[0].message.content?.trim() ?? "";
    if (title) {
      updates.push(prisma.conversation.update({ where: { id: branch.conversationId }, data: { title } }));
    }
  }

  await Promise.all(updates);

  return NextResponse.json({ role: "assistant", content: assistantContent, messageId: assistantMsg.id });
}
