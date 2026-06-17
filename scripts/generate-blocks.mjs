/**
 * Phase 2 of `sync-blocks`: Read the texture inventory produced by
 * download-block-textures.mjs and generate app/_lib/blocks.ts.
 *
 * Usage:
 *   node scripts/generate-blocks.mjs
 *
 * Input:  scripts/generated-blocks.json
 * Output: app/_lib/blocks.ts (overwritten)
 */

import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_JSON = path.join(__dirname, "generated-blocks.json");
const OUTPUT_TS = path.join(__dirname, "..", "app", "_lib", "blocks.ts");

// ── Color name helpers ────────────────────────────────────────────────────────

const COLORS_16 = [
  "white", "orange", "magenta", "light_blue", "yellow", "lime",
  "pink", "gray", "light_gray", "cyan", "purple", "blue",
  "brown", "green", "red", "black",
];

const WOOD_TYPES = [
  "oak", "spruce", "birch", "jungle", "acacia", "dark_oak",
  "mangrove", "cherry", "bamboo", "crimson", "warped", "pale_oak",
];

// ── Alpha threshold: textures with average alpha below this are non-solid ─────
//
// Leaves, wheat, saplings, mushrooms, coral fans, plants, etc. all have
// significant transparent pixels. Fully opaque blocks (stone, concrete, wool)
// have avgAlpha ≈ 255. We use 230 as the cutoff to allow for minor edge AA.

const MIN_AVG_ALPHA = 230;

// ── Variance cap: textures too visually complex/patterned for pixel art ───────
//
// Blocks like glowstone (glowing spots, var≈3926), cobblestone (random noise,
// var≈865) look jarring in pixel art even when their average color is correct.
//
// Concrete: var≈0, Wool: var≈70, Stone: var≈117, Netherrack: var≈196
// Obsidian: var≈357, Prismarine dark: var≈308, Oak planks: var≈576
// Cobblestone: var≈865 → cut here
//
// Cap at 800. Anchor blocks (see below) bypass this check so that gem/mineral
// blocks like emerald (var≈1286) and diamond (var≈1043) are always included.

const MAX_TEXTURE_VARIANCE = 800;

// ── Anchor textures: the only blocks included in the final palette ────────────
//
// The palette is intentionally limited to three material groups that together
// cover the full Minecraft 16-color spectrum with three distinct textures:
//
//   • All 16 concrete colors  (var≈0, perfectly flat)
//   • All 16 wool colors      (var≈35–280, subtle weave texture)
//   • All 16 stained terracotta + plain terracotta  (var≈1–5, earthy flat)
//
// These anchor blocks bypass the variance filter AND the LAB dedup step.
// Non-anchor blocks are discarded entirely after the alpha/pattern filters.

const ANCHOR_EXACT = new Set([
  "hardened_clay", // plain (uncolored) terracotta — Bedrock texture name
]);

function isAnchorTexture(texture) {
  return (
    /^concrete_(?!powder_)/.test(texture) ||  // all 16 concrete colors
    /^wool_colored_/.test(texture) ||          // all 16 wool colors
    /^hardened_clay_stained_/.test(texture) || // all 16 stained terracotta (Bedrock)
    /^terracotta_(?=\w)/.test(texture) ||      // stained terracotta (new Bedrock names)
    ANCHOR_EXACT.has(texture)
  );
}

// ── Skip-list: texture names that do NOT represent a full solid-block face ────
//
// The alpha filter catches most transparent/non-solid blocks automatically.
// This list handles the remaining edge cases: opaque textures that still don't
// represent a full placeable block face (directional faces, UI items, etc.).

const SKIP_PATTERNS = [
  // Directional / partial faces
  "_side", "_bottom", "_front", "_back", "_inner", "_outer", "_corner",
  "_left", "_right",
  // Block shapes that aren't full cubes
  "_slab", "_stairs", "_stair",
  "door", "trapdoor", "fence", "_gate",
  "_button", "pressure_plate",
  // Glass (transparent) — belt-and-suspenders alongside alpha filter
  "glass_pane", "glass",
  // Rail / redstone items
  "_bar", "rail", "redstone_dust", "redstone_wire", "_repeater", "_comparator",
  "tripwire",
  // Plants and non-solid nature (belt-and-suspenders; alpha filter gets most)
  "sapling", "_flower", "_plant", "_stem", "_vine", "seagrass",
  "dead_bush", "fern", "grass_", "_grass_carried",
  "_leaves", "leaves_",
  "_fungus", "_roots", "_root",
  "kelp", "sugar_cane", "cactus",
  "coral_fan", "coral_wall", "sea_pickle", "lily_pad",
  "dripleaf", "chorus", "nether_sprouts", "twisting_vines", "weeping_vines",
  "spore_blossom", "hanging_roots", "cave_vines",
  // Pottery / patterns / decoration items
  "pottery_pattern", "_shelf",
  // Crystal growth stages (not full blocks)
  "_cluster", "_bud",
  // Animated / overlay textures
  "_mers", "_normal", "destroy_stage",
  // Non-full-block utility items
  "torch", "lantern", "chain", "ladder", "lever",
  "piston", "sticky_piston", "piston_arm",
  "dispenser", "dropper", "observer", "hopper",
  "composter", "brewing_stand", "cauldron",
  "end_rod", "lightning_rod",
  "campfire", "_fire",
  "flower_pot", "item_frame",
  "_sign", "_banner",
  "skull", "head",
  "shulker_box",
  "daylight_detector",
  "chiseled_bookshelf",
  "suspicious_gravel", "suspicious_sand",
  "calibrated_sculk_sensor",
  "bell", "conduit",
  // Chest / container textures
  "chest_", "_chest",
  // End frame / bed
  "endframe", "bed_",
  // Anvil damage variants
  "_damaged_",
  // Log textures — both "_log" (Java: spruce_log) and "log_" (Bedrock: log_spruce)
  "_log", "log_",
  // Water / liquid (animated, not a solid block)
  "water_", "lava_",
  // Education Edition / debug blocks
  "reactor_core", "border", "structure_block", "jigsaw",
  // Coral blocks only exist underwater — not useful for standard pixel art
  "coral_block", "coral_",
  // Redstone/interactive blocks with distracting textures
  "redstone_lamp", "furnace_", "blast_furnace", "smoker_",
  "crafting_table", "cartography", "smithing_table", "loom_",
  // UI / inventory textures that leaked through
  "spawn_egg", "powder_snow",
];

