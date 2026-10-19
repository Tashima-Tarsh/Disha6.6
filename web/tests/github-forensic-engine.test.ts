import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { DeepGithubForensicEngine } from "../lib/unified/github-forensic-engine";

describe("Deep GitHub Forensic OSINT Engine", () => {
  const engine = new DeepGithubForensicEngine();

  const mockProfile = {
    login: "target-actor",
    id: 1234567,
    name: "John Doe",
    company: "Target Corp",
    email: null, // Profile email is hidden!
    bio: "Security Researcher",
    public_repos: 5,
    public_gists: 2,
    followers: 10,
    following: 5,
    created_at: "2021-04-12T08:30:00Z",
    updated_at: "2026-09-01T12:00:00Z",
    avatar_url: "https://avatars.githubusercontent.com/u/1234567",
    html_url: "https://github.com/target-actor",
  };

  const mockSshKeys = `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH8qH1yQz71wE5rP3eF3gY4j2kL1mN0pQ7rS9tU2vW4x john@MacBook-Pro.local
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC3 target@production-srv`;

  const mockEvents = [
    {
      id: "ev1",
      type: "PushEvent",
      created_at: "2026-10-10T09:30:00Z",
      repo: { name: "target-actor/internal-tool" },
      payload: {
        commits: [
          {
            sha: "a1b2c3d4e5f67890",
            author: {
              name: "Johnathan Doe",
              email: "real-john-personal@gmail.com", // Discovered personal email!
            },
            message: "Initial commit with backend configuration",
          },
          {
            sha: "f1e2d3c4b5a67890",
            author: {
              name: "John Doe",
              email: "jdoe@targetcorp.in", // Discovered corporate email!
            },
            message: "Fix authentication database connection",
          },
        ],
      },
    },
    {
      id: "ev2",
      type: "PushEvent",
      created_at: "2026-10-11T10:15:00Z",
      repo: { name: "target-actor/internal-tool" },
      payload: {
        commits: [
          {
            sha: "c9b8a7d6e5f43210",
            author: {
              name: "Johnathan Doe",
              email: "real-john-personal@gmail.com",
            },
            message: "Update deployment scripts",
          },
        ],
      },
    },
  ];

  const mockGists = [
    {
      id: "gist123",
      description: "Database and API credentials backup",
      html_url: "https://gist.github.com/target-actor/gist123",
      created_at: "2025-06-01T10:00:00Z",
      updated_at: "2025-06-01T10:00:00Z",
      files: {
        ".env.prod": { filename: ".env.prod" },
        "setup_keys.pem": { filename: "setup_keys.pem" },
      },
    },
  ];

  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((url: string | URL) => {
        const urlStr = url.toString();

        if (urlStr.includes("/users/target-actor/events/public")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockEvents,
          });
        }

        if (urlStr.endsWith("target-actor.keys")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            text: async () => mockSshKeys,
          });
        }

        if (urlStr.includes("/users/target-actor/gists")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockGists,
          });
        }

        if (urlStr.includes("/users/target-actor/orgs")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [{ login: "secret-lab", description: "Internal R&D", html_url: "https://github.com/secret-lab" }],
          });
        }

        if (urlStr.includes("/users/target-actor/gpg_keys")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => [],
          });
        }

        if (urlStr.includes("/users/target-actor")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: async () => mockProfile,
          });
        }

        return Promise.resolve({
          ok: false,
          status: 404,
          text: async () => "Not found",
        });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("extracts hidden/unlinked commit author emails even when profile email is hidden", async () => {
    const report = await engine.analyze("target-actor");

    expect(report.targetHandle).toBe("target-actor");
    expect(report.profile.name).toBe("John Doe");

    // Hidden commit author emails
    const discovered = report.forensicAttributions.hiddenAuthorEmails;
    expect(discovered.length).toBe(2);

    const personal = discovered.find((d) => d.email === "real-john-personal@gmail.com");
    expect(personal).toBeDefined();
    expect(personal?.name).toBe("Johnathan Doe");
    expect(personal?.commitCount).toBe(2);
    expect(personal?.repositories).toContain("target-actor/internal-tool");

    const corp = discovered.find((d) => d.email === "jdoe@targetcorp.in");
    expect(corp).toBeDefined();
    expect(corp?.name).toBe("John Doe");
    expect(corp?.commitCount).toBe(1);
  });

  it("extracts and parses public cryptographic SSH keys with SHA-256 and MD5 fingerprints", async () => {
    const report = await engine.analyze("@target-actor");

    const sshKeys = report.forensicAttributions.sshKeys;
    expect(sshKeys.length).toBe(2);

    const edKey = sshKeys[0];
    expect(edKey.type).toBe("ssh-ed25519");
    expect(edKey.comment).toBe("john@MacBook-Pro.local");
    expect(edKey.fingerprintSha256).toMatch(/^SHA256:/);
    expect(edKey.fingerprintMd5).toMatch(/^[a-f0-9:]{47}$/);
  });

  it("detects secret-bearing public gists and analyzes diurnal timeline", async () => {
    const report = await engine.analyze("target-actor");

    // Secret-bearing gists
    const gists = report.behavioralForensics.suspectGists;
    expect(gists.length).toBe(1);
    expect(gists[0].potentialSecretSuspects).toContain(".env.prod");
    expect(gists[0].potentialSecretSuspects).toContain("setup_keys.pem");

    // Behavioral diurnal timeline
    const diurnal = report.behavioralForensics.diurnalActivity;
    expect(diurnal.totalAnalyzedEvents).toBe(2);
    expect(diurnal.probableTimezoneOffset).toBeDefined();

    // Court-admissible evidence items
    expect(report.evidenceItems.length).toBeGreaterThan(0);
    const emailEvidence = report.evidenceItems.find((e) => e.evidenceClass === "UNLINKED_COMMITTER_EMAIL");
    expect(emailEvidence).toBeDefined();
    expect(emailEvidence?.summary).toContain("real-john-personal@gmail.com");
  });

  it("sanitizes handle inputs and rejects invalid usernames", async () => {
    await expect(engine.analyze("bad/handle/with/too/many/slashes/and/symbols$$")).rejects.toThrow("Invalid GitHub handle format");
  });
});
