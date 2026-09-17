import { describe, expect, it } from "vitest";
import { aggregateDepartureCells } from "../departure-heatmap";

describe("aggregateDepartureCells", () => {
  it("suppresses bins below the privacy threshold and bands counts", () => {
    const sources = [
      ...["a", "b"].map((contributorId) => ({ latitude: 33.77, longitude: -118.19, contributorId })),
      ...["a", "b", "c", "d", "e", "f"].map((contributorId) => ({ latitude: 33.773, longitude: -118.19, contributorId })),
    ];
    const cells = aggregateDepartureCells(sources);
    expect(cells).toHaveLength(1);
    expect(cells[0]).toMatchObject({ contributorsBand: "6-10", score: 1, level: "high" });
    expect(cells[0]).not.toHaveProperty("contributors");
    expect(cells[0]).not.toHaveProperty("contributorIds");
  });

  it("deduplicates contributors and normalizes eligible cells", () => {
    const sources = [
      ...["a", "b", "c"].map((contributorId) => ({ latitude: 33.77, longitude: -118.19, contributorId })),
      ...["d", "e", "f", "g", "h", "i"].map((contributorId) => ({ latitude: 33.776, longitude: -118.19, contributorId })),
      { latitude: 33.77, longitude: -118.19, contributorId: "a" },
    ];
    const cells = aggregateDepartureCells(sources);
    expect(cells.map((cell) => cell.score)).toEqual([0.5, 1]);
    expect(cells.map((cell) => cell.level)).toEqual(["medium", "high"]);
  });
});
