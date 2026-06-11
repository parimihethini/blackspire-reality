"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "@/lib/auth";
import {
    createStartup,
    updateStartup,
    submitStartup,
    uploadStartupLogo,
    uploadPitchDeck,
    fetchMyStartups,
    type StartupFormData,
    type StartupRow,
} from "@/lib/startupApi";

const STAGES = ["Pre-Seed", "Seed", "Series A", "Series B", "Series C", "Growth"];
const INDUSTRIES = ["FinTech", "HealthTech", "EdTech", "SaaS", "AI/ML", "E-Commerce", "CleanTech", "Other"];

function EditStartupInner() {
    const searchParams = useSearchParams();
    const editId = searchParams.get("id");

    const [startupId, setStartupId] = useState<number | null>(editId ? Number(editId) : null);
    const [form, setForm] = useState<StartupFormData>({ name: "", founder_name: getAuth()?.name || "" });
    const [loading, setLoading] = useState(!!editId);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const load = useCallback(async () => {
        if (!startupId) return;
        setLoading(true);
        try {
            const mine = await fetchMyStartups();
            const row = mine.find((s) => s.id === startupId);
            if (!row) throw new Error("Startup not found");
            setForm({
                name: row.name,
                founder_name: row.founder_name,
                co_founder_name: row.co_founder_name,
                industry: row.industry,
                stage: row.stage,
                revenue: row.revenue,
                team_size: row.team_size,
                funding_requirement: row.funding_requirement,
                funding_raised: row.funding_raised,
                valuation: row.valuation,
                website: row.website,
                linkedin_url: row.linkedin_url,
                description: row.description,
                problem_statement: row.problem_statement,
                solution: row.solution,
                target_market: row.target_market,
                business_model: row.business_model,
                location: row.location,
                country: row.country,
            });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load startup");
        } finally {
            setLoading(false);
        }
    }, [startupId]);

    useEffect(() => { load(); }, [load]);

    const set = (key: keyof StartupFormData, value: string | number | null) => {
        setForm((f) => ({ ...f, [key]: value }));
    };

    const onSave = async () => {
        setSaving(true);
        setError("");
        setSuccess("");
        try {
            let row: StartupRow;
            if (startupId) {
                row = await updateStartup(startupId, form);
            } else {
                row = await createStartup(form);
                setStartupId(row.id);
            }
            setSuccess(`Saved · ${row.profile_completion}% complete`);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    };

    const onSubmit = async () => {
        if (!startupId) { await onSave(); return; }
        setSaving(true);
        setError("");
        try {
            await submitStartup(startupId);
            setSuccess("Submitted for admin review!");
        } catch (e) {
            setError(e instanceof Error ? e.message : "Submit failed");
        } finally {
            setSaving(false);
        }
    };

    const onLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !startupId) return;
        try {
            await uploadStartupLogo(startupId, file);
            setSuccess("Logo uploaded");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        }
    };

    const onDeckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !startupId) return;
        try {
            await uploadPitchDeck(startupId, file);
            setSuccess("Pitch deck uploaded");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        }
    };

    const inputCls = "w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm";
    const labelCls = "text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider block mb-1";

    if (loading) return <p className="text-[#A0AEC0] animate-pulse">Loading…</p>;

    return (
        <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-extrabold text-white mb-2">{startupId ? "Edit Startup" : "Create Startup"}</h1>
            <p className="text-[#A0AEC0] text-sm mb-6">Build your startup profile for the marketplace</p>

            {error && <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-400 text-sm">{error}</div>}
            {success && <div className="mb-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-400 text-sm">{success}</div>}

            <div className="space-y-6 bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl p-6">
                <section className="grid md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className={labelCls}>Startup Name *</label><input className={inputCls} value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
                    <div><label className={labelCls}>Founder Name</label><input className={inputCls} value={form.founder_name || ""} onChange={(e) => set("founder_name", e.target.value)} /></div>
                    <div><label className={labelCls}>Co-Founder Name</label><input className={inputCls} value={form.co_founder_name || ""} onChange={(e) => set("co_founder_name", e.target.value)} /></div>
                    <div><label className={labelCls}>Industry</label><select className={inputCls} value={form.industry || ""} onChange={(e) => set("industry", e.target.value)}><option value="">Select</option>{INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}</select></div>
                    <div><label className={labelCls}>Stage</label><select className={inputCls} value={form.stage || ""} onChange={(e) => set("stage", e.target.value)}><option value="">Select</option>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
                </section>

                <section className="grid md:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Funding Requirement ($)</label><input type="number" className={inputCls} value={form.funding_requirement ?? ""} onChange={(e) => set("funding_requirement", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={labelCls}>Funding Raised ($)</label><input type="number" className={inputCls} value={form.funding_raised ?? ""} onChange={(e) => set("funding_raised", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={labelCls}>Revenue ($)</label><input type="number" className={inputCls} value={form.revenue ?? ""} onChange={(e) => set("revenue", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={labelCls}>Team Size</label><input type="number" className={inputCls} value={form.team_size ?? ""} onChange={(e) => set("team_size", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={labelCls}>Valuation ($)</label><input type="number" className={inputCls} value={form.valuation ?? ""} onChange={(e) => set("valuation", e.target.value ? Number(e.target.value) : null)} /></div>
                    <div><label className={labelCls}>Country</label><input className={inputCls} value={form.country || ""} onChange={(e) => set("country", e.target.value)} /></div>
                </section>

                <section className="space-y-4">
                    {(["description", "problem_statement", "solution", "target_market", "business_model"] as const).map((field) => (
                        <div key={field}>
                            <label className={labelCls}>{field.replace(/_/g, " ")}</label>
                            <textarea className={`${inputCls} min-h-[80px]`} value={(form[field] as string) || ""} onChange={(e) => set(field, e.target.value)} />
                        </div>
                    ))}
                </section>

                <section className="grid md:grid-cols-2 gap-4">
                    <div><label className={labelCls}>Website</label><input className={inputCls} value={form.website || ""} onChange={(e) => set("website", e.target.value)} /></div>
                    <div><label className={labelCls}>LinkedIn</label><input className={inputCls} value={form.linkedin_url || ""} onChange={(e) => set("linkedin_url", e.target.value)} /></div>
                    <div><label className={labelCls}>Location</label><input className={inputCls} value={form.location || ""} onChange={(e) => set("location", e.target.value)} /></div>
                </section>

                {startupId && (
                    <section className="grid md:grid-cols-2 gap-4">
                        <div><label className={labelCls}>Logo</label><input type="file" accept="image/*" onChange={onLogoUpload} className="text-sm text-[#A0AEC0]" /></div>
                        <div><label className={labelCls}>Pitch Deck</label><input type="file" accept=".pdf,.ppt,.pptx" onChange={onDeckUpload} className="text-sm text-[#A0AEC0]" /></div>
                    </section>
                )}

                <div className="flex gap-3 pt-4">
                    <button type="button" onClick={onSave} disabled={saving} className="px-6 py-2.5 rounded-xl bg-[#4DA3FF] text-[#0A0F1F] font-extrabold text-sm disabled:opacity-50">
                        {saving ? "Saving…" : "Save Draft"}
                    </button>
                    {startupId && (
                        <button type="button" onClick={onSubmit} disabled={saving} className="px-6 py-2.5 rounded-xl border border-[#4DA3FF]/40 text-[#7CC4FF] font-bold text-sm disabled:opacity-50">
                            Submit for Review
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function EditStartupPage() {
    return (
        <Suspense fallback={<p className="text-[#A0AEC0]">Loading…</p>}>
            <EditStartupInner />
        </Suspense>
    );
}
