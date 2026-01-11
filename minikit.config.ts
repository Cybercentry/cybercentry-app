const ROOT_URL = process.env.NEXT_PUBLIC_URL || "https://cybercentry-one-mini-app.up.railway.app"

export const minikitConfig = {
  accountAssociation: {
    header:
      "eyJmaWQiOjEzMDIzOTIsInR5cGUiOiJhdXRoIiwia2V5IjoiMHhiOEVmNkNFOEQ3N2U3NzcxNTQzRUMyNDJEMkNkM0E5RjFmMjBFNkZBIn0",
    payload: "eyJkb21haW4iOiJjeWJlcmNlbnRyeS1vbmUtbWluaS1hcHAudXAucmFpbHdheS5hcHAifQ",
    signature: "l8FgDdJ16mhquxCkixGASWGawyv6yG0ayFcA+iAGqb5kT+a06Rjzhzjz6sz8Q60tYWW4ncQokUQ/7oJt26wU0Rw=",
  },
  frame: {
    version: "1",
    name: "Cybercentry One",
    subtitle: "Managed Detection and Response",
    iconUrl: `${ROOT_URL}/blue-icon.png`,
    splashImageUrl: `${ROOT_URL}/blue-icon.png`,
    splashBackgroundColor: "#0d2b6b",
    homeUrl: ROOT_URL,
    webhookUrl: `${ROOT_URL}/api/webhook`,
    imageUrl: `${ROOT_URL}/blue-hero.png`,
    buttonTitle: "Future of Web3 Security",
  },
} as const
