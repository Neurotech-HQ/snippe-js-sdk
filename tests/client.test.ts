import { describe, expect, it } from "vitest";
import { Snippe } from "../src";

describe("Snippe client", () => {
  it("requires an apiKey", () => {
    expect(() => new Snippe({ apiKey: "" })).toThrow(/apiKey/);
    // @ts-expect-error intentionally passing no apiKey
    expect(() => new Snippe({})).toThrow(/apiKey/);
  });

  it("defaults environment to production with the correct base URL and timeout", () => {
    const snippe = new Snippe({ apiKey: "snp_test" });
    const cfg = snippe.getConfig();
    expect(cfg.environment).toBe("production");
    expect(cfg.baseUrl).toBe("https://api.snippe.sh");
    expect(cfg.timeoutMs).toBe(30_000);
  });

  it("honours explicit environment, baseUrl, and timeoutMs overrides", () => {
    const snippe = new Snippe({
      apiKey: "snp_test",
      environment: "sandbox",
      baseUrl: "https://custom.example/v1",
      timeoutMs: 5_000,
    });
    const cfg = snippe.getConfig();
    expect(cfg.environment).toBe("sandbox");
    expect(cfg.baseUrl).toBe("https://custom.example/v1");
    expect(cfg.timeoutMs).toBe(5_000);
  });

  it("wires up payments, sessions, and payouts resources", () => {
    const snippe = new Snippe({ apiKey: "snp_test" });
    expect(snippe.payments).toBeDefined();
    expect(snippe.sessions).toBeDefined();
    expect(snippe.payouts).toBeDefined();
    expect(typeof snippe.payments.create).toBe("function");
    expect(typeof snippe.sessions.create).toBe("function");
    expect(typeof snippe.payouts.send).toBe("function");
  });

  it("accepts a custom fetch implementation", () => {
    const customFetch = (async () => new Response("{}")) as typeof fetch;
    const snippe = new Snippe({ apiKey: "snp_test", fetch: customFetch });
    expect(snippe.getConfig().fetch).toBe(customFetch);
  });
});
