# Cybercentry Mini App

A minimal Farcaster / Base Mini App whose only job is to divert visitors to
**https://centry.cybercentry.co.uk**.

The app still needs to exist and stay deployed because the signed Mini App
manifest at `/.well-known/farcaster.json` is bound to this app's own domain. The
`accountAssociation` signature covers that domain specifically, so the manifest
cannot simply be moved to the destination site.

## ⚠️ Outstanding: re-sign the manifest

The app moved from `cybercentry-one-mini-app.up.railway.app` to
`cybercentry-mini-app.up.railway.app`. The `accountAssociation` block in
[`minikit.config.ts`](minikit.config.ts) is **still signed for the old domain**
and will fail verification until it is regenerated:

1. Go to the [Farcaster Manifest tool](https://farcaster.xyz/~/developers/mini-apps/manifest).
2. Enter `cybercentry-mini-app.up.railway.app`.
3. Sign with the Farcaster custody wallet and copy the new `accountAssociation`.
4. Replace all three fields (`header`, `payload`, `signature`) in `minikit.config.ts`.

This requires wallet signing, so it cannot be automated here.

## Domains

| Host | Use |
| --- | --- |
| `cybercentry-mini-app.up.railway.app` | Public URL — manifest, embeds, Mini App entry point |
| `cybercentry-mini-app.railway.internal` | Railway private network only. Not publicly reachable — never use it in the manifest |
| `centry.cybercentry.co.uk` | The divert destination |

## How the divert works

[`app/page.tsx`](app/page.tsx) handles three cases, in order:

1. **Inside a Mini App host** (Base app, Farcaster) — calls `sdk.actions.ready()`
   to dismiss the host splash screen, then `sdk.actions.openUrl()` so the host
   opens the site in its own browser. The page stays on screen showing a manual
   button, because the host, not the page, owns navigation.
2. **A normal browser** — `window.location.replace()`, so the redirect does not
   add a history entry.
3. **No JavaScript** — a `<noscript>` meta refresh, plus a visible button that
   works regardless.

Host detection is raced against a 1.5s timeout so a slow or unresponsive host can
never leave a visitor stuck on this page.

The destination lives in one place: [`lib/target.ts`](lib/target.ts).

## Styling

The divert page mirrors the destination site so the handoff reads as one product:

| Token | Value |
| --- | --- |
| Brand | `#0d2b6b` |
| Accent | `#93c5fd` |
| Page background | `#fcfcfc` |
| Surface | `#ffffff` |
| Border | `#e4e4e4` |
| Text / muted / subtle | `#18181b` / `#71717a` / `#a1a1aa` |
| Font | Geist + Geist Mono |

Defined in [`app/globals.css`](app/globals.css). The manifest splash is light
(`#fcfcfc` + `blue-icon.png`) to match, so launching the Mini App doesn't flash
dark before landing on a light page.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | The divert page |
| `/.well-known/farcaster.json` | Mini App manifest, generated from `minikit.config.ts` |

Nothing else is served. The previous waitlist form, product/pricing pages,
`/api/*` routes, and Postgres integration were removed — see git history if any
of it needs to come back.

## Verification tags

The Base app domain-ownership tag (`base:app_id`) is emitted into `<head>` from
`generateMetadata` in [`app/layout.tsx`](app/layout.tsx).

## Local development

```bash
pnpm install
pnpm dev
```

No environment variables are required. `NEXT_PUBLIC_URL` is optional and
overrides the base URL used for manifest asset links; it defaults to the public
Railway domain.

## Deployment

Deployed on Railway. `pnpm build` then `pnpm start` (the start script honours
`$PORT`).

## Changing the destination

Edit `TARGET_URL` in [`lib/target.ts`](lib/target.ts) and redeploy.
