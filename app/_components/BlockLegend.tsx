"use client";

import { useState } from "react";
import { track } from "@vercel/analytics";
import type { MinecraftBlock } from "../_lib/blocks";
import BlockPickerModal, { BlockIcon } from "./BlockPickerModal";

interface Props {
  blockGrid: MinecraftBlock[][];
  onReplaceBlock?: (fromId: string, toBlock: MinecraftBlock) => void;
}

export default function BlockLegend({ blockGrid, onReplaceBlock }: Props) {
  const [replacingBlockId, setReplacingBlockId] = useState<string | null>(null);

  if (blockGrid.length === 0) return null;

  const counts = new Map<string, { block: MinecraftBlock; count: number }>();
  for (const row of blockGrid) {
    for (const block of row) {
      if (block.id === "minecraft:air") continue;
      const existing = counts.get(block.id);
      if (existing) {
        existing.count++;
      } else {
        counts.set(block.id, { block, count: 1 });
      }
    }
  }

  const sorted = Array.from(counts.values()).sort((a, b) => b.count - a.count);
  const total = sorted.reduce((s, e) => s + e.count, 0);

  const replacingBlock = replacingBlockId
    ? sorted.find(({ block }) => block.id === replacingBlockId)?.block
    : undefined;

  const handleDownloadCsv = () => {
    const header = "Block Name,Block ID,Count,Percentage";
    const rows = sorted.map(({ block, count }) =>
      `"${block.name}","${block.id}",${count},${((count / total) * 100).toFixed(2)}%`
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "material-list.csv";
    a.click();
    URL.revokeObjectURL(url);
    track("CSV Exported", { unique_blocks: sorted.length, total_blocks: total });
  };

  return (
    <div className="flex flex-col">
      <div className="px-4 py-2 border-b border-zinc-800 flex-shrink-0 flex items-center justify-between gap-2">
        <p className="text-xs text-zinc-500">
          {sorted.length} types · {total.toLocaleString()} blocks
        </p>
        <button
          onClick={handleDownloadCsv}
          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-green-500 active:scale-95 transition-all"
          title="Download as CSV"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>
      <div className="divide-y divide-zinc-800">
        {sorted.map(({ block, count }) => (
          <div key={block.id} className="flex items-center gap-3 px-4 py-2.5">
            <BlockIcon block={block} size={20} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-200 font-medium truncate">{block.name}</p>
              <p className="text-xs text-zinc-500 truncate">{block.id}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-zinc-200">{count.toLocaleString()}</p>
              <p className="text-xs text-zinc-500">{((count / total) * 100).toFixed(1)}%</p>
            </div>
            {onReplaceBlock && (
              <button
                onClick={() => setReplacingBlockId(block.id)}
                className="flex-shrink-0 rounded-lg border border-zinc-700 px-2 py-1 text-[10px] font-medium text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-colors"
                title={`Replace all ${block.name}`}
              >
                Replace
              </button>
            )}
          </div>
        ))}
      </div>

      {replacingBlockId && replacingBlock && onReplaceBlock && (
        <BlockPickerModal
          title={`Replace ${replacingBlock.name}`}
          initialCategory={replacingBlock.category}
          onSelect={(toBlock) => {
            onReplaceBlock(replacingBlockId, toBlock);
            setReplacingBlockId(null);
          }}
          onClose={() => setReplacingBlockId(null)}
        />
      )}
    </div>
  );
}
