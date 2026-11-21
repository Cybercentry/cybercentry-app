import { createRequire } from "node:module"

const pkg = createRequire(import.meta.url)("./package.json")

/** @type {import('next').NextConfig} */

// NOTE: deliberately no X-Frame-Options and no CSP `frame-ancestors` restriction.
// The Base app can load this page inside a webview/iframe, so framing must stay
// permitted or the app cannot launch inside it.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Base Account approvals happen in a keys.coinbase.com popup that must keep its
  // window.opener link to post the result back. `same-origin` severs that and the
  // popup spins forever; `same-origin-allow-popups` is Base's recommended value
  // and keeps the opener while still isolating the page. (Base Account docs.)
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // Next.js inlines hydration and RSC payload scripts, so 'unsafe-inline'
      // is required without a nonce-based setup.
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors *",
    ].join("; "),
  },
]

const nextConfig = {
  images: {
    unoptimized: true,
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }]
  },

  // The wagmi `baseAccount` connector pulls @coinbase/cdp-sdk, which statically
  // references optional @x402/* packages. The ones we do not install are stubbed
  // so the build resolves; the code path that would call them is never taken in
  // our wallet-connect / USDC-transfer flow.
  //
  // The @x402 packages we actually depend on are NOT stubbed: the MCP server
  // pays for itself with them (app/api/mcp/x402.ts). This used to ignore all of
  // @x402/*, which silently deleted those imports and failed the build at
  // page-data collection with MODULE_NOT_FOUND rather than at compile time.
  //
  // Anything added to package.json under @x402/ must be listed here too, or it
  // typechecks, tests green, and then dies at build. That has now happened
  // twice — first for core/evm/mcp, then for extensions — so the list is
  // derived from package.json rather than hand-maintained.
  webpack: (config, { webpack }) => {
    const used = Object.keys(pkg.dependencies ?? {})
      .filter((name) => name.startsWith("@x402/"))
      .map((name) => name.slice("@x402/".length))
    const keep = used.length ? `(?!${used.join("|")})` : ""
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: new RegExp(`^@x402/${keep}`) }))
    return config
  },
}

export default nextConfig
