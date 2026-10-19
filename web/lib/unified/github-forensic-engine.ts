import crypto from "node:crypto";
import { hashValue } from "./hash";
import type { EvidenceItem } from "./contracts";

export type SshKeyArtifact = {
  raw: string;
  type: string;
  keyData: string;
  comment?: string;
  fingerprintSha256: string;
  fingerprintMd5: string;
};

export type GpgKeyArtifact = {
  keyId: string;
  primaryKeyFingerprint?: string;
  emails: string[];
  canSign: boolean;
  canEncrypt: boolean;
  createdAt?: string;
  expiresAt?: string;
};

export type DiscoveredAuthorIdentity = {
  name: string;
  email: string;
  commitCount: number;
  repositories: string[];
  isNoReply: boolean;
  sampleCommitShas: string[];
};

export type DiurnalActivityProfile = {
  probableTimezoneOffset: string;
  hourlyDistribution: Record<number, number>;
  peakActiveHoursUtc: number[];
  weekendActivityRatio: number;
  totalAnalyzedEvents: number;
};

export type LeakedGistArtifact = {
  gistId: string;
  description?: string;
  htmlUrl: string;
  createdAt: string;
  updatedAt: string;
  fileNames: string[];
  potentialSecretSuspects: string[];
};

export type DeepGithubForensicReport = {
  targetHandle: string;
  profile: {
    login: string;
    id: number;
    name?: string;
    company?: string;
    blog?: string;
    location?: string;
    email?: string;
    bio?: string;
    twitterUsername?: string;
    publicRepos: number;
    publicGists: number;
    followers: number;
    following: number;
    createdAt: string;
    updatedAt: string;
    avatarUrl: string;
    htmlUrl: string;
  };
  forensicAttributions: {
    hiddenAuthorEmails: DiscoveredAuthorIdentity[];
    sshKeys: SshKeyArtifact[];
    gpgKeys: GpgKeyArtifact[];
  };
  behavioralForensics: {
    diurnalActivity: DiurnalActivityProfile;
    suspectGists: LeakedGistArtifact[];
    organizations: Array<{ login: string; description?: string; url: string }>;
  };
  courtAdmissibleFindings: {
    totalCryptographicSignatures: number;
    totalUnlinkedIdentitiesDiscovered: number;
    identityProvenanceSummary: string;
  };
  evidenceItems: EvidenceItem[];
  retrievedAt: string;
  provenanceHash: string;
};

function computeSshFingerprints(keyData: string): { sha256: string; md5: string } {
  try {
    const buf = Buffer.from(keyData, "base64");
    const sha256 = "SHA256:" + crypto.createHash("sha256").update(buf).digest("base64").replace(/=+$/, "");
    const md5Raw = crypto.createHash("md5").update(buf).digest("hex");
    const md5 = md5Raw.match(/.{2}/g)?.join(":") ?? md5Raw;
    return { sha256, md5 };
  } catch {
    return { sha256: "INVALID_BASE64", md5: "INVALID_BASE64" };
  }
}

function parseSshKeys(keysText: string): SshKeyArtifact[] {
  const lines = keysText.split("\n").map((l) => l.trim()).filter(Boolean);
  const artifacts: SshKeyArtifact[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 2) {
      const type = parts[0];
      const keyData = parts[1];
      const comment = parts.slice(2).join(" ") || undefined;
      const { sha256, md5 } = computeSshFingerprints(keyData);
      artifacts.push({
        raw: line,
        type,
        keyData,
        comment,
        fingerprintSha256: sha256,
        fingerprintMd5: md5,
      });
    }
  }

  return artifacts;
}

