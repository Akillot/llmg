"use client";

import { GitBranch, Tag } from "lucide-react";

type TreeMessage = {
  id: string;
  role: string;
  content: string;
  tag: string | null;
};

export type TreeBranchData = {
  id: string;
  name: string;
  headMessageId: string | null;
  forkedFromMsgId: string | null;
  messages: TreeMessage[];
};

// Layout constants
const BW = 176; // branch column width
const BG = 28;  // gap between columns
const NH = 62;  // node height
const NG = 10;  // node gap
const HH = 44;  // header height
const PT = 12;  // padding top
const PL = 16;  // padding left

function branchX(bi: number) {
  return PL + bi * (BW + BG);
}

export default function TreePanel({
  branches,
  activeBranchId,
  onSelectBranch,
}: {
  branches: TreeBranchData[];
  activeBranchId: string | null;
  onSelectBranch: (id: string) => void;
}) {
  if (!branches.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-white/22 text-xs">
        no branches
      </div>
    );
  }

  // message id → {branch index, message index within branch}
  const msgMap = new Map<string, { bi: number; mi: number }>();
  branches.forEach((b, bi) => {
    b.messages.forEach((m, mi) => msgMap.set(m.id, { bi, mi }));
  });

  // Y slot offset per branch: forked branch starts at slot (forkSrc slot + 1)
  // so messages line up with what happened after the fork point
  const yOff = new Array(branches.length).fill(0);
  branches.forEach((b, bi) => {
    if (b.forkedFromMsgId) {
      const src = msgMap.get(b.forkedFromMsgId);
      if (src) yOff[bi] = yOff[src.bi] + src.mi + 1;
    }
  });

  function nodeTop(bi: number, mi: number) {
    return HH + PT + (yOff[bi] + mi) * (NH + NG);
  }

  const maxSlot = Math.max(...branches.map((b, bi) => yOff[bi] + b.messages.length), 1);
  const totalW = PL + branches.length * (BW + BG);
  const totalH = HH + PT + maxSlot * (NH + NG) + 40;

  return (
    <div className="flex-1 overflow-auto p-4">
      <div style={{ position: "relative", width: totalW, height: totalH }}>
        {/* SVG connection lines */}
        <svg
          style={{ position: "absolute", top: 0, left: 0, width: totalW, height: totalH, pointerEvents: "none", overflow: "visible" }}
        >
          {/* Within-branch vertical connectors */}
          {branches.map((branch, bi) =>
            branch.messages.slice(0, -1).map((_, mi) => {
              const cx = branchX(bi) + BW / 2;
              return (
                <line
                  key={`vl-${bi}-${mi}`}
                  x1={cx} y1={nodeTop(bi, mi) + NH}
                  x2={cx} y2={nodeTop(bi, mi + 1)}
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth={1.5}
                />
              );
            })
          )}

          {/* Fork connection: L-shaped line from fork point to first node of forked branch */}
          {branches.map((branch, bi) => {
            if (!branch.forkedFromMsgId || !branch.messages.length) return null;
            const src = msgMap.get(branch.forkedFromMsgId);
            if (!src) return null;

            const srcCx = branchX(src.bi) + BW / 2;
            const srcBottomY = nodeTop(src.bi, src.mi) + NH;
            const dstCx = branchX(bi) + BW / 2;
            const dstTopY = nodeTop(bi, 0);
            const midY = (srcBottomY + dstTopY) / 2;

            return (
              <path
                key={`fork-${bi}`}
                d={`M ${srcCx} ${srcBottomY} L ${srcCx} ${midY} L ${dstCx} ${midY} L ${dstCx} ${dstTopY}`}
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={1.5}
                fill="none"
                opacity={1}
              />
            );
          })}
        </svg>

        {/* Branch columns */}
        {branches.map((branch, bi) => {
          const x = branchX(bi);
          const isActive = branch.id === activeBranchId;

          return (
            <div key={branch.id} style={{ position: "absolute", left: x, top: 0, width: BW }}>
              {/* Branch header */}
              <button
                onClick={() => onSelectBranch(branch.id)}
                style={{ position: "absolute", top: 4, height: HH - 8, width: BW }}
                className={`flex items-center gap-1.5 px-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-white/10 text-white border border-white/20"
                    : "bg-white/[0.07] text-white/45 border border-white/[0.07] hover:border-white/20 hover:text-white/65"
                }`}
              >
                <GitBranch size={9} className={isActive ? "text-white" : "text-white/35"} />
                <span className="flex-1 text-left truncate">{branch.name}</span>
                {isActive && <span className="text-[9px] text-white/30">HEAD</span>}
              </button>

              {/* Message nodes */}
              {branch.messages.map((msg, mi) => {
                const isHead = msg.id === branch.headMessageId;
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    style={{ position: "absolute", top: nodeTop(bi, mi), width: BW, height: NH }}
                    className={`rounded border px-2 py-1.5 text-[10px] leading-tight ${
                      isUser
                        ? "bg-white/10 border-white/15 text-white/65"
                        : "bg-white/[0.06] border-white/10 text-white/45"
                    } ${isHead ? "ring-1 ring-white/20" : ""}`}
                  >
                    <div className="flex items-center gap-1 mb-0.5">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isHead ? "bg-white" : isUser ? "bg-zinc-500" : "bg-white/15"
                        }`}
                      />
                      <span className="text-white/22">{isUser ? "you" : "ai"}</span>
                      {msg.tag && (
                        <span className="flex items-center gap-0.5 text-white/35 ml-1">
                          <Tag size={7} />
                          <span className="truncate max-w-[50px]">{msg.tag}</span>
                        </span>
                      )}
                      {isHead && <span className="ml-auto text-[9px] text-white/30">head</span>}
                    </div>
                    <div className="text-white/45 line-clamp-2 leading-relaxed">
                      {msg.content.slice(0, 90)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
