import "./globals.css";
import Navbar from "@/components/Navbar";
import Providers from "@/components/Providers";

export const metadata = {
  title: "Pizza Palace",
  description: "Delicious pizza delivered fresh",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dm-allow-colors="" dm-allow-transitions="">
      <body className="text-white">
        <Providers>
          <Navbar />
          <main className="pt-14 min-h-screen bg-black/40">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