function shouldSkip(name) {
  for (const pat of SKIP_PATTERNS) {
    if (name.includes(pat)) return true;
  }
  return false;
}

// ── Bedrock texture name → Java Edition block ID ──────────────────────────────
//
// Hand-maintained lookup for cases where Bedrock and Java naming diverge.
// For textures not in this map, we fall back to `minecraft:{textureName}`.

const TEXTURE_TO_JAVA_ID = {};

// Wool: wool_colored_{color} → minecraft:{color}_wool
for (const c of COLORS_16) {
  TEXTURE_TO_JAVA_ID[`wool_colored_${c}`] = `minecraft:${c}_wool`;
}

// Concrete: concrete_{color} → minecraft:{color}_concrete
for (const c of COLORS_16) {
  TEXTURE_TO_JAVA_ID[`concrete_${c}`] = `minecraft:${c}_concrete`;
}

// Concrete powder: concrete_powder_{color} → minecraft:{color}_concrete_powder
for (const c of COLORS_16) {
  TEXTURE_TO_JAVA_ID[`concrete_powder_${c}`] = `minecraft:${c}_concrete_powder`;
}

// Terracotta: Bedrock uses terracotta_{color}, Java uses {color}_terracotta
for (const c of COLORS_16) {
  TEXTURE_TO_JAVA_ID[`terracotta_${c}`] = `minecraft:${c}_terracotta`;
  // Bedrock also ships older "hardened_clay_stained_*" textures for the same blocks
  TEXTURE_TO_JAVA_ID[`hardened_clay_stained_${c}`] = `minecraft:${c}_terracotta`;
}
TEXTURE_TO_JAVA_ID["hardened_clay"] = "minecraft:terracotta";

// Bedrock uses "silver" for the color Java Edition calls "light_gray" in several material groups.
// Map them explicitly so they get the correct Java IDs and Java-ID dedup works correctly.
for (const [bedrockMaterial, javaMaterial] of [
  ["concrete_silver",           "minecraft:light_gray_concrete"],
  ["concrete_powder_silver",    "minecraft:light_gray_concrete_powder"],
  ["wool_colored_silver",       "minecraft:light_gray_wool"],
  ["hardened_clay_stained_silver", "minecraft:light_gray_terracotta"],
  ["terracotta_silver",         "minecraft:light_gray_terracotta"],
]) {
  TEXTURE_TO_JAVA_ID[bedrockMaterial] = javaMaterial;
}

// Wood planks: planks_{wood} → minecraft:{wood}_planks
for (const w of WOOD_TYPES) {
  TEXTURE_TO_JAVA_ID[`planks_${w}`] = `minecraft:${w}_planks`;
}
// bamboo_planks aligns in both editions
TEXTURE_TO_JAVA_ID["bamboo_planks"] = "minecraft:bamboo_planks";

// Stone variants: Bedrock uses stone_{variant}
TEXTURE_TO_JAVA_ID["stone_granite"] = "minecraft:granite";
TEXTURE_TO_JAVA_ID["stone_diorite"] = "minecraft:diorite";
TEXTURE_TO_JAVA_ID["stone_andesite"] = "minecraft:andesite";
TEXTURE_TO_JAVA_ID["stone_granite_smooth"] = "minecraft:polished_granite";
TEXTURE_TO_JAVA_ID["stone_diorite_smooth"] = "minecraft:polished_diorite";
TEXTURE_TO_JAVA_ID["stone_andesite_smooth"] = "minecraft:polished_andesite";
TEXTURE_TO_JAVA_ID["stonebrick"] = "minecraft:stone_bricks";
TEXTURE_TO_JAVA_ID["stonebrick_mossy"] = "minecraft:mossy_stone_bricks";
TEXTURE_TO_JAVA_ID["stonebrick_cracked"] = "minecraft:cracked_stone_bricks";
TEXTURE_TO_JAVA_ID["stonebrick_carved"] = "minecraft:chiseled_stone_bricks";
TEXTURE_TO_JAVA_ID["cobblestone_mossy"] = "minecraft:mossy_cobblestone";

