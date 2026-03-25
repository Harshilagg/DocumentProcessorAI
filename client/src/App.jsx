import React, { useState, useEffect, useCallback } from "react";
import { db } from "./firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5001";

/* ═══════════════════════════════════════════════════════════════════
   REUSABLE COMPONENTS
   ═══════════════════════════════════════════════════════════════════ */

/** Status badge with color-coded pill */
const StatusBadge = ({ status, size = "sm" }) => {
  const map = {
    uploaded: { bg: "bg-slate-100", text: "text-slate-500", dot: "bg-slate-400" },
    processing: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500" },
    processed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    failed: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" },
  };
  const s = map[status] || map.uploaded;
  const isLg = size === "lg";
  return (
    <span className={`inline-flex items-center gap-1.5 font-semibold rounded-full
      ${s.bg} ${s.text}
      ${isLg ? "text-xs px-3 py-1" : "text-[10px] px-2 py-0.5"}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === "processing" ? "pulse-dot" : ""}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

/** Skeleton loader block */
const Skeleton = ({ className = "" }) => (
  <div className={`skeleton-line ${className}`} />
);

/** Section header inside result panel */
const PanelSection = ({ icon, title, children, warning = false }) => (
  <div className={`rounded-2xl p-4 ${warning ? "bg-red-50/60 border border-red-100" : "bg-slate-50/80 border border-slate-100"}`}>
    <div className="flex items-center gap-2 mb-3">
      <span className={`text-sm ${warning ? "text-red-400" : "text-slate-400"}`}>{icon}</span>
      <h4 className={`text-[11px] font-bold uppercase tracking-widest ${warning ? "text-red-400" : "text-slate-400"}`}>{title}</h4>
    </div>
    {children}
  </div>
);

/** Data field inside result panel */
const DataField = ({ label, value }) => (
  <div className="space-y-0.5">
    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-sm font-bold text-slate-800 leading-snug">{value || "—"}</p>
  </div>
);

/** PII chip */
const PiiChip = ({ text }) => (
  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-white text-red-600 border border-red-200 shadow-sm">
    {text}
  </span>
);

/* ═══════════════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════════════ */

export default function App() {
  const [files, setFiles] = useState([]);
  const [docs, setDocs] = useState([]);
  const [uploading, setUpload] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [drag, setDrag] = useState(false);

  // Firestore real-time
  useEffect(() => {
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (s) => setDocs(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
  }, []);

  // Upload (no backend changes)
  const upload = useCallback(async () => {
    if (!files.length) return;
    setUpload(true);
    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));
    try {
      const { data } = await axios.post(`${API}/upload`, fd);
      for (const d of data.documents)
        axios.post(`${API}/trigger`, { docId: d.id, fileUrl: d.fileUrl });
      setFiles([]);
    } catch { alert("Upload failed"); }
    finally { setUpload(false); }
  }, [files]);

  const active = docs.find((d) => d.id === activeId);
  const counts = {
    total: docs.length,
    processing: docs.filter((d) => d.status === "processing").length,
    done: docs.filter((d) => d.status === "processed").length,
    failed: docs.filter((d) => d.status === "failed").length,
  };

  /* ═══════════════════════════════════════════════════════════════
     RENDER — Three-panel layout
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="h-screen flex bg-slate-50">

      {/* ════════════ LEFT SIDEBAR ════════════ */}
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-200/50">
              <span className="text-white text-sm font-extrabold">D</span>
            </div>
            <div>
              <h1 className="text-[15px] font-extrabold text-slate-900 tracking-tight leading-none">DocuAI</h1>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Intelligence Hub</p>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="px-5 py-4 border-b border-slate-100 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Overview</p>
          {[
            { label: "Total", value: counts.total, color: "text-slate-800", bg: "bg-slate-50" },
            { label: "In Process", value: counts.processing, color: "text-amber-600", bg: "bg-amber-50/50" },
            { label: "Processed", value: counts.done, color: "text-emerald-600", bg: "bg-emerald-50/50" },
            { label: "Failed", value: counts.failed, color: "text-red-600", bg: "bg-red-50/50" },
          ].map((s) => (
            <div key={s.label} className={`flex justify-between items-center px-3 py-1.5 rounded-lg ${s.bg}`}>
              <span className="text-[11px] text-slate-500 font-medium">{s.label}</span>
              <span className={`text-xs font-extrabold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>

        {/* Document List */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-5 pt-4 pb-2 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300">Documents</p>
            <div className="flex items-center gap-1 text-[9px] text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" />
              Live
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scroll px-3 pb-4 space-y-1">
            {docs.length === 0 ? (
              <div className="px-2 py-10 text-center">
                <p className="text-xs text-slate-300 font-medium">No documents yet</p>
              </div>
            ) : (
              docs.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setActiveId(d.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group
                    ${activeId === d.id
                      ? "bg-indigo-50 border border-indigo-200 shadow-sm"
                      : "bg-transparent border border-transparent hover:bg-slate-50 hover:border-slate-100"}`}
                >
                  <p className={`text-[13px] font-semibold truncate transition-colors ${activeId === d.id ? "text-indigo-700" : "text-slate-700 group-hover:text-slate-900"}`}>
                    {d.fileName}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-slate-400">{d.createdAt?.toDate?.().toLocaleDateString?.() ?? "—"}</span>
                    <StatusBadge status={d.status} />
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Bottom status */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
          <span className="text-[11px] text-slate-400 font-medium">System Online</span>
        </div>
      </aside>

      {/* ════════════ CENTER PANEL ════════════ */}
      <main className="flex-1 min-w-0 overflow-y-auto custom-scroll">
        <div className="max-w-2xl mx-auto px-8 py-8 space-y-8">

          {/* Page header */}
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Upload & Process</h2>
            <p className="text-sm text-slate-400 mt-1">Upload documents to extract intelligence and detect PII.</p>
          </div>

          {/* ── Upload Hero Card ── */}
          <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-200/60 overflow-hidden">
            {/* Card header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <span className="text-slate-400">📤</span>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Upload Documents</h3>
            </div>

            {/* Drop zone */}
            <div className="p-6">
              <div
                className={`relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-200 cursor-pointer
                  ${drag
                    ? "border-indigo-400 bg-indigo-50/50 glow-pulse"
                    : "border-slate-200 bg-gradient-to-b from-slate-50/80 to-white hover:border-slate-300"}`}
                onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={(e) => { e.preventDefault(); setDrag(false); if (e.dataTransfer.files.length) setFiles(Array.from(e.dataTransfer.files)); }}
                onClick={() => document.getElementById("fi").click()}
              >
                <input id="fi" type="file" multiple className="hidden" onChange={(e) => { if (e.target.files.length) setFiles(Array.from(e.target.files)); }} />
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">
                  Drop files here or <span className="text-indigo-600 font-bold">browse</span>
                </p>
                <p className="text-xs text-slate-400 mt-1.5">PDF, JPG, PNG — up to 10 MB each</p>
              </div>

              {/* Selected files */}
              {files.length > 0 && (
                <div className="mt-5 space-y-4 fade-up">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">{files.length} file{files.length > 1 && "s"} ready</span>
                    <button onClick={() => setFiles([])} className="text-[11px] text-red-400 hover:text-red-500 font-semibold transition-colors">Clear all</button>
                  </div>
                  <div className="space-y-2 max-h-36 overflow-y-auto custom-scroll">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all duration-200">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                            <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <span className="text-sm font-medium text-slate-700 truncate">{f.name}</span>
                        </div>
                        <span className="text-xs text-slate-400 shrink-0 ml-3">{(f.size / 1024).toFixed(0)} KB</span>
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={upload}
                    disabled={uploading}
                    className="w-full py-3 rounded-xl text-sm font-bold text-white
                      bg-gradient-to-r from-indigo-600 to-violet-600
                      hover:from-indigo-700 hover:to-violet-700
                      active:scale-[0.98] transition-all duration-200
                      disabled:opacity-40 disabled:cursor-not-allowed
                      shadow-lg shadow-indigo-200/40"
                  >
                    {uploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" style={{ animation: "spin 0.6s linear infinite" }} />
                        Processing…
                      </span>
                    ) : "Process Documents"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Recent Activity ── */}
          <div className="bg-white rounded-2xl shadow-sm shadow-slate-200/60 border border-slate-200/60 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">📋</span>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Activity</h3>
              </div>
              <span className="text-[11px] text-slate-300 font-medium">{docs.length} documents</span>
            </div>

            {docs.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <span className="text-2xl opacity-40">📄</span>
                </div>
                <p className="text-sm font-semibold text-slate-400">No documents uploaded yet</p>
                <p className="text-xs text-slate-300 mt-1">Upload a file above to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => setActiveId(d.id)}
                    className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-all duration-200 group
                      ${activeId === d.id
                        ? "bg-indigo-50/40 border-l-[3px] border-l-indigo-500"
                        : "hover:bg-slate-50/80 border-l-[3px] border-l-transparent"}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-200
                        ${activeId === d.id ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{d.fileName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{d.createdAt?.toDate?.().toLocaleString?.() ?? "—"}</p>
                      </div>
                    </div>
                    <StatusBadge status={d.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      {/* ════════════ RIGHT PANEL (RESULTS) ════════════ */}
      <aside className="w-[400px] shrink-0 bg-white border-l border-slate-200 flex flex-col">

        {!active ? (
          /* ── Empty state ── */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-5">
              <span className="text-3xl opacity-30">🔍</span>
            </div>
            <p className="text-sm font-semibold text-slate-400">No document selected</p>
            <p className="text-xs text-slate-300 mt-1 max-w-[200px]">Click on a document from the list to view its AI analysis results</p>
          </div>
        ) : (
          /* ── Active document ── */
          <div className="flex flex-col h-full fade-up">

            {/* Panel header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                  <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 truncate leading-tight">{active.fileName}</h3>
                  <div className="mt-1.5"><StatusBadge status={active.status} size="lg" /></div>
                </div>
              </div>
              <button onClick={() => setActiveId(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* Panel body */}
            <div className="flex-1 overflow-y-auto custom-scroll p-6 space-y-4">

              {active.status === "processed" && active.result ? (
                <>
                  {/* Card 1: Document Type */}
                  <PanelSection icon="🏷️" title="Document Type">
                    <span className="inline-block text-sm font-bold text-indigo-700 bg-white border border-indigo-100 rounded-xl px-4 py-2 shadow-sm">
                      {active.result.type}
                    </span>
                  </PanelSection>

                  {/* Card 2: Extracted Data */}
                  <PanelSection icon="📊" title="Extracted Data">
                    <div className="grid grid-cols-2 gap-4">
                      <DataField label="Name" value={active.result.data?.name} />
                      <DataField label="Date of Birth" value={active.result.data?.dob} />
                      <DataField label="Document Number" value={active.result.data?.document_number} />
                    </div>
                  </PanelSection>

                  {/* Card 3: PII Detection */}
                  <PanelSection icon="🛡️" title="PII Detection" warning>
                    <div className="space-y-4">

                      {/* Universal AI Detected PII */}
                      {active.result.pii?.ai_detected?.length > 0 && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">AI-Detected Insights</p>
                          <div className="flex flex-wrap gap-1.5">
                            {active.result.pii.ai_detected.map((v, i) => <PiiChip key={i} text={v} />)}
                          </div>
                        </div>
                      )}

                      {/* Standard Pattern Matches */}
                      {Object.entries(active.result.pii?.patterns || {}).some(([_, items]) => items.length > 0) && (
                        <div className="pt-2 border-t border-red-100">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2">Regex Pattern Matches</p>
                          {Object.entries(active.result.pii.patterns).map(([cat, items]) => (
                            items.length > 0 && (
                              <div key={cat} className="mb-2 last:mb-0">
                                <p className="text-[9px] font-bold text-red-300 uppercase mb-1">{cat}</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {items.map((v, i) => <PiiChip key={i} text={v} />)}
                                </div>
                              </div>
                            )
                          ))}
                        </div>
                      )}

                      {(!active.result.pii?.ai_detected?.length && !Object.entries(active.result.pii?.patterns || {}).some(([_, items]) => items.length > 0)) && (
                        <p className="text-xs text-slate-400 italic">No sensitive data detected.</p>
                      )}
                    </div>
                  </PanelSection>

                  {/* Open file link */}
                  <a
                    href={active.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 transition-colors"
                  >
                    View Original File
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                  </a>
                </>

              ) : active.status === "processing" ? (
                /* Skeleton loading state */
                <div className="space-y-4 fade-up">
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-36" />
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
                    <Skeleton className="h-3 w-28" />
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                  <div className="flex flex-col items-center pt-4">
                    <div className="w-8 h-8 border-[3px] border-slate-200 border-t-indigo-600 rounded-full" style={{ animation: "spin 0.8s linear infinite" }} />
                    <p className="text-xs font-semibold text-slate-400 mt-3">AI is analyzing your document…</p>
                    <p className="text-[10px] text-slate-300 mt-0.5">This usually takes a few seconds</p>
                  </div>
                </div>

              ) : active.status === "failed" ? (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-5 fade-up">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <span className="text-base">⚠️</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-red-700">Processing Failed</p>
                      <p className="text-xs text-red-500 mt-1 leading-relaxed">{active.error || "The AI pipeline encountered an error processing this document."}</p>
                    </div>
                  </div>
                </div>

              ) : (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-400 font-medium">Queued for processing…</p>
                </div>
              )}
            </div>

            {/* Panel footer */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-300 font-medium uppercase tracking-wider">
              <span>Groq LLaMA3 70B</span>
              <span>PaddleOCR v2</span>
            </div>
          </div>
        )}
      </aside>

    </div>
  );
}
