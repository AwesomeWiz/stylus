import { GrowthPage } from "@/components/marketing/growth-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <GrowthPage kind="hypothesis" searchParams={searchParams} />;
}

export const metadata = { title: "Hypotheses" };
