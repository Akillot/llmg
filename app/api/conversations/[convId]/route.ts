import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ convId: string }> }) {
  const { convId } = await params;

  const branches = await prisma.branch.findMany({ where: { conversationId: convId }, select: { id: true } });
  const branchIds = branches.map((b) => b.id);

  if (branchIds.length > 0) {
    const messages = await prisma.message.findMany({ where: { branchId: { in: branchIds } }, select: { id: true } });
    const messageIds = messages.map((m) => m.id);
    if (messageIds.length > 0) {
      await prisma.message.updateMany({ where: { parentMessageId: { in: messageIds } }, data: { parentMessageId: null } });
    }
  }

  await prisma.conversation.delete({ where: { id: convId } });
  return NextResponse.json({ ok: true });
}
