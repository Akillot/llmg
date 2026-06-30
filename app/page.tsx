"use client";

import { useEffect, useRef, useState } from "react";
import { GitBranch, GitFork, RotateCcw, Plus, Send, Loader2 } from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };
type Branch = { id: string; name: string; forkedFromMsgId: string | null; headMessageId: string | null };
type Conversation = { id: string; title: string; branches: Branch[] };

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMsgIdx, setSelectedMsgIdx] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeBranch = activeConv?.branches.find((b) => b.id === activeBranchId);

  useEffect(() => {
    fetch("/api/conversations")
      .then((r) => r.json())
      .then(setConversations);
  }, []);

  useEffect(() => {
    if (!activeBranchId) return;
    fetch(`/api/branches/${activeBranchId}/messages`)
      .then((r) => r.json())
      .then(setMessages);
    setSelectedMsgIdx(null);
  }, [activeBranchId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function newConversation() {
    const res = await fetch("/api/conversations", { method: "POST" });
    const conv: Conversation = await res.json();
    setConversations((prev) => [conv, ...prev]);
    setActiveConvId(conv.id);
    setActiveBranchId(conv.branches[0].id);
    setMessages([]);
  }

  async function sendMessage() {
    if (!input.trim() || !activeBranchId || loading) return;
    const text = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/branches/${activeBranchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      const reply = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: reply.content }]);
      refreshConversations();
    } finally {
      setLoading(false);
    }
  }

  async function refreshConversations() {
    const res = await fetch("/api/conversations");
    setConversations(await res.json());
  }

  async function forkFrom(msgIdx: number) {
    if (!activeBranchId || !activeConv) return;
    const name = prompt("Branch name:", `fork-${activeConv.branches.length + 1}`);
    if (!name) return;

    const idRes = await fetch(`/api/branches/${activeBranchId}/message-at-index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: msgIdx }),
    });
    if (!idRes.ok) return;
    const { messageId } = await idRes.json();

    const forkRes = await fetch(`/api/branches/${activeBranchId}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromMessageId: messageId, name }),
    });
    const newBranch = await forkRes.json();
    await refreshConversations();
    setActiveBranchId(newBranch.id);
  }

  async function rollbackTo(msgIdx: number) {
    if (!activeBranchId) return;
    const ok = confirm(`Roll back to message ${msgIdx + 1}? Messages after this will be hidden from the model.`);
    if (!ok) return;

    const idRes = await fetch(`/api/branches/${activeBranchId}/message-at-index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: msgIdx }),
    });
    if (!idRes.ok) return;
    const { messageId } = await idRes.json();

    await fetch(`/api/branches/${activeBranchId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toMessageId: messageId }),
    });

    const msgs = await fetch(`/api/branches/${activeBranchId}/messages`).then((r) => r.json());
    setMessages(msgs);
    setSelectedMsgIdx(null);
    refreshConversations();
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 border-r border-zinc-800 flex flex-col shrink-0">
        <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
          <GitBranch size={14} className="text-emerald-400" />
          <span className="text-xs font-semibold tracking-widest text-zinc-300 uppercase">llmg</span>
        </div>

        <button
          onClick={newConversation}
          className="mx-3 mt-3 flex items-center gap-2 text-xs px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 transition-colors text-zinc-300"
        >
          <Plus size={12} /> New chat
        </button>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.map((conv) => (
            <div key={conv.id}>
              <button
                onClick={() => {
                  setActiveConvId(conv.id);
                  setActiveBranchId(conv.branches[0]?.id ?? null);
                }}
                className={`w-full text-left px-4 py-2 text-xs truncate transition-colors ${
                  activeConvId === conv.id
                    ? "text-zinc-100 bg-zinc-800"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                {conv.title}
              </button>

              {activeConvId === conv.id && conv.branches.length > 1 && (
                <div className="pl-6 pb-1">
                  {conv.branches.map((br) => (
                    <button
                      key={br.id}
                      onClick={() => setActiveBranchId(br.id)}
                      className={`w-full text-left flex items-center gap-1.5 px-2 py-1 text-xs rounded transition-colors ${
                        activeBranchId === br.id
                          ? "text-emerald-400"
                          : "text-zinc-600 hover:text-zinc-400"
                      }`}
                    >
                      <GitBranch size={10} />
                      {br.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {activeBranch && (
          <div className="border-b border-zinc-800 px-4 py-2 flex items-center gap-2 text-xs text-zinc-500">
            <GitBranch size={11} className="text-emerald-400" />
            <span className="text-zinc-300">{activeBranch.name}</span>
            {activeBranch.forkedFromMsgId && (
              <span className="text-zinc-600">· forked</span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {!activeBranchId && (
            <div className="flex flex-col items-center justify-center h-full text-zinc-600 text-sm gap-3">
              <GitBranch size={36} className="text-zinc-700" />
              <span>Create or select a conversation</span>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedMsgIdx(idx === selectedMsgIdx ? null : idx)}
              className={`group relative cursor-pointer rounded-lg px-4 py-3 text-sm transition-all ${
                msg.role === "user"
                  ? "ml-12 bg-zinc-800 text-zinc-100"
                  : "mr-12 bg-zinc-900 border border-zinc-800 text-zinc-200"
              } ${
                selectedMsgIdx === idx
                  ? "ring-1 ring-emerald-500/60"
                  : "hover:ring-1 hover:ring-zinc-700"
              }`}
            >
              <div className="text-xs text-zinc-500 mb-1">
                {msg.role === "user" ? "you" : "ai"}
              </div>
              <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>

              {selectedMsgIdx === idx && (
                <div className="absolute -bottom-8 right-0 flex gap-1 z-10">
                  <button
                    onClick={(e) => { e.stopPropagation(); rollbackTo(idx); }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 hover:border-orange-500 hover:text-orange-400 transition-colors"
                  >
                    <RotateCcw size={10} /> rollback
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); forkFrom(idx); }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-zinc-800 border border-zinc-700 hover:border-emerald-500 hover:text-emerald-400 transition-colors"
                  >
                    <GitFork size={10} /> fork
                  </button>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="mr-12 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3 flex items-center gap-2 text-zinc-500 text-sm">
              <Loader2 size={12} className="animate-spin" />
              thinking…
            </div>
          )}

          <div ref={bottomRef} className="h-8" />
        </div>

        {activeBranchId && (
          <div className="border-t border-zinc-800 p-3">
            <div className="flex gap-2 items-end">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Message… (Enter to send, Shift+Enter for newline)"
                rows={1}
                className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
                style={{ maxHeight: "160px" }}
                onInput={(e) => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = t.scrollHeight + "px";
                }}
              />
              <button
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className="shrink-0 p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
            <div className="mt-1.5 text-xs text-zinc-600">
              Click a message →{" "}
              <span className="text-orange-400">rollback</span> or{" "}
              <span className="text-emerald-400">fork</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
