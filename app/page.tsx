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

          <VerifyForm />

          {/* The showcase sits below the form: someone who already knows what they
              want scans immediately, and someone deciding whether to trust the
              result reads on. Grouped by the question each answers, not by the
              module that produces it. */}
          <section className={styles.caps}>
            <span className={styles.capsHead}>What a scan covers</span>

            <div className={styles.figures}>
              <div className={styles.figure}>
                <span className={styles.figureN}>40</span>
                <span className={styles.figureL}>catalogued findings, fixed IDs</span>
              </div>
              <div className={styles.figure}>
                <span className={styles.figureN}>4</span>
                <span className={styles.figureL}>severity bands, grade-capping</span>
              </div>
              <div className={styles.figure}>
                <span className={styles.figureN}>13</span>
                <span className={styles.figureL}>tokenized stocks covered</span>
              </div>
            </div>

            <div className={styles.cap}>
              <span className={styles.capQ}>Can you get your money out?</span>
              <p className={styles.capA}>
                A real buy-and-sell round trip against the token&rsquo;s own pools: sell-side honeypots, pool hooks that
                exempt insiders from a penalty everyone else pays, reverting sells, and a round trip that costs more
                than the stated fee. When no pool can be quoted, it says <strong>unknown</strong> rather than fine.
              </p>
            </div>

            <div className={styles.cap}>
              <span className={styles.capQ}>What can the issuer do to you?</span>
              <p className={styles.capA}>
                Freeze-and-seize authority and whether it is armed, live pauses, mint rights and supply caps, rebase —
                which changes what every balance is worth — policy control held by a third party, and admin power
                concentrated on a single hot key. Disclosed as <strong>capability</strong>, and where it matters proven
                by running the call in a read-only simulation.
              </p>
            </div>

            <div className={styles.cap}>
              <span className={styles.capQ}>Is this even the right token?</span>
              <p className={styles.capA}>
                Fake B20s minted to look official, same-ticker copycats, homoglyph and zero-width lookalikes, and
                address-derivation reproduction. Ecosystem copycats are reported separately — someone else&rsquo;s fake
                is never counted against the token you asked about.
              </p>
            </div>

            <div className={styles.cap}>
              <span className={styles.capQ}>Coinbase tokenized stocks</span>
              <p className={styles.capA}>
                All thirteen — <strong>NVDAc, TSLAc, AAPLc</strong> and ten more — settled against the issuer&rsquo;s
                published list by address, so a copycat wearing the ticker cannot pass as the real security. Reads the
                Chainlink total-return feed and its staleness, the multiplier that decides what a token redeems for,
                and the oracle&rsquo;s registry state. Reports the controls that sit <em>above</em> the token —
                AP-gated redemption, price-feed behaviour outside market hours — which no on-chain check can see.
              </p>
            </div>

            <p className={styles.capRule}>
              It never guesses. A truncated read is never called clean, an empty result is never called proof, and an
              absence is reported as <strong>not observed</strong> — never as does not exist.
            </p>
          </section>
        </div>
      </main>

      <footer className={styles.footer}>Cybercentry — verify before you transact.</footer>
    </div>
  )
}
