// Minimal Meta Model API client (OpenAI-compatible Chat Completions shape).
// Plain fetch on purpose: no SDK defaults that could silently point at a non-Meta provider.
import { AppError } from "../errors";

export interface MetaConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
}

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface JsonSchemaFormat {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
}

export type ReasoningEffort = "minimal" | "low" | "medium" | "high";

export interface CompletionResult {
  content: string;
  model: string | null;
  latencyMs: number;
  usage: { promptTokens?: number; completionTokens?: number; reasoningTokens?: number } | null;
  providerRequestId: string | null;
}

export async function createCompletion(
  cfg: MetaConfig,
  messages: ChatMessage[],
  opts: {
    jsonSchema?: JsonSchemaFormat;
    maxTokens?: number;
    reasoningEffort?: ReasoningEffort;
    fetchImpl?: typeof fetch;
  } = {},
): Promise<CompletionResult> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    // Muse Spark reasons before answering; reasoning tokens count against this cap.
    max_tokens: opts.maxTokens ?? 4000,
  };
  if (opts.reasoningEffort) body.reasoning_effort = opts.reasoningEffort;
  if (opts.jsonSchema) {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: opts.jsonSchema.name, schema: opts.jsonSchema.schema, strict: opts.jsonSchema.strict ?? true },
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  const started = Date.now();
  let res: Response;
  try {
    res = await (opts.fetchImpl ?? fetch)(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      throw new AppError("MODEL_TIMEOUT", "Live analysis took too long. Please try again.", 504);
    }
    const cause = (err as Error & { cause?: { code?: string } }).cause?.code ?? (err as Error).name;
    throw Object.assign(new AppError("MODEL_UNAVAILABLE", "Live analysis is temporarily unavailable.", 502), { detail: `fetch:${cause}` });
  } finally {
    clearTimeout(timer);
  }
  const latencyMs = Date.now() - started;

  if (res.status === 429) {
    throw new AppError("MODEL_RATE_LIMITED", "Live analysis is busy right now. Please wait a moment and retry.", 429);
  }
  if (res.status === 401 || res.status === 403) {
    throw new AppError("CONFIG_INVALID", "The Meta Model API rejected this server's API key. Check MODEL_API_KEY in .env.local and restart.", 502);
  }
  if (!res.ok) {
    throw Object.assign(new AppError("MODEL_UNAVAILABLE", `Live analysis is temporarily unavailable (provider status ${res.status}).`, 502), { detail: `status:${res.status}` });
  }

  let json: {
    model?: string;
    id?: string;
    choices?: Array<{ finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      completion_tokens_details?: { reasoning_tokens?: number };
    };
  };
  try {
    json = await res.json();
  } catch {
    throw new AppError("MODEL_BAD_RESPONSE", "Live analysis returned an unreadable response.", 502);
  }
  const choice = json.choices?.[0];
  const content = choice?.message?.content;
  if (choice?.finish_reason === "length") {
    throw new AppError("MODEL_BAD_RESPONSE", "Live analysis ran out of output budget before answering.", 502);
  }
  if (choice?.message?.refusal) {
    throw new AppError("MODEL_BAD_RESPONSE", "Live analysis declined to read this input.", 502);
  }
  if (typeof content !== "string" || content.length === 0) {
    throw new AppError("MODEL_BAD_RESPONSE", "Live analysis returned an empty response.", 502);
  }
  return {
    content,
    model: json.model ?? null,
    latencyMs,
    usage: json.usage
      ? {
          promptTokens: json.usage.prompt_tokens,
          completionTokens: json.usage.completion_tokens,
          reasoningTokens: json.usage.completion_tokens_details?.reasoning_tokens,
        }
      : null,
    providerRequestId: res.headers.get("x-request-id") ?? json.id ?? null,
  };
}
