"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/case/state";
import { SAMPLES, type SampleKey } from "@/lib/samples";
import { ErrorPanel, type ClientError } from "./ErrorPanel";
import { EMPTY_EVIDENCE, EvidenceForm, type Evidence, type Shot } from "./EvidenceForm";
import { Findings } from "./Findings";
import { OnFilePanel } from "./OnFilePanel";
import { Progress } from "./Progress";
import { ResortPicker } from "./ResortPicker";
import { Stepper } from "./Stepper";
import type { ReferenceView, Selection, StepId } from "./types";
import styles from "./workspace.module.css";

type View = "business" | "evidence" | "analyzing" | "error" | "findings";

const STEP_OF: Record<View, StepId> = {
  business: "business",
  evidence: "evidence",
  analyzing: "findings",
  error: "findings",
  findings: "findings",
};

export function Workspace({ sampleKey }: { sampleKey: SampleKey | null }) {
  const sample = sampleKey ? SAMPLES[sampleKey] : null;
  const [view, setView] = useState<View>("business");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [evidence, setEvidence] = useState<Evidence>(EMPTY_EVIDENCE);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<ClientError | null>(null);
  const [sampleError, setSampleError] = useState(false);
  const mainRef = useRef<HTMLDivElement>(null);

  // A sample scenario preselects its made-up resort and loads its made-up screenshots.
  useEffect(() => {
    if (!sample) return;
    let cancelled = false;
    (async () => {
      try {
        let sel: Selection;
        if (sample.businessId) {
          const r = await fetch(`/api/references/${sample.businessId}?samples=1`);
          if (!r.ok) throw new Error(String(r.status));
          const d: { item: ReferenceView } = await r.json();
          sel = { kind: "listed", ref: d.item, pageUrl: sample.pageUrl };
        } else {
          sel = { kind: "unlisted", label: sample.unlistedName ?? "Unlisted resort", pageUrl: sample.pageUrl };
        }
        const load = async (path: string): Promise<Shot> => {
          const blob = await (await fetch(path)).blob();
          const name = path.split("/").pop()!;
          const file = new File([blob], name, { type: blob.type || "image/png" });
          return { file, previewUrl: URL.createObjectURL(file), name, sample: true };
        };
        const pageShot = sample.pageImage ? await load(sample.pageImage) : null;
        const chats = await Promise.all(sample.chatImages.map(load));
        if (cancelled) return;
        setSelection(sel);
        setEvidence({ pageUrl: sample.pageUrl ?? "", pageShot, chats, note: "", consent: false });
        setView("evidence");
      } catch {
        if (!cancelled) setSampleError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sample]);

  // Move focus to the new view's heading (not on first render).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    mainRef.current?.querySelector<HTMLElement>("h1")?.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  const choose = (s: Selection) => {
    setSelection(s);
    setEvidence((e) => ({ ...e, pageUrl: s.pageUrl ?? e.pageUrl }));
    setView("evidence");
  };

  const restart = () => {
    if (sample) {
      window.location.assign("/investigate");
      return;
    }
    for (const s of [evidence.pageShot, ...evidence.chats]) if (s) URL.revokeObjectURL(s.previewUrl);
    setSelection(null);
    setEvidence(EMPTY_EVIDENCE);
    setResult(null);
    setError(null);
    setView("business");
  };

  async function analyze() {
    if (!selection) return;
    setError(null);
    setView("analyzing");
    const form = new FormData();
    if (sample) form.set("samples", "1");
    if (selection.kind === "listed") form.set("businessId", selection.ref.id);
    else form.set("unlistedLabel", selection.label);
    if (evidence.pageUrl.trim()) form.set("pageUrl", evidence.pageUrl.trim());
    if (evidence.pageShot) form.set("pageImage", evidence.pageShot.file);
    for (const c of evidence.chats) form.append("chatImages", c.file);
    if (evidence.consent) form.set("consent", "true");
    try {
      const res = await fetch("/api/investigations/analyze", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        setError(data?.error ?? { code: "MODEL_UNAVAILABLE", message: "Something went wrong. Please try again.", recoverable: true });
        setView("error");
        return;
      }
      setResult(data as AnalyzeResponse);
      setView("findings");
    } catch {
      setError({ code: "NETWORK", message: "Check your connection and try again. Nothing was analysed.", recoverable: true });
      setView("error");
    }
  }

  const title = selection ? (selection.kind === "listed" ? selection.ref.displayName : selection.label) : "New check";
  const usesModel = Boolean(evidence.pageShot) || evidence.chats.length > 0;

  return (
    <div className={styles.workspace}>
      <div className={styles.topBar}>
        <div className={styles.topTitle}>
          <span className={styles.eyebrowMuted}>{sample ? `Sample ${sample.key} · made-up example` : "Booking check"}</span>
          <span className={styles.caseTitle}>{title}</span>
        </div>
        <button type="button" className={styles.smallBtn} onClick={restart}>
          Start over
        </button>
      </div>

      <Stepper current={STEP_OF[view]} />

      {sampleError && (
        <p role="alert" className={styles.errText}>
          We couldn&apos;t load this sample. Please start over.
        </p>
      )}

      <div className={styles.columns}>
        <div className={styles.main} ref={mainRef}>
          {view === "business" && <ResortPicker samples={false} onSelect={choose} />}
          {view === "evidence" && selection && (
            <EvidenceForm evidence={evidence} onChange={setEvidence} onSubmit={analyze} onBack={() => setView("business")} isSample={Boolean(sample)} />
          )}
          {view === "analyzing" && <Progress usesModel={usesModel} />}
          {view === "error" && error && <ErrorPanel error={error} onRetry={analyze} onEdit={() => setView("evidence")} onRestart={restart} />}
          {view === "findings" && result && (
            <Findings
              result={result}
              reference={selection?.kind === "listed" ? selection.ref : null}
              note={evidence.note}
              onEdit={() => setView("evidence")}
              onRestart={restart}
            />
          )}
        </div>
        {selection && view !== "business" && (
          <div className={styles.aside}>
            <OnFilePanel selection={selection} onChange={() => setView("business")} />
          </div>
        )}
      </div>
    </div>
  );
}
