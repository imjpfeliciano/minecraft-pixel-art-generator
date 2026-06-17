/**
 * Auto-generated Minecraft block palette.
 *
 * DO NOT EDIT MANUALLY — regenerate with `pnpm run sync-blocks`.
 *
 * Textures sourced from Mojang/bedrock-samples (MIT licence).
 * RGB values are computed by averaging each 16×16 texture to a single pixel.
 * Files live in public/blocks/{texture}.png and are served as static assets.
 *
 * `minecraft:air` is NOT included — it is synthesised at runtime by
 * `color-matcher.ts` and `litematic-generator.ts` to represent transparent pixels.
 */

/** A single entry in the Minecraft block palette. */
export interface MinecraftBlock {
  /** Namespaced block ID as used in-game, e.g. `"minecraft:white_wool"`. */
  id: string;
  /** Human-readable display name, e.g. `"White Wool"`. */
  name: string;
  /** Average RGB color sampled from the block texture; each component 0–255. */
  rgb: [number, number, number];
  /** UI grouping category, e.g. `"Wool"` or `"Concrete"`. Drives the filter buttons. */
  category: string;
  /** Bedrock texture filename stem (without `.png`), served from `/blocks/{texture}.png`. Empty string for synthetic runtime-only blocks. */
  texture: string;
}

