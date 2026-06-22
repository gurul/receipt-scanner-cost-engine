"use client";

import { useEffect, useMemo, useState } from "react";
import { Camera, Check, CircleAlert, Images, LoaderCircle, RotateCcw, Upload } from "lucide-react";
import type { ProductCost, ValidatedMappedReceipt } from "@/lib/domain";
import { compressReceiptImage } from "@/lib/client/compress-image";

type Phase = "choose" | "uploading" | "review" | "committing" | "done";

export function ReceiptScanner({ initialJobId }: { initialJobId?: string }) {
  const [phase, setPhase] = useState<Phase>("choose");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<ValidatedMappedReceipt | null>(null);
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  useEffect(() => {
    if (!initialJobId) return;
    let active = true;
    fetch(`/api/scans/${initialJobId}`)
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load receipt review");
        return result;
      })
      .then((result) => {
        if (!active) return;
        setJobId(result.jobId);
        setReceipt(result.receipt);
        setPhase("review");
      })
      .catch((cause) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load receipt review");
      });
    return () => { active = false; };
  }, [initialJobId]);

  const unmapped = useMemo(
    () => receipt?.items.filter((item) => !item.matched_pattern).length ?? 0,
    [receipt],
  );

  async function scan() {
    if (!file) return;
    setError("");
    setPhase("uploading");
    try {
      const prepared = await compressReceiptImage(file);
      const form = new FormData();
      form.set("receipt", prepared);
      form.set("source", "website");
      const response = await fetch("/api/scans", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Receipt processing failed");
      setJobId(result.jobId);
      setReceipt(result.receipt);
      setPhase("review");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Receipt processing failed");
      setPhase("choose");
    }
  }

  async function commit() {
    if (!jobId || !receipt) return;
    setPhase("committing");
    setError("");
    const normalized = {
      ...receipt,
      mapping_stats: {
        total_items: receipt.items.length,
        mapped: receipt.items.filter((item) => !item.canonical_name.startsWith("UNMAPPED: ")).length,
        unmapped: receipt.items.filter((item) => item.canonical_name.startsWith("UNMAPPED: ")).length,
      },
    };
    const response = await fetch(`/api/scans/${jobId}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Could not commit receipt");
      setPhase("review");
      return;
    }
    setCosts(result.costs ?? []);
    setPhase("done");
  }

  function reset() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    setJobId(null);
    setReceipt(null);
    setCosts([]);
    setError("");
    setPhase("choose");
  }

  function selectFile(nextFile: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    setError("");
    if (nextFile && !nextFile.type.startsWith("image/")) {
      setFile(null);
      setPreview(null);
      setError("Choose a receipt photo or image file.");
      return;
    }
    setFile(nextFile);
    setPreview(nextFile ? URL.createObjectURL(nextFile) : null);
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-3xl py-12 text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-moss-soft text-moss"><Check size={25} /></div>
        <p className="mt-6 text-sm font-semibold text-moss">Receipt committed</p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.045em]">Costs and margins are up to date.</h1>
        <p className="mx-auto mt-4 max-w-xl text-ink-muted">{receipt?.items.length} purchase rows were written to your Google workbook.</p>
        {costs.length > 0 && <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">{costs.slice(0, 4).map((cost) => <div key={cost.product} className="panel p-4"><p className="font-semibold">{cost.product}</p><p className="mt-2 text-2xl font-semibold">${cost.total_cost_per_unit.toFixed(2)}<span className="text-sm font-normal text-ink-faint">/{cost.unit_name}</span></p>{cost.missing_prices.length > 0 && <p className="mt-2 text-xs text-rust">Missing: {cost.missing_prices.join(", ")}</p>}</div>)}</div>}
        <button type="button" onClick={reset} className="button-primary mt-8"><RotateCcw size={16} /> Scan another receipt</button>
      </div>
    );
  }

  return (
    <div>
      <div><p className="text-sm font-semibold text-moss">Receipt scanner</p><h1 className="mt-2 font-display text-3xl font-semibold tracking-[-.045em] sm:text-4xl">Capture a purchase</h1><p className="mt-2 text-ink-muted">Take a photo now or choose one from your phone. We save it to your Drive before asking Claude to read it.</p></div>

      {phase === "choose" || phase === "uploading" ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_21rem]">
          <section className="panel p-4 sm:p-8">
            <div className="flex min-h-[18rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/15 bg-sand/35 px-4 py-6 text-center sm:min-h-[22rem] sm:px-6">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Receipt preview" className="max-h-80 max-w-full rounded-xl object-contain shadow-lg" />
              ) : <><div className="grid size-14 place-items-center rounded-2xl bg-white text-moss shadow-sm"><Camera size={25} /></div><h2 className="mt-5 text-lg font-semibold">Take a photo or choose an image</h2><p className="mt-2 max-w-sm text-sm leading-6 text-ink-muted">Use a clear, straight-on image. The browser will resize it before upload.</p></>}
              <div className="mt-6 grid w-full max-w-sm gap-3 sm:grid-cols-2">
                <label className="button-primary min-h-12 cursor-pointer">
                  <Camera size={18} /> Take photo
                  <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
                </label>
                <label className="button-secondary min-h-12 cursor-pointer bg-white">
                  <Images size={18} /> Photo library
                  <input type="file" accept="image/*" className="sr-only" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} />
                </label>
              </div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-rust"><CircleAlert size={16} className="mr-2 inline" />{error}</p>}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-ink-faint">Your phone prepares the image before upload.</p><button type="button" disabled={!file || phase === "uploading"} onClick={scan} className="button-primary w-full sm:w-auto">{phase === "uploading" ? <><LoaderCircle size={17} className="animate-spin" /> Extracting receipt...</> : <><Upload size={17} /> Scan receipt</>}</button></div>
          </section>
          <aside className="panel h-fit p-5"><h2 className="font-semibold">Before you scan</h2><ol className="mt-4 space-y-4 text-sm leading-6 text-ink-muted"><li><b className="text-ink">1.</b> Include the full receipt and all line items.</li><li><b className="text-ink">2.</b> Avoid glare and heavy shadows.</li><li><b className="text-ink">3.</b> Review quantities, prices, and unmapped names before committing.</li></ol></aside>
        </div>
      ) : receipt && (
        <div className="mt-8">
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-moss/20 bg-moss-soft/45 p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">Claude found {receipt.items.length} items</p><p className="mt-1 text-sm text-ink-muted">{unmapped ? `${unmapped} need a canonical name or category.` : "Every item matched an existing alias."}</p></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${unmapped ? "bg-orange-100 text-orange-800" : "bg-white text-moss"}`}>{unmapped ? `${unmapped} to review` : "Ready to commit"}</span></div>

          <section className="panel mt-5 overflow-hidden">
            <div className="grid gap-4 border-b border-ink/8 p-4 sm:grid-cols-3 sm:p-5"><label><span className="field-label">Supplier</span><input className="field" value={receipt.merchant} onChange={(event) => setReceipt({ ...receipt, merchant: event.target.value })} /></label><label><span className="field-label">Date</span><input type="date" className="field" value={receipt.date ?? ""} onChange={(event) => setReceipt({ ...receipt, date: event.target.value })} /></label><label><span className="field-label">Receipt total</span><input type="number" inputMode="decimal" step="0.01" className="field" value={receipt.total} onChange={(event) => setReceipt({ ...receipt, total: Number(event.target.value) })} /></label></div>
            <div className="divide-y divide-ink/8 md:hidden">{receipt.items.map((item, index) => <article key={index} className={`p-4 ${!item.matched_pattern ? "bg-orange-50/55" : ""}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Item {index + 1}</p><p className="mt-1 text-sm text-ink-muted">{item.raw_description}</p></div>{!item.matched_pattern && <span className="shrink-0 rounded-full bg-orange-100 px-2 py-1 text-[11px] font-semibold text-orange-800">Review</span>}</div><div className="mt-4 grid grid-cols-2 gap-3"><label className="col-span-2"><span className="field-label">Canonical name</span><input className="field" value={item.canonical_name.replace(/^UNMAPPED: /, "")} onChange={(event) => updateItem(index, { canonical_name: event.target.value, matched_pattern: "manual" })} /></label><label className="col-span-2"><span className="field-label">Category</span><input className="field" value={item.category} onChange={(event) => updateItem(index, { category: event.target.value })} /></label><label><span className="field-label">Quantity</span><input className="field" type="number" inputMode="decimal" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></label><label><span className="field-label">Unit</span><input className="field" value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} /></label><label className="col-span-2"><span className="field-label">Line total</span><input className="field" type="number" inputMode="decimal" step="0.01" value={item.total_price} onChange={(event) => updateItem(index, { total_price: Number(event.target.value) })} /></label></div></article>)}</div>
            <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[840px] text-left text-sm"><thead className="bg-sand/60 text-xs uppercase tracking-wider text-ink-faint"><tr><th className="px-4 py-3">Receipt text</th><th className="px-4 py-3">Canonical name</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Qty</th><th className="px-4 py-3">Unit</th><th className="px-4 py-3">Total</th></tr></thead><tbody className="divide-y divide-ink/7">{receipt.items.map((item, index) => <tr key={index} className={!item.matched_pattern ? "bg-orange-50/55" : ""}><td className="max-w-56 px-4 py-3 text-xs text-ink-muted">{item.raw_description}</td><td className="px-4 py-2"><input className="field min-w-40" value={item.canonical_name.replace(/^UNMAPPED: /, "")} onChange={(event) => updateItem(index, { canonical_name: event.target.value, matched_pattern: "manual" })} /></td><td className="px-4 py-2"><input className="field min-w-32" value={item.category} onChange={(event) => updateItem(index, { category: event.target.value })} /></td><td className="px-4 py-2"><input className="field w-20" type="number" inputMode="decimal" step="0.01" value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></td><td className="px-4 py-2"><input className="field w-20" value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} /></td><td className="px-4 py-2"><input className="field w-24" type="number" inputMode="decimal" step="0.01" value={item.total_price} onChange={(event) => updateItem(index, { total_price: Number(event.target.value) })} /></td></tr>)}</tbody></table></div>
          </section>
          {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-medium text-rust">{error}</p>}
          <div className="mobile-action-bar mt-5 flex flex-col-reverse justify-between gap-3 sm:flex-row"><button type="button" disabled={phase === "committing"} onClick={reset} className="button-secondary w-full sm:w-auto">Discard and start over</button><button type="button" disabled={phase === "committing" || receipt.items.some((item) => !item.canonical_name.replace(/^UNMAPPED: /, "").trim())} onClick={commit} className="button-primary w-full sm:w-auto">{phase === "committing" ? <><LoaderCircle size={17} className="animate-spin" /> Updating workbook...</> : <><Check size={17} /> Confirm and update workbook</>}</button></div>
        </div>
      )}
    </div>
  );

  function updateItem(index: number, update: Partial<ValidatedMappedReceipt["items"][number]>) {
    if (!receipt) return;
    setReceipt({ ...receipt, items: receipt.items.map((item, itemIndex) => itemIndex === index ? { ...item, ...update } : item) });
  }
}
