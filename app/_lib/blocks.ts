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

/** Anchor palette (concrete, wool, terracotta) — default blocks for automatic color matching. */
export const GENERATION_BLOCKS: MinecraftBlock[] = [
  // --- Wool ---
  { id: "minecraft:black_wool", name: "Black Wool", rgb: [21, 21, 26], category: "Wool", texture: "wool_colored_black" },
  { id: "minecraft:blue_wool", name: "Blue Wool", rgb: [53, 57, 157], category: "Wool", texture: "wool_colored_blue" },
  { id: "minecraft:brown_wool", name: "Brown Wool", rgb: [114, 72, 41], category: "Wool", texture: "wool_colored_brown" },
  { id: "minecraft:cyan_wool", name: "Cyan Wool", rgb: [21, 138, 145], category: "Wool", texture: "wool_colored_cyan" },
  { id: "minecraft:gray_wool", name: "Gray Wool", rgb: [63, 68, 72], category: "Wool", texture: "wool_colored_gray" },
  { id: "minecraft:green_wool", name: "Green Wool", rgb: [85, 110, 28], category: "Wool", texture: "wool_colored_green" },
  { id: "minecraft:light_blue_wool", name: "Light Blue Wool", rgb: [58, 175, 217], category: "Wool", texture: "wool_colored_light_blue" },
  { id: "minecraft:light_gray_wool", name: "Light Gray Wool", rgb: [142, 142, 135], category: "Wool", texture: "wool_colored_silver" },
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
  { id: "minecraft:light_gray_concrete", name: "Light Gray Concrete", rgb: [125, 125, 115], category: "Concrete", texture: "concrete_silver" },
  { id: "minecraft:lime_concrete", name: "Lime Concrete", rgb: [94, 169, 25], category: "Concrete", texture: "concrete_lime" },
  { id: "minecraft:magenta_concrete", name: "Magenta Concrete", rgb: [169, 48, 159], category: "Concrete", texture: "concrete_magenta" },
  { id: "minecraft:orange_concrete", name: "Orange Concrete", rgb: [224, 97, 1], category: "Concrete", texture: "concrete_orange" },
  { id: "minecraft:pink_concrete", name: "Pink Concrete", rgb: [214, 101, 143], category: "Concrete", texture: "concrete_pink" },
  { id: "minecraft:purple_concrete", name: "Purple Concrete", rgb: [100, 32, 156], category: "Concrete", texture: "concrete_purple" },
  { id: "minecraft:red_concrete", name: "Red Concrete", rgb: [142, 33, 33], category: "Concrete", texture: "concrete_red" },
  { id: "minecraft:white_concrete", name: "White Concrete", rgb: [207, 213, 214], category: "Concrete", texture: "concrete_white" },
  { id: "minecraft:yellow_concrete", name: "Yellow Concrete", rgb: [241, 175, 21], category: "Concrete", texture: "concrete_yellow" },
  // --- Terracotta ---
  { id: "minecraft:terracotta", name: "Terracotta", rgb: [152, 94, 68], category: "Terracotta", texture: "hardened_clay" },
  { id: "minecraft:black_terracotta", name: "Black Terracotta", rgb: [37, 23, 16], category: "Terracotta", texture: "hardened_clay_stained_black" },
  { id: "minecraft:blue_terracotta", name: "Blue Terracotta", rgb: [74, 60, 91], category: "Terracotta", texture: "hardened_clay_stained_blue" },
  { id: "minecraft:brown_terracotta", name: "Brown Terracotta", rgb: [77, 51, 36], category: "Terracotta", texture: "hardened_clay_stained_brown" },
  { id: "minecraft:cyan_terracotta", name: "Cyan Terracotta", rgb: [87, 91, 91], category: "Terracotta", texture: "hardened_clay_stained_cyan" },
  { id: "minecraft:gray_terracotta", name: "Gray Terracotta", rgb: [58, 42, 36], category: "Terracotta", texture: "hardened_clay_stained_gray" },
  { id: "minecraft:green_terracotta", name: "Green Terracotta", rgb: [76, 83, 42], category: "Terracotta", texture: "hardened_clay_stained_green" },
  { id: "minecraft:light_blue_terracotta", name: "Light Blue Terracotta", rgb: [113, 109, 138], category: "Terracotta", texture: "hardened_clay_stained_light_blue" },
  { id: "minecraft:light_gray_terracotta", name: "Light Gray Terracotta", rgb: [135, 107, 98], category: "Terracotta", texture: "hardened_clay_stained_silver" },
  { id: "minecraft:lime_terracotta", name: "Lime Terracotta", rgb: [104, 118, 53], category: "Terracotta", texture: "hardened_clay_stained_lime" },
  { id: "minecraft:magenta_terracotta", name: "Magenta Terracotta", rgb: [150, 88, 109], category: "Terracotta", texture: "hardened_clay_stained_magenta" },
  { id: "minecraft:orange_terracotta", name: "Orange Terracotta", rgb: [162, 84, 38], category: "Terracotta", texture: "hardened_clay_stained_orange" },
  { id: "minecraft:pink_terracotta", name: "Pink Terracotta", rgb: [162, 78, 79], category: "Terracotta", texture: "hardened_clay_stained_pink" },
  { id: "minecraft:purple_terracotta", name: "Purple Terracotta", rgb: [118, 70, 86], category: "Terracotta", texture: "hardened_clay_stained_purple" },
  { id: "minecraft:red_terracotta", name: "Red Terracotta", rgb: [143, 61, 47], category: "Terracotta", texture: "hardened_clay_stained_red" },
  { id: "minecraft:white_terracotta", name: "White Terracotta", rgb: [210, 178, 161], category: "Terracotta", texture: "hardened_clay_stained_white" },
  { id: "minecraft:yellow_terracotta", name: "Yellow Terracotta", rgb: [186, 133, 35], category: "Terracotta", texture: "hardened_clay_stained_yellow" },
];

