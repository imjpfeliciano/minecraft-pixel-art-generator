"use client";

import { useCallback, useState } from "react";

interface Props {
  onImageSelected: (file: File, previewUrl: string) => void;
}

export default function ImageUpload({ onImageSelected }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback(
    (file: File) => {
      const url = URL.createObjectURL(file);
      onImageSelected(file, url);
    },
    [onImageSelected]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <label
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`
        relative flex flex-col items-center justify-center gap-3
        rounded-2xl border-2 border-dashed p-10 cursor-pointer
        transition-colors select-none
        ${dragging
          ? "border-green-400 bg-green-950/30"
          : "border-zinc-600 bg-zinc-900 hover:border-zinc-400 hover:bg-zinc-800"
        }
      `}
    >
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onInputChange}
      />
      <svg
        className={`w-12 h-12 ${dragging ? "text-green-400" : "text-zinc-500"}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
      <div className="text-center">
        <p className="text-sm font-semibold text-zinc-200">
          Drop an image here
        </p>
        <p className="text-xs text-zinc-500 mt-1">or click to browse — PNG, JPG, WEBP, GIF</p>
      </div>
    </label>
  );
}
