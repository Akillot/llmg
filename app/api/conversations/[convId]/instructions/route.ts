import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ convId: string }> }) {
  const { convId } = await params;
  const { instructions, inheritFromConvId } = await req.json();
  await prisma.conversation.update({
    where: { id: convId },
    data: { instructions: instructions ?? null, inheritFromConvId: inheritFromConvId ?? null },
  });
  return NextResponse.json({ ok: true });
}
