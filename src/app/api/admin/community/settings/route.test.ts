import { describe, expect, it } from "vitest";
import { validateCommunitySettings } from "./route";

describe("community setting validation", () => {
  it("accepts the supported control shape", () => {
    expect(validateCommunitySettings({ feed_enabled: true, composer_enabled: false, require_moderation: true, allow_media: true, max_media_mb: 10 })).toEqual({ feed_enabled: true, composer_enabled: false, require_moderation: true, allow_media: true, max_media_mb: 10 });
  });

  it("rejects missing booleans and unsafe media limits", () => {
    expect(validateCommunitySettings({ feed_enabled: true, composer_enabled: true, require_moderation: false, allow_media: true, max_media_mb: 0 })).toBeNull();
    expect(validateCommunitySettings({ feed_enabled: true, composer_enabled: true, require_moderation: false, max_media_mb: 10 })).toBeNull();
  });
});
