import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveUser } from "@/app/_lib/server/identity";
import DashboardEmptyState from "./DashboardEmptyState";

export const metadata: Metadata = {
  title: "My Creations",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const user = await resolveUser();
  if (!user) redirect("/sign-in");
  if (!user.nickname) redirect("/onboarding");

  return <DashboardEmptyState />;
}