// Deepslate
TEXTURE_TO_JAVA_ID["deepslate_top"] = "minecraft:deepslate";
TEXTURE_TO_JAVA_ID["cobbled_deepslate"] = "minecraft:cobbled_deepslate";
TEXTURE_TO_JAVA_ID["polished_deepslate"] = "minecraft:polished_deepslate";
TEXTURE_TO_JAVA_ID["deepslate_tiles"] = "minecraft:deepslate_tiles";
TEXTURE_TO_JAVA_ID["deepslate_bricks"] = "minecraft:deepslate_bricks";
TEXTURE_TO_JAVA_ID["cracked_deepslate_tiles"] = "minecraft:cracked_deepslate_tiles";
TEXTURE_TO_JAVA_ID["cracked_deepslate_bricks"] = "minecraft:cracked_deepslate_bricks";
TEXTURE_TO_JAVA_ID["chiseled_deepslate"] = "minecraft:chiseled_deepslate";

// Tuff family
TEXTURE_TO_JAVA_ID["tuff"] = "minecraft:tuff";
TEXTURE_TO_JAVA_ID["polished_tuff"] = "minecraft:polished_tuff";
TEXTURE_TO_JAVA_ID["tuff_bricks"] = "minecraft:tuff_bricks";
TEXTURE_TO_JAVA_ID["chiseled_tuff"] = "minecraft:chiseled_tuff";
TEXTURE_TO_JAVA_ID["chiseled_tuff_bricks"] = "minecraft:chiseled_tuff_bricks";

// Nether
TEXTURE_TO_JAVA_ID["nether_brick"] = "minecraft:nether_bricks";
TEXTURE_TO_JAVA_ID["red_nether_brick"] = "minecraft:red_nether_bricks";
TEXTURE_TO_JAVA_ID["nether_wart_block"] = "minecraft:nether_wart_block";
TEXTURE_TO_JAVA_ID["soul_sand"] = "minecraft:soul_sand";
TEXTURE_TO_JAVA_ID["soul_soil"] = "minecraft:soul_soil";
TEXTURE_TO_JAVA_ID["basalt_side"] = null; // skip — use basalt directly
TEXTURE_TO_JAVA_ID["basalt_top"] = "minecraft:basalt";
TEXTURE_TO_JAVA_ID["polished_basalt_side"] = "minecraft:polished_basalt";
TEXTURE_TO_JAVA_ID["blackstone_top"] = "minecraft:blackstone";
TEXTURE_TO_JAVA_ID["polished_blackstone"] = "minecraft:polished_blackstone";
TEXTURE_TO_JAVA_ID["polished_blackstone_bricks"] = "minecraft:polished_blackstone_bricks";
TEXTURE_TO_JAVA_ID["cracked_polished_blackstone_bricks"] = "minecraft:cracked_polished_blackstone_bricks";
TEXTURE_TO_JAVA_ID["chiseled_polished_blackstone"] = "minecraft:chiseled_polished_blackstone";
TEXTURE_TO_JAVA_ID["gilded_blackstone"] = "minecraft:gilded_blackstone";
TEXTURE_TO_JAVA_ID["crimson_nylium"] = "minecraft:crimson_nylium";
TEXTURE_TO_JAVA_ID["warped_nylium"] = "minecraft:warped_nylium";
TEXTURE_TO_JAVA_ID["netherite_block"] = "minecraft:netherite_block";
TEXTURE_TO_JAVA_ID["ancient_debris_top"] = "minecraft:ancient_debris";
TEXTURE_TO_JAVA_ID["shroomlight"] = "minecraft:shroomlight";

// Copper family
TEXTURE_TO_JAVA_ID["copper_block"] = "minecraft:copper_block";
TEXTURE_TO_JAVA_ID["exposed_copper"] = "minecraft:exposed_copper";
TEXTURE_TO_JAVA_ID["weathered_copper"] = "minecraft:weathered_copper";
TEXTURE_TO_JAVA_ID["oxidized_copper"] = "minecraft:oxidized_copper";
TEXTURE_TO_JAVA_ID["waxed_copper"] = "minecraft:waxed_copper_block";
TEXTURE_TO_JAVA_ID["waxed_exposed_copper"] = "minecraft:waxed_exposed_copper";
TEXTURE_TO_JAVA_ID["waxed_weathered_copper"] = "minecraft:waxed_weathered_copper";
TEXTURE_TO_JAVA_ID["waxed_oxidized_copper"] = "minecraft:waxed_oxidized_copper";
TEXTURE_TO_JAVA_ID["cut_copper"] = "minecraft:cut_copper";
TEXTURE_TO_JAVA_ID["exposed_cut_copper"] = "minecraft:exposed_cut_copper";
TEXTURE_TO_JAVA_ID["weathered_cut_copper"] = "minecraft:weathered_cut_copper";
TEXTURE_TO_JAVA_ID["oxidized_cut_copper"] = "minecraft:oxidized_cut_copper";

// Quartz
TEXTURE_TO_JAVA_ID["quartz_block_side"] = "minecraft:quartz_block";
TEXTURE_TO_JAVA_ID["quartz_block_top"] = "minecraft:quartz_block"; // same as side; Java-ID dedup keeps one
TEXTURE_TO_JAVA_ID["quartz_block_bottom"] = null;
TEXTURE_TO_JAVA_ID["quartz_bricks"] = "minecraft:quartz_bricks";
TEXTURE_TO_JAVA_ID["chiseled_quartz_block"] = "minecraft:chiseled_quartz_block";
TEXTURE_TO_JAVA_ID["smooth_quartz"] = "minecraft:smooth_quartz";

