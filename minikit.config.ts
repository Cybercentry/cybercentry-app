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
    // Every image below is generated from blue-icon.png to the sizes Farcaster
    // documents: icon 1024x1024 with no alpha, splash 200x200, hero/og
    // 1200x630 (1.91:1), embed 3:2. See scripts note in README.
    iconUrl: `${ROOT_URL}/icon-1024.png`,
    homeUrl: ROOT_URL,
    imageUrl: `${ROOT_URL}/embed-1200x800.png`,
    buttonTitle: "Open Mini App",
    splashImageUrl: `${ROOT_URL}/splash-200.png`,
    splashBackgroundColor: "#fcfcfc",
    // Copy mirrors the live site (centry.cybercentry.co.uk): its web manifest
    // brands as "Security Verification for EVM and Solana", and its service
    // catalogue is pay-per-call ("Pay for the call, not the seat"). Kept within
    // the schema's 30-char subtitle limit and free of banned characters.
    subtitle: "Security Verification",
    description: "Verify wallets, agents, contracts and applications before execution.",
    primaryCategory: "utility",
    heroImageUrl: `${ROOT_URL}/hero-1200x630.png`,
    tags: ["security"],
    tagline: "Verify before you transact",
    ogTitle: "Cybercentry",
    ogDescription: "Pay-per-call verification for tokens, wallets, contracts and agents across EVM and Solana.",
    ogImageUrl: `${ROOT_URL}/hero-1200x630.png`,
    castShareUrl: ROOT_URL,
  },
  baseBuilder: {
    allowedAddresses: ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"],
  },
} as const
