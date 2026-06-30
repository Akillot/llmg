import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { toMessageId } = await req.json();

  const msg = await prisma.message.findUnique({ where: { id: toMessageId } });
  if (!msg) return NextResponse.json({ error: "Message not found" }, { status: 404 });

  const branch = await prisma.branch.update({
    where: { id: branchId },
    data: { headMessageId: toMessageId },
  });

  return NextResponse.json(branch);
}