// Sand/dirt
TEXTURE_TO_JAVA_ID["sand"] = "minecraft:sand";
TEXTURE_TO_JAVA_ID["red_sand"] = "minecraft:red_sand";
TEXTURE_TO_JAVA_ID["gravel"] = "minecraft:gravel";
TEXTURE_TO_JAVA_ID["dirt"] = "minecraft:dirt";
TEXTURE_TO_JAVA_ID["coarse_dirt"] = "minecraft:coarse_dirt";
TEXTURE_TO_JAVA_ID["podzol_top"] = "minecraft:podzol";
TEXTURE_TO_JAVA_ID["mycelium_top"] = "minecraft:mycelium";
TEXTURE_TO_JAVA_ID["grass_top"] = "minecraft:grass_block";
TEXTURE_TO_JAVA_ID["clay"] = "minecraft:clay";
TEXTURE_TO_JAVA_ID["mud"] = "minecraft:mud";
TEXTURE_TO_JAVA_ID["muddy_mangrove_roots_top"] = "minecraft:muddy_mangrove_roots";
TEXTURE_TO_JAVA_ID["packed_mud"] = "minecraft:packed_mud";
TEXTURE_TO_JAVA_ID["mud_bricks"] = "minecraft:mud_bricks";

// Ice/snow
TEXTURE_TO_JAVA_ID["snow"] = "minecraft:snow_block";
TEXTURE_TO_JAVA_ID["ice"] = "minecraft:ice";
TEXTURE_TO_JAVA_ID["packed_ice"] = "minecraft:packed_ice";
TEXTURE_TO_JAVA_ID["blue_ice"] = "minecraft:blue_ice";

// Mineral blocks
TEXTURE_TO_JAVA_ID["coal_block"] = "minecraft:coal_block";
TEXTURE_TO_JAVA_ID["iron_block"] = "minecraft:iron_block";
TEXTURE_TO_JAVA_ID["gold_block"] = "minecraft:gold_block";
TEXTURE_TO_JAVA_ID["diamond_block"] = "minecraft:diamond_block";
TEXTURE_TO_JAVA_ID["emerald_block"] = "minecraft:emerald_block";
TEXTURE_TO_JAVA_ID["lapis_block"] = "minecraft:lapis_block";
TEXTURE_TO_JAVA_ID["redstone_block"] = "minecraft:redstone_block";
TEXTURE_TO_JAVA_ID["amethyst_block"] = "minecraft:amethyst_block";
TEXTURE_TO_JAVA_ID["raw_iron_block"] = "minecraft:raw_iron_block";
TEXTURE_TO_JAVA_ID["raw_gold_block"] = "minecraft:raw_gold_block";
TEXTURE_TO_JAVA_ID["raw_copper_block"] = "minecraft:raw_copper_block";

// Sandstone
TEXTURE_TO_JAVA_ID["sandstone_top"] = "minecraft:sandstone";
TEXTURE_TO_JAVA_ID["red_sandstone_top"] = "minecraft:red_sandstone";
TEXTURE_TO_JAVA_ID["chiseled_sandstone"] = "minecraft:chiseled_sandstone";
TEXTURE_TO_JAVA_ID["chiseled_red_sandstone"] = "minecraft:chiseled_red_sandstone";
TEXTURE_TO_JAVA_ID["smooth_sandstone"] = "minecraft:smooth_sandstone";
TEXTURE_TO_JAVA_ID["smooth_red_sandstone"] = "minecraft:smooth_red_sandstone";
TEXTURE_TO_JAVA_ID["cut_sandstone"] = "minecraft:cut_sandstone";
TEXTURE_TO_JAVA_ID["cut_red_sandstone"] = "minecraft:cut_red_sandstone";

// End
TEXTURE_TO_JAVA_ID["end_stone"] = "minecraft:end_stone";
TEXTURE_TO_JAVA_ID["end_bricks"] = "minecraft:end_stone_bricks";
TEXTURE_TO_JAVA_ID["purpur_block"] = "minecraft:purpur_block";
TEXTURE_TO_JAVA_ID["purpur_block_side"] = null; // skip — use main purpur_block
TEXTURE_TO_JAVA_ID["purpur_pillar"] = "minecraft:purpur_pillar";

