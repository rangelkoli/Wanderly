import React from "react";
import { InstagramEmbed } from "react-social-media-embed";

// usage:
// <ReelEmbed url="https://www.instagram.com/reel/SHORTCODE/" />
export function ReelsList({ urls }: { urls: string[] }) {
  if (!urls || !Array.isArray(urls)) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "16px",
        justifyContent: "flex-start",
        marginBottom: "16px",
        overflowX: "auto",
        overflowY: "hidden",
        padding: "8px 0",
        scrollbarWidth: "thin",
        scrollbarColor: "#ccc transparent",
      }}
    >
      {urls.map((url, index) => (
        <div
          key={`${url}-${index}`}
          style={{
            flex: "0 0 auto",
            minWidth: "328px",
          }}
        >
          <InstagramEmbed url={url} width={328} />
        </div>
      ))}
    </div>
  );
}

// usage:
// <ReelsList urls={["https://www.instagram.com/reel/CODE1/", "https://www.instagram.com/reel/CODE2/"]} />
