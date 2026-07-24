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
    name: "Cybercentry",
    version: "1",
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    homeUrl: ROOT_URL,
    // /image.png does not exist; blue-hero.png is the branded asset and matches
    // ogImageUrl below.
    imageUrl: `${ROOT_URL}/blue-hero.png`,
    buttonTitle: "Open Mini App",
    // /splash.png is leftover template placeholder art, not Cybercentry branding.
    splashImageUrl: `${ROOT_URL}/blue-icon.png`,
    splashBackgroundColor: "#fcfcfc",
    // Max 30 chars and no "&" — the schema rejects both, so the site's full
    // "Security & Verification for Every EVM Chain and Solana" line lives on the
    // divert page heading instead.
    subtitle: "Security and Verification",
    description: "Verify wallets, agents, contracts and applications before execution.",
    primaryCategory: "utility",
    heroImageUrl: `${ROOT_URL}/blue-hero.png`,
    tags: ["security"],
    tagline: "Future of Web3 Security",
    ogTitle: "Cybercentry",
    ogDescription: "Anticipate, prevent, and respond to cyber threats with confidence. Future of Web3 security.",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
    castShareUrl: ROOT_URL,
  },
  baseBuilder: {
    allowedAddresses: ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"],
  },
} as const
