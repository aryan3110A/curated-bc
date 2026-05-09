import sanitizeHtml from "sanitize-html";

export const sanitizeBlogContent = (value: string) =>
  sanitizeHtml(value, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      "img",
      "h1",
      "h2",
      "h3",
      "figure",
      "figcaption",
      "section",
      "article"
    ]),
    allowedAttributes: {
      a: ["href", "target", "rel", "title"],
      img: ["src", "alt", "title", "width", "height"],
      "*": ["class"]
    },
    allowedSchemes: ["http", "https", "mailto"]
  });

export const estimateReadingTime = (value: string) => {
  const plainText = value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  const wordCount = plainText ? plainText.split(" ").length : 0;

  return Math.max(1, Math.ceil(wordCount / 220));
};
