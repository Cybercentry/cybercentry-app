const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://cybercentry-mini-app.up.railway.app"

export const minikitConfig = {
  // Signed 2026-07-24 for cybercentry-mini-app.up.railway.app by the FID 1302392
  // custody key 0x2826EaeFc3Ff379491589c5BF53f026199dEC9A4. If the domain ever
  // changes, this must be regenerated at
  // https://farcaster.xyz/~/developers/mini-apps/manifest
  accountAssociation: {
    header:
      "eyJmaWQiOjEzMDIzOTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyODI2RWFlRmMzRmYzNzk0OTE1ODljNUJGNTNmMDI2MTk5ZEVDOUE0In0",
    payload: "eyJkb21haW4iOiJjeWJlcmNlbnRyeS1taW5pLWFwcC51cC5yYWlsd2F5LmFwcCJ9",
    signature: "Xkgbc06EaGL8NpKb+s1dR64GTcl4QQ7B3+VoIhYELnd6hw8eSyNCv7O6KBZWzSuCfeTAI0s91g9vleoFexOGNRw=",
  },
  miniapp: {
    // Brand name only; what it does is carried by subtitle/description. Matches
    // the Base.dev listing name.
    name: "Cybercentry",
    version: "1",
    // Every image below is generated from blue-icon.png to the sizes Farcaster
    // documents: icon 1024x1024 with no alpha, splash 200x200, hero/og
    // 1200x630 (1.91:1), embed 3:2. See scripts note in README.
    iconUrl: `${ROOT_URL}/icon-1024-maskable.png`,
    homeUrl: ROOT_URL,
    imageUrl: `${ROOT_URL}/embed-1200x800.png`,
    buttonTitle: "Verify a B20 token",
    splashImageUrl: `${ROOT_URL}/splash-200.png`,
    splashBackgroundColor: "#fcfcfc",
    // Portrait 1284x2778 promo of the landing; also uploaded to the Base.dev
    // listing. Farcaster catalog shows it too.
    screenshotUrls: [
      `${ROOT_URL}/basedev-screenshot-1-1284x2778.png`,
      `${ROOT_URL}/basedev-screenshot-2-1284x2778.png`,
      `${ROOT_URL}/basedev-screenshot-3-1284x2778.png`,
    ],
    // App diverts straight to the Base Token Verification service, so the copy
    // is that service's, not the whole catalogue. Fields kept within the
    // schema's length limits and free of banned characters.
    subtitle: "Base Token Verification",
    description:
      "Can you actually sell it? Verify a B20 before you buy: pool-hook honeypots, whitelisted exits, freeze-and-seize, live pauses, fakes and issuer controls. In seconds.",
    primaryCategory: "utility",
    heroImageUrl: `${ROOT_URL}/hero-1200x630.png`,
    tags: ["security", "base", "token", "honeypot", "defi"],
    tagline: "Verify a B20 before you buy it",
    ogTitle: "Cybercentry",
    ogDescription: "A clean B20 can still be a honeypot. Cybercentry tests whether you can actually sell, in seconds.",
    ogImageUrl: `${ROOT_URL}/hero-1200x630.png`,
    castShareUrl: ROOT_URL,
    // The canonical host for this app, used by Base to dedupe/attribute it.
    // Derived from ROOT_URL so it follows a domain change automatically.
    canonicalDomain: ROOT_URL.replace(/^https?:\/\//, ""),
    // Explicitly indexable — Base's guidance is to set this false (not just omit
    // it) so the app is eligible for search and leaderboards.
    noindex: false,
  },
  baseBuilder: {
    allowedAddresses: ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"],
  },
} as const
