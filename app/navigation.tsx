"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "./navigation.module.css"

export function Navigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true
    if (path !== "/" && pathname.startsWith(path)) return true
    return false
  }

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <Link href="/" className={styles.logo}>
          <span className={styles.logoText}>CYBERCENTRY</span>
        </Link>

        <div className={styles.links}>
          <Link href="/" className={`${styles.link} ${isActive("/") ? styles.active : ""}`}>
            Home
          </Link>
          <Link href="/core" className={`${styles.link} ${isActive("/core") ? styles.active : ""}`}>
            Core
          </Link>
          <Link href="/edge" className={`${styles.link} ${isActive("/edge") ? styles.active : ""}`}>
            Edge
          </Link>
          <Link href="/one" className={`${styles.link} ${isActive("/one") ? styles.active : ""}`}>
            One
          </Link>
        </div>
      </div>
    </nav>
  )
}

