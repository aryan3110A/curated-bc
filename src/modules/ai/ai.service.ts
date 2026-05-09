import OpenAI from "openai";

import { env } from "../../config/env";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const parseJsonResponse = <T>(value: string, fallback: T): T => {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

type GenerateBlogInput = {
  topic: string;
  keywords: string[];
  tone: string;
  audience?: string;
};

const buildFallbackBlog = (input: GenerateBlogInput) => {
  const keywordLine = input.keywords.length ? input.keywords.join(", ") : "Pinterest growth, premium styling, affiliate storytelling";
  const title = `${input.topic} Ideas That Turn Pinterest Clicks Into Long-Read Sessions`;

  return {
    title,
    excerpt: `A ${input.tone} guide to ${input.topic.toLowerCase()} with SEO-friendly structure, immersive storytelling, and product-ready recommendations.`,
    seoTitle: `${input.topic} Guide for Pinterest-Inspired Blogging`,
    metaDescription: `Explore ${input.topic.toLowerCase()} ideas, refined visual styling, and affiliate-ready recommendations designed for Pinterest-driven traffic.`,
    pinterestCaption: `${input.topic} inspiration with ${keywordLine}. Save this post for your next content refresh.`,
    content: `<section><p>${input.topic} performs best when the content feels saved-worthy at first glance and useful once the reader lands. Build the opening around emotional intent, then guide the reader into clear design decisions and shoppable recommendations.</p><h2>Use a clear visual promise</h2><p>Lead with a scene the reader can immediately picture. Keep the language tactile, warm, and easy to scan.</p><h2>Structure for search and readability</h2><p>Use descriptive subheadings, short paragraphs, and product placements that support the idea instead of interrupting it.</p><h2>Close with action</h2><p>End the article with a concise takeaway, one or two curated products, and a share-worthy summary that feels native to Pinterest traffic.</p></section>`
  };
};

const requestJson = async <T>(prompt: string, fallback: T) => {
  if (!openai) {
    return fallback;
  }

  const response = await openai.responses.create({
    model: env.OPENAI_MODEL,
    input: prompt
  });

  return parseJsonResponse(response.output_text, fallback);
};

export const aiService = {
  async generateBlog(input: GenerateBlogInput) {
    const fallback = buildFallbackBlog(input);

    return requestJson(
      [
        "You are an expert editorial strategist for a premium Pinterest-driven blog platform.",
        "Return valid JSON only with keys: title, excerpt, seoTitle, metaDescription, pinterestCaption, content.",
        "The content must be HTML with headings and paragraphs, optimized for SEO and readability.",
        `Topic: ${input.topic}`,
        `Tone: ${input.tone}`,
        `Audience: ${input.audience ?? "design-conscious readers"}`,
        `Keywords: ${input.keywords.join(", ") || "minimal interiors, Pinterest traffic, affiliate recommendations"}`
      ].join("\n"),
      fallback
    );
  },

  async generateSeo(input: { title: string; excerpt?: string; content?: string }) {
    const fallback = {
      seoTitle: `${input.title} | CuratedCounter`,
      metaDescription: input.excerpt || "Pinterest-inspired editorial content crafted for search visibility and premium readability."
    };

    return requestJson(
      [
        "You are an SEO strategist for an editorial content platform.",
        "Return valid JSON only with keys: seoTitle and metaDescription.",
        `Title: ${input.title}`,
        `Excerpt: ${input.excerpt ?? ""}`,
        `Content: ${input.content ?? ""}`
      ].join("\n"),
      fallback
    );
  },

  async generateCaption(input: { title: string; keywords: string[] }) {
    const fallback = {
      caption: `${input.title} with ${input.keywords.join(", ") || "editorial styling"}. Save this for your next inspiration board.`,
      hashtags: input.keywords.map((keyword) => `#${keyword.replace(/\s+/g, "")}`).slice(0, 5)
    };

    return requestJson(
      [
        "You write Pinterest captions for premium editorial blogs.",
        "Return valid JSON only with keys: caption and hashtags.",
        `Title: ${input.title}`,
        `Keywords: ${input.keywords.join(", ")}`
      ].join("\n"),
      fallback
    );
  }
};
