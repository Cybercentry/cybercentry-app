/** @type {import('next').NextConfig} */

// NOTE: deliberately no X-Frame-Options and no CSP `frame-ancestors` restriction.
// Mini App hosts (Base app, Farcaster) load this page inside a webview/iframe,
// so framing must stay permitted or the app cannot launch.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
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
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
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
