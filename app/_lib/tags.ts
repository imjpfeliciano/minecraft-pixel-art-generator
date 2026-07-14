export type Tag = {
  slug: string;
  label: string;
  description?: string;
};

export const AVAILABLE_TAGS: Tag[] = [
  { slug: "animals", label: "Animals", description: "Pets, wildlife, and creatures" },
  { slug: "landscapes", label: "Landscapes", description: "Nature, mountains, and scenery" },
  { slug: "portraits", label: "Portraits", description: "Faces and people" },
  { slug: "gaming", label: "Gaming", description: "Game characters and icons" },
  { slug: "anime", label: "Anime", description: "Anime and manga art" },
  { slug: "buildings", label: "Buildings", description: "Architecture and structures" },
  { slug: "logos", label: "Logos", description: "Brand marks and symbols" },
  { slug: "flags", label: "Flags", description: "Country and regional flags" },
  { slug: "maps", label: "Maps", description: "World maps and geographic art" },
  { slug: "abstract", label: "Abstract", description: "Geometric and abstract designs" },
  { slug: "memes", label: "Memes", description: "Internet culture and memes" },
  { slug: "sports", label: "Sports", description: "Teams, players, and sports icons" },
];
