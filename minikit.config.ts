const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://cybercentry-mini-app.up.railway.app"

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
    version: "1",
    name: "Cybercentry",
    subtitle: "Managed Detection and Response",
    description:
      "Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.",
    tagline: "Future of Web3 Security",
    buttonTitle: "Get",
    imageUrl: `${ROOT_URL}/blue-hero.png`,
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    // Light splash to match the destination site, so the handoff doesn't flash
    // from dark to light.
    splashImageUrl: `${ROOT_URL}/blue-icon.png`,
    splashBackgroundColor: "#fcfcfc",
    homeUrl: ROOT_URL,
    primaryCategory: "utility",
    tags: ["cybersecurity", "subscription", "msp", "mdr", "compliance"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`,
    ogTitle: "Cybercentry",
    ogDescription: "Anticipate, prevent, and respond to cyber threats with confidence. Future of Web3 security.",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
    castShareUrl: ROOT_URL,
  },
  baseBuilder: {
    allowedAddresses: ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"],
  },
} as const
