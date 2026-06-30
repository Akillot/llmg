import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function getLineageIds(headMessageId: string): Promise<string[]> {
  const ids: string[] = [];
  let currentId: string | null = headMessageId;
  while (currentId) {
    const msg: { id: string; parentMessageId: string | null } | null =
      await prisma.message.findUnique({ where: { id: currentId } });
    if (!msg) break;
    ids.unshift(msg.id);
    currentId = msg.parentMessageId;
  }
  return ids;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { index } = await req.json();

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch?.headMessageId) return NextResponse.json({ error: "No messages" }, { status: 404 });

  const ids = await getLineageIds(branch.headMessageId);
  const messageId = ids[index];
  if (!messageId) return NextResponse.json({ error: "Index out of range" }, { status: 404 });

  return NextResponse.json({ messageId });
}
