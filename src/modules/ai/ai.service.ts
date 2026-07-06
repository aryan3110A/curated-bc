import OpenAI from "openai";

import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";

type JsonRecord = Record<string, unknown>;

const extractJsonResponse = (value: string): JsonRecord | null => {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const candidates = [withoutFences];
  const firstBrace = withoutFences.indexOf("{");
  const lastBrace = withoutFences.lastIndexOf("}");

  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(withoutFences.slice(firstBrace, lastBrace + 1));
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as JsonRecord;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const getString = (value: unknown, fieldName: string) => {
  if (typeof value !== "string") {
    throw new AppError(`OpenAI response is missing a valid ${fieldName}.`, 502);
  }

  const normalized = value.trim();

  if (!normalized) {
    throw new AppError(`OpenAI response returned an empty ${fieldName}.`, 502);
  }

  return normalized;
};

const getStringArray = (value: unknown, fieldName: string) => {
  if (!Array.isArray(value)) {
    throw new AppError(`OpenAI response is missing a valid ${fieldName}.`, 502);
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!normalized.length) {
    throw new AppError(`OpenAI response returned an empty ${fieldName}.`, 502);
  }

  return normalized;
};

type GenerateBlogInput = {
  topic: string;
  keywords: string[];
  tone: string;
  audience?: string;
};

type OpenAiResult = {
  data: JsonRecord;
  model: string;
  source: "openai";
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const limitWords = (value: string, maxWords: number) =>
  value.split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");

const normalizeBlogContent = (value: string) => {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new AppError("OpenAI response returned empty article content.", 502);
  }

  if (trimmed.includes("<section") || trimmed.includes("<p")) {
    return trimmed;
  }

  const plain = trimmed.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const limited = limitWords(plain, 1000);

  return `<section><p>${escapeHtml(limited)}</p></section>`;
};

const getOpenAiClient = () => {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(
      "OpenAI is not configured. Add OPENAI_API_KEY to enable AI blog generation.",
      503,
    );
  }

  return new OpenAI({ apiKey: env.OPENAI_API_KEY });
};

const requestJson = async (
  prompt: string,
  options: { maxOutputTokens: number },
): Promise<OpenAiResult> => {
  const client = getOpenAiClient();
  const model = env.OPENAI_MODEL;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, env.OPENAI_TIMEOUT_MS);

  try {
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a helpful assistant for an editorial blog platform. Always return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: options.maxOutputTokens,
        response_format: { type: "json_object" },
      },
      { signal: controller.signal },
    );

    const outputText = response.choices[0]?.message?.content?.trim();

    if (!outputText) {
      throw new AppError("OpenAI returned an empty response.", 502);
    }

    const parsed = extractJsonResponse(outputText);

    if (!parsed) {
      throw new AppError("OpenAI returned content that could not be parsed.", 502);
    }

    logger.info(
      {
        model,
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
      },
      "OpenAI generation completed.",
    );

    return {
      data: parsed,
      model,
      source: "openai",
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    const errorName = error instanceof Error ? error.name : "UnknownError";

    if (errorName === "AbortError") {
      throw new AppError(
        `OpenAI request timed out after ${env.OPENAI_TIMEOUT_MS}ms.`,
        504,
      );
    }

    logger.error(
      { errorName, model },
      "OpenAI request failed.",
    );

    throw new AppError(
      error instanceof Error
        ? `OpenAI request failed: ${error.message}`
        : "OpenAI request failed.",
      502,
    );
  } finally {
    clearTimeout(timeoutId);
  }
};

const withMeta = <T extends Record<string, unknown>>(payload: T, meta: OpenAiResult) => ({
  ...payload,
  source: meta.source,
  model: meta.model,
});

export const aiService = {
  async generateBlog(input: GenerateBlogInput) {
    const result = await requestJson(
      [
        "You are an expert editorial strategist for a premium Pinterest-driven blog platform.",
        "Return valid JSON only with keys: title, excerpt, seoTitle, metaDescription, pinterestCaption, content.",
        "The content must be a single HTML paragraph wrapped in <section><p>...</p></section>.",
        "Do not use h1, h2, h3, lists, bold text, or multiple paragraphs.",
        "Write one detailed, visually rich paragraph around 500-800 words.",
        "Keep it long-form, descriptive, editorial, and easy to read, but still only one paragraph.",
        `Topic: ${input.topic.trim()}`,
        `Tone: ${input.tone}`,
        `Audience: ${input.audience ?? "design-conscious readers"}`,
        `Keywords: ${input.keywords.join(", ") || "minimal interiors, Pinterest traffic, affiliate recommendations"}`,
      ].join("\n"),
      { maxOutputTokens: 2500 },
    );

    return withMeta(
      {
        title: getString(result.data.title, "title"),
        excerpt: getString(result.data.excerpt, "excerpt"),
        seoTitle: getString(result.data.seoTitle, "seoTitle"),
        metaDescription: getString(result.data.metaDescription, "metaDescription"),
        pinterestCaption: getString(result.data.pinterestCaption, "pinterestCaption"),
        content: normalizeBlogContent(getString(result.data.content, "content")),
      },
      result,
    );
  },

  async generateSeo(input: {
    title: string;
    excerpt?: string;
    content?: string;
  }) {
    const result = await requestJson(
      [
        "You are an SEO strategist for an editorial content platform.",
        "Return valid JSON only with keys: seoTitle and metaDescription.",
        `Title: ${input.title}`,
        `Excerpt: ${input.excerpt ?? ""}`,
        `Content: ${input.content ?? ""}`,
      ].join("\n"),
      { maxOutputTokens: 300 },
    );

    return withMeta(
      {
        seoTitle: getString(result.data.seoTitle, "seoTitle"),
        metaDescription: getString(result.data.metaDescription, "metaDescription"),
      },
      result,
    );
  },

  async generateCaption(input: { title: string; keywords: string[] }) {
    const result = await requestJson(
      [
        "You write Pinterest captions for premium editorial blogs.",
        "Return valid JSON only with keys: caption and hashtags.",
        "Keep the caption tight and punchy. Maximum two sentences and five hashtags.",
        `Title: ${input.title.trim()}`,
        `Keywords: ${input.keywords.join(", ")}`,
      ].join("\n"),
      { maxOutputTokens: 220 },
    );

    return withMeta(
      {
        caption: getString(result.data.caption, "caption"),
        hashtags: getStringArray(result.data.hashtags, "hashtags").slice(0, 5),
      },
      result,
    );
  },
};
