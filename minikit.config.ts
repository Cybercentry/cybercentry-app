const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://cybercentry-mini-app.up.railway.app"

// `miniapp` mirrors the manifest JSON supplied by the Base/Farcaster dashboard
// verbatim, at the owner's explicit request. Known issues kept as supplied:
//
//   webhookUrl      " "         -> not a URL (no /api/webhook route exists)
//   subtitle                    -> 54 chars (max 30) and contains "&"; both rejected
//   imageUrl        /image.png  -> 404, this file does not exist in /public
//   splashImageUrl  /splash.png -> exists but is leftover template placeholder art,
//                                  not Cybercentry branding (blue-icon.png is the logo)
//
// If a validator rejects the manifest, or the splash/embed art looks wrong,
// these are why.
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
    imageUrl: `${ROOT_URL}/image.png`,
    buttonTitle: "Open Mini App",
    splashImageUrl: `${ROOT_URL}/splash.png`,
    splashBackgroundColor: "#fcfcfc",
    webhookUrl: " ",
    subtitle: "Security & Verification for Every EVM Chain and Solana",
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
