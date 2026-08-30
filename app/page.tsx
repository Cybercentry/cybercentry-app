import { VerifyForm } from "./verify-form"
import styles from "./page.module.css"

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          {/* next/image is pointless here: next.config sets images.unoptimized. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/Cybercentry_Logo_Blue.png" alt="Cybercentry" className={styles.logo} />
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <span className={styles.eyebrow}>Cybercentry · Base Token Verification</span>
          <h1 className={styles.title}>You can buy it. Can you sell it?</h1>
          <p className={styles.lede}>
            A B20 (a Base token) can pass every contract check and still be a honeypot — the trap lives in the{" "}
            <strong>pool</strong>, not the token. Paste an address and Cybercentry runs a real buy-and-sell round trip.
          </p>

          <p className={styles.stocks}>
            Covers <strong>Coinbase tokenized stocks</strong> on Base —{" "}
            <span className={styles.tickers}>NVDAc, TSLAc, AAPLc</span> and ten more. Cybercentry settles
            the address against the issuer&rsquo;s published list, so a copycat wearing the ticker
            can&rsquo;t pass as the real security, and reports the controls that sit above the token —
            redemption windows and price-feed state — which no on-chain check can see.
          </p>

          <VerifyForm />
        </div>
      </main>

      <footer className={styles.footer}>Cybercentry — verify before you transact.</footer>
    </div>
  )
}
