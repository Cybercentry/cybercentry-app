const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://cybercentry-mini-app.up.railway.app"

// NOTE: `miniapp` below mirrors the manifest JSON supplied by the Base/Farcaster
// dashboard verbatim, at the owner's explicit request. Four values do NOT pass
// `domainMiniAppConfigSchema` from @farcaster/miniapp-core:
//
//   imageUrl        " "            -> not a URL (deprecated field; ogImageUrl is set)
//   webhookUrl      " "            -> not a URL (no /api/webhook route exists)
//   splashImageUrl  " https://..." -> leading space, so not an https URL
//   subtitle                       -> 54 chars (max 30) and contains "&", which is rejected
//
// If a validator rejects this manifest, these are why. `git revert` the commit
// that introduced them to restore the schema-valid version.
export const minikitConfig = {
  // ⚠️ STALE — this signature is bound to the old domain
  // `cybercentry-one-mini-app.up.railway.app` and will FAIL verification on
  // `cybercentry-mini-app.up.railway.app`. Regenerate it for the new domain at
  // https://farcaster.xyz/~/developers/mini-apps/manifest and replace all three
  // fields below.
  accountAssociation: {
    header:
      "eyJmaWQiOjEzMDIzOTIsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhiOEVmNkNFOEQ3N2U3NzcxNTQzRUMyNDJEMkNkM0E5RjFmMjBFNkZBIn0",
    payload: "eyJkb21haW4iOiJjeWJlcmNlbnRyeS1vbmUtbWluaS1hcHAudXAucmFpbHdheS5hcHAifQ",
    signature: "l8FgDdJ16mhquxCkixGASWGawyv6yG0ayFcA+iAGqb5kT+a06Rjzhzjz6sz8Q60tYWW4ncQokUQ/7oJt26wU0Rw=",
  },
  miniapp: {
    name: "Cybercentry",
    version: "1",
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    homeUrl: ROOT_URL,
    imageUrl: " ",
    buttonTitle: "Open Mini App",
    splashImageUrl: ` ${ROOT_URL}/blue-icon.png`,
    splashBackgroundColor: "#fcfcfc",
    webhookUrl: " ",
    description: "Verify wallets, agents, contracts and applications before execution.",
    subtitle: "Security & Verification for Every EVM Chain and Solana",
    primaryCategory: "utility",
    heroImageUrl: `${ROOT_URL}/blue-hero.png`,
    tags: ["cybersecurity"],
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
