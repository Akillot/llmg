# llmg

ChatGPT owns your conversation history. You can't branch it, diff it, or store it next to your code. When the AI loses the plot 20 messages in, you start over.

**llmg** is a self-hosted AI chat with git-style branching. Your conversations live in a local SQLite database. Fork at any message, roll back when the AI goes wrong, export the entire conversation tree as a real git repository.

```bash
npm run export-git
# Every branch becomes a git branch.
# Every message becomes a git commit.
# git log --oneline --graph --all
```

> Open source. MIT. Self-hosted.  
> Your AI history stays on your machine — forever.

---

## What you can do

### With messages — click to open the action menu

| Action | What it does |
|---|---|
| **Fork** | Create a new branch from any message. The AI inherits full history up to that point. |
| **Rollback** | Revert the branch to an earlier message. Later messages become invisible to the AI but stay in the database. |
| **Extract** | Start a clean branch from one message with no prior context — isolates a topic that drifted mid-conversation. |
| **Reply** | Quote a specific message or a text selection. The AI receives the quote as explicit context. |
| **Tag** | Attach a color-coded label. Tagged messages are pinned into the system prompt on every subsequent call — the AI always sees them regardless of rollbacks or long thread depth. |
| **Checkpoint** | Generate an AI summary of everything up to this point. Future calls start from the summary, saving tokens on long threads. |
| **Forward** | Send any message to a different branch or conversation. |

### With branches — hover to reveal

| Action | What it does |
|---|---|
| **Diff** | Compare two branches side-by-side: shared messages and what diverged. |
| **Cherry-pick** | Copy a single message from another branch into the current one. |
| **Merge** | Prompt the AI to synthesize two branches into one coherent response. |

### Workspace

- **Stash** — save and restore branch states by name (`git stash`)
- **Custom instructions** — global system prompt, per-conversation, or inherited from another conversation
- **Branch tree** — visual graph of all branches and fork connections
- **Export** — download the full conversation tree as JSON and Markdown

---

## Quick start

**1. Clone**
```bash
git clone https://github.com/YOUR_USERNAME/llmg.git
cd llmg
```

**2. Add your API key**
```bash
cp .env.example .env.local
# Edit .env.local — add GROQ_API_KEY (free at console.groq.com)
```

**3. Install**
```bash
npm install
```

**4. Run**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## AI provider

llmg auto-detects the provider from environment variables. Only one key is needed.

| Provider | Variable | Default model | Notes |
|---|---|---|---|
| **Groq** *(default)* | `GROQ_API_KEY` | `llama-3.3-70b-versatile` | Free tier at [console.groq.com](https://console.groq.com) |
| **OpenAI** | `OPENAI_API_KEY` | `gpt-4o-mini` | — |
| **Ollama** | `OLLAMA_HOST` *(optional)* | `llama3.2` | Fully local, no key required |

Override the model or force a provider:
```bash
AI_MODEL=gpt-4o
AI_PROVIDER=openai   # groq | openai | ollama
```

---

## Export as a git repository

```bash
npm run export-git
```

Each conversation becomes a directory. Each branch becomes a git branch. Each message becomes a commit with its original timestamp.

```bash
cd exports/my-conversation-abc123
git log --oneline --graph --all
git diff main..experiment -- conversation.md
```

ChatGPT won't ship this. Exporting your history to a format that works without them is not in their interest.

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

- [Next.js 16](https://nextjs.org) App Router
- [Prisma 7](https://www.prisma.io) + SQLite via `@prisma/adapter-better-sqlite3`
- [Tailwind CSS v4](https://tailwindcss.com)
- Groq / OpenAI / Ollama via OpenAI-compatible API
- [react-markdown](https://github.com/remarkjs/react-markdown)

---

## License

MIT
