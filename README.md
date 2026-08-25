# Cybercentry — Base Token Verification

A **Base App** (standard web app + wallet, listed on [base.dev](https://base.dev))
that verifies a B20 token before you buy it: it runs a real on-chain buy-and-sell
round trip and reads the contract to answer one question — **can you actually
sell it?** — surfacing sell-side honeypots, whitelisted exits, freeze-and-seize,
live pauses, copycats, and issuer controls.

> This used to be a Farcaster Mini App. It has been migrated to the current Base
> model — **standard web app + wallet, powered by base.dev** — per Base's
> [migration guide](https://docs.base.org/apps/guides/migrate-to-standard-web-app).
> There is no `farcaster.json` manifest, no `@farcaster/miniapp-sdk`, and no
> `fc:miniapp` embed. Domain ownership is proven by the `base:app_id` meta tag;
> discovery and the store listing live on base.dev.

## How it works

```
Browser / Base app webview            Next.js route (this repo)            CBTV proxy
─ enter a B20 address
─ free first scan: sign a message      POST /api/verify {address, freeSig}
   (or pay $1 USDC via the wallet)     ─ verify signature / payment (server-side)
                                        ─ replay-guard + free-scan guard (Postgres)
                                        ─ POST /verify-b20/async (x-api-key) ──► {job_id}
   ◄──────────────────────────────────  return {jobId}
─ poll GET /api/verify?jobId=…          ─ GET /report/{job_id} (x-api-key) ──► status/result
   ◄──────────────────────────────────  return {status, report}
─ render the verdict + findings
```

Payment/authorisation is verified **once**, server-side, at kickoff — the
frontend is never trusted. Async + poll avoids the proxy's edge time limit so
busy tokens still return a complete report.

## Wallet + payments

- **Connect:** `@wagmi/core` + the `baseAccount` / `injected` connectors
  (`@base-org/account`).
- **Send:** `viem` `walletClient` talks straight to the wallet provider (chain
  switch + USDC transfer). This sidesteps connector gaps in some in-app wallets.
- **Builder attribution:** the ERC-8021 builder-code suffix rides on the transfer
  calldata (see [`lib/wagmi.ts`](lib/wagmi.ts) / [`lib/pay-usdc.ts`](lib/pay-usdc.ts)).
- **Free first scan:** a gasless wallet signature proves ownership; the server
  grants one free verification per wallet (durable guard in Postgres).

See [`memory`](./) notes and [`lib/payments.ts`](lib/payments.ts) for the shared config.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | The verification app |
| `/api/verify` | `POST` kicks off a scan (after verifying payment/signature); `GET ?jobId=` polls for the report |

The CBTV `x-api-key` is server-only and never shipped to the client.

## Discovery / ownership

- **`base:app_id`** meta tag (in [`app/layout.tsx`](app/layout.tsx)) links this
  domain to the base.dev project — this is the domain-ownership proof now.
- App name, icon, tagline, screenshots, category and builder code are configured
  on the **base.dev** project, not in a manifest.
- Open Graph / Twitter card metadata gives the URL a rich preview when shared.

App-level metadata lives in [`app.config.ts`](app.config.ts).

## Environment (Railway)

| Var | Purpose |
| --- | --- |
| `CBTV_API_URL` / `CBTV_API_KEY` | The CBTV verification proxy (server-only) |
| `NEXT_PUBLIC_TREASURY_ADDRESS` | Where the USDC fee lands |
| `NEXT_PUBLIC_PAY_TESTNET` | `true` for Base Sepolia while testing |
| `DATABASE_URL` | Postgres durable store (replay / payer / free-scan guards); fails open to in-memory |
| `MINI_APP_API_KEY` | Base Dashboard notifications API key (optional) |
| `NEXT_PUBLIC_URL` | Public base URL (defaults to `https://app.cybercentry.co.uk`) |

## Local development

```bash
pnpm install
pnpm dev
```

## Deployment

Deployed on Railway at **app.cybercentry.co.uk**. `pnpm build` then `pnpm start`
(the start script honours `$PORT`).
