/**
 * Static catalog of Minecraft blocks used as the color-matching palette.
 *
 * RGB values are approximate average face colors for each block; they are not
 * sampled from actual textures. The palette covers ~130 blocks across 12
 * categories and is intentionally curated for pixel-art suitability (solid,
 * flat-colored blocks that are obtainable in survival mode).
 *
 * `minecraft:air` is NOT included here — it is synthesized at runtime by
 * `color-matcher.ts` and `litematic-generator.ts` to represent transparent pixels.
 */

/** A single entry in the Minecraft block palette. */
export interface MinecraftBlock {
  /** Namespaced block ID as used in-game, e.g. `"minecraft:white_wool"`. */
  id: string;
  /** Human-readable display name, e.g. `"White Wool"`. */
  name: string;
  /** Representative RGB color of the block's top/side face, each component 0–255. */
  rgb: [number, number, number];
  /** UI grouping category, e.g. `"Wool"` or `"Concrete"`. Drives the filter buttons. */
  category: string;
}

/** Full palette of ~130 Minecraft blocks, ordered by category. */
export const MINECRAFT_BLOCKS: MinecraftBlock[] = [
  // --- Wool ---
  { id: "minecraft:white_wool", name: "White Wool", rgb: [233, 236, 236], category: "Wool" },
  { id: "minecraft:orange_wool", name: "Orange Wool", rgb: [240, 118, 19], category: "Wool" },
  { id: "minecraft:magenta_wool", name: "Magenta Wool", rgb: [189, 68, 179], category: "Wool" },
  { id: "minecraft:light_blue_wool", name: "Light Blue Wool", rgb: [58, 175, 217], category: "Wool" },
  { id: "minecraft:yellow_wool", name: "Yellow Wool", rgb: [248, 197, 39], category: "Wool" },
  { id: "minecraft:lime_wool", name: "Lime Wool", rgb: [112, 185, 25], category: "Wool" },
  { id: "minecraft:pink_wool", name: "Pink Wool", rgb: [237, 141, 172], category: "Wool" },
  { id: "minecraft:gray_wool", name: "Gray Wool", rgb: [62, 68, 71], category: "Wool" },
  { id: "minecraft:light_gray_wool", name: "Light Gray Wool", rgb: [142, 142, 134], category: "Wool" },
  { id: "minecraft:cyan_wool", name: "Cyan Wool", rgb: [21, 137, 145], category: "Wool" },
  { id: "minecraft:purple_wool", name: "Purple Wool", rgb: [121, 42, 172], category: "Wool" },
  { id: "minecraft:blue_wool", name: "Blue Wool", rgb: [53, 57, 157], category: "Wool" },
  { id: "minecraft:brown_wool", name: "Brown Wool", rgb: [114, 71, 40], category: "Wool" },
  { id: "minecraft:green_wool", name: "Green Wool", rgb: [84, 109, 27], category: "Wool" },
  { id: "minecraft:red_wool", name: "Red Wool", rgb: [161, 39, 34], category: "Wool" },
  { id: "minecraft:black_wool", name: "Black Wool", rgb: [20, 21, 25], category: "Wool" },

  // --- Concrete ---
  { id: "minecraft:white_concrete", name: "White Concrete", rgb: [207, 213, 214], category: "Concrete" },
  { id: "minecraft:orange_concrete", name: "Orange Concrete", rgb: [224, 97, 1], category: "Concrete" },
  { id: "minecraft:magenta_concrete", name: "Magenta Concrete", rgb: [169, 48, 159], category: "Concrete" },
  { id: "minecraft:light_blue_concrete", name: "Light Blue Concrete", rgb: [36, 137, 199], category: "Concrete" },
  { id: "minecraft:yellow_concrete", name: "Yellow Concrete", rgb: [241, 175, 21], category: "Concrete" },
  { id: "minecraft:lime_concrete", name: "Lime Concrete", rgb: [94, 169, 24], category: "Concrete" },
  { id: "minecraft:pink_concrete", name: "Pink Concrete", rgb: [213, 101, 143], category: "Concrete" },
  { id: "minecraft:gray_concrete", name: "Gray Concrete", rgb: [55, 66, 68], category: "Concrete" },
  { id: "minecraft:light_gray_concrete", name: "Light Gray Concrete", rgb: [125, 125, 115], category: "Concrete" },
  { id: "minecraft:cyan_concrete", name: "Cyan Concrete", rgb: [21, 119, 136], category: "Concrete" },
  { id: "minecraft:purple_concrete", name: "Purple Concrete", rgb: [100, 31, 156], category: "Concrete" },
  { id: "minecraft:blue_concrete", name: "Blue Concrete", rgb: [45, 47, 143], category: "Concrete" },
  { id: "minecraft:brown_concrete", name: "Brown Concrete", rgb: [96, 60, 32], category: "Concrete" },
  { id: "minecraft:green_concrete", name: "Green Concrete", rgb: [73, 91, 36], category: "Concrete" },
  { id: "minecraft:red_concrete", name: "Red Concrete", rgb: [142, 32, 32], category: "Concrete" },
  { id: "minecraft:black_concrete", name: "Black Concrete", rgb: [8, 10, 15], category: "Concrete" },

  // --- Terracotta (glazed-free) ---
  { id: "minecraft:terracotta", name: "Terracotta", rgb: [152, 94, 69], category: "Terracotta" },
  { id: "minecraft:white_terracotta", name: "White Terracotta", rgb: [209, 177, 161], category: "Terracotta" },
  { id: "minecraft:orange_terracotta", name: "Orange Terracotta", rgb: [161, 83, 37], category: "Terracotta" },
  { id: "minecraft:magenta_terracotta", name: "Magenta Terracotta", rgb: [148, 62, 97], category: "Terracotta" },
  { id: "minecraft:light_blue_terracotta", name: "Light Blue Terracotta", rgb: [112, 108, 138], category: "Terracotta" },
  { id: "minecraft:yellow_terracotta", name: "Yellow Terracotta", rgb: [186, 133, 36], category: "Terracotta" },
  { id: "minecraft:lime_terracotta", name: "Lime Terracotta", rgb: [103, 117, 52], category: "Terracotta" },
  { id: "minecraft:pink_terracotta", name: "Pink Terracotta", rgb: [165, 75, 75], category: "Terracotta" },
  { id: "minecraft:gray_terracotta", name: "Gray Terracotta", rgb: [57, 41, 35], category: "Terracotta" },
  { id: "minecraft:light_gray_terracotta", name: "Light Gray Terracotta", rgb: [135, 107, 97], category: "Terracotta" },
  { id: "minecraft:cyan_terracotta", name: "Cyan Terracotta", rgb: [87, 92, 92], category: "Terracotta" },
  { id: "minecraft:purple_terracotta", name: "Purple Terracotta", rgb: [118, 69, 86], category: "Terracotta" },
  { id: "minecraft:blue_terracotta", name: "Blue Terracotta", rgb: [74, 59, 91], category: "Terracotta" },
  { id: "minecraft:brown_terracotta", name: "Brown Terracotta", rgb: [77, 51, 35], category: "Terracotta" },
  { id: "minecraft:green_terracotta", name: "Green Terracotta", rgb: [75, 82, 42], category: "Terracotta" },
  { id: "minecraft:red_terracotta", name: "Red Terracotta", rgb: [142, 60, 46], category: "Terracotta" },
  { id: "minecraft:black_terracotta", name: "Black Terracotta", rgb: [37, 22, 16], category: "Terracotta" },

  // --- Stone & Rock ---
  { id: "minecraft:stone", name: "Stone", rgb: [125, 125, 125], category: "Stone" },
  { id: "minecraft:cobblestone", name: "Cobblestone", rgb: [127, 127, 120], category: "Stone" },
  { id: "minecraft:smooth_stone", name: "Smooth Stone", rgb: [160, 160, 160], category: "Stone" },
  { id: "minecraft:granite", name: "Granite", rgb: [153, 107, 88], category: "Stone" },
  { id: "minecraft:polished_granite", name: "Polished Granite", rgb: [157, 110, 90], category: "Stone" },
  { id: "minecraft:diorite", name: "Diorite", rgb: [188, 188, 188], category: "Stone" },
  { id: "minecraft:polished_diorite", name: "Polished Diorite", rgb: [194, 194, 194], category: "Stone" },
  { id: "minecraft:andesite", name: "Andesite", rgb: [136, 136, 137], category: "Stone" },
  { id: "minecraft:polished_andesite", name: "Polished Andesite", rgb: [137, 137, 138], category: "Stone" },
  { id: "minecraft:deepslate", name: "Deepslate", rgb: [82, 82, 88], category: "Stone" },
  { id: "minecraft:calcite", name: "Calcite", rgb: [220, 218, 202], category: "Stone" },
  { id: "minecraft:tuff", name: "Tuff", rgb: [113, 112, 104], category: "Stone" },

  // --- Wood Planks ---
  { id: "minecraft:oak_planks", name: "Oak Planks", rgb: [162, 130, 78], category: "Wood" },
  { id: "minecraft:spruce_planks", name: "Spruce Planks", rgb: [108, 80, 34], category: "Wood" },
  { id: "minecraft:birch_planks", name: "Birch Planks", rgb: [194, 174, 120], category: "Wood" },
  { id: "minecraft:jungle_planks", name: "Jungle Planks", rgb: [160, 115, 70], category: "Wood" },
  { id: "minecraft:acacia_planks", name: "Acacia Planks", rgb: [180, 97, 37], category: "Wood" },
  { id: "minecraft:dark_oak_planks", name: "Dark Oak Planks", rgb: [63, 45, 19], category: "Wood" },
  { id: "minecraft:mangrove_planks", name: "Mangrove Planks", rgb: [125, 55, 48], category: "Wood" },
  { id: "minecraft:cherry_planks", name: "Cherry Planks", rgb: [229, 141, 130], category: "Wood" },
  { id: "minecraft:bamboo_planks", name: "Bamboo Planks", rgb: [193, 168, 76], category: "Wood" },
  { id: "minecraft:crimson_planks", name: "Crimson Planks", rgb: [106, 33, 49], category: "Wood" },
  { id: "minecraft:warped_planks", name: "Warped Planks", rgb: [26, 110, 106], category: "Wood" },

  // --- Sand & Dirt ---
  { id: "minecraft:sand", name: "Sand", rgb: [219, 211, 160], category: "Natural" },
  { id: "minecraft:red_sand", name: "Red Sand", rgb: [180, 100, 56], category: "Natural" },
  { id: "minecraft:gravel", name: "Gravel", rgb: [136, 136, 120], category: "Natural" },
  { id: "minecraft:dirt", name: "Dirt", rgb: [134, 96, 67], category: "Natural" },
  { id: "minecraft:coarse_dirt", name: "Coarse Dirt", rgb: [119, 84, 58], category: "Natural" },
  { id: "minecraft:clay", name: "Clay", rgb: [158, 163, 170], category: "Natural" },
  { id: "minecraft:mud", name: "Mud", rgb: [59, 48, 55], category: "Natural" },

  // --- Snow & Ice ---
  { id: "minecraft:snow_block", name: "Snow Block", rgb: [239, 241, 241], category: "Frozen" },
  { id: "minecraft:ice", name: "Ice", rgb: [147, 191, 250], category: "Frozen" },
  { id: "minecraft:packed_ice", name: "Packed Ice", rgb: [125, 170, 251], category: "Frozen" },
  { id: "minecraft:blue_ice", name: "Blue Ice", rgb: [116, 169, 255], category: "Frozen" },

  // --- Mineral Blocks ---
  { id: "minecraft:coal_block", name: "Coal Block", rgb: [13, 13, 13], category: "Mineral" },
  { id: "minecraft:iron_block", name: "Iron Block", rgb: [219, 219, 224], category: "Mineral" },
  { id: "minecraft:gold_block", name: "Gold Block", rgb: [242, 224, 56], category: "Mineral" },
  { id: "minecraft:diamond_block", name: "Diamond Block", rgb: [127, 214, 211], category: "Mineral" },
  { id: "minecraft:emerald_block", name: "Emerald Block", rgb: [34, 203, 69], category: "Mineral" },
  { id: "minecraft:lapis_block", name: "Lapis Block", rgb: [28, 72, 163], category: "Mineral" },
  { id: "minecraft:redstone_block", name: "Redstone Block", rgb: [166, 21, 10], category: "Mineral" },
  { id: "minecraft:netherite_block", name: "Netherite Block", rgb: [60, 56, 57], category: "Mineral" },
  { id: "minecraft:amethyst_block", name: "Amethyst Block", rgb: [153, 105, 204], category: "Mineral" },
  { id: "minecraft:copper_block", name: "Copper Block", rgb: [193, 102, 54], category: "Mineral" },
  { id: "minecraft:exposed_copper", name: "Exposed Copper", rgb: [167, 117, 98], category: "Mineral" },
  { id: "minecraft:oxidized_copper", name: "Oxidized Copper", rgb: [87, 160, 120], category: "Mineral" },
  { id: "minecraft:quartz_block", name: "Quartz Block", rgb: [235, 229, 222], category: "Mineral" },

  // --- Nether ---
  { id: "minecraft:netherrack", name: "Netherrack", rgb: [122, 45, 45], category: "Nether" },
  { id: "minecraft:nether_bricks", name: "Nether Bricks", rgb: [42, 17, 20], category: "Nether" },
  { id: "minecraft:red_nether_bricks", name: "Red Nether Bricks", rgb: [92, 20, 20], category: "Nether" },
  { id: "minecraft:blackstone", name: "Blackstone", rgb: [42, 36, 41], category: "Nether" },
  { id: "minecraft:nether_wart_block", name: "Nether Wart Block", rgb: [119, 13, 13], category: "Nether" },
  { id: "minecraft:warped_wart_block", name: "Warped Wart Block", rgb: [24, 104, 86], category: "Nether" },
  { id: "minecraft:soul_sand", name: "Soul Sand", rgb: [84, 65, 45], category: "Nether" },
  { id: "minecraft:soul_soil", name: "Soul Soil", rgb: [77, 59, 42], category: "Nether" },
  { id: "minecraft:basalt", name: "Basalt", rgb: [87, 87, 98], category: "Nether" },
  { id: "minecraft:magma_block", name: "Magma Block", rgb: [136, 68, 21], category: "Nether" },
  { id: "minecraft:shroomlight", name: "Shroomlight", rgb: [240, 164, 52], category: "Nether" },
  { id: "minecraft:obsidian", name: "Obsidian", rgb: [13, 10, 24], category: "Nether" },
  { id: "minecraft:crying_obsidian", name: "Crying Obsidian", rgb: [29, 7, 53], category: "Nether" },

  // --- End ---
  { id: "minecraft:end_stone", name: "End Stone", rgb: [225, 221, 165], category: "End" },
  { id: "minecraft:purpur_block", name: "Purpur Block", rgb: [167, 118, 167], category: "End" },
  { id: "minecraft:end_stone_bricks", name: "End Stone Bricks", rgb: [224, 217, 153], category: "End" },

  // --- Nature / Misc ---
  { id: "minecraft:moss_block", name: "Moss Block", rgb: [97, 119, 57], category: "Nature" },
  { id: "minecraft:sea_lantern", name: "Sea Lantern", rgb: [171, 207, 206], category: "Nature" },
  { id: "minecraft:sponge", name: "Sponge", rgb: [196, 189, 44], category: "Nature" },
  { id: "minecraft:melon", name: "Melon", rgb: [114, 168, 64], category: "Nature" },
  { id: "minecraft:pumpkin", name: "Pumpkin", rgb: [197, 118, 24], category: "Nature" },
  { id: "minecraft:hay_block", name: "Hay Block", rgb: [164, 133, 12], category: "Nature" },
  { id: "minecraft:dried_kelp_block", name: "Dried Kelp Block", rgb: [61, 64, 45], category: "Nature" },

  // --- Brick & Decorative ---
  { id: "minecraft:bricks", name: "Bricks", rgb: [150, 97, 83], category: "Decorative" },
  { id: "minecraft:sandstone", name: "Sandstone", rgb: [216, 207, 157], category: "Decorative" },
  { id: "minecraft:red_sandstone", name: "Red Sandstone", rgb: [179, 97, 31], category: "Decorative" },
  { id: "minecraft:prismarine", name: "Prismarine", rgb: [99, 172, 158], category: "Decorative" },
  { id: "minecraft:dark_prismarine", name: "Dark Prismarine", rgb: [51, 104, 86], category: "Decorative" },
  { id: "minecraft:glowstone", name: "Glowstone", rgb: [171, 131, 75], category: "Decorative" },
  { id: "minecraft:honey_block", name: "Honey Block", rgb: [229, 148, 38], category: "Decorative" },
  { id: "minecraft:honeycomb_block", name: "Honeycomb Block", rgb: [229, 148, 29], category: "Decorative" },
  { id: "minecraft:bookshelf", name: "Bookshelf", rgb: [149, 121, 80], category: "Decorative" },
  { id: "minecraft:tnt", name: "TNT", rgb: [186, 52, 41], category: "Decorative" },
];

/**
 * Deduplicated list of category strings, in the order they first appear in
 * `MINECRAFT_BLOCKS`. Used to render the category filter buttons in the UI.
 */
export const BLOCK_CATEGORIES = Array.from(
  new Set(MINECRAFT_BLOCKS.map((b) => b.category))
);
