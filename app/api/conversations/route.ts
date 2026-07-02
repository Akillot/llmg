import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    include: { branches: { orderBy: { createdAt: "asc" } } },
  });

  const forkMsgIds = conversations
    .flatMap((c) => c.branches)
    .filter((b) => b.forkedFromMsgId)
    .map((b) => b.forkedFromMsgId!);

  const forkMsgs =
    forkMsgIds.length > 0
      ? await prisma.message.findMany({
          where: { id: { in: forkMsgIds } },
          select: { id: true, content: true, branchId: true },
        })
      : [];

  const forkContentMap = new Map(forkMsgs.map((m) => [m.id, m.content]));
  const forkBranchMap = new Map(forkMsgs.map((m) => [m.id, m.branchId]));

  const result = conversations.map((c) => ({
    ...c,
    branches: c.branches.map((b) => ({
      ...b,
      forkedFromPreview: b.forkedFromMsgId
        ? (forkContentMap.get(b.forkedFromMsgId) ?? "").slice(0, 60)
        : null,
      parentBranchId: b.forkedFromMsgId
        ? (forkBranchMap.get(b.forkedFromMsgId) ?? null)
        : null,
    })),
  }));

  return NextResponse.json(result);
}

export async function POST() {
  const conversation = await prisma.conversation.create({
    data: {
      branches: {
        create: { name: "main" },
      },
    },
    include: { branches: true },
  });
  return NextResponse.json(conversation);
}
