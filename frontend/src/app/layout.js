import { Inter } from "next/font/google";
import "./globals.css";
import AxiosInterceptor from "./components/AxiosInterceptor";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata = {
  title: "Dimakh Website Quality Tester & Auditor",
  description: "Automated website quality assurance and client reporting platform.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AxiosInterceptor>
          {children}
        </AxiosInterceptor>
      </body>
    </html>
  );
}

