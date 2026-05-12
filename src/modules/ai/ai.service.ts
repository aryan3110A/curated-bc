import OpenAI from "openai";

import { env } from "../../config/env";
import { logger } from "../../config/logger";

const openai = env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: env.OPENAI_API_KEY })
  : null;

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

const getString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized || fallback;
};

const getStringArray = (value: unknown, fallback: string[]) => {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const normalized = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);

  return normalized.length ? normalized : fallback;
};

type GenerateBlogInput = {
  topic: string;
  keywords: string[];
  tone: string;
  audience?: string;
};

const buildFallbackBlog = (input: GenerateBlogInput) => {
  const topic = input.topic.trim();
  const keywordLine = input.keywords.length
    ? input.keywords.join(", ")
    : "Pinterest growth, premium styling, affiliate storytelling";
  const title = `${topic} Ideas That Turn Pinterest Clicks Into Long-Read Sessions`;

  return {
    title,
    excerpt: `A ${input.tone} guide to ${topic.toLowerCase()} with SEO-friendly structure, immersive storytelling, and product-ready recommendations.`,
    seoTitle: `${topic} Guide for Pinterest-Inspired Blogging`,
    metaDescription: `Explore ${topic.toLowerCase()} ideas, refined visual styling, and affiliate-ready recommendations designed for Pinterest-driven traffic.`,
    pinterestCaption: `${topic} inspiration with ${keywordLine}. Save this post for your next content refresh.`,
    content: `<section><p>${topic} performs best when the content feels saved-worthy at first glance and useful once the reader lands. Build the opening around emotional intent, then guide the reader into clear design decisions and shoppable recommendations.</p><h2>Use a clear visual promise</h2><p>Lead with a scene the reader can immediately picture. Keep the language tactile, warm, and easy to scan.</p><h2>Structure for search and readability</h2><p>Use descriptive subheadings, short paragraphs, and product placements that support the idea instead of interrupting it.</p><h2>Close with action</h2><p>End the article with a concise takeaway, one or two curated products, and a share-worthy summary that feels native to Pinterest traffic.</p></section>`,
  };
};

const requestJson = async (
  prompt: string,
  options: { maxOutputTokens: number },
) => {
  if (!openai) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, env.OPENAI_TIMEOUT_MS);

  try {
    const response = await openai.responses.create(
      {
        model: env.OPENAI_MODEL,
        input: prompt,
        max_output_tokens: options.maxOutputTokens,
        reasoning: { effort: "low" },
      },
      { signal: controller.signal },
    );

    return extractJsonResponse(response.output_text);
  } catch (error) {
    const errorName = error instanceof Error ? error.name : "UnknownError";

    if (errorName === "AbortError") {
      logger.warn(
        { model: env.OPENAI_MODEL, timeoutMs: env.OPENAI_TIMEOUT_MS },
        "OpenAI request timed out; using fallback content.",
      );
      return null;
    }

    logger.warn(
      { errorName, model: env.OPENAI_MODEL },
      "OpenAI request failed; using fallback content.",
    );
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

export const aiService = {
  async generateBlog(input: GenerateBlogInput) {
    const fallback = buildFallbackBlog(input);
    const result = await requestJson(
      [
        "You are an expert editorial strategist for a premium Pinterest-driven blog platform.",
        "Return valid JSON only with keys: title, excerpt, seoTitle, metaDescription, pinterestCaption, content.",
        "The content must be HTML with headings and paragraphs, optimized for SEO and readability.",
        "Keep the article concise: 3 headings, short paragraphs, roughly 450 to 650 words total.",
        `Topic: ${input.topic.trim()}`,
        `Tone: ${input.tone}`,
        `Audience: ${input.audience ?? "design-conscious readers"}`,
        `Keywords: ${input.keywords.join(", ") || "minimal interiors, Pinterest traffic, affiliate recommendations"}`,
      ].join("\n"),
      { maxOutputTokens: 900 },
    );

    return {
      title: getString(result?.title, fallback.title),
      excerpt: getString(result?.excerpt, fallback.excerpt),
      seoTitle: getString(result?.seoTitle, fallback.seoTitle),
      metaDescription: getString(
        result?.metaDescription,
        fallback.metaDescription,
      ),
      pinterestCaption: getString(
        result?.pinterestCaption,
        fallback.pinterestCaption,
      ),
      content: getString(result?.content, fallback.content),
    };
  },

  async generateSeo(input: {
    title: string;
    excerpt?: string;
    content?: string;
  }) {
    const fallback = {
      seoTitle: `${input.title} | CuratedCounter`,
      metaDescription:
        input.excerpt ||
        "Pinterest-inspired editorial content crafted for search visibility and premium readability.",
    };
    const result = await requestJson(
      [
        "You are an SEO strategist for an editorial content platform.",
        "Return valid JSON only with keys: seoTitle and metaDescription.",
        `Title: ${input.title}`,
        `Excerpt: ${input.excerpt ?? ""}`,
        `Content: ${input.content ?? ""}`,
      ].join("\n"),
      { maxOutputTokens: 180 },
    );

    return {
      seoTitle: getString(result?.seoTitle, fallback.seoTitle),
      metaDescription: getString(
        result?.metaDescription,
        fallback.metaDescription,
      ),
    };
  },

  async generateCaption(input: { title: string; keywords: string[] }) {
    const fallback = {
      caption: `${input.title} with ${input.keywords.join(", ") || "editorial styling"}. Save this for your next inspiration board.`,
      hashtags: input.keywords
        .map((keyword) => `#${keyword.replace(/\s+/g, "")}`)
        .slice(0, 5),
    };
    const result = await requestJson(
      [
        "You write Pinterest captions for premium editorial blogs.",
        "Return valid JSON only with keys: caption and hashtags.",
        "Keep the caption tight and punchy. Maximum two sentences and five hashtags.",
        `Title: ${input.title.trim()}`,
        `Keywords: ${input.keywords.join(", ")}`,
      ].join("\n"),
      { maxOutputTokens: 120 },
    );

    return {
      caption: getString(result?.caption, fallback.caption),
      hashtags: getStringArray(result?.hashtags, fallback.hashtags).slice(0, 5),
    };
  },
};
