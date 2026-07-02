import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const setting = await prisma.globalSetting.findUnique({ where: { key: "instructions" } });
  return NextResponse.json({ instructions: setting?.value ?? "" });
}

export async function PUT(req: NextRequest) {
  const { instructions } = await req.json();
  await prisma.globalSetting.upsert({
    where: { key: "instructions" },
    update: { value: instructions ?? "" },
    create: { key: "instructions", value: instructions ?? "" },
  });
  return NextResponse.json({ ok: true });
}
