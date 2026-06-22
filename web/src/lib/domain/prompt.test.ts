import { describe, expect, it } from "vitest";
import { buildExtractionPrompt } from "./prompt";
import { businessConfigSchema } from "./schemas";

describe("buildExtractionPrompt", () => {
  it("includes business-specific context and rules", () => {
    const config = businessConfigSchema.parse({
      business: { name: "My Bakery", industry: "bakery" },
      items: { aliases: {} },
      products: { unit_name: "loaf", recipes: {} },
      overhead: {},
      extraction: {
        prompt_context: "They purchase from wholesale suppliers.",
        item_term: "ingredient",
        receipt_rules: ["Always note the brand name"],
      },
    });

    const prompt = buildExtractionPrompt(config);
    expect(prompt).toContain("My Bakery");
    expect(prompt).toContain("ingredient");
    expect(prompt).toContain("Always note the brand name");
  });
});
