const MERI_PEHCHAAN_HOST_SUFFIX = ".meripehchaan.gov.in";

export function assertTrustedMeriPehchaanUrl(value: string): URL {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    (host !== "meripehchaan.gov.in" && !host.endsWith(MERI_PEHCHAAN_HOST_SUFFIX))
  ) {
    throw Object.assign(new Error("Meri Pehchaan endpoint must use an official meripehchaan.gov.in HTTPS host"), {
      status: 500,
    });
  }
  return url;
}

export async function fetchMeriPehchaanJson(
  url: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  const trusted = assertTrustedMeriPehchaanUrl(url);
  const response = await fetch(trusted, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw Object.assign(new Error(`Meri Pehchaan provider request failed with HTTP ${response.status}`), {
      status: 502,
    });
  }
  const body = await response.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw Object.assign(new Error("Meri Pehchaan returned an invalid JSON response"), { status: 502 });
  }
  return body as Record<string, unknown>;
}

export function requiredProviderString(
  record: Record<string, unknown>,
  key: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw Object.assign(new Error(`Meri Pehchaan response is missing ${key}`), { status: 502 });
  }
  return value.trim();
}

