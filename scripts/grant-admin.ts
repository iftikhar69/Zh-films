/**
 * Grants (or revokes) ZH Films admin access for an existing Clerk account.
 *
 *   npm run admin:grant -- owner@example.com
 *   npm run admin:grant -- owner@example.com --revoke
 *   npm run admin:grant -- --list
 *
 * Runs only on a machine that has CLERK_SECRET_KEY. It sets `publicMetadata.role = "admin"`,
 * which users cannot change themselves; there is no web route that can do this.
 */

const API = "https://api.clerk.com/v1";
const key = process.env.CLERK_SECRET_KEY;

type ClerkUser = {
  id: string;
  public_metadata: Record<string, unknown>;
  email_addresses: { email_address: string; verification: { status: string } | null }[];
};

async function clerk<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init?.headers }
  });
  if (!res.ok) throw new Error(`Clerk API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json() as Promise<T>;
}

async function main() {
  if (!key) {
    console.error("CLERK_SECRET_KEY is not set. Run this with your .env loaded (npm run admin:grant does that).");
    process.exit(1);
  }
  const args = process.argv.slice(2);

  if (args.includes("--list")) {
    const users = await clerk<ClerkUser[]>("/users?limit=200");
    const admins = users.filter((u) => u.public_metadata?.role === "admin");
    console.log(admins.length ? admins.map((u) => `${u.email_addresses[0]?.email_address} (${u.id})`).join("\n") : "No admins yet.");
    return;
  }

  const email = args.find((a) => a.includes("@"))?.toLowerCase();
  if (!email) {
    console.error("Usage: npm run admin:grant -- owner@example.com [--revoke]");
    process.exit(1);
  }
  const revoke = args.includes("--revoke");

  const users = await clerk<ClerkUser[]>(`/users?email_address=${encodeURIComponent(email)}`);
  const user = users[0];
  if (!user) {
    console.error(`No ZH Films account uses ${email}. Sign up on the website first, verify the email, then run this again.`);
    process.exit(1);
  }
  const address = user.email_addresses.find((e) => e.email_address.toLowerCase() === email);
  if (!revoke && address?.verification?.status !== "verified") {
    console.error(`${email} is not verified yet. Open the verification email from Clerk, then run this again.`);
    process.exit(1);
  }

  await clerk(`/users/${user.id}/metadata`, {
    method: "PATCH",
    body: JSON.stringify({ public_metadata: { role: revoke ? null : "admin" } })
  });
  console.log(revoke ? `Admin access removed from ${email}.` : `${email} is now a ZH Films admin. Sign out and back in, then open /admin.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
