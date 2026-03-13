import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hunt Architect",
  description: "POC para converter plantas 2D em visualizacao 3D com controle por gestos",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
