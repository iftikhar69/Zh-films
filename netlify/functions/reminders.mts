export default async function handler() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.warn("Reminders skipped: URL or CRON_SECRET is not set.");
    return new Response("not configured", { status: 200 });
  }
  const res = await fetch(`${base}/api/cron/reminders`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  return new Response(await res.text(), { status: res.status });
}

export const config = { schedule: "@hourly" };
