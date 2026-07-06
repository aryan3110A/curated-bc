import { aiService } from "../src/modules/ai/ai.service";

const main = async () => {
  const result = await aiService.generateBlog({
    topic: "summer cool bedsheets",
    keywords: ["cool", "summer"],
    tone: "luxury",
  });

  console.log(
    JSON.stringify(
      {
        source: result.source,
        model: result.model,
        title: result.title,
        excerptStart: result.excerpt.slice(0, 100),
        isFallbackTitle: result.title.includes(
          "Ideas That Turn Pinterest Clicks Into Long-Read Sessions",
        ),
      },
      null,
      2,
    ),
  );
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
