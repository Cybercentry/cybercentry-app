import type { MetadataRoute } from "next"
import { appConfig } from "../app.config"

/**
 * Serving this explicitly rather than relying on a 404. A missing robots.txt is
 * treated as "crawl everything", but it leaves nowhere to point at the sitemap,
 * and a 5xx here would be read as "crawl nothing" — worth owning the file.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${appConfig.url}/sitemap.xml`,
    host: appConfig.url,
  }
}
