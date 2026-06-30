import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { fromMessageId, name } = await req.json();

  const sourceMsg = await prisma.message.findUnique({ where: { id: fromMessageId } });
  if (!sourceMsg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

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
