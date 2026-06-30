import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { groq, MODEL } from "@/lib/groq";
import { buildLineage } from "@/lib/context";

export async function GET(_: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const lineage = branch.headMessageId ? await buildLineage(branch.headMessageId) : [];
  return NextResponse.json(lineage);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { content } = await req.json();

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const userMsg = await prisma.message.create({
    data: {
      branchId,
      parentMessageId: branch.headMessageId,
      role: "user",
      content,
    },
  });

  await prisma.branch.update({
    where: { id: branchId },
    data: { headMessageId: userMsg.id },
  });

  const history = await buildLineage(userMsg.id);

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: history,
  });

  const assistantContent = completion.choices[0].message.content ?? "";

  const assistantMsg = await prisma.message.create({
    data: {
      branchId,
      parentMessageId: userMsg.id,
      role: "assistant",
      content: assistantContent,
    },
  });

  await prisma.branch.update({
    where: { id: branchId },
    data: { headMessageId: assistantMsg.id },
  });

  return NextResponse.json({ role: "assistant", content: assistantContent, messageId: assistantMsg.id });
}
