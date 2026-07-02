import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const stashes = await prisma.stash.findMany({
    where: { branchId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(stashes);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { name } = await req.json();

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch?.headMessageId) {
    return NextResponse.json({ error: "Nothing to stash" }, { status: 400 });
  }

  const stash = await prisma.stash.create({
    data: {
      branchId,
      headMessageId: branch.headMessageId,
      name: name ?? `stash@{${new Date().toISOString()}}`,
    },
  });

  return NextResponse.json(stash);
}
