const DEFAULT_BASE_URL = "https://api.5dollarfootballapi.com/v1";

export type ApiPagination = {
  page: number;
  per_page: number;
  count: number;
  has_more: boolean;
};

export type ApiResult<T> = {
  data: T;
  pagination?: ApiPagination;
  notice?: { code?: string; message?: string; doc_url?: string };
  rateLimit: {
    limit: number | null;
    remaining: number | null;
    reset: string | null;
  };
};

export class FiveDollarApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfterSeconds?: number
  ) {
    super(message);
    this.name = "FiveDollarApiError";
  }
}

type ApiEnvelope<T> = {
  success: 1 | 0;
  data?: T;
  pagination?: ApiPagination;
  notice?: ApiResult<T>["notice"];
  error?: { code?: string; message?: string };
};

export class FiveDollarClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor(options?: { apiKey?: string; baseUrl?: string }) {
    const apiKey = options?.apiKey ?? process.env.FOOTBALL_API_KEY;
    if (!apiKey) throw new Error("FOOTBALL_API_KEY is not configured");

    this.apiKey = apiKey;
    this.baseUrl = (options?.baseUrl ?? process.env.FOOTBALL_API_BASE_URL ?? DEFAULT_BASE_URL)
      .replace(/\/+$/, "");
  }

  async get<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<ApiResult<T>> {
    const url = new URL(`${this.baseUrl}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json"
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000)
    });

    const envelope = await response.json().catch(() => null) as ApiEnvelope<T> | null;
    if (!response.ok || !envelope || envelope.success !== 1 || envelope.data === undefined) {
      const message = envelope?.error?.message ?? `5DollarFootballAPI request failed with HTTP ${response.status}`;
      const retryAfter = response.headers.get("retry-after");
      throw new FiveDollarApiError(
        message,
        response.status,
        envelope?.error?.code,
        retryAfter && Number.isFinite(Number(retryAfter)) ? Number(retryAfter) : undefined
      );
    }

    return {
      data: envelope.data,
      pagination: envelope.pagination,
      notice: envelope.notice,
      rateLimit: {
        limit: this.headerNumber(response, "x-ratelimit-limit"),
        remaining: this.headerNumber(response, "x-ratelimit-remaining"),
        reset: response.headers.get("x-ratelimit-reset")
      }
    };
  }

  async getAllPages<T>(
    path: string,
    params: Record<string, string | number | undefined> = {},
    maximumPages = 100
  ): Promise<{ records: T[]; notices: NonNullable<ApiResult<T[]>["notice"]>[] }> {
    const records: T[] = [];
    const notices: NonNullable<ApiResult<T[]>["notice"]>[] = [];
    let page = 1;

    while (page <= maximumPages) {
      const result = await this.get<T[]>(path, { ...params, page, per_page: params.per_page ?? 100 });
      if (!Array.isArray(result.data)) {
        throw new Error(`Unexpected response shape from 5DollarFootballAPI ${path}`);
      }
      records.push(...result.data);
      if (result.notice) notices.push(result.notice);
      if (!result.pagination?.has_more) return { records, notices };
      page += 1;
    }

    throw new Error(`5DollarFootballAPI pagination exceeded ${maximumPages} pages for ${path}`);
  }

  private headerNumber(response: Response, name: string): number | null {
    const value = response.headers.get(name);
    if (value === null) return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
}