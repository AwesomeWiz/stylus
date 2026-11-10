import { GrowthPage } from "@/components/marketing/growth-page";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  return <GrowthPage kind="experiment" searchParams={searchParams} />;
}
