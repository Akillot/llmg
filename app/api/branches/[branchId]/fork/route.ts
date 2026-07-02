import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildRichLineage } from "@/lib/context";

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { fromMessageId, name, mode } = await req.json();

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const sourceMsg = await prisma.message.findUnique({ where: { id: fromMessageId } });
  if (!sourceMsg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  // mode "extract": copy messages from fork point onward with no prior context
  if (mode === "extract") {
    if (!branch.headMessageId) return NextResponse.json({ error: "Branch has no messages" }, { status: 400 });

    const lineage = await buildRichLineage(branch.headMessageId);
    const forkIdx = lineage.findIndex((m) => m.id === fromMessageId);
    if (forkIdx === -1) return NextResponse.json({ error: "Message not in lineage" }, { status: 404 });

    const toCopy = lineage.slice(forkIdx);

    const newBranch = await prisma.branch.create({
      data: {
        conversationId: branch.conversationId,
        name: name ?? `extract-${Date.now()}`,
        forkedFromMsgId: fromMessageId,
      },
    });

    let prevId: string | null = null;
    let lastId: string | null = null;

    for (const msg of toCopy) {
      const created: { id: string } = await prisma.message.create({
        data: {
          branchId: newBranch.id,
          parentMessageId: prevId,
          role: msg.role,
          content: msg.content,
          tag: msg.tag ?? undefined,
        },
      });
      prevId = created.id;
      lastId = created.id;
    }

    if (lastId) {
      await prisma.branch.update({ where: { id: newBranch.id }, data: { headMessageId: lastId } });
    }

    return NextResponse.json(newBranch);
  }

  // default mode: fork with full history up to this point
  const newBranch = await prisma.branch.create({
    data: {
      conversationId: branch.conversationId,
      name: name ?? `branch-${Date.now()}`,
      forkedFromMsgId: fromMessageId,
      headMessageId: fromMessageId,
    },
  });

  return NextResponse.json(newBranch);
}
