import "./globals.css";
import type { Metadata } from "next";
import { RefreshRedirectHome } from "./components/RefreshRedirectHome";

export const metadata: Metadata = {
  title: "App Evidencias - FADERGS",
  description: "Gestao profissional de eventos academicos e evidencias."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <RefreshRedirectHome />
        {children}
      </body>
    </html>
  );
}
