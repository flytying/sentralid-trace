import { Workspace } from "@/components/investigate/Workspace";
import { isSampleKey } from "@/lib/samples";

export const metadata = { title: "Check a booking — SentralID Trace" };

export default async function InvestigatePage({ searchParams }: { searchParams: Promise<{ sample?: string }> }) {
  const { sample } = await searchParams;
  const key = isSampleKey(sample) ? sample : null;
  return <Workspace key={key ?? "new"} sampleKey={key} />;
}
