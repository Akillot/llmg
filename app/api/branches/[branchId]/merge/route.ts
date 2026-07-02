import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildLineage } from "@/lib/context";
import { groq, MODEL } from "@/lib/groq";

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { sourceBranchId } = await req.json();

  const [targetBranch, sourceBranch] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branchId } }),
    prisma.branch.findUnique({ where: { id: sourceBranchId } }),
  ]);

  if (!targetBranch || !sourceBranch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const [targetHistory, sourceHistory] = await Promise.all([
    targetBranch.headMessageId ? buildLineage(targetBranch.headMessageId) : [],
    sourceBranch.headMessageId ? buildLineage(sourceBranch.headMessageId) : [],
  ]);

  const mergePrompt = `You are a merge assistant. Two conversation branches diverged from a common point. Your task is to synthesize the key insights and conclusions from both branches into a coherent summary.

BRANCH "${targetBranch.name}" ended with:
${targetHistory.slice(-3).map((m) => `[${m.role}]: ${m.content}`).join("\n\n")}

BRANCH "${sourceBranch.name}" ended with:
${sourceHistory.slice(-3).map((m) => `[${m.role}]: ${m.content}`).join("\n\n")}

Provide a merge summary: what did each branch explore, what conclusions can be combined, and what the merged understanding is. Be concise.`;

  const completion = await groq.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: mergePrompt }],
  });

  const mergeContent = completion.choices[0].message.content ?? "";

  const mergeMsg = await prisma.message.create({
    data: {
      branchId,
      parentMessageId: targetBranch.headMessageId,
      role: "assistant",
      content: mergeContent,
      tag: `merge from ${sourceBranch.name}`,
    },
  });

  await prisma.branch.update({
    where: { id: branchId },
    data: { headMessageId: mergeMsg.id },
  });

  return NextResponse.json({ messageId: mergeMsg.id, content: mergeContent });
}
