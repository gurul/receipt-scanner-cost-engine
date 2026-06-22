import { describe, expect, it } from "vitest";
import { assertSameOrigin } from "./request";

describe("assertSameOrigin", () => {
  it("accepts the application origin", () => {
    expect(() => assertSameOrigin(new Request("https://app.example/api/test", {
      headers: { Origin: "https://app.example" },
    }))).not.toThrow();
  });

  it("rejects missing or foreign origins", () => {
    expect(() => assertSameOrigin(new Request("https://app.example/api/test"))).toThrow();
    expect(() => assertSameOrigin(new Request("https://app.example/api/test", {
      headers: { Origin: "https://attacker.example" },
    }))).toThrow();
  });
});
