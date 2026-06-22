"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { createBusinessConfig, type BusinessTemplate } from "@/lib/domain";

type Cost = { name: string; amount: number };
type Ingredient = { name: string; qty: number; unit: string };

const templateOptions: Array<{ id: BusinessTemplate; label: string; detail: string }> = [
  { id: "restaurant", label: "Restaurant", detail: "Ingredients, menu items, dine-in and takeout" },
  { id: "retail", label: "Retail", detail: "Inventory, products, retail and wholesale" },
  { id: "service", label: "Service", detail: "Materials, jobs, labor and standard rates" },
  { id: "blank", label: "Start blank", detail: "A clean setup for any other business" },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [template, setTemplate] = useState<BusinessTemplate>("restaurant");
  const defaults = useMemo(() => createBusinessConfig(template, "New business"), [template]);
  const [businessName, setBusinessName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [suppliers, setSuppliers] = useState("");
  const [categories, setCategories] = useState("");
  const [unitName, setUnitName] = useState("");
  const [monthlyProduction, setMonthlyProduction] = useState(0);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [productName, setProductName] = useState("");
  const [batchSize, setBatchSize] = useState(1);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [ingredients, setIngredients] = useState<Ingredient[]>([{ name: "", qty: 1, unit: "ea" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function applyTemplate(id: BusinessTemplate) {
    setTemplate(id);
    const next = createBusinessConfig(id, businessName || "New business");
    setCategories(next.items.categories.join(", "));
    setUnitName(next.products.unit_name);
    setCosts(next.overhead.cost_categories.map((cost) => ({ name: cost.name, amount: 0 })));
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const config = createBusinessConfig(template, businessName.trim());
      config.business.currency = currency.toUpperCase();
      config.business.typical_suppliers = suppliers.split(",").map((item) => item.trim()).filter(Boolean);
      config.items.categories = categories.split(",").map((item) => item.trim()).filter(Boolean);
      config.products.unit_name = unitName.trim();
      config.overhead.monthly_production = monthlyProduction;
      config.overhead.cost_categories = costs.filter((cost) => cost.name.trim()).map((cost) => ({ name: cost.name.trim(), monthly_amount: Number(cost.amount) || 0 }));

      if (productName.trim()) {
        config.products.recipes[productName.trim()] = {
          size: "",
          batch_size: batchSize,
          ingredients: Object.fromEntries(
            ingredients.filter((item) => item.name.trim()).map((item) => [item.name.trim(), { qty: item.qty, unit: item.unit }]),
          ),
        };
        const firstTier = Object.keys(config.pricing.tiers)[0];
        if (firstTier && sellingPrice > 0) {
          config.pricing.tiers[firstTier].prices[productName.trim()] = { per_unit: sellingPrice };
        }
      }

      const response = await fetch("/api/workspace/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Setup failed");
      router.push("/dashboard/settings?setup=anthropic");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Setup failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div><p className="text-sm font-semibold text-moss">Business setup</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-[-.045em]">Build your private cost workspace</h1></div>
        <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted">Step {step + 1} of 3</span>
      </div>
      <div className="mb-7 grid grid-cols-3 gap-2">{[0, 1, 2].map((value) => <div key={value} className={`h-1.5 rounded-full ${value <= step ? "bg-moss" : "bg-ink/10"}`} />)}</div>

      <section className="panel p-5 sm:p-8">
        {step === 0 && (
          <div>
            <h2 className="text-xl font-semibold">What kind of business is this?</h2>
            <p className="mt-2 text-sm text-ink-muted">A template gives you useful categories and cost labels. Everything remains editable.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">{templateOptions.map((option) => <button key={option.id} type="button" onClick={() => applyTemplate(option.id)} className={`rounded-xl border p-4 text-left transition ${template === option.id ? "border-moss bg-moss-soft/50" : "border-ink/10 hover:border-ink/25"}`}><div className="flex items-center justify-between"><b>{option.label}</b>{template === option.id && <Check size={17} className="text-moss" />}</div><p className="mt-2 text-sm leading-6 text-ink-muted">{option.detail}</p></button>)}</div>
            <div className="mt-7 grid gap-5 sm:grid-cols-2"><label><span className="field-label">Business name</span><input className="field" value={businessName} onChange={(event) => setBusinessName(event.target.value)} placeholder="Spring Roll House" /></label><label><span className="field-label">Currency</span><input className="field uppercase" maxLength={3} value={currency} onChange={(event) => setCurrency(event.target.value)} /></label></div>
            <label className="mt-5 block"><span className="field-label">Common suppliers <em className="font-normal">(comma separated)</em></span><input className="field" value={suppliers} onChange={(event) => setSuppliers(event.target.value)} placeholder="Restaurant Depot, Costco" /></label>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold">Set the shape of your costs</h2>
            <p className="mt-2 text-sm text-ink-muted">These values turn monthly expenses into a per-product cost.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2"><label><span className="field-label">What do you sell? <em className="font-normal">(unit name)</em></span><input className="field" value={unitName || defaults.products.unit_name} onChange={(event) => setUnitName(event.target.value)} /></label><label><span className="field-label">Units produced per month</span><input className="field" type="number" min="0" value={monthlyProduction} onChange={(event) => setMonthlyProduction(Number(event.target.value))} /></label></div>
            <label className="mt-5 block"><span className="field-label">Purchase categories</span><input className="field" value={categories || defaults.items.categories.join(", ")} onChange={(event) => setCategories(event.target.value)} /></label>
            <div className="mt-7 flex items-center justify-between"><h3 className="font-semibold">Monthly overhead</h3><button type="button" className="text-sm font-semibold text-moss" onClick={() => setCosts([...costs, { name: "", amount: 0 }])}><Plus size={15} className="inline" /> Add cost</button></div>
            <div className="mt-3 space-y-3">{(costs.length ? costs : defaults.overhead.cost_categories.map((item) => ({ name: item.name, amount: 0 }))).map((cost, index) => <div key={`${cost.name}-${index}`} className="grid grid-cols-[1fr_9rem_2rem] gap-2"><input className="field" value={cost.name} onChange={(event) => setCosts((current) => { const source = current.length ? current : defaults.overhead.cost_categories.map((item) => ({ name: item.name, amount: 0 })); return source.map((item, i) => i === index ? { ...item, name: event.target.value } : item); })} placeholder="Labor" /><input className="field" type="number" min="0" value={cost.amount} onChange={(event) => setCosts((current) => { const source = current.length ? current : defaults.overhead.cost_categories.map((item) => ({ name: item.name, amount: 0 })); return source.map((item, i) => i === index ? { ...item, amount: Number(event.target.value) } : item); })} /><button type="button" aria-label="Remove cost" onClick={() => setCosts((current) => current.filter((_, i) => i !== index))} className="text-ink-faint hover:text-rust"><Trash2 size={16} /></button></div>)}</div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold">Add your first product <span className="font-normal text-ink-faint">(optional)</span></h2>
            <p className="mt-2 text-sm text-ink-muted">This creates the first recipe and margin calculation. You can add more later.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-3"><label className="sm:col-span-2"><span className="field-label">Product or service name</span><input className="field" value={productName} onChange={(event) => setProductName(event.target.value)} placeholder="Pork dumpling" /></label><label><span className="field-label">Batch size</span><input className="field" type="number" min="1" value={batchSize} onChange={(event) => setBatchSize(Number(event.target.value))} /></label></div>
            <label className="mt-5 block max-w-xs"><span className="field-label">Selling price per {unitName || defaults.products.unit_name}</span><input className="field" type="number" min="0" step="0.01" value={sellingPrice} onChange={(event) => setSellingPrice(Number(event.target.value))} /></label>
            <div className="mt-7 flex items-center justify-between"><h3 className="font-semibold">Recipe or materials</h3><button type="button" className="text-sm font-semibold text-moss" onClick={() => setIngredients([...ingredients, { name: "", qty: 1, unit: "ea" }])}><Plus size={15} className="inline" /> Add item</button></div>
            <div className="mt-3 space-y-3">{ingredients.map((ingredient, index) => <div key={index} className="grid grid-cols-[1fr_6rem_6rem_2rem] gap-2"><input className="field" placeholder="Ground pork" value={ingredient.name} onChange={(event) => setIngredients((current) => current.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} /><input className="field" type="number" min="0" step="0.01" value={ingredient.qty} onChange={(event) => setIngredients((current) => current.map((item, i) => i === index ? { ...item, qty: Number(event.target.value) } : item))} /><input className="field" value={ingredient.unit} onChange={(event) => setIngredients((current) => current.map((item, i) => i === index ? { ...item, unit: event.target.value } : item))} /><button type="button" aria-label="Remove ingredient" onClick={() => setIngredients((current) => current.filter((_, i) => i !== index))} className="text-ink-faint hover:text-rust"><Trash2 size={16} /></button></div>)}</div>
            <div className="mt-7 rounded-xl bg-moss-soft/60 p-4 text-sm leading-6 text-moss">Google will create a <b>ShapersAI</b> folder, receipt archive, business configuration, and cost workbook. The app will only be able to access files it created.</div>
          </div>
        )}

        {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-medium text-rust">{error}</p>}
        <div className="mt-8 flex items-center justify-between border-t border-ink/8 pt-5"><button type="button" disabled={step === 0 || busy} onClick={() => setStep(step - 1)} className="button-secondary disabled:invisible"><ArrowLeft size={16} /> Back</button>{step < 2 ? <button type="button" disabled={step === 0 && !businessName.trim()} onClick={() => setStep(step + 1)} className="button-primary">Continue <ArrowRight size={16} /></button> : <button type="button" disabled={busy || !businessName.trim()} onClick={submit} className="button-primary">{busy ? "Creating your workspace..." : "Create workspace"}<ArrowRight size={16} /></button>}</div>
      </section>
    </div>
  );
}