export class DeepGithubForensicEngine {
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "User-Agent": "DISHA-Forensics-Engine/6.6 (Sovereign OSINT; Court-Compliance)",
      Accept: "application/vnd.github.v3+json",
    };
    const token = process.env.GITHUB_TOKEN || process.env.GITHUB_API_KEY;
    if (token?.trim()) {
      headers.Authorization = `Bearer ${token.trim()}`;
    }
    return headers;
  }

  /**
   * Executes deep court-grade forensic reconnaissance on a target GitHub username or handle.
   */
  async analyze(targetHandle: string): Promise<DeepGithubForensicReport> {
    let sanitized = targetHandle.trim().replace(/^@/, "");
    if (/^https?:\/\/github\.com\//i.test(sanitized)) {
      sanitized = sanitized.replace(/^https?:\/\/github\.com\//i, "").replace(/\/.*$/, "");
    }
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(sanitized)) {
      throw new Error(`Invalid GitHub handle format: "${targetHandle}"`);
    }

    const headers = this.getHeaders();
    const retrievedAt = new Date().toISOString();

    // 1. Fetch Profile
    const profileRes = await fetch(`https://api.github.com/users/${sanitized}`, { headers });
    if (!profileRes.ok) {
      if (profileRes.status === 404) {
        throw new Error(`GitHub user "${sanitized}" not found.`);
      }
      throw new Error(`GitHub API request failed with status ${profileRes.status}: ${await profileRes.text()}`);
    }
    const profileData = await profileRes.json();

    // 2. Fetch Public Keys (SSH)
    let sshKeys: SshKeyArtifact[] = [];
    try {
      const sshRes = await fetch(`https://github.com/${sanitized}.keys`, {
        headers: { "User-Agent": headers["User-Agent"] },
      });
      if (sshRes.ok) {
        const text = await sshRes.text();
        sshKeys = parseSshKeys(text);
      }
    } catch {
      // Non-fatal if keys endpoint fails
    }

    // 3. Fetch GPG Keys
    let gpgKeys: GpgKeyArtifact[] = [];
    try {
      const gpgRes = await fetch(`https://api.github.com/users/${sanitized}/gpg_keys`, { headers });
      if (gpgRes.ok) {
        const gpgData = await gpgRes.json();
        if (Array.isArray(gpgData)) {
          gpgKeys = gpgData.map((k: any) => ({
            keyId: k.key_id ?? "",
            primaryKeyFingerprint: k.raw_key ? hashValue(k.raw_key) : undefined,
            emails: Array.isArray(k.emails) ? k.emails.map((e: any) => e.email) : [],
            canSign: Boolean(k.can_sign),
            canEncrypt: Boolean(k.can_encrypt_storage || k.can_encrypt_comms),
            createdAt: k.created_at,
            expiresAt: k.expires_at ?? undefined,
          }));
        }
      }
    } catch {
      // Non-fatal
    }

    // 4. Fetch Public Events (to extract hidden/unlinked commit emails and diurnal timeline)
    const authorMap = new Map<string, DiscoveredAuthorIdentity>();
    const hourlyDistribution: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourlyDistribution[i] = 0;

    let weekendCount = 0;
    let weekdayCount = 0;
    let eventCount = 0;

    try {
      const eventsRes = await fetch(`https://api.github.com/users/${sanitized}/events/public?per_page=100`, { headers });
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        if (Array.isArray(eventsData)) {
          eventCount = eventsData.length;
          for (const ev of eventsData) {
            // Behavioral diurnal distribution
            if (ev.created_at) {
              const d = new Date(ev.created_at);
              const hour = d.getUTCHours();
              hourlyDistribution[hour] = (hourlyDistribution[hour] || 0) + 1;
              const day = d.getUTCDay();
              if (day === 0 || day === 6) weekendCount++;
              else weekdayCount++;
            }

            // Extract commit metadata from PushEvents
            if (ev.type === "PushEvent" && ev.payload?.commits && Array.isArray(ev.payload.commits)) {
              for (const c of ev.payload.commits) {
                const email = c.author?.email?.trim().toLowerCase();
                const name = c.author?.name?.trim() || sanitized;
                const repo = ev.repo?.name || "unknown/repo";
                const sha = c.sha || "";

                if (email) {
                  const isNoReply = email.includes("noreply.github.com");
                  const existing = authorMap.get(email);
                  if (existing) {
                    existing.commitCount++;
                    if (!existing.repositories.includes(repo)) existing.repositories.push(repo);
                    if (sha && !existing.sampleCommitShas.includes(sha) && existing.sampleCommitShas.length < 5) {
                      existing.sampleCommitShas.push(sha);
                    }
                  } else {
                    authorMap.set(email, {
                      name,
                      email,
                      commitCount: 1,
                      repositories: [repo],
                      isNoReply,
                      sampleCommitShas: sha ? [sha] : [],
                    });
                  }
                }
              }
            }
          }
        }
      }
    } catch {
      // Non-fatal
    }

    // 5. Fetch Public Gists for secret/artifact leaks
    const suspectGists: LeakedGistArtifact[] = [];
    try {
      const gistsRes = await fetch(`https://api.github.com/users/${sanitized}/gists?per_page=30`, { headers });
      if (gistsRes.ok) {
        const gistsData = await gistsRes.json();
        if (Array.isArray(gistsData)) {
          for (const g of gistsData) {
            const files = Object.keys(g.files || {});
            const potentialSecretSuspects = files.filter((f) =>
              /(?:env|secret|key|token|id_rsa|id_ed25519|config|dump|shadow|passwd|creds|credential|backup|prod)/i.test(f),
            );
            suspectGists.push({
              gistId: g.id,
              description: g.description ?? undefined,
              htmlUrl: g.html_url,
              createdAt: g.created_at,
              updatedAt: g.updated_at,
              fileNames: files,
              potentialSecretSuspects,
            });
          }
        }
      }
    } catch {
      // Non-fatal
    }

    // 6. Fetch Organizations
    let organizations: Array<{ login: string; description?: string; url: string }> = [];
    try {
      const orgsRes = await fetch(`https://api.github.com/users/${sanitized}/orgs`, { headers });
      if (orgsRes.ok) {
        const orgsData = await orgsRes.json();
        if (Array.isArray(orgsData)) {
          organizations = orgsData.map((o: any) => ({
            login: o.login,
            description: o.description ?? undefined,
            url: o.html_url || `https://github.com/${o.login}`,
          }));
        }
      }
    } catch {
      // Non-fatal
    }

    // 7. Calculate Diurnal Characteristics
    let peakHours: number[] = [];
    let maxHourVal = 0;
    for (let h = 0; h < 24; h++) {
      if (hourlyDistribution[h] > maxHourVal) {
        maxHourVal = hourlyDistribution[h];
      }
    }
    if (maxHourVal > 0) {
      for (let h = 0; h < 24; h++) {
        if (hourlyDistribution[h] >= maxHourVal * 0.7) {
          peakHours.push(h);
        }
      }
    }

    const diurnalActivity: DiurnalActivityProfile = {
      probableTimezoneOffset: calculateProbableOffset(peakHours),
      hourlyDistribution,
      peakActiveHoursUtc: peakHours,
      weekendActivityRatio: eventCount > 0 ? Number((weekendCount / eventCount).toFixed(3)) : 0,
      totalAnalyzedEvents: eventCount,
    };

    const hiddenAuthorEmails = Array.from(authorMap.values()).sort((a, b) => b.commitCount - a.commitCount);

    // 8. Generate Evidence Items for Ledger
    const evidenceItems: EvidenceItem[] = [];
    const reportPayload = {
      sanitized,
      profileData,
      hiddenAuthorEmails,
      sshKeys,
      gpgKeys,
      diurnalActivity,
      suspectGists,
    };
    const provenanceHash = hashValue(reportPayload);

    // Profile evidence
    evidenceItems.push({
      id: `ev_gh_profile_${sanitized}_${Date.now()}`,
      sourceId: "github-forensic-engine",
      sourceName: "GitHub Public Forensic API",
      evidenceClass: "IDENTITY_PROFILE",
      summary: `Verified profile for @${sanitized} (ID: ${profileData.id}, Name: ${profileData.name || "N/A"}, Company: ${profileData.company || "N/A"})`,
      url: profileData.html_url,
      retrievedAt,
      provenanceHash: hashValue({ profile: profileData }),
      fields: {
        username: sanitized,
        name: profileData.name,
        company: profileData.company,
        location: profileData.location,
        bio: profileData.bio,
        email: profileData.email,
        blog: profileData.blog,
      },
    });

    // Hidden Email evidence
    for (const author of hiddenAuthorEmails) {
      evidenceItems.push({
        id: `ev_gh_email_${hashValue(author.email).slice(0, 12)}`,
        sourceId: "github-forensic-engine",
        sourceName: "GitHub Raw Commit Payload",
        evidenceClass: author.isNoReply ? "PSEUDONYM_EMAIL" : "UNLINKED_COMMITTER_EMAIL",
        summary: `Discovered committer identity: "${author.name}" <${author.email}> across ${author.commitCount} commit(s) in repos: ${author.repositories.join(", ")}`,
        url: author.sampleCommitShas[0]
          ? `https://github.com/${author.repositories[0]}/commit/${author.sampleCommitShas[0]}`
          : undefined,
        retrievedAt,
        provenanceHash: hashValue(author),
        fields: {
          author_email: author.email,
          email: author.email,
          author_name: author.name,
          commit_count: author.commitCount,
          repos: author.repositories,
          sample_shas: author.sampleCommitShas,
        },
      });
    }

    // Cryptographic Keys evidence
    for (const key of sshKeys) {
      evidenceItems.push({
        id: `ev_gh_ssh_${hashValue(key.fingerprintSha256).slice(0, 12)}`,
        sourceId: "github-forensic-engine",
        sourceName: "GitHub Authorized Keys",
        evidenceClass: "CRYPTOGRAPHIC_SSH_KEY",
        summary: `Authorized SSH Key: ${key.type} (${key.fingerprintSha256}) Comment: "${key.comment || "none"}"`,
        url: `https://github.com/${sanitized}.keys`,
        retrievedAt,
        provenanceHash: hashValue(key),
        fields: {
          ssh_fingerprint: key.fingerprintSha256,
          fingerprint_md5: key.fingerprintMd5,
          key_type: key.type,
          machine_comment: key.comment,
        },
      });
    }

    const identityProvenanceSummary =
      `Discovered ${hiddenAuthorEmails.length} author email identity(ies), ` +
      `${sshKeys.length} public SSH cryptographic key(s), and ${gpgKeys.length} GPG signature(s). ` +
      `Estimated diurnal pattern indicates active work window corresponding to ${diurnalActivity.probableTimezoneOffset}.`;

    return {
      targetHandle: sanitized,
      profile: {
        login: profileData.login,
        id: profileData.id,
        name: profileData.name ?? undefined,
        company: profileData.company ?? undefined,
        blog: profileData.blog ?? undefined,
        location: profileData.location ?? undefined,
        email: profileData.email ?? undefined,
        bio: profileData.bio ?? undefined,
        twitterUsername: profileData.twitter_username ?? undefined,
        publicRepos: profileData.public_repos || 0,
        publicGists: profileData.public_gists || 0,
        followers: profileData.followers || 0,
        following: profileData.following || 0,
        createdAt: profileData.created_at,
        updatedAt: profileData.updated_at,
        avatarUrl: profileData.avatar_url,
        htmlUrl: profileData.html_url,
      },
      forensicAttributions: {
        hiddenAuthorEmails,
        sshKeys,
        gpgKeys,
      },
      behavioralForensics: {
        diurnalActivity,
        suspectGists,
        organizations,
      },
      courtAdmissibleFindings: {
        totalCryptographicSignatures: sshKeys.length + gpgKeys.length,
        totalUnlinkedIdentitiesDiscovered: hiddenAuthorEmails.filter((a) => !a.isNoReply).length,
        identityProvenanceSummary,
      },
      evidenceItems,
      retrievedAt,
      provenanceHash,
    };
  }
}

