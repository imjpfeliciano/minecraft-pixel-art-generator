import type { MetadataRoute } from "next";
import { getDb } from "./_lib/server/firebase-admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mc-pixel.app";

async function getPublicCreationUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getDb();
    const snap = await db
      .collection("creations")
      .where("visibility", "==", "public")
      .select("publishedAt")
      .get();

    return snap.docs.map((doc) => {
      const data = doc.data();
      const lastModified = data.publishedAt?.toDate?.() ?? new Date();
      return {
        url: `${SITE_URL}/creations/${doc.id}`,
        lastModified,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      };
    });
  } catch {
    return [];
  }
}

async function getPublicProfileUrls(): Promise<MetadataRoute.Sitemap> {
  try {
    const db = getDb();
    // Only profiles with at least one public creation
    const snap = await db
      .collection("users")
      .where("publicCreationCount", ">", 0)
      .select("nickname", "updatedAt")
      .get();

    return snap.docs
      .map((doc) => {
        const data = doc.data();
        if (!data.nickname) return null;
        return {
          url: `${SITE_URL}/u/${data.nickname}`,
          lastModified: data.updatedAt?.toDate?.() ?? new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        };
      })
      .filter(Boolean) as MetadataRoute.Sitemap;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [creationUrls, profileUrls] = await Promise.all([
    getPublicCreationUrls(),
    getPublicProfileUrls(),
  ]);

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/gallery`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/changelog`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.4,
    },
    ...creationUrls,
    ...profileUrls,
  ];
}
