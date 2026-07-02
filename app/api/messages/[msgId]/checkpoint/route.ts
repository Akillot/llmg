import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ai, MODEL } from "@/lib/ai";
import { buildFullRichLineage } from "@/lib/context";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  const { msgId } = await params;

  const message = await prisma.message.findUnique({ where: { id: msgId } });
  if (!message) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Get full history up to and including this message
  const lineage = await buildFullRichLineage(msgId);

  const historyText = lineage
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n\n---\n\n");

  const completion = await ai.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are creating a context checkpoint for an AI conversation. " +
          "Write a comprehensive summary that would allow continuing this work seamlessly using ONLY this summary. " +
          "Include: the goal/task, all key decisions, any code written, problems solved, current state, and important facts. " +
          "Be thorough — this replaces the full conversation history to save tokens.",
      },
      { role: "user", content: `Summarize this conversation:\n\n${historyText}` },
    ],
    max_tokens: 1500,
  });

  const summary = completion.choices[0].message.content ?? "";

  await prisma.message.update({
    where: { id: msgId },
    data: { isCheckpoint: true, checkpointSummary: summary },
  });

  return NextResponse.json({ ok: true, summary });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ msgId: string }> }) {
  const { msgId } = await params;
  await prisma.message.update({
    where: { id: msgId },
    data: { isCheckpoint: false, checkpointSummary: null },
  });
  return NextResponse.json({ ok: true });
}