function calculateProbableOffset(peakHoursUtc: number[]): string {
  if (peakHoursUtc.length === 0) return "UTC+00:00 (Insufficient sample)";
  // Center of mass for peak hours
  const avgHour = peakHoursUtc.reduce((a, b) => a + b, 0) / peakHoursUtc.length;

  // If typical workday peak is 14:00 local time:
  // LocalPeak = (UtcPeak + Offset) % 24  =>  Offset = (14 - UtcPeak)
  const estimatedOffsetHours = Math.round(14 - avgHour);
  if (estimatedOffsetHours === 5 || estimatedOffsetHours === 6) {
    return "UTC+05:30 (Indian Standard Time - IST)";
  }
  if (estimatedOffsetHours === 1 || estimatedOffsetHours === 2) {
    return "UTC+01:00 / UTC+02:00 (Central European Time)";
  }
  if (estimatedOffsetHours === -4 || estimatedOffsetHours === -5) {
    return "UTC-04:00 / UTC-05:00 (Eastern Time - US)";
  }
  if (estimatedOffsetHours === -7 || estimatedOffsetHours === -8) {
    return "UTC-07:00 / UTC-08:00 (Pacific Time - US)";
  }

  const sign = estimatedOffsetHours >= 0 ? "+" : "-";
  const abs = Math.abs(estimatedOffsetHours).toString().padStart(2, "0");
  return `UTC${sign}${abs}:00 (Estimated based on diurnal active hours)`;
}

export const deepGithubForensicEngine = new DeepGithubForensicEngine();
