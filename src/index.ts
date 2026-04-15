import type { SnippeConfig, ResolvedSnippeConfig, Environment } from "./types";

const DEFAULT_BASE_URLS: Record<Environment, string> = {
  sandbox: "https://sandbox.api.snippe.example/v1",
  production: "https://api.snippe.example/v1",
};

const DEFAULT_TIMEOUT_MS = 30_000;

export class Snippe {
  private readonly config: ResolvedSnippeConfig;

  constructor(config: SnippeConfig) {
    if (!config?.apiKey) {
      throw new Error("Snippe SDK: `apiKey` is required.");
    }

    const environment: Environment = config.environment ?? "sandbox";

    this.config = {
      apiKey: config.apiKey,
      environment,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URLS[environment],
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    };
  }

  getConfig(): Readonly<ResolvedSnippeConfig> {
    return this.config;
  }

  async ping(): Promise<{ ok: true; environment: Environment }> {
    return { ok: true, environment: this.config.environment };
  }
}

export default Snippe;
export type { SnippeConfig, ResolvedSnippeConfig, Environment } from "./types";
