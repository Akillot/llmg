import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const conversations = await prisma.conversation.findMany({
    orderBy: { createdAt: "desc" },
    include: { branches: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(conversations);
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
