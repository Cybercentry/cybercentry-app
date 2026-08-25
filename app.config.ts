const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://app.cybercentry.co.uk"

// App metadata for the HTML <head> (title / description / Open Graph) and the
// Base builder attribution. This is a plain Base App now — discovery and the
// store listing live on base.dev, not a Farcaster manifest, so there is no
// accountAssociation / miniapp manifest here any more. Domain ownership is
// proven by the `base:app_id` meta tag in app/layout.tsx.
export const appConfig = {
  name: "Cybercentry",
  url: ROOT_URL,
  description:
    "Can you actually sell it? Verify a B20 before you buy: pool-hook honeypots, whitelisted exits, freeze-and-seize, live pauses, fakes and issuer controls. In seconds.",
  ogTitle: "Cybercentry",
  ogDescription:
    "A clean B20 can still be a honeypot. Cybercentry tests whether you can actually sell, in seconds.",
  ogImageUrl: `${ROOT_URL}/hero-1200x630.png`,
  iconUrl: `${ROOT_URL}/icon-1024-maskable.png`,
  // Base builder attribution (the base.dev project owner).
  baseBuilder: {
    allowedAddresses: ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"],
  },
} as const
