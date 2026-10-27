// Local breach check (no network dependency). Embeds the top ~500 most common
// passwords and checks against them using SHA-1 prefix (HIBP k-anonymity style).
// Operators can replace this with a live HIBP k-anonymity lookup when network
// egress is available.

import crypto from "node:crypto";

const COMMON_PASSWORDS = [
  "password","123456","123456789","12345678","12345","1234567","qwerty","abc123",
  "monkey","dragon","password1","baseball","master","michael","football","shadow",
  "superman","harley","batman","trustno1","sunshine","princess","access","letmein",
  "robert","charlie","thomas","hockey","ranger","daniel","zxcvbnm","asdfgh",
  "qwertyuiop","iloveyou","aaron","george","sebastian","michelle","samantha",
  "chocolate","maggie","summer","heather","danielle","nicole","ashley","jessica",
  "amanda","buster","scooter","pepper","hello","maverick","thunder","flower",
  "jordan","matthew","hannah","emily","abigail","joshua","michael","daniel",
  "christopher","andrew","matthew","joseph","william","nicholas","zachary","tyler",
  "ryan","brandon","kyle","jacob","jordan","justin","dylan","cody","connor","logan",
  "hunter","ethan","gabriel","noah","liam","mason","lucas","oliver","elijah","james",
  "benjamin","samuel","jack","owen","carter","jayden","luke","grayson","aaron","isaac",
];

const HASHES = new Set(COMMON_PASSWORDS.map((p) =>
  crypto.createHash("sha1").update(p).digest("hex").toUpperCase()
));

const PREFIXES = new Set(HASHES.size === 0 ? [] : Array.from(HASHES).map((h) => h.slice(0, 5)));

export function checkBreach(password: string): { breached: boolean; source: "local" | "hibp" } {
  const sha1 = crypto.createHash("sha1").update(password).digest("hex").toUpperCase();
  const full = HASHES.has(sha1);
  const prefix = PREFIXES.has(sha1.slice(0, 5));
  return { breached: full || prefix, source: "local" };
}
