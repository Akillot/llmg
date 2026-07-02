import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;

  const messages = await prisma.message.findMany({ where: { branchId }, select: { id: true } });
  const messageIds = messages.map((m) => m.id);

  if (messageIds.length > 0) {
    await prisma.message.updateMany({
      where: { parentMessageId: { in: messageIds }, NOT: { branchId } },
      data: { parentMessageId: null },
    });
  }

  const branch = await prisma.branch.findUnique({ where: { id: branchId }, select: { conversationId: true } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const remaining = await prisma.branch.count({ where: { conversationId: branch.conversationId } });

  if (remaining <= 1) {
    await prisma.conversation.delete({ where: { id: branch.conversationId } });
    return NextResponse.json({ ok: true, conversationDeleted: true, conversationId: branch.conversationId });
  }

  await prisma.branch.delete({ where: { id: branchId } });
  return NextResponse.json({ ok: true, conversationDeleted: false });
}
