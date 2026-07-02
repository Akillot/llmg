"use client";

import {
  GitFork, GitMerge, GitCompare, GitBranch, RotateCcw, Tag, Archive,
  PackagePlus, CornerUpRight, Copy, Trash2, Network, FileText, Scissors,
  Reply, Download, MousePointer, ChevronRight,
} from "lucide-react";
import type { Lang } from "@/lib/i18n";

type B = { en: string; ru: string };
type SectionItem = { icon: React.ReactNode; name: string; label: B; desc: B; how: B };
type Section = { title: B; items: SectionItem[] };

const sections: Section[] = [
  {
    title: { en: "Messages — click to open menu", ru: "Сообщения — кликни чтобы открыть меню" },
    items: [
      {
        icon: <Tag size={11} />, name: "tag",
        label: { en: "Tag", ru: "Тег" },
        desc: { en: "Mark an important message. Click the tag to change color or remove it.", ru: "Пометить важное сообщение. Кликни на тег чтобы изменить цвет или удалить." },
        how: { en: "click message → tag", ru: "кликни сообщение → тег" },
      },
      {
        icon: <Reply size={11} />, name: "reply",
        label: { en: "Reply", ru: "Ответить" },
        desc: { en: "Reply to a specific message with a quote. The AI sees the quote as context.", ru: "Ответить на конкретное сообщение с цитатой. ИИ увидит цитату как контекст." },
        how: { en: "click message → reply", ru: "кликни сообщение → ответить" },
      },
      {
        icon: <RotateCcw size={11} />, name: "rollback",
        label: { en: "Rollback", ru: "Откат" },
        desc: { en: "Roll the branch back to this point. Later messages become invisible to the AI but stay in the database.", ru: "Вернуть ветку к этой точке. Сообщения после станут невидимы для ИИ — но останутся в базе." },
        how: { en: "click message → rollback", ru: "кликни сообщение → откат" },
      },
      {
        icon: <GitFork size={11} />, name: "fork",
        label: { en: "Fork", ru: "Форк" },
        desc: { en: "Create a branch with full history up to this point. The AI remembers everything before.", ru: "Создать ветку с полной историей до этой точки. ИИ помнит всё что было." },
        how: { en: "click message → fork", ru: "кликни сообщение → форк" },
      },
      {
        icon: <Scissors size={11} />, name: "extract",
        label: { en: "Extract topic", ru: "Извлечь тему" },
        desc: { en: "A clean branch starts from this message. The AI has no prior context — perfect for isolating a topic.", ru: "Чистая ветка начинается с этого сообщения. ИИ не видит предысторию — идеально для изоляции темы." },
        how: { en: "click message → extract", ru: "кликни сообщение → извлечь" },
      },
      {
        icon: <CornerUpRight size={11} />, name: "forward",
        label: { en: "Forward", ru: "Переслать" },
        desc: { en: "Send this message to any other branch or chat.", ru: "Отправить сообщение в любую другую ветку или чат." },
        how: { en: "click message → forward", ru: "кликни сообщение → переслать" },
      },
      {
        icon: <Copy size={11} />, name: "copy",
        label: { en: "Copy", ru: "Копировать" },
        desc: { en: "Copy the message text to clipboard.", ru: "Скопировать текст сообщения в буфер обмена." },
        how: { en: "hover message → 📋 icon on the right", ru: "навести курсор → иконка 📋 справа" },
      },
    ],
  },
  {
    title: { en: "Branches — hover a branch in the sidebar", ru: "Ветки — навести на ветку в сайдбаре" },
    items: [
      {
        icon: <GitCompare size={11} />, name: "diff",
        label: { en: "Diff", ru: "Разница" },
        desc: { en: "Compare two parallel conversations. Shows what's shared and what's unique.", ru: "Сравнить два параллельных разговора. Покажет общие и уникальные сообщения." },
        how: { en: "hover branch → blue icon", ru: "навести на ветку → синяя иконка" },
      },
      {
        icon: <PackagePlus size={11} />, name: "cherry-pick",
        label: { en: "Cherry-pick", ru: "Взять сообщение" },
        desc: { en: "Copy any individual message from another branch into the current one.", ru: "Скопировать любое отдельное сообщение из другой ветки в текущую." },
        how: { en: "hover branch → purple icon", ru: "навести на ветку → фиолетовая иконка" },
      },
      {
        icon: <GitMerge size={11} />, name: "merge",
        label: { en: "Merge", ru: "Объединить" },
        desc: { en: "The AI synthesizes both branches into a single coherent response.", ru: "ИИ синтезирует обе ветки в единый связный ответ." },
        how: { en: "hover branch → orange icon", ru: "навести на ветку → оранжевая иконка" },
      },
      {
        icon: <Trash2 size={11} />, name: "delete",
        label: { en: "Delete", ru: "Удалить" },
        desc: { en: "Delete the branch. If it's the last one — the entire chat is deleted.", ru: "Удалить ветку. Если это последняя ветка — весь чат удалится." },
        how: { en: "hover branch → red trash icon", ru: "навести на ветку → красная корзина" },
      },
    ],
  },
  {
    title: { en: "Stash — bottom of sidebar", ru: "Стэш — внизу сайдбара" },
    items: [
      {
        icon: <Archive size={11} />, name: "stash save",
        label: { en: "Save", ru: "Сохранить" },
        desc: { en: "Save the current branch state with a name. Come back any time.", ru: "Сохранить текущее состояние ветки под именем. Можно вернуться в любой момент." },
        how: { en: "+ stash save", ru: "+ сохранить стэш" },
      },
      {
        icon: <Archive size={11} />, name: "stash pop",
        label: { en: "Restore", ru: "Восстановить" },
        desc: { en: "Restore the branch to the saved point.", ru: "Вернуть ветку к сохранённой точке." },
        how: { en: "↑ icon next to stash entry", ru: "иконка ↑ рядом со стэшем" },
      },
    ],
  },
  {
    title: { en: "Panels — toolbar buttons at top", ru: "Панели — кнопки в шапке" },
    items: [
      {
        icon: <Network size={11} />, name: "tree",
        label: { en: "Tree", ru: "Дерево" },
        desc: { en: "Graph of all branches and messages. Forks are shown as green connecting lines.", ru: "Граф всех веток и сообщений. Форки показаны зелёными соединительными линиями." },
        how: { en: "tree button in toolbar", ru: "кнопка дерево в шапке" },
      },
      {
        icon: <FileText size={11} />, name: "md / raw",
        label: { en: "Markdown / Raw", ru: "Markdown / Текст" },
        desc: { en: "Switch AI response rendering: formatted Markdown or plain text.", ru: "Переключить рендеринг ответов ИИ: красивый Markdown или сырой текст." },
        how: { en: "md/raw button in toolbar", ru: "кнопка md/текст в шапке" },
      },
      {
        icon: <Download size={11} />, name: "export",
        label: { en: "Export", ru: "Экспорт" },
        desc: { en: "Download the entire chat with all branches as JSON and Markdown. Can be uploaded to GitHub.", ru: "Скачать весь чат со всеми ветками в JSON и Markdown. Можно загрузить на GitHub." },
        how: { en: "↓ button in sidebar header", ru: "кнопка ↓ в шапке сайдбара" },
      },
    ],
  },
];

