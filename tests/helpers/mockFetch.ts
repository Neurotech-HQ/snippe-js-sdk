export interface CapturedRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
}

export interface MockResponseSpec {
  status?: number;
  body?: unknown;
  headers?: Record<string, string>;
  /** Plain text body (skips JSON serialisation) — useful for malformed-JSON tests. */
  rawText?: string;
  /** Throw this error instead of returning a response (simulates network failure). */
  throwError?: Error;
  /** Delay before resolving, in ms — useful for timeout tests. */
  delayMs?: number;
}

export interface MockFetch {
  fetch: typeof fetch;
  requests: CapturedRequest[];
  /** Last captured request. Throws if none. */
  lastRequest(): CapturedRequest;
}

/**
 * Create a mock `fetch` that returns scripted responses in order.
 * If fewer responses than calls, the last response is reused.
 */
export function createMockFetch(responses: MockResponseSpec[]): MockFetch {
  const requests: CapturedRequest[] = [];
  let callIndex = 0;

  const mock: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input as URL).toString();
    const method = (init?.method ?? "GET").toUpperCase();
    const headers: Record<string, string> = {};
    if (init?.headers) {
      const h = init.headers as Record<string, string>;
      for (const [k, v] of Object.entries(h)) {
        headers[k.toLowerCase()] = v;
      }
    }

    let body: unknown = undefined;
    if (init?.body && typeof init.body === "string") {
      try {
        body = JSON.parse(init.body);
      } catch {
        body = init.body;
      }
    }

    requests.push({ url, method, headers, body });

    const spec = responses[Math.min(callIndex, responses.length - 1)];
    callIndex += 1;

    if (spec.delayMs) {
      await new Promise((resolve, reject) => {
        const t = setTimeout(resolve, spec.delayMs);
        if (init?.signal) {
          init.signal.addEventListener("abort", () => {
            clearTimeout(t);
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        }
      });
    }

    if (spec.throwError) {
      throw spec.throwError;
    }

    const status = spec.status ?? 200;
    const responseHeaders = new Headers(spec.headers ?? {});
    if (!responseHeaders.has("content-type") && spec.rawText === undefined) {
      responseHeaders.set("content-type", "application/json");
    }

    const payload =
      spec.rawText !== undefined
        ? spec.rawText
        : spec.body === undefined
          ? ""
          : JSON.stringify(spec.body);

    return new Response(payload, { status, headers: responseHeaders });
  };

  return {
    fetch: mock,
    requests,
    lastRequest(): CapturedRequest {
      if (requests.length === 0) throw new Error("No requests captured");
      return requests[requests.length - 1];
    },
  };
}

/** Standard Snippe success envelope. */
export function successEnvelope<T>(data: T, code = 200) {
  return { status: "success", code, data };
}

/** Standard Snippe error envelope. */
export function errorEnvelope(code: number, errorCode: string, message: string) {
  return { status: "error", code, error_code: errorCode, message };
}