// Nature
TEXTURE_TO_JAVA_ID["moss_block"] = "minecraft:moss_block";
TEXTURE_TO_JAVA_ID["sponge"] = "minecraft:sponge";
TEXTURE_TO_JAVA_ID["sponge_wet"] = "minecraft:wet_sponge";
TEXTURE_TO_JAVA_ID["sea_lantern"] = "minecraft:sea_lantern";
TEXTURE_TO_JAVA_ID["prismarine"] = "minecraft:prismarine";
TEXTURE_TO_JAVA_ID["prismarine_rough"] = "minecraft:prismarine"; // duplicate, will be deduped
TEXTURE_TO_JAVA_ID["prismarine_bricks"] = "minecraft:prismarine_bricks";
TEXTURE_TO_JAVA_ID["dark_prismarine"] = "minecraft:dark_prismarine";
TEXTURE_TO_JAVA_ID["melon_side"] = "minecraft:melon";
TEXTURE_TO_JAVA_ID["melon_top"] = null;
TEXTURE_TO_JAVA_ID["pumpkin_side"] = "minecraft:pumpkin";
TEXTURE_TO_JAVA_ID["pumpkin_top"] = null;
TEXTURE_TO_JAVA_ID["hay_block_side"] = "minecraft:hay_block";
TEXTURE_TO_JAVA_ID["hay_block_top"] = null;
TEXTURE_TO_JAVA_ID["dried_kelp_block_side_a"] = "minecraft:dried_kelp_block";
TEXTURE_TO_JAVA_ID["sculk"] = "minecraft:sculk";
TEXTURE_TO_JAVA_ID["sculk_catalyst_top"] = "minecraft:sculk_catalyst";
TEXTURE_TO_JAVA_ID["sculk_shrieker_top"] = null; // non-solid feel
TEXTURE_TO_JAVA_ID["sculk_vein"] = null; // non-solid
TEXTURE_TO_JAVA_ID["mangrove_roots_top"] = "minecraft:mangrove_roots";
TEXTURE_TO_JAVA_ID["cherry_leaves"] = "minecraft:cherry_leaves";

// Decorative
TEXTURE_TO_JAVA_ID["brick"] = "minecraft:bricks";
TEXTURE_TO_JAVA_ID["bricks"] = "minecraft:bricks";
TEXTURE_TO_JAVA_ID["sandstone_side"] = null; // skip, use top
TEXTURE_TO_JAVA_ID["glowstone"] = "minecraft:glowstone";
TEXTURE_TO_JAVA_ID["honey_block_side"] = "minecraft:honey_block";
TEXTURE_TO_JAVA_ID["honey_block_top"] = null;
TEXTURE_TO_JAVA_ID["honeycomb"] = "minecraft:honeycomb_block";
TEXTURE_TO_JAVA_ID["bookshelf"] = "minecraft:bookshelf";
TEXTURE_TO_JAVA_ID["tnt_side"] = "minecraft:tnt";
TEXTURE_TO_JAVA_ID["tnt_top"] = null;
TEXTURE_TO_JAVA_ID["tnt_bottom"] = null;
TEXTURE_TO_JAVA_ID["magma"] = "minecraft:magma_block";
TEXTURE_TO_JAVA_ID["obsidian"] = "minecraft:obsidian";
TEXTURE_TO_JAVA_ID["crying_obsidian"] = "minecraft:crying_obsidian";
TEXTURE_TO_JAVA_ID["target_top"] = "minecraft:target";
TEXTURE_TO_JAVA_ID["target_side"] = null;
TEXTURE_TO_JAVA_ID["calcite"] = "minecraft:calcite";
TEXTURE_TO_JAVA_ID["smooth_stone"] = "minecraft:smooth_stone";
TEXTURE_TO_JAVA_ID["smooth_stone_slab_side"] = null;
TEXTURE_TO_JAVA_ID["cobblestone"] = "minecraft:cobblestone";
TEXTURE_TO_JAVA_ID["stone"] = "minecraft:stone";

// Specific null entries (explicit skips for textures that appear non-null but aren't blocks)
TEXTURE_TO_JAVA_ID["grass_side_carried"] = null;
TEXTURE_TO_JAVA_ID["mycelium_side"] = null;
TEXTURE_TO_JAVA_ID["podzol_side"] = null;
TEXTURE_TO_JAVA_ID["dirt_podzol_side"] = null;
TEXTURE_TO_JAVA_ID["grass_side_snowed"] = null;
TEXTURE_TO_JAVA_ID["grass_side"] = null;

// ── Category heuristics ───────────────────────────────────────────────────────

function deriveCategory(name) {
  if (COLORS_16.some((c) => name === `wool_colored_${c}`)) return "Wool";
  if (name.startsWith("concrete_") && !name.includes("powder")) return "Concrete";
  if (name.startsWith("concrete_powder_")) return "Concrete Powder";
  if (name.startsWith("terracotta_") || name === "hardened_clay") return "Terracotta";
  if (WOOD_TYPES.some((w) => name === `planks_${w}` || name === `${w}_planks`)) return "Wood";
  if (["bamboo_planks", "bamboo_block", "bamboo_mosaic"].includes(name)) return "Wood";
  if (["crimson_planks", "warped_planks"].includes(name)) return "Wood";
  if (
    name.startsWith("stone") || name.startsWith("deepslate") ||
    name.startsWith("cobblestone") || name.startsWith("tuff") ||
    name === "calcite" || name === "smooth_stone" || name === "cobblestone_mossy"
  ) return "Stone";
  if (
    name === "sand" || name === "red_sand" || name === "gravel" ||
    name.startsWith("dirt") || name === "coarse_dirt" || name === "clay" ||
    name === "mud" || name.startsWith("packed_mud") || name === "mud_bricks" ||
    name.startsWith("muddy_mangrove") || name === "podzol_top" || name === "grass_top" || name === "mycelium_top"
  ) return "Natural";
  if (
    name === "snow" || name === "ice" || name === "packed_ice" || name === "blue_ice"
  ) return "Frozen";
  if (
    name.includes("_block") && (
      name.includes("coal") || name.includes("iron") || name.includes("gold") ||
      name.includes("diamond") || name.includes("emerald") || name.includes("lapis") ||
      name.includes("redstone") || name.includes("amethyst") || name.includes("netherite") ||
      name.includes("copper") || name.includes("quartz") || name.includes("raw_")
    )
  ) return "Mineral";
  if (
    name.includes("copper") || name.includes("quartz") ||
    name === "coal_block" || name === "iron_block" || name === "gold_block" ||
    name === "diamond_block" || name === "emerald_block" || name === "lapis_block" ||
    name === "redstone_block" || name === "amethyst_block" || name === "netherite_block" ||
    name.startsWith("raw_")
  ) return "Mineral";
  if (
    name.includes("nether") || name.includes("basalt") || name.includes("blackstone") ||
    name.startsWith("crimson_") || name.startsWith("warped_") ||
    name === "obsidian" || name === "crying_obsidian" || name === "soul_sand" ||
    name === "soul_soil" || name === "shroomlight" || name === "magma" ||
    name === "ancient_debris_top" || name === "gilded_blackstone"
  ) return "Nether";
  if (
    name.startsWith("end_") || name === "end_stone" || name.startsWith("purpur")
  ) return "End";
  if (
    name.startsWith("moss") || name.startsWith("mud") || name.startsWith("mangrove") ||
    name.startsWith("sculk") || name === "sponge" || name === "sponge_wet" ||
    name === "sea_lantern" || name.startsWith("prismarine") || name.startsWith("melon") ||
    name.startsWith("pumpkin") || name.startsWith("hay") || name.startsWith("dried_kelp") ||
    name.startsWith("cherry_leaves") || name === "packed_mud"
  ) return "Nature";
  // Default
  return "Decorative";
}

