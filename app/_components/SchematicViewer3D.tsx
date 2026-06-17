"use client";

import { useMemo, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { track } from "@vercel/analytics";
import { MinecraftBlock } from "../_lib/blocks";
import { Orientation } from "../_lib/litematic-generator";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SchematicViewer3DProps {
  blockGrid: MinecraftBlock[][];
  orientation: Orientation;
  foundationEnabled?: boolean;
  foundationBlockId?: string;
}

interface BlockGroup {
  /** Unique key for this group — texture name, or "rgb:r,g,b" for texture-less blocks. */
  groupKey: string;
  texture: string;
  rgb: [number, number, number];
  positions: THREE.Vector3[];
  blockId: string;
  blockName: string;
}

interface HoverInfo {
  name: string;
  id: string;
  rgb: [number, number, number];
  x: number;
  y: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOUNDATION_RGB: [number, number, number] = [100, 100, 108];

// ─── Layer mode types ─────────────────────────────────────────────────────────

type LayerMode = "all" | "single" | "below" | "above";

// ─── Block group computation ──────────────────────────────────────────────────

function computeGroups(
  blockGrid: MinecraftBlock[][],
  orientation: Orientation,
  foundationEnabled: boolean,
  layerMode: LayerMode,
  activeLayer: number,
): BlockGroup[] {
  const rows = blockGrid.length;
  const cols = blockGrid[0]?.length ?? 0;
  const map = new Map<string, BlockGroup>();

  const add = (
    block: { texture: string; rgb: [number, number, number]; id: string; name: string },
    x: number,
    y: number,
    z: number,
  ) => {
    const k = block.texture || `rgb:${block.rgb[0]},${block.rgb[1]},${block.rgb[2]}`;
    if (!map.has(k)) {
      map.set(k, { groupKey: k, texture: block.texture, rgb: block.rgb, positions: [], blockId: block.id, blockName: block.name });
    }
    map.get(k)!.positions.push(new THREE.Vector3(x, y, z));
  };

  if (orientation === "vertical") {
    // Wall art on XY plane: x=col, y=rows-1-row (row 0 is top), z=0.
    // Layer N = y=N-1 (layer 1 is the bottom row at y=0).
    const isYVisible = (y: number): boolean => {
      const layer = y + 1;
      switch (layerMode) {
        case "all":    return true;
        case "single": return layer === activeLayer;
        case "below":  return layer <= activeLayer;
        case "above":  return layer >= activeLayer;
      }
    };

    for (let row = 0; row < rows; row++) {
      const y = rows - 1 - row;
      if (!isYVisible(y)) continue;
      for (let col = 0; col < cols; col++) {
        const block = blockGrid[row][col];
        if (block.id === "minecraft:air") continue;
        add(block, col, y, 0);
      }
    }
    // Foundation: a single row at y=-1 along the X axis, spanning all columns.
    if (foundationEnabled) {
      const fbk = { texture: "", rgb: FOUNDATION_RGB, id: "foundation", name: "Foundation" };
      for (let col = 0; col < cols; col++) {
        add(fbk, col, -1, 0);
      }
    }
  } else {
    // Floor art on XZ plane: x=col, z=row, y=0.
    // Layers are Y-levels: foundation at y=-1 (layer 1) and art at y=0 (layer 2 or 1).
    const minY = foundationEnabled ? -1 : 0;

    const isYVisible = (y: number): boolean => {
      const layer = y - minY + 1;
      switch (layerMode) {
        case "all":    return true;
        case "single": return layer === activeLayer;
        case "below":  return layer <= activeLayer;
        case "above":  return layer >= activeLayer;
      }
    };

    const fbk = { texture: "", rgb: FOUNDATION_RGB, id: "foundation", name: "Foundation" };
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (foundationEnabled && isYVisible(-1)) {
          add(fbk, col, -1, row);
        }
        if (isYVisible(0)) {
          const block = blockGrid[row][col];
          if (block.id !== "minecraft:air") add(block, col, 0, row);
        }
      }
    }
  }

  return Array.from(map.values());
}

// ─── InstanceGroup ────────────────────────────────────────────────────────────

