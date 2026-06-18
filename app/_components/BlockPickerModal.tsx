"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BLOCK_CATEGORIES, MINECRAFT_BLOCKS, MinecraftBlock } from "../_lib/blocks";

export function BlockIcon({
  block,
  size = 20,
  className = "",
}: {
  block: MinecraftBlock;
  size?: number;
  className?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const showTexture = block.texture && !imgError;

  return (
    <span
      className={`inline-block flex-shrink-0 rounded border border-zinc-600 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      {showTexture ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`/blocks/${block.texture}.png`}
          alt=""
          width={size}
          height={size}
          className="w-full h-full object-cover"
          style={{ imageRendering: "pixelated" }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span
          className="block w-full h-full"
          style={{
            backgroundColor: `rgb(${block.rgb[0]},${block.rgb[1]},${block.rgb[2]})`,
          }}
        />
      )}
    </span>
  );
}

interface BlockPickerModalProps {
  onSelect: (block: MinecraftBlock) => void;
  onClose: () => void;
  initialCategory?: string;
  title?: string;
}

export default function BlockPickerModal({
  onSelect,
  onClose,
  initialCategory,
  title = "Choose block",
}: BlockPickerModalProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(initialCategory ?? BLOCK_CATEGORIES[0] ?? "");

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return MINECRAFT_BLOCKS.filter((b) => {
      if (b.category !== category) return false;
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.id.toLowerCase().includes(q)
      );
    });
  }, [category, search]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex flex-col w-full max-w-lg max-h-[80vh] rounded-xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <h3 className="text-sm font-semibold text-zinc-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-200 transition-colors"
            title="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-4 py-2 border-b border-zinc-800 flex-shrink-0">
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search blocks…"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-green-500 focus:outline-none"
          />
        </div>

        <div className="flex gap-1 px-4 py-2 border-b border-zinc-800 overflow-x-auto flex-shrink-0">
          {BLOCK_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-green-600/20 text-green-400 border border-green-600/50"
                  : "text-zinc-400 hover:text-zinc-200 border border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 min-h-0">
          {filtered.length === 0 ? (
            <p className="text-xs text-zinc-500 text-center py-8">No blocks match your search.</p>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
              {filtered.map((block) => (
                <button
                  key={block.id}
                  onClick={() => onSelect(block)}
                  className="flex flex-col items-center gap-1 rounded-lg border border-zinc-800 bg-zinc-950 p-2 hover:border-green-600/50 hover:bg-zinc-800 transition-colors"
                  title={block.name}
                >
                  <BlockIcon block={block} size={32} />
                  <span className="text-[10px] text-zinc-400 text-center leading-tight line-clamp-2">
                    {block.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
