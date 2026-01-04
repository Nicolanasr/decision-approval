import type { Metadata } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";

const mulish = Mulish({
    variable: "--font-mulish",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Decidex",
    description: "Structured decisions and approvals for SMB IT/Ops teams.",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="scroll-smooth">
            <body className={`${mulish.variable} min-h-screen font-sans antialiased`}>
                {children}
            </body>
        </html>
    );
}
