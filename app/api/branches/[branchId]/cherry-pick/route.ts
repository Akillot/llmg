import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { messageId } = await req.json();

  const [branch, sourceMsg] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branchId } }),
    prisma.message.findUnique({ where: { id: messageId } }),
  ]);

  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  if (!sourceMsg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const picked = await prisma.message.create({
    data: {
      branchId,
      parentMessageId: branch.headMessageId,
      role: sourceMsg.role,
      content: sourceMsg.content,
      tag: sourceMsg.tag ? `cherry-picked: ${sourceMsg.tag}` : null,
    },
  });

  await prisma.branch.update({
    where: { id: branchId },
    data: { headMessageId: picked.id },
  });

  return NextResponse.json(picked);
}
