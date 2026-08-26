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
  // references optional @x402/* packages (x402 payments) we never use. Stub them
  // so the build resolves; the code path that would call them is never taken in
  // our wallet-connect / USDC-transfer flow.
  webpack: (config, { webpack }) => {
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }))
    return config
  },
}

export default nextConfig
