import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  const { msgId } = await params;
  const { tag, tagColor } = await req.json();

  const msg = await prisma.message.update({
    where: { id: msgId },
    data: { tag: tag ?? null, tagColor: tagColor ?? null },
  });

  return NextResponse.json(msg);
}
