const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
  accountAssociation: {
    header:
      "eyJmaWQiOjEzMDIzOTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyODI2RWFlRmMzRmYzNzk0OTE1ODljNUJGNTNmMDI2MTk5ZEVDOUE0In0",
    payload: "eyJkb21haW4iOiJjeWJlcmNlbnRyeS1vbmUtbWluaS1hcHAudmVyY2VsLmFwcCJ9",
    signature:
      "MHhhMjI3YzU2MTM4NjJmMmQzODgyNzNjZGI0YTc0M2JhNDdhYzVkOTkxYmMyNjRkMjZlZTQ5OThhZGMwZTEyMzE0MzcwYTMzZTA3OGYzY2NiYzUwMDkzZDg5YWZiMzY1NTMzYjM0NWFkNWY3ODU4M2M1MmE3MGYyY2JkNTg0ODk3NTFi",
  },
  miniapp: {
    version: "1",
    name: "Cybercentry One",
    subtitle: "Cyber Threat Response",
    description:
      "Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.",
    screenshotUrls: ["https://cybercentry-one-mini-app.vercel.app/screenshot-portrait.png"],
    iconUrl: "https://cybercentry-one-mini-app.vercel.app/blue-icon.png",
    splashImageUrl: "https://cybercentry-one-mini-app.vercel.app/blue-icon.png",
    splashBackgroundColor: "#0d2b6b",
    homeUrl: "https://cybercentry-one-mini-app.vercel.app",
    webhookUrl: "https://cybercentry-one-mini-app.vercel.app/api/webhook",
    primaryCategory: "utility",
    tags: ["cybersecurity", "subscription", "msp", "mdr", "compliance"],
    heroImageUrl: "https://cybercentry-one-mini-app.vercel.app/blue-hero.png",
    ogImageUrl: "https://cybercentry-one-mini-app.vercel.app/blue-hero.png",
  },
  baseBuilder: {
    allowedAddresses: ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"],
  },
} as const
