import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import NavBar from "../../_components/NavBar";
import Footer from "../../_components/landing/Footer";
import CreationCard from "../../_components/CreationCard";
import { getDb } from "../../_lib/server/firebase-admin";
import { toCreationJson, type Creation, type UserProfile } from "../../_lib/creation";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mc-pixel.app";

interface ProfilePageProps {
  params: Promise<{ nickname: string }>;
}

async function getProfileData(nickname: string) {
  const db = getDb();

  // Nickname → userId
  const nicknameDoc = await db.collection("nicknames").doc(nickname).get();
  if (!nicknameDoc.exists) return null;
  const { userId } = nicknameDoc.data()!;

  // userId → user profile
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return null;
  const user = { userId, ...userDoc.data() } as UserProfile;

  // Public creations — sorted client-side to avoid composite index
  let creations: ReturnType<typeof toCreationJson>[] = [];
  try {
    const snap = await db
      .collection("creations")
      .where("authorId", "==", userId)
      .where("visibility", "==", "public")
      .get();

    creations = snap.docs
      .map((d) => toCreationJson({ id: d.id, ...d.data() } as Creation))
      .sort((a, b) => {
        const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return bTime - aTime;
      });
  } catch {
    creations = [];
  }

  return { user, creations };
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { nickname } = await params;
  const data = await getProfileData(nickname);
  if (!data) return { title: "Profile | mc-pixel" };

  const { user } = data;
  const title = `${user.displayName} (@${nickname}) | mc-pixel`;
  const description = user.bio
    ? user.bio.slice(0, 160)
    : `${user.displayName}'s Minecraft pixel art creations on mc-pixel.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/u/${nickname}`,
      images: user.avatarUrl ? [{ url: user.avatarUrl, alt: user.displayName }] : undefined,
    },
    twitter: {
      title,
      description,
      images: user.avatarUrl ? [user.avatarUrl] : undefined,
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { nickname } = await params;
  const data = await getProfileData(nickname);
  if (!data) notFound();

  const { user, creations } = data;

  const joinedDate = user.createdAt
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(
        user.createdAt.toDate(),
      )
    : null;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <NavBar />
      <main className="mx-auto max-w-5xl min-h-[calc(100vh-64px)] px-8 py-12">
        {/* Profile header */}
        <div className="mb-10 flex items-start gap-6">
          {user.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.displayName}
              width={80}
              height={80}
              className="rounded-full flex-shrink-0"
              unoptimized
            />
          ) : (
            <div className="h-20 w-20 flex-shrink-0 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-2xl font-bold text-gray-500 dark:text-zinc-400">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="flex flex-col gap-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight truncate">{user.displayName}</h1>
            <p className="text-sm text-grass">@{nickname}</p>
            {user.bio && (
              <p className="mt-1 text-sm text-gray-600 dark:text-zinc-400 leading-relaxed max-w-prose">
                {user.bio}
              </p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-zinc-500">
              <span>
                {creations.length}{" "}
                {creations.length === 1 ? "public creation" : "public creations"}
              </span>
              {joinedDate && <span>Joined {joinedDate}</span>}
            </div>
          </div>
        </div>

        {/* Creations grid */}
        {creations.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20 text-center">
            <p className="text-gray-500 dark:text-zinc-400">No public creations yet.</p>
            <Link
              href="/gallery"
              className="rounded-lg border border-gray-200 dark:border-zinc-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Browse the gallery →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {creations.map((creation) => (
              <Link key={creation.id} href={`/creations/${creation.id}`} className="block">
                <CreationCard creation={creation} variant="public" />
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
