import { afterEach, describe, expect, it } from "vitest";
import { getStagingRuntimeMetadata, newMatchingCorrelationId, STAGING_PROJECT_REF } from "../matching/matching-observability";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("matching observability privacy boundaries", () => {
  it("accepts only the approved staging project and exposes only a suffix", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_PROJECT_REF}.supabase.co`;
    delete process.env.VERCEL_ENV;
    process.env.VERCEL_URL = "parking-preview.example.test";
    process.env.VERCEL_DEPLOYMENT_ID = "deploy_123";
    process.env.VERCEL_GIT_COMMIT_SHA = "abcdef1234567890abcdef";

    const metadata = getStagingRuntimeMetadata();
    expect(metadata.approved).toBe(true);
    expect(metadata.projectSuffix).toBe(STAGING_PROJECT_REF.slice(-4));
    expect(metadata.projectSuffix).not.toBe(STAGING_PROJECT_REF);
    expect(metadata.previewUrl).toBe("https://parking-preview.example.test");
    expect(metadata.deploymentId).toBe("deploy_123");
    expect(metadata.commitId).toBe("abcdef1234567890");
  });

  it("rejects unknown project context and generates opaque correlation values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://unknown-project.supabase.co";
    expect(getStagingRuntimeMetadata().approved).toBe(false);
    const correlation = newMatchingCorrelationId();
    expect(correlation).toMatch(/^[0-9a-f-]{36}$/);
  });
});
