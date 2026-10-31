// Live extraction check on the synthetic samples (and optional extra images).
// Usage: npm run eval:extraction -- [effort ...]     e.g. npm run eval:extraction -- minimal low
// Prints extracted fields and latency per scenario. Sends only the synthetic sample images.
import { readFile } from "node:fs/promises";
import type { EvidenceInput, InputId } from "../src/lib/engine/types";
import type { ReasoningEffort } from "../src/lib/meta/client";
import { extractObservations } from "../src/lib/meta/extract";

const SETS: Record<string, { page?: string; chats: string[] }> = {
  A: { page: "A-page-lumencove-cropped.png", chats: ["A-chat-lumencove-gcash.png"] },
  B: { page: "B-page-bahaydagat-lookalike.png", chats: ["B-chat-bahaydagat-deposit.png", "B-chat-bahaydagat-number.png"] },
  C: { chats: ["C-chat-islaverde-cropped.png"] },
};

async function main() {
  const efforts = (process.argv.slice(2).length ? process.argv.slice(2) : ["low"]) as (ReasoningEffort | "default")[];
  const cfg = { baseUrl: "https://api.meta.ai/v1", apiKey: process.env.MODEL_API_KEY!, model: "muse-spark-1.3", timeoutMs: 90000 };
  if (!cfg.apiKey) throw new Error("MODEL_API_KEY missing");
  for (const effort of efforts) {
    for (const [key, set] of Object.entries(SETS)) {
      const images = [];
      if (set.page) images.push(await img("IN-PAGE", "page_screenshot", "Facebook page screenshot", set.page));
      for (const [i, c] of set.chats.entries()) images.push(await img(`IN-CHAT-${i + 1}` as InputId, "chat_screenshot", `Messenger screenshot ${i + 1}`, c));
      try {
        const r = await extractObservations(cfg, images, { reasoningEffort: effort === "default" ? undefined : effort });
        console.log(`\n[${effort}] Sample ${key}: ${r.latencyMs}ms attempts=${r.attempts} warnings=${r.warnings.length}`);
        for (const o of r.observations) console.log(`   ${o.inputId.padEnd(9)} ${o.field.padEnd(20)} ${o.clarity.padEnd(10)} ${JSON.stringify(o.value)}`);
      } catch (e) {
        console.log(`\n[${effort}] Sample ${key}: FAILED ${(e as { code?: string }).code} ${(e as Error).message}`);
      }
    }
  }
}

async function img(id: InputId, kind: EvidenceInput["kind"], label: string, file: string) {
  return { input: { id, kind, label }, mime: "image/png", bytes: await readFile(`public/samples/${file}`) };
}

main();
