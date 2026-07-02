"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GitBranch, GitFork, GitMerge, RotateCcw, Plus, Send, Loader2,
  Tag, Archive, PackagePlus, GitCompare, X, ChevronDown, Check, Trash2, FileText, Code2, Network, Scissors, CornerUpRight, Copy, Reply, Download, HelpCircle, Settings, BookmarkCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import TreePanel, { type TreeBranchData } from "./components/TreePanel";
import HelpPanel, { TAG_COLORS } from "./components/HelpPanel";
import { t, type Lang } from "@/lib/i18n";

type RichMessage = { id: string; role: string; content: string; tag: string | null; tagColor: string | null; forwardedFrom: string | null; replyToId: string | null; isCheckpoint: boolean; checkpointSummary: string | null };
type Branch = { id: string; name: string; forkedFromMsgId: string | null; forkedFromPreview: string | null; headMessageId: string | null; parentBranchId: string | null };
type Stash = { id: string; name: string; createdAt: string };
type Conversation = { id: string; title: string; branches: Branch[]; instructions: string | null; inheritFromConvId: string | null };
type ReplyTarget = { id: string; role: string; content: string };
type DiffData = {
  branch1: { id: string; name: string };
  branch2: { id: string; name: string };
  shared: RichMessage[];
  only1: RichMessage[];
  only2: RichMessage[];
};

