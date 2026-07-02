import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ convId: string }> }) {
  const { convId } = await params;

  const conversation = await prisma.conversation.findUnique({
    where: { id: convId },
    include: {
      branches: {
        orderBy: { createdAt: "asc" },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
            select: { id: true, role: true, content: true, tag: true, tagColor: true, forwardedFrom: true, replyToId: true, parentMessageId: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!conversation) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const exported = {
    llmg_version: "1.0",
    exported_at: new Date().toISOString(),
    conversation: {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      branches: conversation.branches.map((b) => ({
        id: b.id,
        name: b.name,
        headMessageId: b.headMessageId,
        forkedFromMsgId: b.forkedFromMsgId,
        createdAt: b.createdAt,
        messages: b.messages,
      })),
    },
  };

  // Also generate simple markdown
  const md = generateMarkdown(exported.conversation);

  return NextResponse.json({ json: exported, markdown: md });
}

function generateMarkdown(conv: { title: string; branches: Array<{ name: string; forkedFromMsgId: string | null; messages: Array<{ role: string; content: string; tag: string | null; forwardedFrom: string | null }> }> }) {
  const lines: string[] = [`# ${conv.title}`, "", `> Экспортировано из llmg`, ""];

  for (const branch of conv.branches) {
    lines.push(`## Ветка: ${branch.name}`);
    if (branch.forkedFromMsgId) lines.push(`> Форкнуто`);
    lines.push("");

    for (const msg of branch.messages) {
      const speaker = msg.role === "user" ? "**Вы**" : "**AI**";
      if (msg.forwardedFrom) lines.push(`> *Переслано из: ${msg.forwardedFrom}*`);
      if (msg.tag) lines.push(`> 🏷 \`${msg.tag}\``);
      lines.push(`${speaker}: ${msg.content}`);
      lines.push("");
    }

    lines.push("---", "");
  }

  return lines.join("\n");
}
