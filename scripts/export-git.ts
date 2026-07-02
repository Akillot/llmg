/**
 * npm run export-git
 *
 * Exports every conversation in llmg as a real git repository.
 * Each branch → git branch. Each message → git commit.
 * Output: ./exports/<conversation-title>-<id>/
 */

import path from "path";
import fs from "fs";
import simpleGit from "simple-git";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";

// ── Prisma ────────────────────────────────────────────────────────────────────

const dbPath = path.join(process.cwd(), "prisma", "dev.db");
const adapter = new PrismaBetterSqlite3({ url: dbPath });
const prisma = new PrismaClient({
  adapter,
} as ConstructorParameters<typeof PrismaClient>[0]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .slice(0, 50)
    .replace(/^-|-$/g, "");
}

type Message = {
  id: string;
  branchId: string;
  parentMessageId: string | null;
  role: string;
  content: string;
  createdAt: Date;
};

type Branch = {
  id: string;
  name: string;
  forkedFromMsgId: string | null;
  headMessageId: string | null;
  messages: Message[];
};

/** Walk parentMessageId chain to get messages for a branch in chronological order. */
function sortBranchMessages(branchId: string, allMessages: Message[]): Message[] {
  const mine = allMessages.filter((m) => m.branchId === branchId);
  if (mine.length === 0) return [];

  const byId = new Map(mine.map((m) => [m.id, m]));
  const childIds = new Set(mine.map((m) => m.parentMessageId).filter(Boolean));
  // Head = message with no children in this branch
  const head = mine.find((m) => !childIds.has(m.id));
  if (!head) return mine.sort((a, b) => +a.createdAt - +b.createdAt);

  const ordered: Message[] = [];
  let cur: Message | undefined = head;
  while (cur) {
    ordered.unshift(cur);
    cur = cur.parentMessageId ? byId.get(cur.parentMessageId) : undefined;
  }
  return ordered;
}

/** Topological sort: parent branches always before children. */
function topoSortBranches(
  branches: Branch[],
  msgById: Map<string, Message>
): Branch[] {
  const branchById = new Map(branches.map((b) => [b.id, b]));
  const result: Branch[] = [];
  const visited = new Set<string>();

  function parentBranchOf(b: Branch): Branch | null {
    if (!b.forkedFromMsgId) return null;
    const forkMsg = msgById.get(b.forkedFromMsgId);
    return forkMsg ? (branchById.get(forkMsg.branchId) ?? null) : null;
  }

  function visit(b: Branch) {
    if (visited.has(b.id)) return;
    const parent = parentBranchOf(b);
    if (parent) visit(parent);
    visited.add(b.id);
    result.push(b);
  }

  for (const b of branches) visit(b);
  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const outRoot = path.join(process.cwd(), "exports");
  fs.mkdirSync(outRoot, { recursive: true });

  const conversations = await prisma.conversation.findMany({
    include: {
      branches: {
        include: { messages: true },
      },
    },
  });

  if (conversations.length === 0) {
    console.log("No conversations found.");
    await prisma.$disconnect();
    return;
  }

  let totalMessages = 0;
  let totalSkipped = 0;

  for (const conv of conversations) {
    const slug = slugify(conv.title) || "untitled";
    const convDir = path.join(outRoot, `${slug}-${conv.id.slice(-6)}`);

    console.log(`\nExporting: "${conv.title}"`);

    fs.mkdirSync(convDir, { recursive: true });

    const git = simpleGit(convDir);
    await git.init();
    await git.addConfig("user.name", "llmg-export");
    await git.addConfig("user.email", "export@llmg.local");

    // Initial empty commit so branches have a base
    fs.writeFileSync(path.join(convDir, ".llmg"), `id: ${conv.id}\ntitle: ${conv.title}\n`);
    await git.add(".llmg");
    await git.commit(`init: ${conv.title}`);

    const allMessages: Message[] = conv.branches.flatMap((b) => b.messages as Message[]);
    const msgById = new Map(allMessages.map((m) => [m.id, m]));
    const msgToSha = new Map<string, string>(); // messageId → git SHA

    const sortedBranches = topoSortBranches(conv.branches as Branch[], msgById);
    const usedNames = new Set<string>(["main"]);

    for (const branch of sortedBranches) {
      const isRoot = !branch.forkedFromMsgId;

      // Determine git branch name
      let gitName = isRoot ? "main" : (slugify(branch.name) || "branch");
      if (!isRoot && usedNames.has(gitName)) {
        gitName = `${gitName}-${branch.id.slice(-6)}`;
      }
      usedNames.add(gitName);

      if (!isRoot) {
        const forkMsg = branch.forkedFromMsgId ? msgById.get(branch.forkedFromMsgId) : null;
        const forkSha = forkMsg ? msgToSha.get(forkMsg.id) : undefined;

        if (forkSha) {
          await git.checkout(["-b", gitName, forkSha]);
        } else {
          // Fork point not yet committed — branch from HEAD
          await git.checkoutLocalBranch(gitName);
        }
      }

      const messages = sortBranchMessages(branch.id, allMessages);
      let exported = 0;
      let skipped = 0;

      for (const msg of messages) {
        try {
          const mdContent = `# ${msg.role}\n\n${msg.content}\n`;
          fs.writeFileSync(path.join(convDir, "conversation.md"), mdContent);
          await git.add("conversation.md");

          const subject = `${msg.role}: ${msg.content.slice(0, 72).replace(/\n/g, " ")}`;
          const date = new Date(msg.createdAt).toISOString();

          // --date sets author date; GIT_COMMITTER_DATE env var sets committer date
          await git.raw([
            "commit",
            "--date",
            date,
            "-m",
            subject,
          ]);
          // Override committer date to match author date
          await git.raw([
            "commit",
            "--amend",
            "--no-edit",
            "--reset-author",
          ]).catch(() => {
            // If amend fails (e.g. nothing to amend), ignore
          });

          const sha = (await git.revparse(["HEAD"])).trim();
          msgToSha.set(msg.id, sha);
          exported++;
          totalMessages++;
        } catch (err) {
          console.error(`  ✗ Skipped message ${msg.id.slice(-8)}: ${err}`);
          skipped++;
          totalSkipped++;
        }
      }

      console.log(`  ${isRoot ? "main" : gitName}: ${exported} commits${skipped ? `, ${skipped} skipped` : ""}`);
    }

    console.log(`  → ${convDir}`);
  }

  console.log(`\n✓ Done. ${totalMessages} messages exported, ${totalSkipped} skipped.`);
  console.log(`  Output: ${outRoot}/`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
