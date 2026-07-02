import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ convId: string }> }) {
  const { convId } = await params;
  const branches = await prisma.branch.findMany({
    where: { conversationId: convId },
    orderBy: { createdAt: "asc" },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: { id: true, role: true, content: true, tag: true },
      },
    },
  });
  return NextResponse.json(branches);
}
