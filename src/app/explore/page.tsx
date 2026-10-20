import { Explorer } from "@/components/explore/explorer";

export const metadata = { title: "Data explorer" };

export default async function Page({ searchParams }: { searchParams: Promise<{ category?: string; q?: string }> }) {
  const params = await searchParams;
  return <Explorer initialCategory={params.category === "economy" ? "national_accounts" : undefined} initialQuestion={params.q} />;
}
