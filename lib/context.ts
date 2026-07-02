import { prisma } from "./db";

export type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
export type RichMessage = {
  id: string;
  role: string;
  content: string;
  tag: string | null;
  tagColor: string | null;
  forwardedFrom: string | null;
  replyToId: string | null;
  isCheckpoint: boolean;
  checkpointSummary: string | null;
  parentMessageId: string | null;
};

const SELECT = {
  id: true, role: true, content: true,
  tag: true, tagColor: true,
  forwardedFrom: true, replyToId: true,
  isCheckpoint: true, checkpointSummary: true,
  parentMessageId: true,
};

// For UI display — returns ALL messages regardless of checkpoints
export async function buildFullRichLineage(headMessageId: string): Promise<RichMessage[]> {
  const lineage: RichMessage[] = [];
  let currentId: string | null = headMessageId;
  while (currentId) {
    const msg: RichMessage | null = await prisma.message.findUnique({ where: { id: currentId }, select: SELECT });
    if (!msg) break;
    lineage.unshift(msg);
    currentId = msg.parentMessageId;
  }
  return lineage;
}

// For AI calls — stops at checkpoint and uses its summary
export async function buildRichLineage(headMessageId: string): Promise<RichMessage[]> {
  const lineage: RichMessage[] = [];
  let currentId: string | null = headMessageId;
  while (currentId) {
    const msg: RichMessage | null = await prisma.message.findUnique({ where: { id: currentId }, select: SELECT });
    if (!msg) break;
    lineage.unshift(msg);
    if (msg.isCheckpoint && msg.checkpointSummary) break; // stop — summary covers everything before
    currentId = msg.parentMessageId;
  }
  return lineage;
}

// Builds the message array sent to LLM
export async function buildLineage(headMessageId: string): Promise<ChatMessage[]> {
  const rich = await buildRichLineage(headMessageId);

  const first = rich[0];

  // Tagged messages become pinned high-priority system context
  const tagged = rich.filter(m => m.tag && (m.role === "user" || m.role === "assistant"));
  const pinnedBlock = tagged.length > 0
    ? `[Pinned messages — treat as high priority context]\n\n` +
      tagged.map(m => `#${m.tag} [${m.role}]:\n${m.content}`).join("\n\n---\n\n")
    : null;

  // If oldest visible message is a checkpoint, inject its summary as system context
  if (first?.isCheckpoint && first.checkpointSummary) {
    const rest = rich.slice(1)
      .filter(m => m.role === "user" || m.role === "assistant")
      .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));
    const systemContent = pinnedBlock
      ? `[Context checkpoint — summarizes all earlier messages]\n\n${first.checkpointSummary}\n\n${pinnedBlock}`
      : `[Context checkpoint — summarizes all earlier messages]\n\n${first.checkpointSummary}`;
    return [{ role: "system", content: systemContent }, ...rest];
  }

  const messages = rich
    .filter(m => m.role === "user" || m.role === "assistant")
    .map(m => ({ role: m.role as "user" | "assistant", content: m.content }));

  if (pinnedBlock) {
    return [{ role: "system", content: pinnedBlock }, ...messages];
  }

  return messages;
}
