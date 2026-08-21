import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveUser } from "@/app/_lib/server/identity";
import { getDb } from "@/app/_lib/server/firebase-admin";
import { toCreationJson, type Creation } from "@/app/_lib/creation";
import DashboardGrid from "./DashboardGrid";

export const metadata: Metadata = {
  title: "My Creations",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await resolveUser();
  if (!user) redirect("/sign-in");
  if (!user.nickname) redirect("/onboarding");

  const db = getDb();
  const snap = await db
    .collection("creations")
    .where("authorId", "==", user.userId)
    .limit(48)
    .get();

  const creations = snap.docs
    .map((d) => {
      const data = { id: d.id, ...d.data() } as Creation;
      return toCreationJson(data);
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return <DashboardGrid initialCreations={creations} />;
}