type Scenario = { emoji: string; title: B; steps: B[] };

const scenarios: Scenario[] = [
  {
    emoji: "🎮",
    title: { en: "Topic drift mid-chat", ru: "Смена темы в середине чата" },
    steps: [
      { en: "Started discussing a Python game", ru: "Начал обсуждать игру на Python" },
      { en: "Conversation drifted into creativity", ru: "Разговор зашёл в творчество" },
      { en: "Click the message about creativity → extract", ru: "Кликни на сообщение о творчестве → извлечь" },
      { en: "Get a clean branch only about creativity", ru: "Получаешь чистую ветку только о творчестве" },
      { en: "AI doesn't know about Python — clean context", ru: "ИИ не знает про Python — чистый контекст" },
    ],
  },
  {
    emoji: "🔀",
    title: { en: "Try two approaches", ru: "Попробовать два подхода" },
    steps: [
      { en: "AI suggested solution A", ru: "ИИ предложил решение A" },
      { en: "Click that message → fork", ru: "Кликни на это сообщение → форк" },
      { en: "Continue with solution A in the main branch", ru: "В основной ветке продолжай с решением A" },
      { en: "Ask for alternative B in the fork", ru: "В форке попроси альтернативу B" },
      { en: "Use diff to compare both paths", ru: "Используй diff чтобы сравнить оба пути" },
    ],
  },
  {
    emoji: "⏪",
    title: { en: "AI went off track — reset", ru: "ИИ 'поехал' — сбросить" },
    steps: [
      { en: "AI started giving bad answers", ru: "ИИ начал давать плохие ответы" },
      { en: "Find the last good message", ru: "Найди последнее хорошее сообщение" },
      { en: "Click → rollback", ru: "Кликни → откат" },
      { en: "Branch resets — continue from a clean spot", ru: "Ветка откатится — продолжай с чистого места" },
    ],
  },
];

