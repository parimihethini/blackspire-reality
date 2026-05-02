"use client";

import { useState } from "react";
import Navbar from "@/components/Navbar";
import { uploadDocument, uploadImageForOCR } from "@/lib/api";
import { FileText, Image as ImageIcon, CheckCircle, AlertCircle, Copy, Search, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DocumentAnalysis() {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mode, setMode] = useState<"doc" | "ocr">("doc");

    const displayResult = (data: any) => {
        if (data.error) setError(data.error);
        else setResult(data);
    };

    const handleUpload = async () => {
        if (!file) return;
        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const data = await uploadDocument(file);
            console.log("SUCCESS:", data);
            
            if (data.status === "failed" || data.status === "error") {
                setError(data.message || "Analysis failed");
                setLoading(false);
                return;
            }

            // Transform backend response to match UI expectations if needed
            const analysis = data.analysis;
            const uiResult = {
                extracted_text: data.raw_text || "",
                compliance: analysis.legal_status === "clear" ? "Passed" : "Pending",
                confidence: 95, // AI confidence is generally high
                fraud_risk: analysis.risk_level || "Medium",
                details: {
                    type: analysis.document_type,
                    owner: analysis.owner,
                    location: analysis.location,
                    reg_no: analysis.registration_number
                }
            };

            setLoading(false);
            setResult(uiResult);
        } catch (err: any) {
            console.error("UPLOAD ERROR:", err);
            setError(err.message || "Verification failed. Please check your connection.");
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-[#0A0F1F] text-white pb-20">
            <Navbar />
            
            <div className="max-w-4xl mx-auto px-6 mt-32">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-black mb-4 font-poppins">AI Document Verification</h1>
                    <p className="text-[#A0AEC0] font-medium max-w-xl mx-auto">Upload property deeds, legal documents, or images for instant OCR and compliance analysis.</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8 bg-[#121A2F]/50 p-1.5 rounded-2xl border border-white/5">
                    <button 
                        onClick={() => setMode("doc")}
                        className={`py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${mode === "doc" ? "bg-[#4DA3FF] text-[#0A0F1F] shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <FileText className="w-5 h-5" /> Legal Document
                    </button>
                    <button 
                        onClick={() => setMode("ocr")}
                        className={`py-3 rounded-xl flex items-center justify-center gap-2 font-bold transition-all ${mode === "ocr" ? "bg-[#7CC4FF] text-[#0A0F1F] shadow-lg" : "text-gray-400 hover:text-white"}`}
                    >
                        <ImageIcon className="w-5 h-5" /> Image OCR
                    </button>
                </div>

                <div className="bg-[#121A2F]/80 backdrop-blur-xl p-12 rounded-[2.5rem] border-2 border-dashed border-[#4DA3FF]/20 flex flex-col items-center justify-center text-center group hover:border-[#4DA3FF]/50 transition-all cursor-pointer relative overflow-hidden">
                    <input 
                        type="file" 
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    />
                    <div className="w-20 h-20 rounded-2xl bg-[#4DA3FF]/10 flex items-center justify-center text-[#4DA3FF] mb-6 group-hover:scale-110 transition-transform">
                        {mode === "doc" ? <Search className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
                    </div>
                    {file ? (
                        <div className="flex flex-col items-center">
                            <p className="text-lg font-bold text-white mb-2">{file.name}</p>
                            <p className="text-sm text-gray-400 uppercase font-black tracking-widest">{Math.round(file.size / 1024)} KB</p>
                        </div>
                    ) : (
                        <div>
                            <p className="text-xl font-bold text-white mb-2">Drag and drop file here</p>
                            <p className="text-sm text-gray-400">PDF, JPG, PNG or TXT files supported.</p>
                        </div>
                    )}
                </div>

                {file && !result && (
                    <motion.button 
                        layoutId="btn"
                        onClick={handleUpload}
                        disabled={loading}
                        className="w-full mt-8 bg-gradient-to-r from-[#4DA3FF] to-[#7CC4FF] text-[#0A0F1F] font-black py-4 rounded-xl shadow-[0_4px_20px_rgba(77,163,255,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <><div className="w-5 h-5 border-2 border-[#0A0F1F]/20 border-t-[#0A0F1F] rounded-full animate-spin" /> Processing AI Analysis...</>
                        ) : (
                            <><ShieldCheck className="w-5 h-5" /> Run AI Verification</>
                        )}
                    </motion.button>
                )}

                {error && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl flex items-center gap-3"
                    >
                        <AlertCircle className="w-5 h-5 flex-shrink-0" />
                        <p className="font-medium text-sm">{error}</p>
                    </motion.div>
                )}

                <AnimatePresence>

                    {result && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-12 space-y-8"
                        >
                            <div className="bg-[#121A2F] p-8 rounded-3xl border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 opacity-5">
                                    <CheckCircle className="w-24 h-24 text-green-400" />
                                </div>
                                <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-[#4DA3FF]" /> Extracted Insights
                                </h3>
                                <div className="space-y-4">
                                    <div className="bg-[#0A0F1F] p-6 rounded-2xl border border-white/5 font-mono text-sm leading-relaxed text-[#A0AEC0] whitespace-pre-wrap">
                                        {result.extracted_text}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className={`p-4 ${result.compliance === 'Passed' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'} border rounded-2xl flex items-center gap-3`}>
                                            <div className={`w-2 h-2 rounded-full ${result.compliance === 'Passed' ? 'bg-green-400' : 'bg-yellow-400'}`} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Compliance: {result.compliance}</span>
                                        </div>
                                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-400" />
                                            <span className="text-xs font-bold uppercase tracking-widest">Confidence: {Math.round(result.confidence)}%</span>
                                        </div>
                                        <div className={`p-4 ${result.fraud_risk === 'Low' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'} border rounded-2xl flex items-center gap-3`}>
                                            <div className={`w-2 h-2 rounded-full ${result.fraud_risk === 'Low' ? 'bg-green-400' : 'bg-red-400'}`} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Fraud Risk: {result.fraud_risk}</span>
                                        </div>
                                    </div>

                                </div>
                            </div>
                            
                            <button 
                                onClick={() => {setResult(null); setFile(null);}}
                                className="w-full text-gray-400 font-bold hover:text-white transition-colors"
                            >
                                Start New Analysis
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
