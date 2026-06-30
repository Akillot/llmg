import { prisma } from "./db";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export async function buildLineage(headMessageId: string): Promise<ChatMessage[]> {
  const lineage: ChatMessage[] = [];
  let currentId: string | null = headMessageId;

  while (currentId) {
    const msg: { role: string; content: string; parentMessageId: string | null } | null =
      await prisma.message.findUnique({ where: { id: currentId } });
    if (!msg) break;
    if (msg.role === "user" || msg.role === "assistant") {
      lineage.unshift({ role: msg.role as "user" | "assistant", content: msg.content });
    }
    currentId = msg.parentMessageId;
  }

  return lineage;
}
