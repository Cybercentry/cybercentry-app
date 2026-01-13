import type React from "react"
import type { Metadata } from "next"
import { Inter, Source_Code_Pro } from "next/font/google"
import { RootProvider } from "./rootProvider"
import { LiveChat } from "./livechat-widget"
import "./globals.css"

const minikitConfig = {
  miniapp: {
    version: "1",
    name: "Cybercentry One",
    description:
      "Empowers individuals and organisations to anticipate, prevent, and respond to cyber threats with confidence.",
    heroImageUrl: "https://cybercentry-one-mini-app.up.railway.app/blue-hero.png",
  },
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: minikitConfig.miniapp.name,
    description: minikitConfig.miniapp.description,
    other: {
      "fc:frame": JSON.stringify({
        version: minikitConfig.miniapp.version,
        imageUrl: minikitConfig.miniapp.heroImageUrl,
        button: {
          title: "Future of Web3 Security",
          action: {
            name: `Launch ${minikitConfig.miniapp.name}`,
            type: "launch_frame",
          },
        },
      }),
    },
  }
}

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
})

const sourceCodePro = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                background: #0d2b6b;
                margin: 0;
                min-height: 100vh;
              }
              @keyframes float {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
              @keyframes shimmer {
                0% { background-position: -200% center; }
                100% { background-position: 200% center; }
              }
              @keyframes particle-rise {
                0% { transform: translateY(100vh) scale(0); opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { transform: translateY(-100vh) scale(1); opacity: 0; }
              }
              .initial-loader {
                position: fixed;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                background: #0d2b6b;
                overflow: hidden;
              }
              .initial-loader .particles {
                position: absolute;
                inset: 0;
                overflow: hidden;
                pointer-events: none;
              }
              .initial-loader .particle {
                position: absolute;
                width: 4px;
                height: 4px;
                background: rgba(0, 212, 255, 0.6);
                border-radius: 50%;
                animation: particle-rise linear infinite;
              }
              .initial-loader .logo-container {
                position: relative;
                z-index: 1;
              }
              .initial-loader .logo-glow {
                position: absolute;
                inset: -20px;
                background: radial-gradient(circle, rgba(0, 212, 255, 0.3) 0%, transparent 70%);
                border-radius: 50%;
                animation: float 3s ease-in-out infinite;
              }
              .initial-loader img {
                position: relative;
                width: 120px;
                height: 120px;
                animation: float 3s ease-in-out infinite;
                image-rendering: crisp-edges;
              }
              .initial-loader h1 {
                position: relative;
                z-index: 1;
                margin-top: 24px;
                font-family: system-ui, -apple-system, sans-serif;
                font-size: clamp(24px, 5vw, 36px);
                font-weight: 800;
                letter-spacing: 6px;
                background: linear-gradient(135deg, #ffffff 0%, #00d4ff 50%, #ffffff 100%);
                background-size: 200% auto;
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                animation: shimmer 3s linear infinite;
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.variable} ${sourceCodePro.variable}`}>
        <div className="initial-loader" id="initial-loader">
          <div className="particles">
            <div className="particle" style={{ left: "10%", animationDelay: "0s", animationDuration: "12s" }}></div>
            <div className="particle" style={{ left: "20%", animationDelay: "1s", animationDuration: "14s" }}></div>
            <div className="particle" style={{ left: "30%", animationDelay: "2s", animationDuration: "10s" }}></div>
            <div className="particle" style={{ left: "40%", animationDelay: "0.5s", animationDuration: "16s" }}></div>
            <div className="particle" style={{ left: "50%", animationDelay: "3s", animationDuration: "11s" }}></div>
            <div className="particle" style={{ left: "60%", animationDelay: "1.5s", animationDuration: "13s" }}></div>
            <div className="particle" style={{ left: "70%", animationDelay: "2.5s", animationDuration: "15s" }}></div>
            <div className="particle" style={{ left: "80%", animationDelay: "0.8s", animationDuration: "12s" }}></div>
            <div className="particle" style={{ left: "90%", animationDelay: "1.8s", animationDuration: "14s" }}></div>
          </div>
          <div className="logo-container">
            <div className="logo-glow"></div>
            <img src="/white-icon.png" alt="Cybercentry One" />
          </div>
          <h1>CYBERCENTRY ONE</h1>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined') {
                window.addEventListener('load', function() {
                  setTimeout(function() {
                    var loader = document.getElementById('initial-loader');
                    if (loader) {
                      loader.style.opacity = '0';
                      loader.style.transition = 'opacity 0.3s ease';
                      setTimeout(function() { loader.remove(); }, 300);
                    }
                  }, 100);
                });
              }
            `,
          }}
        />
        <RootProvider>{children}</RootProvider>
        <LiveChat />
      </body>
    </html>
  )
}
