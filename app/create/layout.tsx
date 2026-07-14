import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Pixel Art",
  description:
    "Upload any image and convert it to a Minecraft block schematic in seconds. Choose your block palette, set dimensions, and export a .litematic file.",
  alternates: { canonical: "/create" },
  robots: { index: true, follow: true },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return children;
}
