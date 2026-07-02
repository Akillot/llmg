import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

async function getLineageWithIds(headMessageId: string) {
  const msgs: { id: string; role: string; content: string; tag: string | null; parentMessageId: string | null }[] = [];
  let currentId: string | null = headMessageId;
  while (currentId) {
    const msg: { id: string; role: string; content: string; tag: string | null; parentMessageId: string | null } | null =
      await prisma.message.findUnique({ where: { id: currentId } });
    if (!msg) break;
    msgs.unshift(msg);
    currentId = msg.parentMessageId;
  }
  return msgs;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ convId: string }> }) {
  const { convId } = await params;
  const { searchParams } = new URL(req.url);
  const branch1Id = searchParams.get("branch1");
  const branch2Id = searchParams.get("branch2");

  if (!branch1Id || !branch2Id) {
    return NextResponse.json({ error: "branch1 and branch2 required" }, { status: 400 });
  }

  const [b1, b2] = await Promise.all([
    prisma.branch.findUnique({ where: { id: branch1Id } }),
    prisma.branch.findUnique({ where: { id: branch2Id } }),
  ]);

  if (!b1 || !b2 || b1.conversationId !== convId || b2.conversationId !== convId) {
    return NextResponse.json({ error: "Branches not found in conversation" }, { status: 404 });
  }

  const [lineage1, lineage2] = await Promise.all([
    b1.headMessageId ? getLineageWithIds(b1.headMessageId) : [],
    b2.headMessageId ? getLineageWithIds(b2.headMessageId) : [],
  ]);

  const ids1 = new Set(lineage1.map((m) => m.id));
  const ids2 = new Set(lineage2.map((m) => m.id));

  const shared = lineage1.filter((m) => ids2.has(m.id));
  const only1 = lineage1.filter((m) => !ids2.has(m.id));
  const only2 = lineage2.filter((m) => !ids1.has(m.id));

  return NextResponse.json({
    branch1: { id: b1.id, name: b1.name },
    branch2: { id: b2.id, name: b2.name },
    shared,
    only1,
    only2,
  });
}
