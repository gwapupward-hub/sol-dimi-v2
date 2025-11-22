
import "./globals.css";
import SolanaWalletProvider from "@/components/SolanaWalletProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en"><body><SolanaWalletProvider>{children}</SolanaWalletProvider></body></html>
  );
}
