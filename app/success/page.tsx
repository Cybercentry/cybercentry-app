"use client"

import { useAccount } from "wagmi"
import { Identity, Avatar, Name, Badge, Address } from "@coinbase/onchainkit/identity"
import { AddToAppsButton, ShareButton } from "@/components/add-to-apps-button"
import { ParticleBackground } from "@/components/particle-background"
import styles from "./page.module.css"

const minikitConfig = {
  miniapp: {
    name: "Cybercentry One",
  },
}

export default function Success() {
  const { address, isConnected } = useAccount()

  return (
    <div className={styles.container}>
      <ParticleBackground />

      <div className={styles.content}>
        <div className={styles.successMessage}>
          <div className={styles.successGlow} />

          <div className={styles.checkmark}>
            <svg className={styles.checkmarkSvg} viewBox="0 0 52 52">
              <circle className={styles.checkmarkCircle} cx="26" cy="26" r="25" fill="none" />
              <path className={styles.checkmarkCheck} fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
            </svg>
          </div>

          <span className={styles.badge}>SUCCESS</span>

          <h1 className={styles.title}>
            <span className={styles.titleText}>Welcome to Cybercentry</span>
          </h1>

          {isConnected && address && (
            <div className={styles.identityCard}>
              <Identity address={address} className={styles.identity}>
                <Avatar className={styles.avatar} />
                <Name className={styles.name}>
                  <Badge className={styles.badgeIcon} />
                </Name>
                <Address className={styles.address} />
              </Identity>
            </div>
          )}

          <p className={styles.subtitle}>
            We'll be in touch.
            <br />
            Get ready to experience the future of Web3 security.
          </p>

          <div className={styles.actions}>
            <AddToAppsButton buttonClassName={styles.addButton} descriptionClassName={styles.addDescription} />

            <ShareButton
              buttonClassName={styles.shareButton}
              text={`I just signed up for ${minikitConfig.miniapp.name.toUpperCase()}!`}
              embedUrl={process.env.NEXT_PUBLIC_URL || ""}
            />
          </div>
        </div>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerGlow} />
        <p>© 2026 Cybercentry. All rights reserved.</p>
      </footer>
    </div>
  )
}
