"use client";

import { useEffect, useRef, useState } from "react";
import { SAMPLES, type SampleKey } from "@/lib/samples";
import { OnFilePanel } from "./OnFilePanel";
import { ResortPicker } from "./ResortPicker";
import { Stepper } from "./Stepper";
import type { ReferenceView, Selection, StepId } from "./types";
import styles from "./workspace.module.css";

export function Workspace({ sampleKey }: { sampleKey: SampleKey | null }) {
  const sample = sampleKey ? SAMPLES[sampleKey] : null;
  const [step, setStep] = useState<StepId>("business");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [sampleError, setSampleError] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  // A sample scenario preselects its (made-up) resort from the sample registry.
  useEffect(() => {
    if (!sample) return;
    if (!sample.businessId) {
      setSelection({ kind: "unlisted", label: sample.unlistedName ?? "Unlisted resort", pageUrl: sample.pageUrl });
      setStep("evidence");
      return;
    }
    let cancelled = false;
    fetch(`/api/references/${sample.businessId}?samples=1`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d: { item: ReferenceView }) => {
        if (cancelled) return;
        setSelection({ kind: "listed", ref: d.item, pageUrl: sample.pageUrl });
        setStep("evidence");
      })
      .catch(() => !cancelled && setSampleError(true));
    return () => {
      cancelled = true;
    };
  }, [sample]);

  // Move focus to the new step's heading on step changes (not on first render).
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.querySelector("h1")?.focus();
  }, [step]);

  const choose = (s: Selection) => {
    setSelection(s);
    setStep("evidence");
  };
  const restart = () => {
    setSelection(null);
    setStep("business");
    if (sample) window.location.assign("/investigate");
  };

  const title = selection ? (selection.kind === "listed" ? selection.ref.displayName : selection.label) : "New check";

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

      <Stepper current={step} />

      {sampleError && (
        <p role="alert" className={styles.errText}>
          We couldn&apos;t load this sample. Please start over.
        </p>
      )}

      <div className={styles.columns}>
        <div className={styles.main} ref={headingRef}>
          {step === "business" && <ResortPicker samples={false} onSelect={choose} />}
          {step === "evidence" && selection && (
            <div className={`${styles.panel} fade-in`}>
              <div className={styles.headBlock}>
                <h1 className={styles.h1} tabIndex={-1}>
                  Add what you have
                </h1>
                <p className={styles.sub}>Any one is enough: a page link, a page screenshot, or chat screenshots.</p>
              </div>
              <div className={styles.placeholder}>
                Evidence upload and live analysis arrive in the next build phase.
                {sample && <> This sample will use {[sample.pageUrl && "a page link", sample.pageImage && "a page screenshot", sample.chatImages.length && `${sample.chatImages.length} chat screenshot${sample.chatImages.length > 1 ? "s" : ""}`].filter(Boolean).join(", ")}.</>}
              </div>
              <div>
                <button type="button" className="btn btn-secondary" onClick={() => setStep("business")}>
                  ‹ Change resort
                </button>
              </div>
            </div>
          )}
        </div>
        {selection && step !== "business" && (
          <div className={styles.aside}>
            <OnFilePanel selection={selection} onChange={() => setStep("business")} />
          </div>
        )}
      </div>
    </div>
  );
}