type Panel = "chat" | "diff" | "cherry-pick" | "tree" | "forward" | "help" | "settings";

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [activeBranchId, setActiveBranchId] = useState<string | null>(null);
  const [messages, setMessages] = useState<RichMessage[]>([]);
  const [stashes, setStashes] = useState<Stash[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedMsgIdx, setSelectedMsgIdx] = useState<number | null>(null);
  const [panel, setPanel] = useState<Panel>("chat");
  const [diffData, setDiffData] = useState<DiffData | null>(null);
  const [cherryPickBranchId, setCherryPickBranchId] = useState<string | null>(null);
  const [cherryPickMessages, setCherryPickMessages] = useState<RichMessage[]>([]);
  const [showStashPanel, setShowStashPanel] = useState(false);
  const [merging, setMerging] = useState(false);
  const [renderMode, setRenderMode] = useState<"md" | "raw">("md");
  const [treeBranches, setTreeBranches] = useState<TreeBranchData[]>([]);
  const [forwardMsg, setForwardMsg] = useState<{ content: string; role: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replyToMsg, setReplyToMsg] = useState<ReplyTarget | null>(null);
  const [tagEdit, setTagEdit] = useState<{ msgId: string; label: string; color: string } | null>(null);
  const [selectionReply, setSelectionReply] = useState<{ msgId: string; text: string; x: number; y: number } | null>(null);
  // Instructions state
  const [globalInstructions, setGlobalInstructions] = useState("");
  const [convInstMode, setConvInstMode] = useState<"global" | "inherit" | "custom">("global");
  const [convCustomInst, setConvCustomInst] = useState("");
  const [convInheritFrom, setConvInheritFrom] = useState("");
  const [instSaved, setInstSaved] = useState(false);
  const [checkpointingId, setCheckpointingId] = useState<string | null>(null);
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const saved = localStorage.getItem("llmg-lang") as Lang;
    if (saved === "en" || saved === "ru") setLang(saved);
  }, []);

  function switchLang(l: Lang) {
    setLang(l);
    localStorage.setItem("llmg-lang", l);
  }
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!isDragging.current) return;
      const delta = e.clientX - dragStartX.current;
      setSidebarWidth(Math.max(160, Math.min(480, dragStartWidth.current + delta)));
    }
    function onMouseUp() {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function startSidebarDrag(e: React.MouseEvent) {
    isDragging.current = true;
    dragStartX.current = e.clientX;
    dragStartWidth.current = sidebarWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }

  const activeConv = conversations.find((c) => c.id === activeConvId);
  const activeBranch = activeConv?.branches.find((b) => b.id === activeBranchId);

  const refreshConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    setConversations(await res.json());
  }, []);

  const loadMessages = useCallback(async (branchId: string) => {
    const res = await fetch(`/api/branches/${branchId}/messages?rich=1`);
    setMessages(await res.json());
    setSelectedMsgIdx(null);
  }, []);

  const loadStashes = useCallback(async (branchId: string) => {
    const res = await fetch(`/api/branches/${branchId}/stash`);
    setStashes(await res.json());
  }, []);

  useEffect(() => { refreshConversations(); }, [refreshConversations]);

  useEffect(() => {
    if (!activeBranchId) return;
    loadMessages(activeBranchId);
    loadStashes(activeBranchId);
    setPanel("chat");
    setDiffData(null);
  }, [activeBranchId, loadMessages, loadStashes]);

  useEffect(() => {
    if (panel === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, panel]);

  // Load global instructions once
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(d => setGlobalInstructions(d.instructions ?? ""));
  }, []);

  // Sync conv instruction settings when active conversation changes
  useEffect(() => {
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return;
    if (conv.instructions !== null) {
      setConvInstMode("custom");
      setConvCustomInst(conv.instructions);
      setConvInheritFrom("");
    } else if (conv.inheritFromConvId) {
      setConvInstMode("inherit");
      setConvInheritFrom(conv.inheritFromConvId);
      setConvCustomInst("");
    } else {
      setConvInstMode("global");
      setConvCustomInst("");
      setConvInheritFrom("");
    }
  }, [activeConvId, conversations]);

  // Text selection → reply to selection
  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      // Don't interfere with toolbar/sidebar clicks
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!text) { setSelectionReply(null); return; }
      const range = selection!.getRangeAt(0);
      const container = range.commonAncestorContainer;
      const el = container instanceof Element ? container : container.parentElement;
      const msgEl = el?.closest("[data-msg-id]");
      if (!msgEl || msgEl.getAttribute("data-msg-role") !== "assistant") {
        setSelectionReply(null);
        return;
      }
      const msgId = msgEl.getAttribute("data-msg-id")!;
      const rect = range.getBoundingClientRect();
      setSelectionReply({ msgId, text, x: rect.left + rect.width / 2, y: rect.top });
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

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
    const tempId = `temp-${Date.now()}`;
    const currentReply = replyToMsg;
    setReplyToMsg(null);
    setMessages((prev) => [...prev, { id: tempId, role: "user", content: text, tag: null, tagColor: null, forwardedFrom: null, replyToId: currentReply?.id ?? null, isCheckpoint: false, checkpointSummary: null }]);
    setLoading(true);
    try {
      const res = await fetch(`/api/branches/${activeBranchId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text, replyToId: currentReply?.id ?? null }),
      });
      const reply = await res.json();
      await loadMessages(activeBranchId);
      await refreshConversations();
      // reply used via loadMessages
      void reply;
    } finally {
      setLoading(false);
    }
  }

  async function getMsgIdAt(idx: number): Promise<string | null> {
    if (!activeBranchId) return null;
    const res = await fetch(`/api/branches/${activeBranchId}/message-at-index`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ index: idx }),
    });
    if (!res.ok) return null;
    const { messageId } = await res.json();
    return messageId;
  }

  // git tag — opens inline editor
  function tagMessage(idx: number) {
    const msg = messages[idx];
    if (!msg) return;
    setTagEdit({ msgId: msg.id, label: msg.tag ?? "", color: msg.tagColor ?? "amber" });
  }

  async function saveTagEdit() {
    if (!tagEdit || !activeBranchId) return;
    await fetch(`/api/messages/${tagEdit.msgId}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: tagEdit.label.trim() || null, tagColor: tagEdit.label.trim() ? tagEdit.color : null }),
    });
    setTagEdit(null);
    await loadMessages(activeBranchId);
  }

  async function saveGlobalInstructions() {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions: globalInstructions }),
    });
    setInstSaved(true);
    setTimeout(() => setInstSaved(false), 2000);
  }

  async function saveConvInstructions() {
    if (!activeConvId) return;
    const payload =
      convInstMode === "custom" ? { instructions: convCustomInst, inheritFromConvId: null }
      : convInstMode === "inherit" ? { instructions: null, inheritFromConvId: convInheritFrom || null }
      : { instructions: null, inheritFromConvId: null };
    await fetch(`/api/conversations/${activeConvId}/instructions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await refreshConversations();
    setInstSaved(true);
    setTimeout(() => setInstSaved(false), 2000);
  }

  async function createCheckpoint(msgId: string) {
    setCheckpointingId(msgId);
    try {
      await fetch(`/api/messages/${msgId}/checkpoint`, { method: "POST" });
      if (activeBranchId) await loadMessages(activeBranchId);
    } finally {
      setCheckpointingId(null);
    }
  }

  async function removeCheckpoint(msgId: string) {
    await fetch(`/api/messages/${msgId}/checkpoint`, { method: "DELETE" });
    if (activeBranchId) await loadMessages(activeBranchId);
  }

  async function removeTag(msgId: string) {
    if (!activeBranchId) return;
    await fetch(`/api/messages/${msgId}/tag`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: null, tagColor: null }),
    });
    setTagEdit(null);
    await loadMessages(activeBranchId);
  }

  async function exportConversation() {
    if (!activeConvId || !activeConv) return;
    const res = await fetch(`/api/conversations/${activeConvId}/export`);
    const { json, markdown } = await res.json();
    // Download JSON
    const jsonBlob = new Blob([JSON.stringify(json, null, 2)], { type: "application/json" });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const a = document.createElement("a");
    a.href = jsonUrl;
    a.download = `${activeConv.title.replace(/\s+/g, "-")}.llmg.json`;
    a.click();
    URL.revokeObjectURL(jsonUrl);
    // Download Markdown
    const mdBlob = new Blob([markdown], { type: "text/markdown" });
    const mdUrl = URL.createObjectURL(mdBlob);
    const b = document.createElement("a");
    b.href = mdUrl;
    b.download = `${activeConv.title.replace(/\s+/g, "-")}.md`;
    b.click();
    URL.revokeObjectURL(mdUrl);
  }

  // git fork
  async function forkFrom(idx: number) {
    if (!activeBranchId || !activeConv) return;
    const name = prompt("Branch name:", `fork-${activeConv.branches.length + 1}`);
    if (!name) return;
    const messageId = await getMsgIdAt(idx);
    if (!messageId) return;
    const res = await fetch(`/api/branches/${activeBranchId}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromMessageId: messageId, name }),
    });
    const newBranch = await res.json();
    await refreshConversations();
    setActiveBranchId(newBranch.id);
  }

  // extract: clean fork starting from this message, no prior context
  async function extractFrom(idx: number) {
    if (!activeBranchId || !activeConv) return;
    const preview = messages[idx]?.content.slice(0, 30) ?? "";
    const name = prompt("Branch name:", `extract: ${preview}…`);
    if (!name) return;
    const messageId = await getMsgIdAt(idx);
    if (!messageId) return;
    const res = await fetch(`/api/branches/${activeBranchId}/fork`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromMessageId: messageId, name, mode: "extract" }),
    });
    const newBranch = await res.json();
    await refreshConversations();
    setActiveBranchId(newBranch.id);
  }

  // git rollback
  async function rollbackTo(idx: number) {
    if (!activeBranchId) return;
    const ok = confirm(`Roll back to message ${idx + 1}? The tail becomes inaccessible to the model.`);
    if (!ok) return;
    const messageId = await getMsgIdAt(idx);
    if (!messageId) return;
    await fetch(`/api/branches/${activeBranchId}/rollback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toMessageId: messageId }),
    });
    await loadMessages(activeBranchId);
    await refreshConversations();
  }

  // git stash
  async function stashSave() {
    if (!activeBranchId) return;
    const name = prompt(t("stashPrompt", lang), `stash@{${messages.length} msgs}`);
    if (!name) return;
    await fetch(`/api/branches/${activeBranchId}/stash`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await loadStashes(activeBranchId);
  }

  async function stashPop(stashId: string) {
    if (!activeBranchId) return;
    await fetch(`/api/stashes/${stashId}/pop`, { method: "POST" });
    await loadMessages(activeBranchId);
    await loadStashes(activeBranchId);
    await refreshConversations();
  }

  // git cherry-pick
  async function openCherryPick(sourceBranchId: string) {
    const res = await fetch(`/api/branches/${sourceBranchId}/messages?rich=1`);
    setCherryPickMessages(await res.json());
    setCherryPickBranchId(sourceBranchId);
    setPanel("cherry-pick");
  }

  async function doCherryPick(msgId: string) {
    if (!activeBranchId) return;
    await fetch(`/api/branches/${activeBranchId}/cherry-pick`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageId: msgId }),
    });
    setPanel("chat");
    await loadMessages(activeBranchId);
    await refreshConversations();
  }

  // git diff
  async function openDiff(b2Id: string) {
    if (!activeConvId || !activeBranchId) return;
    const res = await fetch(
      `/api/conversations/${activeConvId}/diff?branch1=${activeBranchId}&branch2=${b2Id}`
    );
    setDiffData(await res.json());
    setPanel("diff");
  }

  // git merge
  async function mergeBranch(sourceBranchId: string) {
    if (!activeBranchId) return;
    const ok = confirm(`Merge branch into "${activeBranch?.name}"? AI will synthesize both branches.`);
    if (!ok) return;
    setMerging(true);
    try {
      await fetch(`/api/branches/${activeBranchId}/merge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceBranchId }),
      });
      await loadMessages(activeBranchId);
      await refreshConversations();
    } finally {
      setMerging(false);
    }
  }

  function openForward(idx: number) {
    const msg = messages[idx];
    if (!msg) return;
    setForwardMsg({ content: msg.content, role: msg.role });
    setPanel("forward");
  }

  async function doForward(targetBranchId: string) {
    if (!forwardMsg || !activeBranch || !activeConv) return;
    await fetch(`/api/branches/${targetBranchId}/forward`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: forwardMsg.content,
        role: forwardMsg.role,
        forwardedFrom: `${activeConv.title} / ${activeBranch.name}`,
      }),
    });
    setForwardMsg(null);
    setPanel("chat");
  }

  function copyMessage(msg: RichMessage) {
    navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function openTree() {
    if (!activeConvId) return;
    const res = await fetch(`/api/conversations/${activeConvId}/tree`);
    setTreeBranches(await res.json());
    setPanel("tree");
  }

  async function deleteConversation(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this conversation and all its branches?")) return;
    await fetch(`/api/conversations/${convId}`, { method: "DELETE" });
    if (activeConvId === convId) {
      setActiveConvId(null);
      setActiveBranchId(null);
      setMessages([]);
    }
    await refreshConversations();
  }

  async function deleteBranch(branchId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this branch?")) return;
    const res = await fetch(`/api/branches/${branchId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.conversationDeleted) {
      if (activeConvId === data.conversationId) {
        setActiveConvId(null);
        setActiveBranchId(null);
        setMessages([]);
      }
    } else if (activeBranchId === branchId) {
      const conv = conversations.find((c) => c.id === activeConvId);
      const other = conv?.branches.find((b) => b.id !== branchId);
      setActiveBranchId(other?.id ?? null);
      if (!other) setMessages([]);
    }
    await refreshConversations();
  }

  const otherBranches = activeConv?.branches.filter((b) => b.id !== activeBranchId) ?? [];

  return (
    <div className="flex h-full text-sm">
      {/* Sidebar */}
      <aside style={{ width: sidebarWidth }} className="border-r border-white/10 flex flex-col shrink-0 text-xs min-w-0">
        <div className="p-3 border-b border-white/10 flex items-center gap-2">
          <GitBranch size={13} className="text-white" />
          <span className="font-bold tracking-widest text-white/80 uppercase">llmg</span>
          <div className="ml-auto flex items-center gap-1.5">
            {activeConvId && (
              <button onClick={exportConversation} title={t("exportChat", lang)} className="p-1 text-white/22 hover:text-white/65 transition-colors">
                <Download size={11} />
              </button>
            )}
            <button onClick={() => setPanel("help")} title={t("help", lang)} className={`p-1 transition-colors ${panel === "help" ? "text-white/80" : "text-white/22 hover:text-white/65"}`}>
              <HelpCircle size={11} />
            </button>
            <div className="flex items-center gap-0.5 text-[10px] border border-white/10 rounded overflow-hidden">
              <button onClick={() => switchLang("en")} className={`px-1.5 py-0.5 transition-colors ${lang === "en" ? "bg-white/15 text-white/80" : "text-white/22 hover:text-white/45"}`}>EN</button>
              <button onClick={() => switchLang("ru")} className={`px-1.5 py-0.5 transition-colors ${lang === "ru" ? "bg-white/15 text-white/80" : "text-white/22 hover:text-white/45"}`}>RU</button>
            </div>
          </div>
        </div>

        <button
          onClick={newConversation}
          className="mx-3 mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/10 hover:bg-white/15 transition-colors text-white/65"
        >
          <Plus size={11} /> {t("newChat", lang)}
        </button>

        <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
          {conversations.map((conv) => (
            <div key={conv.id}>
              <div className="group flex items-center">
                <button
                  onClick={() => {
                    setActiveConvId(conv.id);
                    setActiveBranchId(conv.branches[0]?.id ?? null);
                  }}
                  className={`flex-1 text-left px-4 py-1.5 truncate transition-colors ${
                    activeConvId === conv.id
                      ? "text-white bg-white/10"
                      : "text-white/35 hover:text-white/65 hover:bg-white/[0.06]"
                  }`}
                >
                  {conv.title}
                </button>
                <button
                  onClick={(e) => deleteConversation(conv.id, e)}
                  title="delete conversation"
                  className="hidden group-hover:flex pr-2 text-white/14 hover:text-white/60 transition-colors"
                >
                  <Trash2 size={10} />
                </button>
              </div>

              {activeConvId === conv.id && (() => {
                // Build tree structure
                const kidMap = new Map<string | null, Branch[]>();
                for (const b of conv.branches) {
                  const k = b.parentBranchId ?? null;
                  if (!kidMap.has(k)) kidMap.set(k, []);
                  kidMap.get(k)!.push(b);
                }
                const rows: { br: Branch; prefix: string; depth: number }[] = [];
                function collectRows(parentId: string | null, lineStack: boolean[]) {
                  const kids = kidMap.get(parentId) ?? [];
                  kids.forEach((br, i) => {
                    const isLast = i === kids.length - 1;
                    const connector = lineStack.length === 0 ? "" : (isLast ? "└─" : "├─");
                    const verticals = lineStack.map(v => v ? "│  " : "   ").join("");
                    rows.push({ br, prefix: verticals + connector, depth: lineStack.length });
                    collectRows(br.id, [...lineStack, !isLast]);
                  });
                }
                collectRows(null, []);

                return (
                  <div className="pb-1">
                    {rows.map(({ br, prefix, depth }) => (
                      <div key={br.id} className="group flex items-center min-w-0">
                        {/* Tree connector */}
                        {prefix && (
                          <span className="font-mono text-[10px] text-white/14 select-none whitespace-pre shrink-0 pl-3">{prefix}</span>
                        )}
                        {/* Branch node */}
                        <button
                          onClick={() => setActiveBranchId(br.id)}
                          className={`flex-1 min-w-0 text-left flex items-center gap-1.5 px-1.5 py-1 transition-colors ${
                            depth === 0 ? "pl-3" : "pl-1"
                          } ${activeBranchId === br.id ? "text-white" : "text-white/22 hover:text-white/65"}`}
                        >
                          {/* Node dot */}
                          <span className={`shrink-0 w-2 h-2 rounded-full border transition-colors ${
                            activeBranchId === br.id
                              ? "bg-white border-white"
                              : "bg-transparent border-white/20 group-hover:border-white/40"
                          }`} />
                          <span className="truncate text-[11px]">{br.name}</span>
                          {activeBranchId === br.id && (
                            <span className="text-[9px] text-white/30 shrink-0">HEAD</span>
                          )}
                        </button>
                        {/* Action buttons */}
                        <div className="hidden group-hover:flex items-center gap-0.5 pr-1 shrink-0">
                          {activeBranchId !== br.id && activeBranchId && (
                            <>
                              <button title={t("diffTitle", lang)} onClick={() => openDiff(br.id)} className="p-0.5 text-white/22 hover:text-white/60">
                                <GitCompare size={9} />
                              </button>
                              <button title={t("cpTitle", lang)} onClick={() => openCherryPick(br.id)} className="p-0.5 text-white/22 hover:text-purple-400">
                                <PackagePlus size={9} />
                              </button>
                              <button title={t("mergeTitle", lang)} onClick={() => mergeBranch(br.id)} className="p-0.5 text-white/22 hover:text-orange-400">
                                <GitMerge size={9} />
                              </button>
                            </>
                          )}
                          <button title={t("deleteBranch", lang)} onClick={(e) => deleteBranch(br.id, e)} className="p-0.5 text-white/14 hover:text-white/60">
                            <Trash2 size={9} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>

        {/* Stash panel */}
        {activeBranchId && (
          <div className="border-t border-white/10">
            <button
              onClick={() => setShowStashPanel((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 text-white/35 hover:text-white/65 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Archive size={10} /> {t("stash", lang)} ({stashes.length})
              </span>
              <ChevronDown size={10} className={showStashPanel ? "rotate-180" : ""} />
            </button>
            {showStashPanel && (
              <div className="px-2 pb-2 space-y-1">
                <button
                  onClick={stashSave}
                  className="w-full text-left px-2 py-1 rounded border border-dashed border-white/15 text-white/22 hover:text-white/45 hover:border-white/20 transition-colors"
                >
                  {t("stashSave", lang)}
                </button>
                {stashes.map((s) => (
                  <div key={s.id} className="flex items-center gap-1 px-2">
                    <span className="flex-1 truncate text-white/35">{s.name}</span>
                    <button
                      onClick={() => stashPop(s.id)}
                      title="stash pop"
                      className="text-white/22 hover:text-white transition-colors"
                    >
                      <PackagePlus size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </aside>

      {/* Resize handle */}
      <div
        onMouseDown={startSidebarDrag}
        className="w-1 shrink-0 cursor-col-resize bg-white/10 hover:bg-white/20 transition-colors active:bg-white/30"
      />

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Branch toolbar */}
        {activeBranch && (
          <div className="border-b border-white/10 px-4 py-2 flex items-center gap-3 text-xs">
            <GitBranch size={11} className="text-white" />
            <span className="text-white/80 font-medium">{activeBranch.name}</span>
            {activeBranch.forkedFromPreview && (
              <span className="text-white/22 truncate max-w-[260px]">
                ← <span className="italic text-white/35">"{activeBranch.forkedFromPreview}{activeBranch.forkedFromPreview.length >= 60 ? "…" : ""}"</span>
              </span>
            )}
            <div className="flex-1" />
            <button
              onClick={openTree}
              title="Show branch tree"
              className={`flex items-center gap-1 transition-colors ${
                panel === "tree" ? "text-white/80" : "text-white/35 hover:text-white/65"
              }`}
            >
              <Network size={10} /> {t("tree", lang)}
            </button>
            {activeConvId && (
              <button
                onClick={() => setPanel(panel === "settings" ? "chat" : "settings")}
                title={t("settings", lang)}
                className={`flex items-center gap-1 transition-colors ${panel === "settings" ? "text-white/80" : "text-white/35 hover:text-white/65"}`}
              >
                <Settings size={10} />
              </button>
            )}
            <button
              onClick={() => setRenderMode((m) => m === "md" ? "raw" : "md")}
              title={renderMode === "md" ? t("toRaw", lang) : t("toMd", lang)}
              className="flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors"
            >
              {renderMode === "md" ? <FileText size={10} /> : <Code2 size={10} />}
              <span>{renderMode === "md" ? "md" : t("rawLabel", lang)}</span>
            </button>
            {panel !== "chat" && (
              <button
                onClick={() => setPanel("chat")}
                className="flex items-center gap-1 text-white/35 hover:text-white/65 transition-colors"
              >
                <X size={10} /> {t("close", lang)}
              </button>
            )}
            {merging && (
              <span className="flex items-center gap-1 text-orange-400">
                <Loader2 size={10} className="animate-spin" /> {t("merging", lang)}
              </span>
            )}
          </div>
        )}

        {/* DIFF VIEW */}
        {panel === "diff" && diffData && (
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-white/10 text-xs text-white/35">
              <GitCompare size={10} className="inline mr-1 text-white/60" />
              diff: <span className="text-white/65">{diffData.branch1.name}</span>
              <span className="mx-2 text-white/14">vs</span>
              <span className="text-white/65">{diffData.branch2.name}</span>
              <span className="ml-4 text-white/22">{diffData.shared.length} shared · {diffData.only1.length} only in {diffData.branch1.name} · {diffData.only2.length} only in {diffData.branch2.name}</span>
            </div>
            <div className="flex-1 overflow-auto">
              {diffData.shared.length > 0 && (
                <div className="px-4 py-2 text-xs text-white/22 border-b border-white/10">
                  {diffData.shared.length} shared messages (common ancestor)
                </div>
              )}
              <div className="grid grid-cols-2 divide-x divide-zinc-800 h-full">
                <div className="overflow-auto p-3 space-y-3">
                  <div className="text-xs text-white/35 mb-2 flex items-center gap-1">
                    <GitBranch size={9} className="text-white" /> {diffData.branch1.name}
                  </div>
                  {diffData.only1.map((m) => (
                    <div key={m.id} className={`rounded px-3 py-2 text-xs border-l-2 border-white/30 ${
                      m.role === "user" ? "bg-white/[0.04] text-white/80" : "bg-white/[0.06] text-white/65"
                    }`}>
                      <div className="text-white/35 mb-1">{m.role}</div>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                      {m.tag && <div className="mt-1 text-white/35 text-[10px]">#{m.tag}</div>}
                    </div>
                  ))}
                  {diffData.only1.length === 0 && (
                    <div className="text-white/14 text-xs">no unique messages</div>
                  )}
                </div>
                <div className="overflow-auto p-3 space-y-3">
                  <div className="text-xs text-white/35 mb-2 flex items-center gap-1">
                    <GitBranch size={9} className="text-white/60" /> {diffData.branch2.name}
                  </div>
                  {diffData.only2.map((m) => (
                    <div key={m.id} className={`rounded px-3 py-2 text-xs border-l-2 border-white/20 ${
                      m.role === "user" ? "bg-white/[0.03] text-white/80" : "bg-white/[0.06] text-white/65"
                    }`}>
                      <div className="text-white/35 mb-1">{m.role}</div>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.content}</div>
                      {m.tag && <div className="mt-1 text-white/40 text-[10px]">#{m.tag}</div>}
                    </div>
                  ))}
                  {diffData.only2.length === 0 && (
                    <div className="text-white/14 text-xs">no unique messages</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CHERRY-PICK VIEW */}
        {panel === "cherry-pick" && (
          <div className="flex-1 overflow-auto p-4">
            <div className="text-xs text-white/35 mb-3 flex items-center gap-1">
              <PackagePlus size={10} className="text-purple-400" />
              cherry-pick — click a message to add it to <span className="text-white/65 ml-1">{activeBranch?.name}</span>
            </div>
            <div className="space-y-3">
              {cherryPickMessages.map((m) => (
                <button
                  key={m.id}
                  onClick={() => doCherryPick(m.id)}
                  className={`w-full text-left rounded px-3 py-2 text-xs border transition-colors hover:border-white/25 hover:bg-white/[0.06] ${
                    m.role === "user"
                      ? "bg-white/10 border-white/15 text-white/80"
                      : "bg-white/[0.06] border-white/10 text-white/65"
                  }`}
                >
                  <div className="text-white/35 mb-1">{m.role}</div>
                  <div className="whitespace-pre-wrap leading-relaxed line-clamp-4">{m.content}</div>
                  {m.tag && <div className="mt-1 text-white/35 text-[10px]">#{m.tag}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SETTINGS PANEL */}
        {panel === "settings" && activeConvId && (
          <div className="flex-1 overflow-auto p-5 space-y-6 max-w-xl">
            <div className="flex items-center gap-2">
              <Settings size={13} className="text-white/45" />
              <h2 className="text-sm font-semibold text-white/80">{t("instructions", lang)}</h2>
            </div>

            {/* Global instructions */}
            <section className="space-y-2">
              <div>
                <div className="text-xs font-medium text-white/65 mb-0.5">🌐 {t("globalInstructions", lang)}</div>
                <p className="text-[11px] text-white/22">{t("globalDesc", lang)}</p>
              </div>
              <textarea
                value={globalInstructions}
                onChange={(e) => setGlobalInstructions(e.target.value)}
                placeholder={t("instPlaceholder", lang)}
                rows={3}
                className="w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-xs text-white/80 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
              />
              <button
                onClick={saveGlobalInstructions}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-white/15 hover:bg-zinc-600 text-white/80 transition-colors"
              >
                {instSaved ? <><Check size={10} className="text-white" /> {t("saved", lang)}</> : t("save", lang)}
              </button>
            </section>

            {/* Per-conversation instructions */}
            <section className="space-y-2 border-t border-white/10 pt-5">
              <div className="text-xs font-medium text-white/65 mb-2">💬 {t("thisChat", lang)}</div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="instMode" checked={convInstMode === "global"} onChange={() => setConvInstMode("global")} className="accent-emerald-500" />
                <span className="text-xs text-white/45">{t("useGlobal", lang)}</span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="instMode" checked={convInstMode === "inherit"} onChange={() => setConvInstMode("inherit")} className="accent-emerald-500 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs text-white/45">{t("inheritFrom", lang)}</span>
                  {convInstMode === "inherit" && (
                    <select
                      value={convInheritFrom}
                      onChange={(e) => setConvInheritFrom(e.target.value)}
                      className="mt-1.5 w-full bg-white/10 border border-white/15 rounded px-2 py-1 text-xs text-white/65 focus:outline-none focus:border-zinc-500"
                    >
                      <option value="">— {lang === "en" ? "select chat" : "выбери чат"} —</option>
                      {conversations.filter(c => c.id !== activeConvId).map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                  )}
                </div>
              </label>
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="radio" name="instMode" checked={convInstMode === "custom"} onChange={() => setConvInstMode("custom")} className="accent-emerald-500 mt-0.5" />
                <div className="flex-1">
                  <span className="text-xs text-white/45">{t("customInst", lang)}</span>
                  {convInstMode === "custom" && (
                    <textarea
                      value={convCustomInst}
                      onChange={(e) => setConvCustomInst(e.target.value)}
                      placeholder={t("instPlaceholder", lang)}
                      rows={3}
                      className="mt-1.5 w-full bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-xs text-white/80 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  )}
                </div>
              </label>
              <button
                onClick={saveConvInstructions}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded bg-white/15 hover:bg-zinc-600 text-white/80 transition-colors"
              >
                {instSaved ? <><Check size={10} className="text-white" /> {t("saved", lang)}</> : t("save", lang)}
              </button>
            </section>
          </div>
        )}

        {/* HELP VIEW */}
        {panel === "help" && <HelpPanel lang={lang} />}

        {/* FORWARD VIEW */}
        {panel === "forward" && forwardMsg && (
          <div className="flex-1 overflow-auto p-4">
            <div className="text-xs text-white/35 mb-3 flex items-center gap-1">
              <CornerUpRight size={10} className="text-white/60" />
              {t("forwardHint", lang)}
            </div>
            <div className={`mb-4 rounded px-3 py-2 border text-xs ${
              forwardMsg.role === "user"
                ? "bg-white/10 border-white/15 text-white/65"
                : "bg-white/[0.06] border-white/10 text-white/45"
            }`}>
              <div className="text-white/22 mb-1">{forwardMsg.role === "user" ? t("you", lang) : "ai"}</div>
              <div className="line-clamp-4 whitespace-pre-wrap">{forwardMsg.content}</div>
            </div>
            <div className="space-y-3">
              {conversations.map((conv) => {
                const targets = conv.branches.filter((b) => b.id !== activeBranchId);
                if (!targets.length) return null;
                return (
                  <div key={conv.id}>
                    <div className="text-[10px] text-white/22 mb-1 uppercase tracking-wider">{conv.title}</div>
                    <div className="space-y-0.5">
                      {targets.map((br) => (
                        <button
                          key={br.id}
                          onClick={() => doForward(br.id)}
                          className="w-full text-left flex items-center gap-1.5 px-2 py-1.5 rounded border border-white/10 text-xs text-white/45 hover:border-white/25 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
                        >
                          <GitBranch size={9} className="text-white/22 shrink-0" />
                          <span className="truncate">{br.name}</span>
                          {br.forkedFromPreview && (
                            <span className="text-white/14 truncate italic text-[10px] ml-1">"{br.forkedFromPreview}…"</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TREE VIEW */}
        {panel === "tree" && (
          <TreePanel
            branches={treeBranches}
            activeBranchId={activeBranchId}
            onSelectBranch={(id) => {
              setActiveBranchId(id);
              setPanel("chat");
            }}
          />
        )}

        {/* CHAT VIEW */}
        {panel === "chat" && (
          <>
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {!activeBranchId && (
                <div className="flex flex-col items-center justify-center h-full text-white/22 gap-3">
                  <GitBranch size={36} className="text-white/14" />
                  <span className="text-xs">Create or select a conversation</span>
                </div>
              )}

              {messages.map((msg, idx) => (
                <div key={`wrapper-${msg.id}`}>
                {msg.isCheckpoint && idx > 0 && (
                  <div className="flex items-center gap-2 my-1 px-1">
                    <div className="flex-1 h-px bg-amber-500/20" />
                    <span className="text-[9px] text-white/30 shrink-0">↑ {lang === "en" ? "not sent to AI" : "не отправляется в ИИ"}</span>
                    <div className="flex-1 h-px bg-amber-500/20" />
                  </div>
                )}
                <div
                  key={msg.id}
                  data-msg-id={msg.id}
                  data-msg-role={msg.role}
                  onClick={() => setSelectedMsgIdx(idx === selectedMsgIdx ? null : idx)}
                  className={`group relative cursor-pointer rounded-lg px-4 py-3 transition-all ${
                    msg.role === "user"
                      ? "ml-10 bg-white/10 text-white"
                      : "mr-10 bg-white/[0.06] border border-white/10 text-white/80"
                  } ${
                    selectedMsgIdx === idx
                      ? "ring-1 ring-white/20"
                      : "hover:ring-1 hover:ring-white/15"
                  }`}
                >
                  {msg.isCheckpoint && msg.checkpointSummary && (
                    <div className="mb-2 rounded border border-white/12 bg-white/[0.03] overflow-hidden">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-white/[0.05]">
                        <BookmarkCheck size={10} className="text-white shrink-0" />
                        <span className="text-[10px] font-medium text-white">{t("checkpoint", lang)}</span>
                        <span className="text-[10px] text-white/30 ml-auto">{t("checkpointHint", lang)}</span>
                      </div>
                      <details className="group">
                        <summary className="cursor-pointer text-[10px] text-white/30 hover:text-white/50 px-2 py-1 select-none list-none flex items-center gap-1">
                          <ChevronDown size={9} className="group-open:rotate-180 transition-transform" />
                          {t("showSummary", lang)}
                        </summary>
                        <div className="px-2 pb-2 text-[11px] text-white/35 leading-relaxed whitespace-pre-wrap">
                          {msg.checkpointSummary}
                        </div>
                      </details>
                    </div>
                  )}
                  {msg.forwardedFrom && (
                    <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1.5 border-l-2 border-sky-600/30 pl-1.5">
                      <CornerUpRight size={8} />
                      <span className="truncate">из {msg.forwardedFrom}</span>
                    </div>
                  )}
                  {msg.replyToId && (() => {
                    const quoted = messages.find(m => m.id === msg.replyToId);
                    return quoted ? (
                      <div className="text-[10px] text-white/22 bg-white/[0.08] border-l-2 border-white/20 pl-2 pr-2 py-1 mb-1.5 rounded-r line-clamp-2">
                        <span className="text-white/35">{quoted.role === "user" ? t("you", lang) + ": " : "ai: "}</span>
                        {quoted.content.slice(0, 120)}{quoted.content.length > 120 ? "…" : ""}
                      </div>
                    ) : null;
                  })()}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-white/35">{msg.role === "user" ? t("you", lang) : "ai"}</span>
                    {msg.tag && (() => {
                      const c = TAG_COLORS.find(x => x.id === msg.tagColor) ?? TAG_COLORS[0];
                      return (
                        <button
                          onClick={(e) => { e.stopPropagation(); setTagEdit({ msgId: msg.id, label: msg.tag!, color: msg.tagColor ?? "amber" }); }}
                          className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded ${c.cls} hover:opacity-80 transition-opacity`}
                        >
                          <Tag size={8} /> {msg.tag}
                        </button>
                      );
                    })()}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyMessage(msg); }}
                      title="copy"
                      className="ml-auto opacity-0 group-hover:opacity-100 p-0.5 text-white/22 hover:text-white/65 transition-all"
                    >
                      {copiedId === msg.id ? <Check size={10} className="text-white" /> : <Copy size={10} />}
                    </button>
                  </div>
                  {msg.role === "assistant" && renderMode === "md" ? (
                    <div className="prose prose-sm prose-invert max-w-none leading-relaxed">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
                  )}

                  {selectedMsgIdx === idx && (
                    <div className="absolute -bottom-9 right-0 flex gap-1 z-10 flex-wrap justify-end">
                      <button onClick={(e) => { e.stopPropagation(); tagMessage(idx); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 hover:border-white/40 hover:text-white transition-colors">
                        <Tag size={9} /> {t("tag", lang)}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setReplyToMsg(msg); setSelectedMsgIdx(null); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 hover:border-white/40 hover:text-white/80 transition-colors">
                        <Reply size={9} /> {t("reply", lang)}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); rollbackTo(idx); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 hover:border-white/40 hover:text-white transition-colors">
                        <RotateCcw size={9} /> {t("rollback", lang)}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); forkFrom(idx); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 hover:border-white/50 hover:text-white transition-colors">
                        <GitFork size={9} /> {t("fork", lang)}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); extractFrom(idx); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 hover:border-white/40 hover:text-white transition-colors">
                        <Scissors size={9} /> {t("extract", lang)}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); openForward(idx); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 hover:border-white/40 hover:text-white transition-colors">
                        <CornerUpRight size={9} /> {t("forward", lang)}
                      </button>
                      {msg.role === "assistant" && !msg.isCheckpoint && (
                        <button
                          onClick={(e) => { e.stopPropagation(); createCheckpoint(msg.id); }}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 hover:border-white/40 hover:text-white transition-colors"
                        >
                          {checkpointingId === msg.id
                            ? <><Loader2 size={9} className="animate-spin" /> {t("checkpointing", lang)}</>
                            : <><BookmarkCheck size={9} /> {t("checkpoint", lang)}</>}
                        </button>
                      )}
                      {msg.isCheckpoint && (
                        <button
                          onClick={(e) => { e.stopPropagation(); removeCheckpoint(msg.id); }}
                          className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-white/[0.06] border border-white/15 text-amber-600 hover:border-white/40 hover:text-white transition-colors"
                        >
                          <BookmarkCheck size={9} /> {t("removeCheckpoint", lang)}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Inline tag editor */}
                  {tagEdit?.msgId === msg.id && (
                    <div className="absolute -bottom-20 right-0 z-20 bg-white/[0.06] border border-white/15 rounded-lg p-2 flex flex-col gap-2 shadow-xl" onClick={(e) => e.stopPropagation()}>
                      <input
                        autoFocus
                        value={tagEdit.label}
                        onChange={(e) => setTagEdit({ ...tagEdit, label: e.target.value })}
                        onKeyDown={(e) => { if (e.key === "Enter") saveTagEdit(); if (e.key === "Escape") setTagEdit(null); }}
                        placeholder={t("tagLabel", lang)}
                        className="bg-white/10 border border-white/15 rounded px-2 py-1 text-xs text-white/80 focus:outline-none focus:border-zinc-500 w-40"
                      />
                      <div className="flex items-center gap-1">
                        {TAG_COLORS.map((c) => (
                          <button key={c.id} onClick={() => setTagEdit({ ...tagEdit, color: c.id })} className={`w-4 h-4 rounded-full ${c.cls} ${tagEdit.color === c.id ? "ring-2 ring-white/40" : ""}`} title={c.label[lang]} />
                        ))}
                        <button onClick={() => removeTag(tagEdit.msgId)} className="ml-auto text-[10px] text-white/60 hover:text-white/85">{t("remove", lang)}</button>
                        <button onClick={saveTagEdit} className="text-[10px] text-white hover:text-emerald-300">{t("ok", lang)}</button>
                      </div>
                    </div>
                  )}
                </div>
                </div>
              ))}

              {loading && (
                <div className="mr-10 bg-white/[0.06] border border-white/10 rounded-lg px-4 py-3 flex items-center gap-2 text-white/35 text-xs">
                  <Loader2 size={11} className="animate-spin" /> thinking…
                </div>
              )}

              <div ref={bottomRef} className="h-10" />
            </div>

            {activeBranchId && (
              <div className="border-t border-white/10 p-3">
                {replyToMsg && (
                  <div className="flex items-start gap-2 mb-2 bg-white/[0.07] border border-white/15 rounded-lg px-3 py-2">
                    <Reply size={11} className="text-white/35 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white/35 mb-0.5">{replyToMsg.role === "user" ? "Вы" : "AI"}</div>
                      <div className="text-[11px] text-white/45 truncate">{replyToMsg.content.slice(0, 100)}{replyToMsg.content.length > 100 ? "…" : ""}</div>
                    </div>
                    <button onClick={() => setReplyToMsg(null)} className="text-white/22 hover:text-white/45 transition-colors shrink-0">
                      <X size={11} />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
                    }}
                    placeholder={t("msgPlaceholder", lang)}
                    rows={1}
                    className="flex-1 bg-white/[0.06] border border-white/15 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500 transition-colors"
                    style={{ maxHeight: "140px" }}
                    onInput={(e) => {
                      const t = e.currentTarget;
                      t.style.height = "auto";
                      t.style.height = t.scrollHeight + "px";
                    }}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || !input.trim()}
                    className="shrink-0 p-2 rounded-lg bg-white hover:bg-white/85 text-black disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send size={13} />
                  </button>
                </div>
                <div className="mt-1.5 text-[10px] text-white/14 flex flex-wrap gap-x-3 gap-y-0.5">
                  <span>click msg →</span>
                  <span className="text-white/35"><Tag size={8} className="inline" /> tag</span>
                  <span className="text-white/35"><RotateCcw size={8} className="inline" /> rollback</span>
                  <span className="text-white/35"><GitFork size={8} className="inline" /> fork</span>
                  <span className="text-white/22">hover branch →</span>
                  <span className="text-white/40"><GitCompare size={8} className="inline" /> diff</span>
                  <span className="text-white/35"><PackagePlus size={8} className="inline" /> cherry-pick</span>
                  <span className="text-white/35"><GitMerge size={8} className="inline" /> merge</span>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating selection reply button */}
      {selectionReply && (
        <div
          style={{ position: "fixed", left: selectionReply.x, top: selectionReply.y - 38, transform: "translateX(-50%)", zIndex: 9999 }}
          onMouseDown={(e) => {
            e.preventDefault();
            setReplyToMsg({ id: selectionReply.msgId, role: "assistant", content: selectionReply.text });
            setSelectionReply(null);
            window.getSelection()?.removeAllRanges();
          }}
          className="bg-white/10 border border-white/20 rounded-lg px-2.5 py-1.5 text-[11px] flex items-center gap-1.5 cursor-pointer hover:bg-white/15 text-white/80 shadow-xl select-none"
        >
          <Reply size={10} className="text-white/45" />
          {t("replyToSelection", lang)}
        </div>
      )}
    </div>
  );
}