const TAG_COLORS: { id: string; label: B; cls: string }[] = [
  { id: "amber",   label: { en: "Yellow",  ru: "Жёлтый"     }, cls: "bg-amber-400/20 text-amber-300" },
  { id: "blue",    label: { en: "Blue",    ru: "Синий"       }, cls: "bg-blue-400/20 text-blue-300" },
  { id: "emerald", label: { en: "Green",   ru: "Зелёный"     }, cls: "bg-emerald-400/20 text-emerald-300" },
  { id: "red",     label: { en: "Red",     ru: "Красный"     }, cls: "bg-red-400/20 text-red-300" },
  { id: "violet",  label: { en: "Purple",  ru: "Фиолетовый"  }, cls: "bg-violet-400/20 text-violet-300" },
];

export { TAG_COLORS };

export default function HelpPanel({ lang }: { lang: Lang }) {
  const l = lang;
  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-6 space-y-8">

        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitBranch size={16} className="text-emerald-400" />
            <h1 className="text-base font-bold text-zinc-100">llmg — {l === "en" ? "Git for AI chats" : "Git для AI-чатов"}</h1>
          </div>
          <p className="text-xs text-zinc-500">
            {l === "en"
              ? "Every message is a commit. Every branch is an isolated context. The AI only sees its own branch history."
              : "Каждое сообщение — коммит. Каждая ветка — изолированный контекст. ИИ видит только историю своей ветки."}
          </p>
        </div>

        {/* Scenarios */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            {l === "en" ? "Usage examples" : "Примеры использования"}
          </h2>
          <div className="space-y-3">
            {scenarios.map((s) => (
              <div key={s.title.en} className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{s.emoji}</span>
                  <span className="text-xs font-medium text-zinc-200">{s.title[l]}</span>
                </div>
                <ol className="space-y-0.5">
                  {s.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-[11px] text-zinc-500">
                      <ChevronRight size={9} className="mt-0.5 shrink-0 text-zinc-700" />
                      {step[l]}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>

        {/* Sections */}
        {sections.map((section) => (
          <div key={section.title.en}>
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <MousePointer size={9} /> {section.title[l]}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => (
                <div key={item.name} className="flex items-start gap-3 rounded-md px-3 py-2 hover:bg-zinc-800/40 transition-colors">
                  <span className="text-zinc-500 mt-0.5 shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-zinc-200">{item.label[l]}</span>
                      <code className="text-[10px] text-zinc-600 bg-zinc-800 px-1 rounded">{item.name}</code>
                    </div>
                    <p className="text-[11px] text-zinc-500 leading-relaxed">{item.desc[l]}</p>
                    <p className="text-[10px] text-zinc-700 mt-0.5">→ {item.how[l]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Tag colors reference */}
        <div>
          <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            {l === "en" ? "Tag colors" : "Цвета тегов"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {TAG_COLORS.map((c) => (
              <span key={c.id} className={`text-[11px] px-2 py-0.5 rounded ${c.cls}`}>
                {c.label[l]}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-zinc-600 mt-2">
            {l === "en" ? "Click a tag on any message to change its color or label." : "Кликни на тег в сообщении чтобы изменить цвет или метку."}
          </p>
        </div>

      </div>
    </div>
  );
}
