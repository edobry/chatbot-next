import "~/styles/globals.css";

import type { Metadata } from "next";
import { Exo } from "next/font/google";

import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
	title: "Chatbot",
	description: "fun lil chatbot app",
	icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const exo = Exo({
	subsets: ["latin"],
});

export default function RootLayout({
	children,
}: Readonly<{ children: React.ReactNode }>) {
	return (
		<html lang="en" className={`${exo.className}`}>
			<body>
				<TRPCReactProvider>{children}</TRPCReactProvider>
			</body>
		</html>
	);
}
