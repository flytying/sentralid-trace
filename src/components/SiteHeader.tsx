"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteHeader.module.css";

const NAV = [
  { href: "/investigate", label: "Check a booking" },
  { href: "/about", label: "About & limits" },
];

export function SiteHeader() {
  const pathname = usePathname();
  return (
    <header className={styles.header}>
      <div className={`container ${styles.inner}`}>
        <Link href="/" className={styles.brand} aria-label="SentralID Trace home">
          <span className={styles.logo} aria-hidden="true">
            <span className={styles.logoMark} />
          </span>
          <span className={styles.wordmark}>
            <span className={styles.wordTop}>SentralID</span>
            <span className={styles.wordMain}>Trace</span>
          </span>
        </Link>
        <nav className={styles.nav} aria-label="Main">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.navLink}
                aria-current={active ? "page" : undefined}
              >
                {item.label}
                {active && <span className={styles.navBar} aria-hidden="true" />}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
