import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { content, role, forwardedFrom } = await req.json();

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) return NextResponse.json({ error: "Branch not found" }, { status: 404 });

  const msg = await prisma.message.create({
    data: {
      branchId,
      parentMessageId: branch.headMessageId,
      role,
      content,
      forwardedFrom,
    },
  });

  await prisma.branch.update({ where: { id: branchId }, data: { headMessageId: msg.id } });

  return NextResponse.json(msg);
}
