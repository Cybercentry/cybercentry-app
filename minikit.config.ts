const ROOT_URL =
  process.env.NEXT_PUBLIC_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3000');

/**
 * MiniApp configuration object. Must follow the Farcaster MiniApp specification.
 *
 * @see {@link https://miniapps.farcaster.xyz/docs/guides/publishing}
 */
export const minikitConfig = {
    accountAssociation: {
    header: "eyJmaWQiOjEzMDIzOTIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHgyODI2RWFlRmMzRmYzNzk0OTE1ODljNUJGNTNmMDI2MTk5ZEVDOUE0In0",
    payload: "eyJkb21haW4iOiJjeWJlcmNlbnRyeS1vbmUtbWluaS1hcHAudmVyY2VsLmFwcCJ9",
    signature: "MHhhMjI3YzU2MTM4NjJmMmQzODgyNzNjZGI0YTc0M2JhNDdhYzVkOTkxYmMyNjRkMjZlZTQ5OThhZGMwZTEyMzE0MzcwYTMzZTA3OGYzY2NiYzUwMDkzZDg5YWZiMzY1NTMzYjM0NWFkNWY3ODU4M2M1MmE3MGYyY2JkNTg0ODk3NTFi"
  },
  "baseBuilder": {
    "allowedAddresses": ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"]
  },
  miniapp: {
    version: "1",
    name: "Cybercentry One", 
    subtitle: "Empowering cyber threat response.", 
    description: "Ads",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-hero.png`,
    splashBackgroundColor: "#FFFFFF",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "developer-tools",
    tags: ["cybersecurity", "subscription", "msp", "mdr", "compliance"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`, 
    tagline: "",
    ogTitle: "",
    ogDescription: "",
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
} as const;