// ── Human-readable name derivation ───────────────────────────────────────────

// Special-case lookup: texture → display name
const DISPLAY_NAME_OVERRIDES = {
  hardened_clay: "Terracotta",
  grass_top: "Grass Block",
  podzol_top: "Podzol",
  mycelium_top: "Mycelium",
  snow: "Snow Block",
  basalt_top: "Basalt",
  polished_basalt_side: "Polished Basalt",
  blackstone_top: "Blackstone",
  sandstone_top: "Sandstone",
  red_sandstone_top: "Red Sandstone",
  ancient_debris_top: "Ancient Debris",
  magma: "Magma Block",
  hay_block_side: "Hay Block",
  dried_kelp_block_side_a: "Dried Kelp Block",
  melon_side: "Melon",
  pumpkin_side: "Pumpkin",
  honey_block_side: "Honey Block",
  honeycomb: "Honeycomb Block",
  brick: "Bricks",
  bricks: "Bricks",
  tnt_side: "TNT",
  nether_brick: "Nether Bricks",
  red_nether_brick: "Red Nether Bricks",
  cobblestone_mossy: "Mossy Cobblestone",
  stonebrick: "Stone Bricks",
  stonebrick_mossy: "Mossy Stone Bricks",
  stonebrick_cracked: "Cracked Stone Bricks",
  stonebrick_carved: "Chiseled Stone Bricks",
  deepslate_top: "Deepslate",
  smooth_stone: "Smooth Stone",
  quartz_block_side: "Quartz Block",
  quartz_bricks: "Quartz Bricks",
  chiseled_quartz_block: "Chiseled Quartz Block",
  sculk_catalyst_top: "Sculk Catalyst",
  mangrove_roots_top: "Mangrove Roots",
  muddy_mangrove_roots_top: "Muddy Mangrove Roots",
  sponge_wet: "Wet Sponge",
  target_top: "Target",
  prismarine_rough: "Prismarine",
  waxed_copper: "Waxed Copper Block",
};

/** Convert a Bedrock texture stem to a human-readable display name. */
function deriveName(texture) {
  if (DISPLAY_NAME_OVERRIDES[texture]) return DISPLAY_NAME_OVERRIDES[texture];

  // Strip known suffixes that were kept for disambiguation
  let s = texture
    .replace(/_top$/, "")
    .replace(/_side$/, "")
    .replace(/_bottom$/, "");

  // wool_colored_{color} → {Color} Wool
  const woolMatch = s.match(/^wool_colored_(.+)$/);
  if (woolMatch) return titleCase(`${woolMatch[1].replace(/_/g, " ")} wool`);

  // planks_{wood} → {Wood} Planks
  const planksMatch = s.match(/^planks_(.+)$/);
  if (planksMatch) return titleCase(`${planksMatch[1].replace(/_/g, " ")} planks`);

  // stone_{variant}_smooth → Polished {Variant}
  const stoneMatch = s.match(/^stone_(.+)_smooth$/);
  if (stoneMatch) return titleCase(`polished ${stoneMatch[1].replace(/_/g, " ")}`);

  // hardened_clay_stained_{color} → {Color} Terracotta
  const hardClayMatch = s.match(/^hardened_clay_stained_(.+)$/);
  if (hardClayMatch) return titleCase(`${hardClayMatch[1].replace(/_/g, " ")} terracotta`);

  // terracotta_{color} → {Color} Terracotta  (Bedrock new-style naming)
  const terracottaMatch = s.match(/^terracotta_(.+)$/);
  if (terracottaMatch) return titleCase(`${terracottaMatch[1].replace(/_/g, " ")} terracotta`);

  // concrete_{color} → {Color} Concrete  (already handled by titleCase, but make it explicit)
  const concreteMatch = s.match(/^concrete_(?!powder_)(.+)$/);
  if (concreteMatch) return titleCase(`${concreteMatch[1].replace(/_/g, " ")} concrete`);

  // concrete_powder_{color} → {Color} Concrete Powder
  const concretePowderMatch = s.match(/^concrete_powder_(.+)$/);
  if (concretePowderMatch) return titleCase(`${concretePowderMatch[1].replace(/_/g, " ")} concrete powder`);

  return titleCase(s.replace(/_/g, " "));
}

function titleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Deduplication by Java ID ──────────────────────────────────────────────────

/** For entries that share a Java ID, keep the first one encountered. */
function deduplicateByJavaId(entries) {
  const seen = new Set();
  return entries.filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
}

// ── CIELAB color deduplication ────────────────────────────────────────────────
//
// Blocks too close in perceptual color space cause the color matcher to
// pick visually different textures for adjacent pixels of the same color —
// producing the "noisy" look where one green pixel maps to lime concrete and
// its neighbour maps to moss block.
//
// We run a greedy pass: sort blocks by how "clean" they look in pixel art
// (Concrete first, then Wool, etc.), then accept each block only if it is at
// least LAB_DEDUP_THRESHOLD perceptual units from every already-accepted block.
//
// Threshold 10 ≈ one clearly visible step. Raise to reduce palette size;
// lower to allow more similar-colored options.

const LAB_DEDUP_THRESHOLD = 12;

// Lower index = preferred when two blocks are the same perceptual color.
// "Clean" solid-color blocks rank above heavily-textured ones.
const DEDUP_CATEGORY_PRIORITY = [
  "Concrete",
  "Wool",
  "Terracotta",
  "Concrete Powder",
  "Frozen",
  "Mineral",
  "Stone",
  "Wood",
  "Natural",
  "Nether",
  "End",
  "Nature",
  "Decorative",
];

