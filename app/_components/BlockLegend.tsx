"use client";

import type { MinecraftBlock } from "../_lib/blocks";

interface Props {
  blockGrid: MinecraftBlock[][];
}

export default function BlockLegend({ blockGrid }: Props) {
  if (blockGrid.length === 0) return null;

  // Count usage per block
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

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
        Block List — {sorted.length} types · {total.toLocaleString()} blocks
      </h3>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-700 divide-y divide-zinc-800">
        {sorted.map(({ block, count }) => (
          <div key={block.id} className="flex items-center gap-3 px-3 py-2">
            <span
              className="w-5 h-5 rounded flex-shrink-0 border border-zinc-600"
              style={{ backgroundColor: `rgb(${block.rgb[0]},${block.rgb[1]},${block.rgb[2]})` }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-200 font-medium truncate">{block.name}</p>
              <p className="text-xs text-zinc-500 truncate">{block.id}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-xs font-semibold text-zinc-200">{count.toLocaleString()}</p>
              <p className="text-xs text-zinc-500">
                {((count / total) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