/** Full catalog of solid blocks — used by the block picker and manual replace flows. */
export const MINECRAFT_BLOCKS: MinecraftBlock[] = [
  ...GENERATION_BLOCKS,
  // --- Stone ---
  { id: "minecraft:stone", name: "Stone", rgb: [126, 126, 126], category: "Stone", texture: "stone" },
  { id: "minecraft:cobblestone", name: "Cobblestone", rgb: [115, 115, 115], category: "Stone", texture: "cobblestone" },
  { id: "minecraft:mossy_cobblestone", name: "Mossy Cobblestone", rgb: [108, 108, 108], category: "Stone", texture: "cobblestone_mossy" },
  { id: "minecraft:smooth_stone", name: "Smooth Stone", rgb: [158, 158, 158], category: "Stone", texture: "smooth_stone" },
  { id: "minecraft:granite", name: "Granite", rgb: [149, 103, 86], category: "Stone", texture: "stone_granite" },
  { id: "minecraft:polished_granite", name: "Polished Granite", rgb: [154, 106, 89], category: "Stone", texture: "stone_granite_smooth" },
  { id: "minecraft:diorite", name: "Diorite", rgb: [189, 189, 189], category: "Stone", texture: "stone_diorite" },
  { id: "minecraft:polished_diorite", name: "Polished Diorite", rgb: [193, 193, 193], category: "Stone", texture: "stone_diorite_smooth" },
  { id: "minecraft:andesite", name: "Andesite", rgb: [136, 136, 136], category: "Stone", texture: "stone_andesite" },
  { id: "minecraft:polished_andesite", name: "Polished Andesite", rgb: [132, 132, 132], category: "Stone", texture: "stone_andesite_smooth" },
  { id: "minecraft:stone_bricks", name: "Stone Bricks", rgb: [122, 122, 122], category: "Stone", texture: "stonebrick" },
  { id: "minecraft:mossy_stone_bricks", name: "Mossy Stone Bricks", rgb: [115, 115, 115], category: "Stone", texture: "stonebrick_mossy" },
  { id: "minecraft:cracked_stone_bricks", name: "Cracked Stone Bricks", rgb: [118, 118, 118], category: "Stone", texture: "stonebrick_cracked" },
  { id: "minecraft:chiseled_stone_bricks", name: "Chiseled Stone Bricks", rgb: [120, 120, 120], category: "Stone", texture: "stonebrick_carved" },
  { id: "minecraft:deepslate", name: "Deepslate", rgb: [80, 80, 82], category: "Stone", texture: "deepslate_top" },
  { id: "minecraft:cobbled_deepslate", name: "Cobbled Deepslate", rgb: [77, 77, 79], category: "Stone", texture: "cobbled_deepslate" },
  { id: "minecraft:polished_deepslate", name: "Polished Deepslate", rgb: [72, 72, 74], category: "Stone", texture: "polished_deepslate" },
  { id: "minecraft:deepslate_bricks", name: "Deepslate Bricks", rgb: [70, 70, 72], category: "Stone", texture: "deepslate_bricks" },
  { id: "minecraft:deepslate_tiles", name: "Deepslate Tiles", rgb: [68, 68, 70], category: "Stone", texture: "deepslate_tiles" },
  { id: "minecraft:cracked_deepslate_bricks", name: "Cracked Deepslate Bricks", rgb: [68, 68, 70], category: "Stone", texture: "cracked_deepslate_bricks" },
  { id: "minecraft:cracked_deepslate_tiles", name: "Cracked Deepslate Tiles", rgb: [66, 66, 68], category: "Stone", texture: "cracked_deepslate_tiles" },
  { id: "minecraft:chiseled_deepslate", name: "Chiseled Deepslate", rgb: [64, 64, 66], category: "Stone", texture: "chiseled_deepslate" },
  { id: "minecraft:tuff", name: "Tuff", rgb: [108, 109, 102], category: "Stone", texture: "tuff" },
  { id: "minecraft:polished_tuff", name: "Polished Tuff", rgb: [104, 105, 98], category: "Stone", texture: "polished_tuff" },
  { id: "minecraft:tuff_bricks", name: "Tuff Bricks", rgb: [100, 101, 94], category: "Stone", texture: "tuff_bricks" },
  { id: "minecraft:chiseled_tuff", name: "Chiseled Tuff", rgb: [96, 97, 90], category: "Stone", texture: "chiseled_tuff" },
  { id: "minecraft:chiseled_tuff_bricks", name: "Chiseled Tuff Bricks", rgb: [92, 93, 86], category: "Stone", texture: "chiseled_tuff_bricks" },
  { id: "minecraft:calcite", name: "Calcite", rgb: [223, 223, 210], category: "Stone", texture: "calcite" },
  // --- Wood ---
  { id: "minecraft:oak_planks", name: "Oak Planks", rgb: [162, 130, 78], category: "Wood", texture: "planks_oak" },
  { id: "minecraft:spruce_planks", name: "Spruce Planks", rgb: [115, 85, 49], category: "Wood", texture: "planks_spruce" },
  { id: "minecraft:birch_planks", name: "Birch Planks", rgb: [196, 179, 123], category: "Wood", texture: "planks_birch" },
  { id: "minecraft:jungle_planks", name: "Jungle Planks", rgb: [160, 115, 81], category: "Wood", texture: "planks_jungle" },
  { id: "minecraft:acacia_planks", name: "Acacia Planks", rgb: [168, 90, 50], category: "Wood", texture: "planks_acacia" },
  { id: "minecraft:dark_oak_planks", name: "Dark Oak Planks", rgb: [66, 43, 20], category: "Wood", texture: "planks_dark_oak" },
  { id: "minecraft:mangrove_planks", name: "Mangrove Planks", rgb: [117, 54, 48], category: "Wood", texture: "planks_mangrove" },
  { id: "minecraft:cherry_planks", name: "Cherry Planks", rgb: [226, 178, 172], category: "Wood", texture: "planks_cherry" },
  { id: "minecraft:bamboo_planks", name: "Bamboo Planks", rgb: [194, 175, 75], category: "Wood", texture: "bamboo_planks" },
  { id: "minecraft:crimson_planks", name: "Crimson Planks", rgb: [101, 48, 70], category: "Wood", texture: "planks_crimson" },
  { id: "minecraft:warped_planks", name: "Warped Planks", rgb: [43, 104, 99], category: "Wood", texture: "planks_warped" },
  // --- Natural ---
  { id: "minecraft:sand", name: "Sand", rgb: [219, 207, 163], category: "Natural", texture: "sand" },
  { id: "minecraft:red_sand", name: "Red Sand", rgb: [190, 102, 33], category: "Natural", texture: "red_sand" },
  { id: "minecraft:gravel", name: "Gravel", rgb: [131, 127, 126], category: "Natural", texture: "gravel" },
  { id: "minecraft:dirt", name: "Dirt", rgb: [134, 96, 67], category: "Natural", texture: "dirt" },
  { id: "minecraft:coarse_dirt", name: "Coarse Dirt", rgb: [119, 85, 59], category: "Natural", texture: "coarse_dirt" },
  { id: "minecraft:grass_block", name: "Grass Block", rgb: [89, 125, 39], category: "Natural", texture: "grass_top" },
  { id: "minecraft:podzol", name: "Podzol", rgb: [91, 63, 24], category: "Natural", texture: "podzol_top" },
  { id: "minecraft:mycelium", name: "Mycelium", rgb: [111, 99, 107], category: "Natural", texture: "mycelium_top" },
  { id: "minecraft:clay", name: "Clay", rgb: [160, 166, 179], category: "Natural", texture: "clay" },
  { id: "minecraft:mud", name: "Mud", rgb: [60, 57, 53], category: "Natural", texture: "mud" },
  { id: "minecraft:packed_mud", name: "Packed Mud", rgb: [142, 106, 79], category: "Natural", texture: "packed_mud" },
  { id: "minecraft:mud_bricks", name: "Mud Bricks", rgb: [137, 104, 77], category: "Natural", texture: "mud_bricks" },
  { id: "minecraft:muddy_mangrove_roots", name: "Muddy Mangrove Roots", rgb: [68, 59, 49], category: "Natural", texture: "muddy_mangrove_roots_top" },
  // --- Frozen ---
  { id: "minecraft:snow_block", name: "Snow Block", rgb: [249, 253, 253], category: "Frozen", texture: "snow" },
  { id: "minecraft:ice", name: "Ice", rgb: [145, 183, 253], category: "Frozen", texture: "ice" },
  { id: "minecraft:packed_ice", name: "Packed Ice", rgb: [141, 180, 250], category: "Frozen", texture: "packed_ice" },
  { id: "minecraft:blue_ice", name: "Blue Ice", rgb: [116, 167, 253], category: "Frozen", texture: "blue_ice" },
  // --- Mineral ---
  { id: "minecraft:coal_block", name: "Coal Block", rgb: [16, 16, 16], category: "Mineral", texture: "coal_block" },
  { id: "minecraft:iron_block", name: "Block of Iron", rgb: [220, 220, 220], category: "Mineral", texture: "iron_block" },
  { id: "minecraft:gold_block", name: "Block of Gold", rgb: [249, 236, 79], category: "Mineral", texture: "gold_block" },
  { id: "minecraft:diamond_block", name: "Block of Diamond", rgb: [99, 219, 213], category: "Mineral", texture: "diamond_block" },
  { id: "minecraft:emerald_block", name: "Block of Emerald", rgb: [28, 167, 55], category: "Mineral", texture: "emerald_block" },
  { id: "minecraft:lapis_block", name: "Block of Lapis Lazuli", rgb: [38, 67, 138], category: "Mineral", texture: "lapis_block" },
  { id: "minecraft:redstone_block", name: "Block of Redstone", rgb: [171, 27, 4], category: "Mineral", texture: "redstone_block" },
  { id: "minecraft:amethyst_block", name: "Block of Amethyst", rgb: [133, 97, 191], category: "Mineral", texture: "amethyst_block" },
  { id: "minecraft:raw_iron_block", name: "Block of Raw Iron", rgb: [216, 175, 154], category: "Mineral", texture: "raw_iron_block" },
  { id: "minecraft:raw_gold_block", name: "Block of Raw Gold", rgb: [221, 169, 41], category: "Mineral", texture: "raw_gold_block" },
  { id: "minecraft:raw_copper_block", name: "Block of Raw Copper", rgb: [154, 101, 75], category: "Mineral", texture: "raw_copper_block" },
  { id: "minecraft:copper_block", name: "Block of Copper", rgb: [192, 127, 88], category: "Mineral", texture: "copper_block" },
  { id: "minecraft:exposed_copper", name: "Exposed Copper", rgb: [161, 125, 103], category: "Mineral", texture: "exposed_copper" },
  { id: "minecraft:weathered_copper", name: "Weathered Copper", rgb: [109, 145, 110], category: "Mineral", texture: "weathered_copper" },
  { id: "minecraft:oxidized_copper", name: "Oxidized Copper", rgb: [82, 162, 132], category: "Mineral", texture: "oxidized_copper" },
  { id: "minecraft:waxed_copper_block", name: "Waxed Copper Block", rgb: [192, 127, 88], category: "Mineral", texture: "waxed_copper" },
  { id: "minecraft:waxed_exposed_copper", name: "Waxed Exposed Copper", rgb: [161, 125, 103], category: "Mineral", texture: "waxed_exposed_copper" },
  { id: "minecraft:waxed_weathered_copper", name: "Waxed Weathered Copper", rgb: [109, 145, 110], category: "Mineral", texture: "waxed_weathered_copper" },
  { id: "minecraft:waxed_oxidized_copper", name: "Waxed Oxidized Copper", rgb: [82, 162, 132], category: "Mineral", texture: "waxed_oxidized_copper" },
  { id: "minecraft:cut_copper", name: "Cut Copper", rgb: [191, 126, 87], category: "Mineral", texture: "cut_copper" },
  { id: "minecraft:exposed_cut_copper", name: "Exposed Cut Copper", rgb: [160, 124, 102], category: "Mineral", texture: "exposed_cut_copper" },
  { id: "minecraft:weathered_cut_copper", name: "Weathered Cut Copper", rgb: [108, 144, 109], category: "Mineral", texture: "weathered_cut_copper" },
  { id: "minecraft:oxidized_cut_copper", name: "Oxidized Cut Copper", rgb: [81, 161, 131], category: "Mineral", texture: "oxidized_cut_copper" },
  { id: "minecraft:quartz_block", name: "Quartz Block", rgb: [236, 230, 223], category: "Mineral", texture: "quartz_block_side" },
  { id: "minecraft:quartz_bricks", name: "Quartz Bricks", rgb: [235, 229, 222], category: "Mineral", texture: "quartz_bricks" },
  { id: "minecraft:chiseled_quartz_block", name: "Chiseled Quartz Block", rgb: [231, 226, 218], category: "Mineral", texture: "chiseled_quartz_block" },
  { id: "minecraft:smooth_quartz", name: "Smooth Quartz", rgb: [236, 230, 223], category: "Mineral", texture: "smooth_quartz" },
  // --- Nether ---
  { id: "minecraft:nether_bricks", name: "Nether Bricks", rgb: [44, 21, 26], category: "Nether", texture: "nether_brick" },
  { id: "minecraft:red_nether_bricks", name: "Red Nether Bricks", rgb: [69, 7, 9], category: "Nether", texture: "red_nether_brick" },
  { id: "minecraft:nether_wart_block", name: "Nether Wart Block", rgb: [114, 2, 2], category: "Nether", texture: "nether_wart_block" },
  { id: "minecraft:soul_sand", name: "Soul Sand", rgb: [81, 62, 50], category: "Nether", texture: "soul_sand" },
  { id: "minecraft:soul_soil", name: "Soul Soil", rgb: [75, 57, 46], category: "Nether", texture: "soul_soil" },
  { id: "minecraft:basalt", name: "Basalt", rgb: [72, 72, 78], category: "Nether", texture: "basalt_top" },
  { id: "minecraft:polished_basalt", name: "Polished Basalt", rgb: [88, 88, 94], category: "Nether", texture: "polished_basalt_side" },
  { id: "minecraft:blackstone", name: "Blackstone", rgb: [42, 36, 41], category: "Nether", texture: "blackstone_top" },
  { id: "minecraft:polished_blackstone", name: "Polished Blackstone", rgb: [53, 48, 56], category: "Nether", texture: "polished_blackstone" },
  { id: "minecraft:polished_blackstone_bricks", name: "Polished Blackstone Bricks", rgb: [48, 42, 49], category: "Nether", texture: "polished_blackstone_bricks" },
  { id: "minecraft:cracked_polished_blackstone_bricks", name: "Cracked Polished Blackstone Bricks", rgb: [44, 38, 45], category: "Nether", texture: "cracked_polished_blackstone_bricks" },
  { id: "minecraft:chiseled_polished_blackstone", name: "Chiseled Polished Blackstone", rgb: [52, 46, 54], category: "Nether", texture: "chiseled_polished_blackstone" },
  { id: "minecraft:gilded_blackstone", name: "Gilded Blackstone", rgb: [55, 42, 38], category: "Nether", texture: "gilded_blackstone" },
  { id: "minecraft:crimson_nylium", name: "Crimson Nylium", rgb: [131, 18, 18], category: "Nether", texture: "crimson_nylium" },
  { id: "minecraft:warped_nylium", name: "Warped Nylium", rgb: [43, 133, 133], category: "Nether", texture: "warped_nylium" },
  { id: "minecraft:netherite_block", name: "Block of Netherite", rgb: [66, 61, 63], category: "Nether", texture: "netherite_block" },
  { id: "minecraft:ancient_debris", name: "Ancient Debris", rgb: [96, 73, 59], category: "Nether", texture: "ancient_debris_top" },
  { id: "minecraft:shroomlight", name: "Shroomlight", rgb: [240, 146, 70], category: "Nether", texture: "shroomlight" },
  { id: "minecraft:obsidian", name: "Obsidian", rgb: [15, 11, 23], category: "Nether", texture: "obsidian" },
  { id: "minecraft:crying_obsidian", name: "Crying Obsidian", rgb: [32, 10, 60], category: "Nether", texture: "crying_obsidian" },
  { id: "minecraft:magma_block", name: "Magma Block", rgb: [153, 57, 18], category: "Nether", texture: "magma" },
  // --- End ---
  { id: "minecraft:end_stone", name: "End Stone", rgb: [219, 222, 158], category: "End", texture: "end_stone" },
  { id: "minecraft:end_stone_bricks", name: "End Stone Bricks", rgb: [218, 224, 162], category: "End", texture: "end_bricks" },
  { id: "minecraft:purpur_block", name: "Purpur Block", rgb: [170, 126, 170], category: "End", texture: "purpur_block" },
  { id: "minecraft:purpur_pillar", name: "Purpur Pillar", rgb: [171, 129, 171], category: "End", texture: "purpur_pillar" },
  // --- Nature ---
  { id: "minecraft:moss_block", name: "Moss Block", rgb: [89, 109, 45], category: "Nature", texture: "moss_block" },
  { id: "minecraft:sponge", name: "Sponge", rgb: [195, 192, 74], category: "Nature", texture: "sponge" },
  { id: "minecraft:wet_sponge", name: "Wet Sponge", rgb: [171, 181, 59], category: "Nature", texture: "sponge_wet" },
  { id: "minecraft:sea_lantern", name: "Sea Lantern", rgb: [172, 199, 190], category: "Nature", texture: "sea_lantern" },
  { id: "minecraft:prismarine", name: "Prismarine", rgb: [99, 156, 137], category: "Nature", texture: "prismarine" },
  { id: "minecraft:prismarine_bricks", name: "Prismarine Bricks", rgb: [99, 171, 158], category: "Nature", texture: "prismarine_bricks" },
  { id: "minecraft:dark_prismarine", name: "Dark Prismarine", rgb: [51, 91, 75], category: "Nature", texture: "dark_prismarine" },
  { id: "minecraft:melon", name: "Melon", rgb: [111, 144, 30], category: "Nature", texture: "melon_side" },
  { id: "minecraft:pumpkin", name: "Pumpkin", rgb: [198, 118, 24], category: "Nature", texture: "pumpkin_side" },
  { id: "minecraft:hay_block", name: "Hay Block", rgb: [166, 139, 12], category: "Nature", texture: "hay_block_side" },
  { id: "minecraft:dried_kelp_block", name: "Dried Kelp Block", rgb: [58, 89, 49], category: "Nature", texture: "dried_kelp_block_side_a" },
  { id: "minecraft:sculk", name: "Sculk", rgb: [12, 32, 46], category: "Nature", texture: "sculk" },
  { id: "minecraft:sculk_catalyst", name: "Sculk Catalyst", rgb: [22, 52, 66], category: "Nature", texture: "sculk_catalyst_top" },
  { id: "minecraft:mangrove_roots", name: "Mangrove Roots", rgb: [74, 61, 53], category: "Nature", texture: "mangrove_roots_top" },
  // --- Decorative ---
  { id: "minecraft:sandstone", name: "Sandstone", rgb: [216, 203, 155], category: "Decorative", texture: "sandstone_top" },
  { id: "minecraft:red_sandstone", name: "Red Sandstone", rgb: [186, 99, 29], category: "Decorative", texture: "red_sandstone_top" },
  { id: "minecraft:chiseled_sandstone", name: "Chiseled Sandstone", rgb: [216, 203, 155], category: "Decorative", texture: "chiseled_sandstone" },
  { id: "minecraft:chiseled_red_sandstone", name: "Chiseled Red Sandstone", rgb: [186, 99, 29], category: "Decorative", texture: "chiseled_red_sandstone" },
  { id: "minecraft:smooth_sandstone", name: "Smooth Sandstone", rgb: [216, 203, 155], category: "Decorative", texture: "smooth_sandstone" },
  { id: "minecraft:smooth_red_sandstone", name: "Smooth Red Sandstone", rgb: [186, 99, 29], category: "Decorative", texture: "smooth_red_sandstone" },
  { id: "minecraft:cut_sandstone", name: "Cut Sandstone", rgb: [216, 203, 155], category: "Decorative", texture: "cut_sandstone" },
  { id: "minecraft:cut_red_sandstone", name: "Cut Red Sandstone", rgb: [186, 99, 29], category: "Decorative", texture: "cut_red_sandstone" },
  { id: "minecraft:bricks", name: "Bricks", rgb: [150, 97, 83], category: "Decorative", texture: "brick" },
  { id: "minecraft:glowstone", name: "Glowstone", rgb: [171, 131, 84], category: "Decorative", texture: "glowstone" },
  { id: "minecraft:honey_block", name: "Honey Block", rgb: [229, 148, 29], category: "Decorative", texture: "honey_block_side" },
  { id: "minecraft:honeycomb_block", name: "Honeycomb Block", rgb: [229, 148, 29], category: "Decorative", texture: "honeycomb" },
  { id: "minecraft:bookshelf", name: "Bookshelf", rgb: [162, 130, 78], category: "Decorative", texture: "bookshelf" },
  { id: "minecraft:tnt", name: "TNT", rgb: [219, 68, 58], category: "Decorative", texture: "tnt_side" },
  { id: "minecraft:target", name: "Target", rgb: [226, 173, 164], category: "Decorative", texture: "target_top" },
];

/**
 * Deduplicated list of category strings, in the order they first appear in
 * `MINECRAFT_BLOCKS`. Used to render the category filter buttons in the UI.
 */
export const BLOCK_CATEGORIES = Array.from(
  new Set(MINECRAFT_BLOCKS.map((b) => b.category))
);

/** Categories available in the generation anchor palette. */
export const GENERATION_BLOCK_CATEGORIES = Array.from(
  new Set(GENERATION_BLOCKS.map((b) => b.category))
);
