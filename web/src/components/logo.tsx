import Link from "next/link";

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-3 font-semibold tracking-[-.02em] ${inverse ? "text-white" : "text-ink"}`}>
      <span className={`grid size-9 place-items-center rounded-xl font-display text-lg font-bold ${inverse ? "bg-white text-ink" : "bg-ink text-cream"}`}>S</span>
      <span>ShapersAI</span>
    </Link>
  );
}