function InstanceGroup({
  rgb,
  texture,
  positions,
  blockId,
  blockName,
  onHover,
}: {
  rgb: [number, number, number];
  texture: string;
  positions: THREE.Vector3[];
  blockId: string;
  blockName: string;
  onHover: (info: HoverInfo | null) => void;
}) {
  const [r, g, b] = rgb;

  const { mesh, geo, mat } = useMemo(() => {
    const geometry = new THREE.BoxGeometry(0.95, 0.95, 0.95);
    const material = new THREE.MeshLambertMaterial({
      color: new THREE.Color(r / 255, g / 255, b / 255),
    });
    const instance = new THREE.InstancedMesh(geometry, material, positions.length);
    const matrix = new THREE.Matrix4();
    positions.forEach((pos, i) => {
      matrix.makeTranslation(pos.x, pos.y, pos.z);
      instance.setMatrixAt(i, matrix);
    });
    instance.instanceMatrix.needsUpdate = true;
    return { mesh: instance, geo: geometry, mat: material };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [r, g, b, positions, texture]);

  // Load the block texture and apply it to the material
  useEffect(() => {
    if (!texture) return;
    const loader = new THREE.TextureLoader();
    loader.load(
      `/blocks/${texture}.png`,
      (tex) => {
        tex.magFilter = THREE.NearestFilter;
        tex.minFilter = THREE.NearestFilter;
        tex.colorSpace = THREE.SRGBColorSpace;
        mat.map = tex;
        mat.color.set(0xffffff);
        mat.needsUpdate = true;
      },
    );
  // mat identity is tied to the useMemo above; texture changes force a new mat via the memo key
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mat, texture]);

  // Dispose Three.js objects when they are replaced or the component unmounts
  useEffect(() => {
    return () => {
      geo.dispose();
      if (mat.map) mat.map.dispose();
      mat.dispose();
      mesh.dispose();
    };
  }, [mesh, geo, mat]);

  return (
    <primitive
      object={mesh}
      dispose={null}
      onPointerMove={(e: { stopPropagation: () => void; nativeEvent: MouseEvent }) => {
        e.stopPropagation();
        onHover({ name: blockName, id: blockId, rgb, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY });
      }}
      onPointerOut={() => onHover(null)}
    />
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({
  blockGrid,
  orientation,
  foundationEnabled,
  layerMode,
  activeLayer,
  target,
  onHover,
}: {
  blockGrid: MinecraftBlock[][];
  orientation: Orientation;
  foundationEnabled: boolean;
  layerMode: LayerMode;
  activeLayer: number;
  target: [number, number, number];
  onHover: (info: HoverInfo | null) => void;
}) {
  const cols = blockGrid[0]?.length ?? 0;
  const rows = blockGrid.length;

  const groups = useMemo(
    () => computeGroups(blockGrid, orientation, foundationEnabled, layerMode, activeLayer),
    [blockGrid, orientation, foundationEnabled, layerMode, activeLayer],
  );

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[cols, rows, rows]} intensity={1.0} />
      <directionalLight position={[-cols * 0.5, rows * 0.5, -rows * 0.5]} intensity={0.3} />
      <OrbitControls
        target={target}
        enableDamping
        dampingFactor={0.1}
        makeDefault
      />
      {groups.map((g) => (
        <InstanceGroup
          key={g.groupKey}
          rgb={g.rgb}
          texture={g.texture}
          positions={g.positions}
          blockId={g.blockId}
          blockName={g.blockName}
          onHover={onHover}
        />
      ))}
    </>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

const LAYER_MODES: { mode: LayerMode; label: string }[] = [
  { mode: "all",    label: "All"    },
  { mode: "single", label: "Single" },
  { mode: "below",  label: "Below"  },
  { mode: "above",  label: "Above"  },
];

export default function SchematicViewer3D({
  blockGrid,
  orientation,
  foundationEnabled = false,
}: SchematicViewer3DProps) {
  const rows = blockGrid.length;
  const cols = blockGrid[0]?.length ?? 0;
  // Vertical: one layer per image row (Y levels 0..rows-1).
  // Horizontal: one Y level per enabled feature — foundation at y=-1 and/or art at y=0.
  const totalLayers =
    orientation === "vertical" ? rows : foundationEnabled ? 2 : 1;

  const [layerMode, setLayerMode] = useState<LayerMode>("all");
  const [activeLayer, setActiveLayer] = useState(1);
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);

  // Reset to defaults when the total layer count changes.
  useEffect(() => {
    setLayerMode("all");
    setActiveLayer(1);
  }, [totalLayers]);

  const prevLayer = () => {
    track("3D Layer Navigated", { direction: "prev" });
    setActiveLayer((l) => (l <= 1 ? totalLayers : l - 1));
  };
  const nextLayer = () => {
    track("3D Layer Navigated", { direction: "next" });
    setActiveLayer((l) => (l >= totalLayers ? 1 : l + 1));
  };

  // Camera initial position and orbit target, computed from grid dimensions
  const { cameraPos, target } = useMemo((): {
    cameraPos: [number, number, number];
    target: [number, number, number];
  } => {
    const maxDim = Math.max(cols, rows);
    const dist = maxDim * 1.5;

    if (orientation === "vertical") {
      return {
        cameraPos: [cols / 2, rows / 2, dist],
        target: [cols / 2, rows / 2, 0],
      };
    }

    return {
      cameraPos: [cols / 2, dist * 0.8, rows * 1.5],
      target: [cols / 2, 0, rows / 2],
    };
  }, [cols, rows, orientation]);

  // Use key to remount the canvas (and reset camera) when dimensions or orientation change
  const canvasKey = `${cols}x${rows}x${orientation}`;

  return (
    <div className="relative w-full h-full bg-zinc-900 rounded-lg overflow-hidden">
      {/* 3D canvas */}
      <Canvas
        key={canvasKey}
        gl={{ antialias: true }}
        camera={{ position: cameraPos, fov: 50, near: 0.1, far: 10000 }}
        style={{ width: "100%", height: "100%" }}
      >
        <color attach="background" args={["#18181b"]} />
        <Scene
          blockGrid={blockGrid}
          orientation={orientation}
          foundationEnabled={foundationEnabled}
          layerMode={layerMode}
          activeLayer={activeLayer}
          target={target}
          onHover={setHoverInfo}
        />
      </Canvas>

      {/* Layer control overlay — hidden when there is only one layer */}
      {totalLayers > 1 && (
        <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8 bg-gradient-to-t from-zinc-950/95 to-transparent pointer-events-none">
          <div className="flex items-center justify-center gap-3 pointer-events-auto">
            {/* Mode segmented control */}
            <div className="flex rounded-md overflow-hidden border border-zinc-700">
              {LAYER_MODES.map(({ mode, label }) => (
                <button
                  key={mode}
                  onClick={() => {
                    setLayerMode(mode);
                    track("3D Layer Mode Changed", { mode });
                  }}
                  className={`px-3 py-1 text-xs font-medium transition-colors ${
                    layerMode === mode
                      ? "bg-green-600 text-white"
                      : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Layer navigator — visible when not showing all */}
            {layerMode !== "all" && (
              <div className="flex items-center gap-1">
                <button
                  onClick={prevLayer}
                  className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-sm"
                  aria-label="Previous layer"
                >
                  ←
                </button>
                <span className="text-xs text-zinc-300 tabular-nums w-20 text-center select-none">
                  Layer {activeLayer} / {totalLayers}
                </span>
                <button
                  onClick={nextLayer}
                  className="w-7 h-7 flex items-center justify-center rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-sm"
                  aria-label="Next layer"
                >
                  →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute top-3 right-3 text-[10px] text-zinc-600 leading-relaxed text-right pointer-events-none select-none">
        <p>Drag to rotate</p>
        <p>Scroll to zoom</p>
        <p>Right-drag to pan</p>
        <p>Hover to inspect</p>
      </div>

      {/* Block hover tooltip — mirrors the 2D preview style */}
      {hoverInfo && (
        <div
          className="fixed z-50 pointer-events-none rounded-lg border border-zinc-600 bg-zinc-900 px-3 py-2 text-xs shadow-xl"
          style={{ left: hoverInfo.x + 12, top: hoverInfo.y - 12 }}
        >
          <div className="flex items-center gap-2">
            <span
              className="inline-block w-3 h-3 rounded-sm flex-shrink-0 border border-zinc-600"
              style={{ backgroundColor: `rgb(${hoverInfo.rgb[0]},${hoverInfo.rgb[1]},${hoverInfo.rgb[2]})` }}
            />
            <span className="text-zinc-100 font-medium">{hoverInfo.name}</span>
          </div>
          <p className="text-zinc-500 mt-0.5">{hoverInfo.id}</p>
        </div>
      )}
    </div>
  );
}