/** Full palette of Minecraft blocks generated from Mojang's bedrock-samples textures. */
export const MINECRAFT_BLOCKS: MinecraftBlock[] = [
  // --- Wool ---
  { id: "minecraft:black_wool", name: "Black Wool", rgb: [21, 21, 26], category: "Wool", texture: "wool_colored_black" },
  { id: "minecraft:blue_wool", name: "Blue Wool", rgb: [53, 57, 157], category: "Wool", texture: "wool_colored_blue" },
  { id: "minecraft:brown_wool", name: "Brown Wool", rgb: [114, 72, 41], category: "Wool", texture: "wool_colored_brown" },
  { id: "minecraft:cyan_wool", name: "Cyan Wool", rgb: [21, 138, 145], category: "Wool", texture: "wool_colored_cyan" },
  { id: "minecraft:gray_wool", name: "Gray Wool", rgb: [63, 68, 72], category: "Wool", texture: "wool_colored_gray" },
  { id: "minecraft:green_wool", name: "Green Wool", rgb: [85, 110, 28], category: "Wool", texture: "wool_colored_green" },
  { id: "minecraft:light_blue_wool", name: "Light Blue Wool", rgb: [58, 175, 217], category: "Wool", texture: "wool_colored_light_blue" },
  { id: "minecraft:lime_wool", name: "Lime Wool", rgb: [112, 185, 26], category: "Wool", texture: "wool_colored_lime" },
  { id: "minecraft:magenta_wool", name: "Magenta Wool", rgb: [190, 69, 180], category: "Wool", texture: "wool_colored_magenta" },
  { id: "minecraft:orange_wool", name: "Orange Wool", rgb: [241, 118, 20], category: "Wool", texture: "wool_colored_orange" },
  { id: "minecraft:pink_wool", name: "Pink Wool", rgb: [238, 141, 172], category: "Wool", texture: "wool_colored_pink" },
  { id: "minecraft:purple_wool", name: "Purple Wool", rgb: [122, 42, 173], category: "Wool", texture: "wool_colored_purple" },
  { id: "minecraft:red_wool", name: "Red Wool", rgb: [161, 39, 35], category: "Wool", texture: "wool_colored_red" },
  { id: "minecraft:white_wool", name: "White Wool", rgb: [234, 236, 237], category: "Wool", texture: "wool_colored_white" },
  { id: "minecraft:yellow_wool", name: "Yellow Wool", rgb: [249, 198, 40], category: "Wool", texture: "wool_colored_yellow" },
  // --- Concrete ---
  { id: "minecraft:black_concrete", name: "Black Concrete", rgb: [8, 10, 15], category: "Concrete", texture: "concrete_black" },
  { id: "minecraft:blue_concrete", name: "Blue Concrete", rgb: [45, 47, 143], category: "Concrete", texture: "concrete_blue" },
  { id: "minecraft:brown_concrete", name: "Brown Concrete", rgb: [96, 60, 32], category: "Concrete", texture: "concrete_brown" },
  { id: "minecraft:cyan_concrete", name: "Cyan Concrete", rgb: [21, 119, 136], category: "Concrete", texture: "concrete_cyan" },
  { id: "minecraft:gray_concrete", name: "Gray Concrete", rgb: [55, 58, 62], category: "Concrete", texture: "concrete_gray" },
  { id: "minecraft:green_concrete", name: "Green Concrete", rgb: [73, 91, 36], category: "Concrete", texture: "concrete_green" },
  { id: "minecraft:light_blue_concrete", name: "Light Blue Concrete", rgb: [36, 137, 199], category: "Concrete", texture: "concrete_light_blue" },
  { id: "minecraft:lime_concrete", name: "Lime Concrete", rgb: [94, 169, 25], category: "Concrete", texture: "concrete_lime" },
  { id: "minecraft:magenta_concrete", name: "Magenta Concrete", rgb: [169, 48, 159], category: "Concrete", texture: "concrete_magenta" },
  { id: "minecraft:orange_concrete", name: "Orange Concrete", rgb: [224, 97, 1], category: "Concrete", texture: "concrete_orange" },
  { id: "minecraft:pink_concrete", name: "Pink Concrete", rgb: [214, 101, 143], category: "Concrete", texture: "concrete_pink" },
  { id: "minecraft:purple_concrete", name: "Purple Concrete", rgb: [100, 32, 156], category: "Concrete", texture: "concrete_purple" },
  { id: "minecraft:red_concrete", name: "Red Concrete", rgb: [142, 33, 33], category: "Concrete", texture: "concrete_red" },
  { id: "minecraft:light_gray_concrete", name: "Silver Concrete", rgb: [125, 125, 115], category: "Concrete", texture: "concrete_silver" },
  { id: "minecraft:white_concrete", name: "White Concrete", rgb: [207, 213, 214], category: "Concrete", texture: "concrete_white" },
  { id: "minecraft:yellow_concrete", name: "Yellow Concrete", rgb: [241, 175, 21], category: "Concrete", texture: "concrete_yellow" },
  // --- Terracotta ---
  { id: "minecraft:terracotta", name: "Terracotta", rgb: [152, 94, 68], category: "Terracotta", texture: "hardened_clay" },
  // --- Decorative ---
  { id: "minecraft:black_terracotta", name: "Black Terracotta", rgb: [37, 23, 16], category: "Decorative", texture: "hardened_clay_stained_black" },
  { id: "minecraft:blue_terracotta", name: "Blue Terracotta", rgb: [74, 60, 91], category: "Decorative", texture: "hardened_clay_stained_blue" },
  { id: "minecraft:brown_terracotta", name: "Brown Terracotta", rgb: [77, 51, 36], category: "Decorative", texture: "hardened_clay_stained_brown" },
  { id: "minecraft:cyan_terracotta", name: "Cyan Terracotta", rgb: [87, 91, 91], category: "Decorative", texture: "hardened_clay_stained_cyan" },
  { id: "minecraft:gray_terracotta", name: "Gray Terracotta", rgb: [58, 42, 36], category: "Decorative", texture: "hardened_clay_stained_gray" },
  { id: "minecraft:green_terracotta", name: "Green Terracotta", rgb: [76, 83, 42], category: "Decorative", texture: "hardened_clay_stained_green" },
  { id: "minecraft:light_blue_terracotta", name: "Light Blue Terracotta", rgb: [113, 109, 138], category: "Decorative", texture: "hardened_clay_stained_light_blue" },
  { id: "minecraft:lime_terracotta", name: "Lime Terracotta", rgb: [104, 118, 53], category: "Decorative", texture: "hardened_clay_stained_lime" },
  { id: "minecraft:magenta_terracotta", name: "Magenta Terracotta", rgb: [150, 88, 109], category: "Decorative", texture: "hardened_clay_stained_magenta" },
  { id: "minecraft:orange_terracotta", name: "Orange Terracotta", rgb: [162, 84, 38], category: "Decorative", texture: "hardened_clay_stained_orange" },
  { id: "minecraft:pink_terracotta", name: "Pink Terracotta", rgb: [162, 78, 79], category: "Decorative", texture: "hardened_clay_stained_pink" },
  { id: "minecraft:purple_terracotta", name: "Purple Terracotta", rgb: [118, 70, 86], category: "Decorative", texture: "hardened_clay_stained_purple" },
  { id: "minecraft:red_terracotta", name: "Red Terracotta", rgb: [143, 61, 47], category: "Decorative", texture: "hardened_clay_stained_red" },
  { id: "minecraft:light_gray_terracotta", name: "Silver Terracotta", rgb: [135, 107, 98], category: "Decorative", texture: "hardened_clay_stained_silver" },
  { id: "minecraft:light_gray_wool", name: "Silver Wool", rgb: [142, 142, 135], category: "Decorative", texture: "wool_colored_silver" },
  { id: "minecraft:white_terracotta", name: "White Terracotta", rgb: [210, 178, 161], category: "Decorative", texture: "hardened_clay_stained_white" },
  { id: "minecraft:yellow_terracotta", name: "Yellow Terracotta", rgb: [186, 133, 35], category: "Decorative", texture: "hardened_clay_stained_yellow" },
];

/**
 * Deduplicated list of category strings, in the order they first appear in
 * `MINECRAFT_BLOCKS`. Used to render the category filter buttons in the UI.
 */
export const BLOCK_CATEGORIES = Array.from(
  new Set(MINECRAFT_BLOCKS.map((b) => b.category))
);
