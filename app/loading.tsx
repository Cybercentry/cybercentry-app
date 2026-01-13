import styles from "./loading.module.css"

export default function Loading() {
  return (
    <div className={styles.loadingPage}>
      <div className={styles.particleContainer}>
        {/* Primary particles - cyan */}
        {Array.from({ length: 30 }).map((_, i) => (
          <div
            key={`p1-${i}`}
            className={styles.particle}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${12 + Math.random() * 8}s`,
            }}
          />
        ))}
        {/* Secondary particles - white */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={`p2-${i}`}
            className={`${styles.particle} ${styles.particleSecondary}`}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
        {/* Accent particles - larger glowing */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={`p3-${i}`}
            className={`${styles.particle} ${styles.particleAccent}`}
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${18 + Math.random() * 12}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.networkGrid}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={`line-${i}`}
            className={styles.networkLine}
            style={{
              left: `${15 + i * 15}%`,
              animationDelay: `${i * 0.5}s`,
            }}
          />
        ))}
      </div>

      <div className={styles.logoContainer}>
        <div className={styles.logoGlow} />
        <img src="/white-icon.png" alt="Cybercentry One" className={styles.logo} />
      </div>

      <h1 className={styles.title}>
        <span className={styles.titleText}>CYBERCENTRY ONE</span>
        <span className={styles.titleGhost}>CYBERCENTRY ONE</span>
      </h1>

      <div className={styles.loadingIndicator}>
        <div className={styles.loadingBar}>
          <div className={styles.loadingProgress} />
        </div>
        <span className={styles.loadingText}>Initializing Security Protocol...</span>
      </div>
    </div>
  )
}
