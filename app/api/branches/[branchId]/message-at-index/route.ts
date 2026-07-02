import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildRichLineage } from "@/lib/context";

export async function POST(req: NextRequest, { params }: { params: Promise<{ branchId: string }> }) {
  const { branchId } = await params;
  const { index } = await req.json();

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch?.headMessageId) return NextResponse.json({ error: "No messages" }, { status: 404 });

  const lineage = await buildRichLineage(branch.headMessageId);
  const msg = lineage[index];
  if (!msg) return NextResponse.json({ error: "Index out of range" }, { status: 404 });

  return NextResponse.json({ messageId: msg.id });
}
