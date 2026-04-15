export type Environment = "sandbox" | "production";

export interface SnippeConfig {
  apiKey: string;
  environment?: Environment;
  baseUrl?: string;
  timeoutMs?: number;
}

export interface ResolvedSnippeConfig extends Required<Omit<SnippeConfig, "baseUrl">> {
  baseUrl: string;
}
