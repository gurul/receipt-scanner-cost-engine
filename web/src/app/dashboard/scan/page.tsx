import { ReceiptScanner } from "./receipt-scanner";

export const metadata = { title: "Scan receipt" };

export default async function ScanPage({ searchParams }: { searchParams: Promise<{ jobId?: string }> }) {
  const { jobId } = await searchParams;
  return <ReceiptScanner initialJobId={jobId} />;
}
