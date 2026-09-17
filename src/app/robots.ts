import type { MetadataRoute } from "next";

/** Parking Meeters is an authenticated product; do not expose app routes to crawlers. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
    host: "https://www.parkingmeeters.com",
  };
}
