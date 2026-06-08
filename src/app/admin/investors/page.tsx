"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
    fetchInvestors,
    createInvestor,
    updateInvestor,
    deleteInvestor,
    importInvestorsCsv,
    getExportInvestorsUrl,
    type InvestorProfileRow,
    type InvestorCreateParams,
} from "@/lib/investorApi";
import { fetchAdminUsers, type AdminUserRow } from "@/lib/adminApi";
import {
    Search,
    Plus,
    Edit2,
    Trash2,
    Download,
    Upload,
    RefreshCw,
    SlidersHorizontal,
    X,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    CheckCircle,
} from "lucide-react";

export default function AdminInvestorsPage() {
    // Data states
    const [rows, setRows] = useState<InvestorProfileRow[]>([]);
    const [users, setUsers] = useState<AdminUserRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMsg, setSuccessMsg] = useState("");

    // Search and filters
    const [q, setQ] = useState("");
    const [investorType, setInvestorType] = useState("");
    const [industry, setIndustry] = useState("");
    const [stage, setStage] = useState("");
    const [ticketMin, setTicketMin] = useState<number | "">("");
    const [ticketMax, setTicketMax] = useState<number | "">("");
    const [priorityScore, setPriorityScore] = useState<number | "">("");
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("desc");

    // Pagination
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [hasMore, setHasMore] = useState(true);

    // Modal forms states
    const [isOpen, setIsOpen] = useState(false);
    const [isEdit, setIsEdit] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);
    const [busy, setBusy] = useState(false);

    // Form fields
    const [userSelectMode, setUserSelectMode] = useState<"link" | "create">("link");
    const [formUserId, setFormUserId] = useState<number | "">("");
    const [formName, setFormName] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formPassword, setFormPassword] = useState("");
    const [formCompany, setFormCompany] = useState("");
    const [formDesignation, setFormDesignation] = useState("");
    const [formType, setFormType] = useState("Angel");
    const [formLinkedin, setFormLinkedin] = useState("");
    const [formWebsite, setFormWebsite] = useState("");
    const [formTicketMin, setFormTicketMin] = useState<number | "">("");
    const [formTicketMax, setFormTicketMax] = useState<number | "">("");
    const [formCountries, setFormCountries] = useState("");
    const [formCities, setFormCities] = useState("");
    const [formIndustries, setFormIndustries] = useState("");
    const [formStages, setFormStages] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formComments, setFormComments] = useState("");
    const [formPriority, setFormPriority] = useState(0);

    // CSV import state
    const [importing, setImporting] = useState(false);
    const [importResult, setImportResult] = useState<{
        imported: number;
        skipped: number;
        errors: string[];
    } | null>(null);

    // Fetch lists
    const loadData = useCallback(async () => {
        setError("");
        setLoading(true);
        try {
            const data = await fetchInvestors({
                q,
                investor_type: investorType,
                stage,
                industry,
                ticket_size_min: ticketMin === "" ? undefined : ticketMin,
                ticket_size_max: ticketMax === "" ? undefined : ticketMax,
                priority_score: priorityScore === "" ? undefined : priorityScore,
                page,
                per_page: perPage,
                sort_by: sortBy,
                sort_order: sortOrder,
            });
            setRows(data);
            setHasMore(data.length === perPage);

            const allUsers = await fetchAdminUsers();
            setUsers(allUsers);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to load investors");
        } finally {
            setLoading(false);
        }
    }, [q, investorType, stage, industry, ticketMin, ticketMax, priorityScore, page, perPage, sortBy, sortOrder]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const resetForm = () => {
        setFormUserId("");
        setFormName("");
        setFormEmail("");
        setFormPhone("");
        setFormPassword("");
        setFormCompany("");
        setFormDesignation("");
        setFormType("Angel");
        setFormLinkedin("");
        setFormWebsite("");
        setFormTicketMin("");
        setFormTicketMax("");
        setFormCountries("");
        setFormCities("");
        setFormIndustries("");
        setFormStages("");
        setFormNotes("");
        setFormComments("");
        setFormPriority(0);
        setUserSelectMode("link");
    };

    const handleOpenCreate = () => {
        resetForm();
        setIsEdit(false);
        setEditId(null);
        setIsOpen(true);
    };

    const handleOpenEdit = (p: InvestorProfileRow) => {
        resetForm();
        setIsEdit(true);
        setEditId(p.id);

        setFormUserId(p.user_id);
        setFormCompany(p.company_name || "");
        setFormDesignation(p.designation || "");
        setFormType(p.investor_type || "Angel");
        setFormLinkedin(p.linkedin_url || "");
        setFormWebsite(p.website_url || "");
        setFormTicketMin(p.ticket_size_min || "");
        setFormTicketMax(p.ticket_size_max || "");
        setFormCountries((p.preferred_countries || []).join(", "));
        setFormCities((p.preferred_cities || []).join(", "));
        setFormIndustries((p.industries || []).join(", "));
        setFormStages((p.stages || []).join(", "));
        setFormNotes(p.notes || "");
        setFormComments(p.internal_comments || "");
        setFormPriority(p.priority_score || 0);

        setIsOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setSuccessMsg("");
        setBusy(true);

        const listFromStr = (str: string) =>
            str
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);

        try {
            if (isEdit && editId !== null) {
                const updateParams = {
                    company_name: formCompany || null,
                    designation: formDesignation || null,
                    investor_type: formType || null,
                    linkedin_url: formLinkedin || null,
                    website_url: formWebsite || null,
                    ticket_size_min: formTicketMin === "" ? null : Number(formTicketMin),
                    ticket_size_max: formTicketMax === "" ? null : Number(formTicketMax),
                    preferred_countries: listFromStr(formCountries),
                    preferred_cities: listFromStr(formCities),
                    notes: formNotes || null,
                    internal_comments: formComments || null,
                    priority_score: Number(formPriority),
                    industries: listFromStr(formIndustries),
                    stages: listFromStr(formStages),
                };
                await updateInvestor(editId, updateParams);
                setSuccessMsg("Investor profile updated successfully.");
            } else {
                const createParams: InvestorCreateParams = {
                    company_name: formCompany || null,
                    designation: formDesignation || null,
                    investor_type: formType || null,
                    linkedin_url: formLinkedin || null,
                    website_url: formWebsite || null,
                    ticket_size_min: formTicketMin === "" ? null : Number(formTicketMin),
                    ticket_size_max: formTicketMax === "" ? null : Number(formTicketMax),
                    preferred_countries: listFromStr(formCountries),
                    preferred_cities: listFromStr(formCities),
                    notes: formNotes || null,
                    internal_comments: formComments || null,
                    priority_score: Number(formPriority),
                    industries: listFromStr(formIndustries),
                    stages: listFromStr(formStages),
                };

                if (userSelectMode === "link") {
                    if (!formUserId) {
                        throw new Error("Please select an existing user to link.");
                    }
                    createParams.user_id = Number(formUserId);
                } else {
                    if (!formEmail || !formName) {
                        throw new Error("Email and Name are required to create a new user.");
                    }
                    createParams.email = formEmail;
                    createParams.name = formName;
                    createParams.phone = formPhone || null;
                    createParams.password = formPassword || null;
                }

                await createInvestor(createParams);
                setSuccessMsg("Investor profile created successfully.");
            }
            setIsOpen(false);
            loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Submission failed");
        } finally {
            setBusy(false);
        }
    };

    const handleDelete = async (p: InvestorProfileRow) => {
        if (!confirm(`Are you sure you want to soft delete investor "${p.user?.name || "N/A"}"?`)) return;
        setError("");
        setSuccessMsg("");
        try {
            await deleteInvestor(p.id);
            setSuccessMsg("Investor soft deleted successfully.");
            loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    };

    const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError("");
        setSuccessMsg("");
        setImportResult(null);
        setImporting(true);

        try {
            const res = await importInvestorsCsv(file);
            setImportResult(res);
            setSuccessMsg(`Import finished: ${res.imported} imported successfully.`);
            loadData();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Import failed");
        } finally {
            setImporting(false);
            e.target.value = ""; // reset input
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-white tracking-tight">Investor Profiles</h1>
                    <p className="text-[#A0AEC0] text-sm mt-1">Manage normalized startup investors, preferences, and details</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        type="button"
                        onClick={handleOpenCreate}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4DA3FF] to-[#3B82F6] text-[#0A0F1F] font-extrabold hover:opacity-90 shadow-[0_0_20px_rgba(77,163,255,0.3)] transition-all cursor-pointer"
                    >
                        <Plus size={18} />
                        Add Investor
                    </button>
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#4DA3FF]/20 bg-[#121A2F]/80 text-[#7CC4FF] font-bold hover:bg-[#4DA3FF]/10 transition-colors cursor-pointer">
                        <Upload size={18} className={importing ? "animate-spin" : ""} />
                        Import CSV
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleImportCsv}
                            disabled={importing}
                            className="hidden"
                        />
                    </label>
                    <a
                        href={getExportInvestorsUrl()}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#4DA3FF]/20 bg-[#121A2F]/80 text-[#7CC4FF] font-bold hover:bg-[#4DA3FF]/10 transition-colors"
                    >
                        <Download size={18} />
                        Export CSV
                    </a>
                    <button
                        type="button"
                        onClick={() => loadData()}
                        className="p-2.5 rounded-xl border border-[#4DA3FF]/20 bg-[#121A2F]/80 text-[#A0AEC0] hover:text-white transition-colors cursor-pointer"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* Notification messages */}
            {error && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3.5 text-red-400 text-sm font-semibold">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div>{error}</div>
                </div>
            )}
            {successMsg && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3.5 text-emerald-400 text-sm font-semibold">
                    <CheckCircle size={20} className="shrink-0 mt-0.5" />
                    <div>{successMsg}</div>
                </div>
            )}

            {/* CSV Import Report */}
            {importResult && (
                <div className="mb-6 p-4 rounded-xl border border-[#4DA3FF]/20 bg-[#121A2F]/60 backdrop-blur-xl">
                    <h3 className="font-extrabold text-[#7CC4FF] text-sm mb-2 uppercase tracking-wider">CSV Import Report</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-white mb-2">
                        <div>Imported: <span className="text-emerald-400">{importResult.imported}</span></div>
                        <div>Skipped: <span className="text-amber-400">{importResult.skipped}</span></div>
                    </div>
                    {importResult.errors.length > 0 && (
                        <div className="max-h-36 overflow-y-auto mt-2 p-2 rounded bg-black/40 text-[10px] font-mono text-amber-300/90 leading-relaxed custom-scrollbar">
                            {importResult.errors.map((err, i) => (
                                <div key={i}>{err}</div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Filters Bar */}
            <div className="bg-[#121A2F]/40 border border-[#4DA3FF]/10 rounded-2xl p-6 mb-8 backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-4">
                    <SlidersHorizontal size={16} className="text-[#4DA3FF]" />
                    <span className="text-xs uppercase font-extrabold tracking-wider text-[#A0AEC0]">Search & Filters</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {/* Search */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Keyword Search</label>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search name, company..."
                                value={q}
                                onChange={(e) => {
                                    setQ(e.target.value);
                                    setPage(1);
                                }}
                                className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 pl-9 pr-4 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                            />
                            <Search size={16} className="absolute left-3 top-3 text-[#A0AEC0]" />
                        </div>
                    </div>

                    {/* Investor Type */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Investor Type</label>
                        <select
                            value={investorType}
                            onChange={(e) => {
                                setInvestorType(e.target.value);
                                setPage(1);
                            }}
                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                        >
                            <option value="">All Types</option>
                            <option value="Angel">Angel</option>
                            <option value="VC">VC (Venture Capital)</option>
                            <option value="PE">PE (Private Equity)</option>
                            <option value="Family Office">Family Office</option>
                            <option value="Corporate">Corporate</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Industry */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Industry</label>
                        <input
                            type="text"
                            placeholder="SaaS, AI, Fintech..."
                            value={industry}
                            onChange={(e) => {
                                setIndustry(e.target.value);
                                setPage(1);
                            }}
                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Stage */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Stage</label>
                        <input
                            type="text"
                            placeholder="Seed, Series A..."
                            value={stage}
                            onChange={(e) => {
                                setStage(e.target.value);
                                setPage(1);
                            }}
                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Ticket Size Min */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Min Ticket ($)</label>
                        <input
                            type="number"
                            placeholder="e.g. 50000"
                            value={ticketMin}
                            onChange={(e) => {
                                setTicketMin(e.target.value === "" ? "" : Number(e.target.value));
                                setPage(1);
                            }}
                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Ticket Size Max */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Max Ticket ($)</label>
                        <input
                            type="number"
                            placeholder="e.g. 500000"
                            value={ticketMax}
                            onChange={(e) => {
                                setTicketMax(e.target.value === "" ? "" : Number(e.target.value));
                                setPage(1);
                            }}
                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                        />
                    </div>

                    {/* Priority Score */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Priority Score</label>
                        <select
                            value={priorityScore}
                            onChange={(e) => {
                                setPriorityScore(e.target.value === "" ? "" : Number(e.target.value));
                                setPage(1);
                            }}
                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                        >
                            <option value="">All Priorities</option>
                            <option value="0">0 (Normal)</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5 (Highest)</option>
                        </select>
                    </div>

                    {/* Sort By */}
                    <div>
                        <label className="block text-[11px] font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Sort By</label>
                        <div className="flex gap-2">
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                className="flex-1 bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                            >
                                <option value="created_at">Date Created</option>
                                <option value="priority_score">Priority</option>
                                <option value="company_name">Company Name</option>
                                <option value="name">Investor Name</option>
                            </select>
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                className="bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-2 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                            >
                                <option value="desc">DESC</option>
                                <option value="asc">ASC</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-[#121A2F]/80 border border-[#4DA3FF]/20 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-[#4DA3FF]/20 text-left text-[#A0AEC0] uppercase text-[10px] tracking-wider font-bold">
                                <th className="px-6 py-4">Investor</th>
                                <th className="px-6 py-4">Company Details</th>
                                <th className="px-6 py-4">Ticket Range</th>
                                <th className="px-6 py-4">Industries / Stages</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-[#A0AEC0] font-medium animate-pulse">
                                        Loading investor data…
                                    </td>
                                </tr>
                            )}
                            {!loading && rows.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-16 text-center text-[#A0AEC0] font-semibold">
                                        No investor profiles found.
                                    </td>
                                </tr>
                            )}
                            {!loading &&
                                rows.map((p) => (
                                    <tr key={p.id} className="hover:bg-white/[0.01] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-extrabold text-white text-base">{p.user?.name || "N/A"}</div>
                                            <div className="text-xs text-[#A0AEC0] font-medium mt-0.5">{p.user?.email || "N/A"}</div>
                                            {p.user?.phone && <div className="text-[10px] text-[#7CC4FF] mt-0.5">{p.user.phone}</div>}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-white">{p.company_name || "—"}</div>
                                            <div className="text-xs text-[#A0AEC0] mt-0.5">
                                                {p.designation || "No Designation"} • <span className="text-[#4DA3FF] font-semibold">{p.investor_type}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-mono text-sm text-[#7CC4FF] font-bold">
                                                {p.ticket_size_min ? `$${p.ticket_size_min.toLocaleString()}` : "$0"}{" "}
                                                to{" "}
                                                {p.ticket_size_max ? `$${p.ticket_size_max.toLocaleString()}` : "∞"}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="flex flex-wrap gap-1">
                                                {p.industries.map((ind) => (
                                                    <span
                                                        key={ind}
                                                        className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-[#4DA3FF]/10 text-[#7CC4FF] border border-[#4DA3FF]/20"
                                                    >
                                                        {ind}
                                                    </span>
                                                ))}
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-1.5">
                                                {p.stages.map((stg) => (
                                                    <span
                                                        key={stg}
                                                        className="px-2 py-0.5 text-[9px] font-extrabold rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                    >
                                                        {stg}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-block px-2.5 py-1 text-xs font-bold rounded-lg ${
                                                p.priority_score >= 4 
                                                    ? "bg-red-500/15 text-red-400 border border-red-500/30" 
                                                    : p.priority_score >= 2 
                                                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" 
                                                    : "bg-white/5 text-[#A0AEC0] border border-white/10"
                                            }`}>
                                                Priority {p.priority_score}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenEdit(p)}
                                                    className="p-2 rounded-lg text-[#7CC4FF] hover:bg-[#4DA3FF]/10 transition-all cursor-pointer"
                                                    title="Edit profile"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDelete(p)}
                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                                                    title="Delete profile"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="px-6 py-4 bg-[#0A0F1F]/40 border-t border-[#4DA3FF]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs font-bold text-[#A0AEC0]">
                    <div className="flex items-center gap-2">
                        <span>Show</span>
                        <select
                            value={perPage}
                            onChange={(e) => {
                                setPerPage(Number(e.target.value));
                                setPage(1);
                            }}
                            className="bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-lg py-1 px-2 text-white text-xs focus:outline-none"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                        <span>investors per page</span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            disabled={page === 1}
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            className="p-1.5 rounded-lg border border-[#4DA3FF]/20 hover:bg-[#4DA3FF]/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <span className="text-white font-extrabold">Page {page}</span>
                        <button
                            type="button"
                            disabled={!hasMore}
                            onClick={() => setPage((p) => p + 1)}
                            className="p-1.5 rounded-lg border border-[#4DA3FF]/20 hover:bg-[#4DA3FF]/10 disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer transition-colors"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Create/Edit Form Dialog */}
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
                    <div className="bg-[#121A2F] border border-[#4DA3FF]/30 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl custom-scrollbar flex flex-col">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-[#4DA3FF]/10">
                            <h2 className="text-xl font-extrabold text-white">
                                {isEdit ? "Edit Investor Profile" : "Add Investor Profile"}
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsOpen(false)}
                                className="p-1 rounded-lg text-[#A0AEC0] hover:text-white transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <form onSubmit={handleSubmit} className="p-6 flex-1 space-y-6">
                            {/* User Selection Section (Only for Create) */}
                            {!isEdit && (
                                <div className="space-y-4">
                                    <h3 className="text-[#7CC4FF] text-xs uppercase font-extrabold tracking-wider border-b border-[#4DA3FF]/10 pb-1.5">User Link Mode</h3>
                                    <div className="flex gap-4">
                                        <label className="flex items-center gap-2 text-sm text-white font-bold cursor-pointer">
                                            <input
                                                type="radio"
                                                name="userSelectMode"
                                                checked={userSelectMode === "link"}
                                                onChange={() => setUserSelectMode("link")}
                                                className="accent-[#4DA3FF]"
                                            />
                                            Link Existing User
                                        </label>
                                        <label className="flex items-center gap-2 text-sm text-white font-bold cursor-pointer">
                                            <input
                                                type="radio"
                                                name="userSelectMode"
                                                checked={userSelectMode === "create"}
                                                onChange={() => setUserSelectMode("create")}
                                                className="accent-[#4DA3FF]"
                                            />
                                            Create New User Account
                                        </label>
                                    </div>

                                    {userSelectMode === "link" ? (
                                        <div>
                                            <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-2">Select User</label>
                                            <select
                                                required
                                                value={formUserId}
                                                onChange={(e) => setFormUserId(e.target.value === "" ? "" : Number(e.target.value))}
                                                className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none focus:ring-1 focus:ring-[#4DA3FF] transition-all"
                                            >
                                                <option value="">-- Select an eligible user account --</option>
                                                {users
                                                    .filter((u) => ["customer", "investor"].includes(u.role))
                                                    .map((u) => (
                                                        <option key={u.id} value={u.id}>
                                                            {u.name} ({u.email}) - Current Role: {u.role}
                                                        </option>
                                                    ))}
                                            </select>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Full Name</label>
                                                <input
                                                    type="text"
                                                    required
                                                    placeholder="John Doe"
                                                    value={formName}
                                                    onChange={(e) => setFormName(e.target.value)}
                                                    className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Email Address</label>
                                                <input
                                                    type="email"
                                                    required
                                                    placeholder="john@example.com"
                                                    value={formEmail}
                                                    onChange={(e) => setFormEmail(e.target.value)}
                                                    className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Phone Number (Optional)</label>
                                                <input
                                                    type="text"
                                                    placeholder="+91 9999999999"
                                                    value={formPhone}
                                                    onChange={(e) => setFormPhone(e.target.value)}
                                                    className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Password (Optional)</label>
                                                <input
                                                    type="password"
                                                    placeholder="If empty, generates a secure password"
                                                    value={formPassword}
                                                    onChange={(e) => setFormPassword(e.target.value)}
                                                    className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Profile Information */}
                            <div className="space-y-4">
                                <h3 className="text-[#7CC4FF] text-xs uppercase font-extrabold tracking-wider border-b border-[#4DA3FF]/10 pb-1.5">Company & Links</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Company Name</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Sequoia Capital"
                                            value={formCompany}
                                            onChange={(e) => setFormCompany(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Designation</label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Managing Partner"
                                            value={formDesignation}
                                            onChange={(e) => setFormDesignation(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Investor Type</label>
                                        <select
                                            value={formType}
                                            onChange={(e) => setFormType(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        >
                                            <option value="Angel">Angel</option>
                                            <option value="VC">VC</option>
                                            <option value="PE">PE</option>
                                            <option value="Family Office">Family Office</option>
                                            <option value="Corporate">Corporate</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">LinkedIn Profile URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://linkedin.com/in/..."
                                            value={formLinkedin}
                                            onChange={(e) => setFormLinkedin(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Website URL</label>
                                        <input
                                            type="url"
                                            placeholder="https://example.com"
                                            value={formWebsite}
                                            onChange={(e) => setFormWebsite(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Investment Constraints & Preferences */}
                            <div className="space-y-4">
                                <h3 className="text-[#7CC4FF] text-xs uppercase font-extrabold tracking-wider border-b border-[#4DA3FF]/10 pb-1.5">Investment Parameters</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Min Ticket ($)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 25000"
                                            value={formTicketMin}
                                            onChange={(e) => setFormTicketMin(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Max Ticket ($)</label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 1000000"
                                            value={formTicketMax}
                                            onChange={(e) => setFormTicketMax(e.target.value === "" ? "" : Number(e.target.value))}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Preferred Countries (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="India, United States, Singapore"
                                            value={formCountries}
                                            onChange={(e) => setFormCountries(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Preferred Cities (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="Bangalore, Mumbai, San Francisco"
                                            value={formCities}
                                            onChange={(e) => setFormCities(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Industries (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="SaaS, AI, Fintech, CleanTech"
                                            value={formIndustries}
                                            onChange={(e) => setFormIndustries(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Preferred Stages (comma-separated)</label>
                                        <input
                                            type="text"
                                            placeholder="Pre-seed, Seed, Series A, Growth"
                                            value={formStages}
                                            onChange={(e) => setFormStages(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl py-2 px-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Notes & Admin details */}
                            <div className="space-y-4">
                                <h3 className="text-[#7CC4FF] text-xs uppercase font-extrabold tracking-wider border-b border-[#4DA3FF]/10 pb-1.5">Admin & Notes</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Priority Score (0 to 5)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="5"
                                            value={formPriority}
                                            onChange={(e) => setFormPriority(Number(e.target.value))}
                                            className="w-full accent-[#4DA3FF]"
                                        />
                                        <div className="flex justify-between text-[10px] text-[#A0AEC0] font-bold mt-1">
                                            <span>0 (Lowest)</span>
                                            <span className="text-white font-extrabold">Current: {formPriority}</span>
                                            <span>5 (Highest)</span>
                                        </div>
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">General Notes</label>
                                        <textarea
                                            placeholder="Write generic profile description or public investor notes here..."
                                            value={formNotes}
                                            onChange={(e) => setFormNotes(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl p-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none h-24 custom-scrollbar"
                                        />
                                    </div>
                                    <div className="sm:col-span-2">
                                        <label className="block text-xs font-bold text-[#A0AEC0] uppercase tracking-wider mb-1.5">Internal Comments</label>
                                        <textarea
                                            placeholder="Private review details, vetting comments, or contact remarks..."
                                            value={formComments}
                                            onChange={(e) => setFormComments(e.target.value)}
                                            className="w-full bg-[#0A0F1F] border border-[#4DA3FF]/20 rounded-xl p-3 text-white text-sm focus:border-[#4DA3FF] focus:outline-none h-24 custom-scrollbar"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions */}
                            <div className="flex items-center justify-end gap-3 border-t border-[#4DA3FF]/10 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="px-5 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white font-bold transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={busy}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#4DA3FF] to-[#3B82F6] text-[#0A0F1F] font-extrabold hover:opacity-90 shadow-[0_0_20px_rgba(77,163,255,0.2)] disabled:opacity-50 transition-all cursor-pointer"
                                >
                                    {busy ? "Submitting…" : isEdit ? "Save Changes" : "Create Profile"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
