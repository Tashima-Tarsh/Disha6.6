export type PentagiStatus = {
  status: "unconfigured" | "available" | "unavailable";
  publicUrl: string | null;
};

export async function getPentagiStatus(): Promise<PentagiStatus> {
  const base = process.env.PENTAGI_BASE_URL?.trim();
  const publicUrl = process.env.PENTAGI_PUBLIC_URL?.trim();
  if (!base || !publicUrl) return { status: "unconfigured", publicUrl: null };
  try {
    const destination = new URL(publicUrl);
    if (!["http:", "https:"].includes(destination.protocol) || destination.username || destination.password) {
      return { status: "unconfigured", publicUrl: null };
    }
    const response = await fetch(`${base.replace(/\/$/, "")}/api/v1/info`, {
      signal: AbortSignal.timeout(2500),
      cache: "no-store",
      redirect: "error",
    });
    const body = response.ok ? await response.json() : null;
    const available = Boolean(body && body.status === "success" && body.data);
    return { status: available ? "available" : "unavailable", publicUrl: destination.toString() };
  } catch {
    return { status: "unavailable", publicUrl: null };
  }
}
