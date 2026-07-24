/** The site this Mini App diverts to. */
export const TARGET_URL = "https://centry.cybercentry.co.uk"

/** Host shown in the UI, derived so it can never drift from TARGET_URL. */
export const TARGET_HOST = new URL(TARGET_URL).host
