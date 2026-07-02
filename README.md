# llmg

> Git-style version control for AI conversations.

Most chat interfaces give you a single linear thread. llmg treats every message as a commit — you can branch at any point, roll back to an earlier state, diff two parallel conversations, cherry-pick individual messages across threads, and merge branches with AI synthesis. When you're done, export the entire conversation tree as a real git repository.

```
main ─── msg1 ─── msg2 ─── msg3 ─── msg4 (HEAD)
                    │
                    └─ feature ─── msg3' ─── msg4' ─── msg5' (HEAD)
```

---

## Features

### Message operations

| Action | What it does |
|---|---|
| **Fork** | Create a new branch from any message. The AI inherits the full conversation history up to that point. |
| **Rollback** | Revert the branch HEAD to an earlier message. Later messages become invisible to the AI but remain in the database. |
| **Extract** | Start a clean branch from one message with no prior context — useful for isolating a topic that drifted in mid-conversation. |
| **Reply** | Quote a specific message (or a text selection from any AI response) when writing your next message. The AI receives the quote as explicit context. |
| **Forward** | Send any message to a different branch or conversation. |
| **Tag** | Attach a color-coded label to any message. Tagged messages are automatically promoted to high-priority pinned context and injected into every subsequent AI call in that branch. |
| **Checkpoint** | Generate a compressed AI summary of everything up to a given message. Future calls start from the summary instead of the full history, saving tokens on long threads. |
| **Copy** | Copy any message text to the clipboard. |

### Branch operations

Hover over any branch in the sidebar to reveal its actions:

| Action | What it does |
|---|---|
| **Diff** | Compare two branches side-by-side: shows shared messages (common ancestor) and the unique messages in each branch. |
| **Cherry-pick** | Copy a single message from another branch into the current one. |
| **Merge** | Prompt the AI to synthesize two branches into a single coherent response. |
| **Delete** | Remove a branch. If it's the last branch in a conversation, the conversation is deleted. |

### Workspace

- **Stash** — save the current branch state under a name and restore it at any time, like `git stash`
- **Custom instructions** — set a global system prompt, a per-conversation prompt, or inherit instructions from another conversation
- **Branch tree** — a visual graph of all branches and fork connections for the active conversation
- **Export** — download the full conversation tree (all branches) as JSON and Markdown; or run `npm run export-git` to get a real git repository where each message is a commit

---

## Quick start

**1. Clone**
```bash
git clone https://github.com/YOUR_USERNAME/llmg.git
cd llmg
```

**2. Configure your AI provider**
```bash
cp .env.example .env.local
# Add one of the keys below
```

**3. Install and run**
```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## AI provider configuration

llmg auto-detects the provider from environment variables. Only one key is needed.

| Provider | Variable | Default model | Notes |
|---|---|---|---|
| **Groq** *(default)* | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | Free tier available at [console.groq.com](https://console.groq.com) |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o-mini` | — |
| **Ollama** | `OLLAMA_HOST` *(optional)* | `llama3.2` | Fully local, no API key required |

Override the model or force a specific provider:
```bash
AI_MODEL=gpt-4o
AI_PROVIDER=openai   # groq | openai | ollama
```

---

## How tagging affects LLM context

When you tag a message, it is pinned into the system prompt on every subsequent AI call in that branch:

```
[Pinned messages — high priority context]

#Very useful [assistant]:
<tagged message content>

---

#Key constraint [user]:
<another tagged message>
```

This means the model always has access to your most important messages regardless of rollbacks, checkpoints, or long thread depth.

---

## Export as a git repository

```bash
npm run export-git
```

Output lands in `./exports/`. Each conversation becomes a directory, each branch becomes a git branch, and each message becomes a commit with its original timestamp as the author date.

```bash
cd exports/my-conversation-abc123
git log --oneline --graph --all
git diff main..experiment -- conversation.md
```

---

## How it maps to git

| llmg | git |
|---|---|
| Conversation | Repository |
| Branch | Branch |
| Message | Commit |
| Fork | `git checkout -b` |
| Rollback | `git reset HEAD~n` |
| Cherry-pick | `git cherry-pick` |
| Diff | `git diff branch1..branch2` |
| Merge | `git merge` |
| Stash | `git stash` |
| Checkpoint | Squash commit with summary |
| Tag | `git tag` |

---

## Tech stack

- [Next.js 16](https://nextjs.org) — App Router, React Server Components
- [Prisma 7](https://www.prisma.io) + SQLite via `@prisma/adapter-better-sqlite3`
- [Tailwind CSS v4](https://tailwindcss.com) — CSS-first configuration
- [Groq](https://groq.com) / [OpenAI](https://openai.com) / [Ollama](https://ollama.com) — via OpenAI-compatible API
- [react-markdown](https://github.com/remarkjs/react-markdown) — AI response rendering

---

## License

MIT
