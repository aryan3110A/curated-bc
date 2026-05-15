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

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const limitWords = (value: string, maxWords: number) =>
  value.split(/\s+/).filter(Boolean).slice(0, maxWords).join(" ");

const countWords = (value: string) => value.split(/\s+/).filter(Boolean).length;

const buildDetailedParagraph = (topic: string, keywords: string[]) => {
  const keywordLine = keywords.length
    ? `Details like ${keywords.slice(0, 8).join(", ")} can be woven into the room through color, texture, furniture, decor, and finishing touches that feel collected rather than forced.`
    : "Details can be woven into the room through color, texture, furniture, decor, and finishing touches that feel collected rather than forced.";

  return `${topic} works best when the room feels layered, calm, intentional, and visually complete, with every element supporting both comfort and style in a way that feels natural rather than overdesigned. Begin with a grounded palette that gives the space a clear mood, then build depth through fabric, finish, lighting, and shape so the room feels thoughtful from every angle. Walls, bedding, curtains, rugs, and upholstered pieces should all contribute to one connected story, allowing the bedroom to feel restful while still carrying personality and character. Soft contrast is especially important in a design like this, because the room should feel rich without becoming heavy, which is why wood tones, muted neutrals, brushed metal, stone-inspired accents, and tactile textiles help create balance across the full composition. ${keywordLine} Lighting should never feel like an afterthought, so combine ambient lamps, soft bedside glow, filtered daylight, and warm evening light to help surfaces feel gentle and elevated throughout the day. Furniture should stay clean-lined and functional, but it should also bring warmth through curved silhouettes, layered upholstery, and pieces that feel substantial without making the room visually crowded. Styling is most effective when it feels restrained and polished, so a few meaningful objects such as framed art, stacked books, ceramic decor, sculptural lamps, and natural branches can shape a more editorial atmosphere than dozens of small accessories. Layering should be handled with intention, meaning bedding can combine crisp sheets, quilted coverlets, textured cushions, and a folded throw so the space feels both comfortable and visually rich without looking busy. Window treatments, bedside tables, mirrors, and storage pieces should also support the mood, helping the room feel complete, practical, and coherent instead of decorative only on the surface. The strongest version of this bedroom feels quiet, refined, and deeply livable, offering a polished retreat that photographs beautifully, reads beautifully in editorial content, and gives readers a clear vision they can adapt in their own home with confidence, warmth, and lasting style.`;
};

const toSingleParagraphContent = (
  value: unknown,
  fallback: string,
  minWords = 330,
) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const paragraphMatches = [...value.matchAll(/<p[^>]*>(.*?)<\/p>/gis)].map(
    (match) => match[1],
  );
  const source = paragraphMatches.length ? paragraphMatches.join(" ") : value;
  const normalized = source
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!normalized) {
    return fallback;
  }

  if (countWords(normalized) < minWords) {
    return fallback;
  }

  const trimmed = limitWords(normalized, 1000);

  if (!trimmed) {
    return fallback;
  }

  return `<section><p>${escapeHtml(trimmed)}</p></section>`;
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
    content: toSingleParagraphContent(
      buildDetailedParagraph(topic, input.keywords),
      `<section><p>${escapeHtml(buildDetailedParagraph(topic, input.keywords))}</p></section>`,
    ),
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
        "The content must be a single HTML paragraph wrapped in <section><p>...</p></section>.",
        "Do not use h1, h2, h3, lists, bold text, or multiple paragraphs.",
        "Write one detailed, visually rich paragraph around 800 words.",
        "Keep it long-form, descriptive, editorial, and easy to read, but still only one paragraph.",
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
      content: toSingleParagraphContent(result?.content, fallback.content),
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
