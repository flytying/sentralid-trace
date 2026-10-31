"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyzeResponse, ReassessResponse } from "@/lib/case/state";
import { SAMPLES, type SampleKey } from "@/lib/samples";
import { CheckView, type FollowUp } from "./CheckView";
import { ErrorPanel, type ClientError } from "./ErrorPanel";
import { EMPTY_EVIDENCE, EvidenceForm, type Evidence, type Shot } from "./EvidenceForm";
import { Findings } from "./Findings";
import { OnFilePanel } from "./OnFilePanel";
import { Progress } from "./Progress";
import { ResortPicker } from "./ResortPicker";
import { ResultView } from "./ResultView";
import { Stepper } from "./Stepper";
import type { ReferenceView, Selection, StepId } from "./types";
import styles from "./workspace.module.css";

type View = "business" | "evidence" | "analyzing" | "error" | "findings" | "check" | "result";

const STEP_OF: Record<View, StepId> = {
  business: "business",
  evidence: "evidence",
  analyzing: "findings",
  error: "findings",
  findings: "findings",
  check: "check",
  result: "result",
};

export function Workspace({ sampleKey }: { sampleKey: SampleKey | null }) {
  const sample = sampleKey ? SAMPLES[sampleKey] : null;
  const [view, setView] = useState<View>("business");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [evidence, setEvidence] = useState<Evidence>(EMPTY_EVIDENCE);
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<ClientError | null>(null);
  const [sampleError, setSampleError] = useState(false);
  const [reassessment, setReassessment] = useState<ReassessResponse | null>(null);
  const [skipped, setSkipped] = useState(false);
  const [checkBusy, setCheckBusy] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [times, setTimes] = useState<{ analyzed: Date; followup: Date | null }>({ analyzed: new Date(), followup: null });
  const mainRef = useRef<HTMLDivElement>(null);
  const [analysisDone, setAnalysisDone] = useState(false);
  const [asideOffset, setAsideOffset] = useState(0);

  // Line the side panel up with the first box under each step's heading (marked data-aside-anchor, else the first card).
  useEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const update = () => {
      const card = main.querySelector<HTMLElement>("[data-aside-anchor]") ?? main.querySelector<HTMLElement>(".card");
      const sideBySide = window.matchMedia("(min-width: 1001px)").matches;
      // offsetTop ignores the fade-in transform, so the result doesn't depend on animation timing.
      const pageTop = (el: HTMLElement | null) => {
        let y = 0;
        for (; el; el = el.offsetParent as HTMLElement | null) y += el.offsetTop;
        return y;
      };
      setAsideOffset(card && sideBySide ? pageTop(card) - pageTop(main) : 0);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(main);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [view]);

  // A sample scenario preselects its fictional resort and loads its demo screenshots.
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
    setReassessment(null);
    setSkipped(false);
    setView("business");
  };

  async function followUp(f: FollowUp) {
    if (!result?.nextCheck.actionId) return;
    setCheckBusy(true);
    setCheckError(null);
    const form = new FormData();
    form.set("sealedCaseToken", result.sealedCaseToken);
    form.set("actionId", result.nextCheck.actionId);
    if (f.kind === "url") form.set("extraPageUrl", f.url);
    if (f.kind === "image") {
      form.set("extraImage", f.file);
      form.set("consent", "true");
    }
    if (f.kind === "report") form.set("reportedAnswer", f.answer);
    try {
      const res = await fetch("/api/investigations/reassess", { method: "POST", body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data || data.error) {
        // Never show a success card for an error; the earlier result stays as it was.
        setCheckError(`${data?.error?.message ?? "We couldn't update your result. Please try again."} Your result hasn't changed.`);
        return;
      }
      setReassessment(data as ReassessResponse);
      setSkipped(false);
      setTimes((t) => ({ ...t, followup: new Date() }));
      setView("result");
    } catch {
      setCheckError("We couldn't reach Trace. Check your connection and try again. Your result hasn't changed.");
    } finally {
      setCheckBusy(false);
    }
  }

  async function analyze() {
    if (!selection) return;
    setError(null);
    setAnalysisDone(false);
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
      setReassessment(null);
      setSkipped(false);
      setTimes({ analyzed: new Date(), followup: null });
      // The progress screen plays the remaining stages, then switches to the findings.
      setAnalysisDone(true);
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
          <span className={styles.eyebrowMuted}>{sample ? `Demo scenario ${sample.key}` : "Booking check"}</span>
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
          {view === "analyzing" && (
            <Progress
              usesModel={usesModel}
              done={analysisDone}
              modelMs={analysisDone ? (result?.inference?.latencyMs ?? null) : null}
              onFinished={() => setView("findings")}
              shots={[
                ...(evidence.pageShot ? [{ shot: evidence.pageShot, caption: "Page" }] : []),
                ...evidence.chats.map((shot, i) => ({ shot, caption: `Chat ${i + 1}` })),
              ]}
            />
          )}
          {view === "error" && error && <ErrorPanel error={error} onRetry={analyze} onEdit={() => setView("evidence")} onRestart={restart} />}
          {view === "findings" && result && (
            <Findings
              result={result}
              reference={selection?.kind === "listed" ? selection.ref : null}
              note={evidence.note}
              onEdit={() => setView("evidence")}
              onRestart={restart}
              onStartCheck={() => {
                setCheckError(null);
                setView(reassessment ? "result" : "check");
              }}
              onFinish={() => {
                setSkipped(true);
                setView("result");
              }}
            />
          )}
          {view === "check" && result?.nextCheck.check && (
            <CheckView
              next={result.nextCheck}
              synthetic={result.subject.samples}
              sampleLink={sample?.followupLink}
              busy={checkBusy}
              error={checkError}
              onSubmit={followUp}
              onSkip={() => {
                setSkipped(true);
                setTimes((t) => ({ ...t, followup: new Date() }));
                setView("result");
              }}
              onBack={() => setView("findings")}
            />
          )}
          {view === "result" && result && (
            <ResultView
              analysis={result}
              reassessment={reassessment}
              skipped={skipped && !reassessment}
              reference={selection?.kind === "listed" ? selection.ref : null}
              checkedAt={times}
              onRestart={restart}
            />
          )}
        </div>
        {selection && view !== "business" && (
          <div className={styles.aside} style={{ marginTop: asideOffset }}>
            <OnFilePanel selection={selection} onChange={() => setView("business")} />
          </div>
        )}
      </div>
    </div>
  );
}
