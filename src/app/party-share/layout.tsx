import { Metadata } from "next";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: { d?: string };
}): Promise<Metadata> {
  const baseUrl = process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
  const ogImageUrl = `${baseUrl}/api/og/party?d=${searchParams.d || ""}`;

  return {
    title: "Party Results - Play Shade",
    description: "Check out these awesome party game results from Play Shade!",
    openGraph: {
      title: "Party Results - Play Shade",
      description: "Check out these awesome party game results from Play Shade!",
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: "Party Game Results",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Party Results - Play Shade",
      description: "Check out these awesome party game results from Play Shade!",
      images: [ogImageUrl],
    },
  };
}

export default function PartyShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