function rgbToLab(r, g, b) {
  const toLinear = (c) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const rl = toLinear(r), gl = toLinear(g), bl = toLinear(b);
  const x = rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375;
  const y = rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750;
  const z = rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x / 0.95047), fy = f(y / 1.0), fz = f(z / 1.08883);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labDist([L1, a1, b1], [L2, a2, b2]) {
  return Math.sqrt((L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2);
}

/**
 * Remove blocks whose perceptual color is too similar to an already-accepted
 * block. Anchor blocks are ALWAYS included; LAB dedup only runs on non-anchors.
 * Non-anchor blocks are also checked against the already-accepted anchor colors.
 */
function deduplicateByColor(blocks, threshold = LAB_DEDUP_THRESHOLD) {
  const anchors = blocks.filter((b) => b._isAnchor);
  const nonAnchors = blocks.filter((b) => !b._isAnchor);

  // Sort non-anchors by pixel-art quality: preferred categories first, then name
  const sorted = [...nonAnchors].sort((a, b) => {
    const pa = DEDUP_CATEGORY_PRIORITY.indexOf(a.category);
    const pb = DEDUP_CATEGORY_PRIORITY.indexOf(b.category);
    const ia = pa === -1 ? 99 : pa;
    const ib = pb === -1 ? 99 : pb;
    if (ia !== ib) return ia - ib;
    return a.name.localeCompare(b.name);
  });

  // Anchors are unconditionally included; seed the LAB list with their colors
  // so non-anchors that duplicate an anchor color are still filtered out.
  const kept = [...anchors];
  const keptLabs = anchors.map((b) => rgbToLab(...b.rgb));

  for (const block of sorted) {
    const lab = rgbToLab(...block.rgb);
    const tooClose = keptLabs.some((kl) => labDist(lab, kl) < threshold);
    if (!tooClose) {
      kept.push(block);
      keptLabs.push(lab);
    }
  }

  return kept;
}

// ── Category ordering ─────────────────────────────────────────────────────────

const CATEGORY_ORDER = [
  "Wool", "Concrete", "Concrete Powder", "Terracotta",
  "Stone", "Wood", "Natural", "Frozen",
  "Mineral", "Nether", "End", "Nature", "Decorative",
];

function categoryIndex(cat) {
  const idx = CATEGORY_ORDER.indexOf(cat);
  return idx === -1 ? CATEGORY_ORDER.length : idx;
}

// ── TypeScript file emission ──────────────────────────────────────────────────

function emitBlocksTs(blocks) {
  const lines = [];

  lines.push(`/**`);
  lines.push(` * Auto-generated Minecraft block palette.`);
  lines.push(` *`);
  lines.push(` * DO NOT EDIT MANUALLY — regenerate with \`pnpm run sync-blocks\`.`);
  lines.push(` *`);
  lines.push(` * Textures sourced from Mojang/bedrock-samples (MIT licence).`);
  lines.push(` * RGB values are computed by averaging each 16×16 texture to a single pixel.`);
  lines.push(` * Files live in public/blocks/{texture}.png and are served as static assets.`);
  lines.push(` *`);
  lines.push(` * \`minecraft:air\` is NOT included — it is synthesised at runtime by`);
  lines.push(` * \`color-matcher.ts\` and \`litematic-generator.ts\` to represent transparent pixels.`);
  lines.push(` */`);
  lines.push(``);
  lines.push(`/** A single entry in the Minecraft block palette. */`);
  lines.push(`export interface MinecraftBlock {`);
  lines.push(`  /** Namespaced block ID as used in-game, e.g. \`"minecraft:white_wool"\`. */`);
  lines.push(`  id: string;`);
  lines.push(`  /** Human-readable display name, e.g. \`"White Wool"\`. */`);
  lines.push(`  name: string;`);
  lines.push(`  /** Average RGB color sampled from the block texture; each component 0–255. */`);
  lines.push(`  rgb: [number, number, number];`);
  lines.push(`  /** UI grouping category, e.g. \`"Wool"\` or \`"Concrete"\`. Drives the filter buttons. */`);
  lines.push(`  category: string;`);
  lines.push(`  /** Bedrock texture filename stem (without \`.png\`), served from \`/blocks/{texture}.png\`. Empty string for synthetic runtime-only blocks. */`);
  lines.push(`  texture: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`/** Full palette of Minecraft blocks generated from Mojang's bedrock-samples textures. */`);
  lines.push(`export const MINECRAFT_BLOCKS: MinecraftBlock[] = [`);

  let currentCategory = null;
  for (const block of blocks) {
    if (block.category !== currentCategory) {
      currentCategory = block.category;
      lines.push(`  // --- ${currentCategory} ---`);
    }
    const [r, g, b] = block.rgb;
    // _isAnchor is an internal pipeline flag — strip it from the TS output
    lines.push(
      `  { id: ${JSON.stringify(block.id)}, name: ${JSON.stringify(block.name)}, rgb: [${r}, ${g}, ${b}], category: ${JSON.stringify(block.category)}, texture: ${JSON.stringify(block.texture)} },`
    );
  }

  lines.push(`];`);
  lines.push(``);
  lines.push(`/**`);
  lines.push(` * Deduplicated list of category strings, in the order they first appear in`);
  lines.push(` * \`MINECRAFT_BLOCKS\`. Used to render the category filter buttons in the UI.`);
  lines.push(` */`);
  lines.push(`export const BLOCK_CATEGORIES = Array.from(`);
  lines.push(`  new Set(MINECRAFT_BLOCKS.map((b) => b.category))`);
  lines.push(`);`);
  lines.push(``);

  return lines.join("\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  console.log(`Reading ${INPUT_JSON}…`);
  const raw = JSON.parse(readFileSync(INPUT_JSON, "utf-8"));
  console.log(`  ${raw.length} textures loaded.`);

  const entries = [];
  let skippedAlpha = 0;
  let skippedPattern = 0;
  let skippedNull = 0;

  let skippedVariance = 0;

  for (const { texture, avgRgb, avgAlpha = 255, variance = 0 } of raw) {
    // Step 1: skip non-solid blocks by alpha — leaves, wheat, plants, etc.
    if (avgAlpha < MIN_AVG_ALPHA) {
      skippedAlpha++;
      continue;
    }

    // Step 2: skip visually noisy/patterned textures (anchors bypass this check)
    if (variance > MAX_TEXTURE_VARIANCE && !isAnchorTexture(texture)) {
      skippedVariance++;
      continue;
    }

    // Step 4: skip non-block textures by pattern
    if (shouldSkip(texture)) {
      skippedPattern++;
      continue;
    }

    // Step 5: resolve Java Edition ID
    let javaId;
    if (Object.prototype.hasOwnProperty.call(TEXTURE_TO_JAVA_ID, texture)) {
      javaId = TEXTURE_TO_JAVA_ID[texture];
      if (javaId === null) {
        // Anchor blocks are never silently dropped — fall back to a namespaced ID.
        if (isAnchorTexture(texture)) {
          javaId = `minecraft:${texture}`;
        } else {
          skippedNull++;
          continue;
        }
      }
    } else {
      // Fallback: assume Java and Bedrock names match
      javaId = `minecraft:${texture}`;
    }

    // Step 6: derive display metadata
    const name = deriveName(texture);
    const category = deriveCategory(texture);

    entries.push({
      id: javaId,
      name,
      rgb: avgRgb,
      category,
      texture,
      _isAnchor: isAnchorTexture(texture),
    });
  }

  console.log(`  ${skippedAlpha} skipped by alpha filter (transparent/non-solid textures).`);
  console.log(`  ${skippedVariance} skipped by variance filter (visually noisy textures, var > ${MAX_TEXTURE_VARIANCE}).`);
  console.log(`  ${skippedPattern} skipped by pattern filter.`);
  console.log(`  ${skippedNull} skipped by explicit null mapping.`);

  // Step 5: keep only anchor blocks (concrete, wool, terracotta)
  const anchorEntries = entries.filter((e) => e._isAnchor);
  console.log(`  ${entries.length - anchorEntries.length} non-anchor blocks discarded (only concrete/wool/terracotta kept).`);

  // Step 6: deduplicate by Java ID (keep first occurrence)
  const idDeduped = deduplicateByJavaId(anchorEntries);
  console.log(`  ${anchorEntries.length - idDeduped.length} duplicate Java IDs removed.`);

  // Step 7: restore category sort order for display
  idDeduped.sort((a, b) => {
    const ci = categoryIndex(a.category) - categoryIndex(b.category);
    if (ci !== 0) return ci;
    return a.name.localeCompare(b.name);
  });

  console.log(`\n${idDeduped.length} blocks in final palette.`);

  // Step 8: emit TypeScript
  const ts = emitBlocksTs(idDeduped);
  writeFileSync(OUTPUT_TS, ts);
  console.log(`Wrote ${OUTPUT_TS}`);
}

main();
