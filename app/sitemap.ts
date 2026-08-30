import type { MetadataRoute } from "next"
import { appConfig } from "../app.config"

/**
 * One route. The verifier is a single page — results live behind a POST and a
 * job id, so there is nothing else a crawler should be asked to index.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: appConfig.url,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ]
}
