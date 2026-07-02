import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(_: NextRequest, { params }: { params: Promise<{ stashId: string }> }) {
  const { stashId } = await params;

  const stash = await prisma.stash.findUnique({ where: { id: stashId } });
  if (!stash) return NextResponse.json({ error: "Stash not found" }, { status: 404 });

  const branch = await prisma.branch.update({
    where: { id: stash.branchId },
    data: { headMessageId: stash.headMessageId },
  });

  await prisma.stash.delete({ where: { id: stashId } });

  return NextResponse.json(branch);
}
