import type { HttpClient } from "../http";
import type {
  CreateSessionParams,
  ListSessionsParams,
  RequestOptions,
  ResolvedSnippeConfig,
  Session,
  SessionList,
} from "../types";

/**
 * Hosted checkout — Snippe renders the payment UI on its own page and
 * handles method selection (mobile money, card). Returns a `paymentLinkUrl`
 * you can share via SMS / WhatsApp, or a `checkoutUrl` to embed.
 */
export class CheckoutResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedSnippeConfig,
  ) {}

  /** Create a hosted checkout session. Returns `checkoutUrl` and `paymentLinkUrl`. */
  async create(
    params: CreateSessionParams,
    options?: RequestOptions,
  ): Promise<Session> {
    const body = {
      currency: "TZS" as const,
      ...params,
      webhookUrl: params.webhookUrl ?? this.config.webhookUrl,
    };
    return this.http.request<Session>({
      method: "POST",
      path: "/api/v1/sessions",
      body,
      options,
    });
  }

  async get(reference: string, options?: RequestOptions): Promise<Session> {
    return this.http.request<Session>({
      method: "GET",
      path: `/api/v1/sessions/${encodeURIComponent(reference)}`,
      options,
    });
  }

  async list(
    params: ListSessionsParams = {},
    options?: RequestOptions,
  ): Promise<SessionList> {
    return this.http.request<SessionList>({
      method: "GET",
      path: "/api/v1/sessions",
      query: params as Record<string, unknown>,
      options,
    });
  }

  /** Cancel a pending or active session. Fetch it with `get()` afterwards if you need its new state. */
  async cancel(reference: string, options?: RequestOptions): Promise<void> {
    await this.http.request<unknown>({
      method: "POST",
      path: `/api/v1/sessions/${encodeURIComponent(reference)}/cancel`,
      options,
    });
  }
}
