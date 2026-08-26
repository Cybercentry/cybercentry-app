const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://app.cybercentry.co.uk"

// App metadata for the HTML <head> — title, description and the Open Graph /
// Twitter card. This is a plain Base App now: discovery and the store listing
// live in the base.dev dashboard, not a Farcaster manifest, so there is no
// accountAssociation or miniapp block here any more. Domain ownership is proven
// by the `base:app_id` meta tag in app/layout.tsx.
//
// Only the fields below are read (all by app/layout.tsx). The listing name, icon,
// category, tagline and screenshots — and the builder address
// 0xfEE13309251B632317ea2d475d6ABa7E7E0219e6 — are registered on base.dev and
// are never served from this app, so they do not belong in here.
export const appConfig = {
  url: ROOT_URL,
  description:
    "Can you actually sell it? Verify a B20 before you buy: pool-hook honeypots, whitelisted exits, freeze-and-seize, live pauses, fakes and issuer controls. In seconds.",
  ogTitle: "Cybercentry",
  ogDescription:
    "A clean B20 can still be a honeypot. Cybercentry tests whether you can actually sell, in seconds.",
  ogImageUrl: `${ROOT_URL}/hero-1200x630.png`,
} as const
