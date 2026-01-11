const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://cybercentry-one-mini-app.up.railway.app"

export const minikitConfig = {
  accountAssociation: {
    header: "",
    payload: "",
    signature: "",
  },
  miniapp: {
    version: "1",
    name: "Cybercentry One",
    subtitle: "Managed Detection and Response",
    description:
      "Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.",
    screenshotUrls: [`${ROOT_URL}/screenshot-portrait.png`],
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-icon.png`,
    splashBackgroundColor: "#0d2b6b",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    primaryCategory: "utility",
    tags: ["cybersecurity", "subscription", "msp", "mdr", "compliance"],
    heroImageUrl: `${ROOT_URL}/blue-hero.png`,
    ogImageUrl: `${ROOT_URL}/blue-hero.png`,
  },
  baseBuilder: {
    allowedAddresses: ["0xfee13309251b632317ea2d475d6aba7e7e0219e6"],
  },
} as const
