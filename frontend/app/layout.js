import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "AI Architect — Enterprise Workflow Builder",
  description:
    "Build, orchestrate, and monitor AI agent workflows with a visual canvas builder. Enterprise-grade LLM chains, approval gates, and HTTP integrations.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
