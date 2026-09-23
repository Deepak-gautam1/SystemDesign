import type { MetadataRoute } from "next";

// Makes the site installable: Chrome on Android offers "Install app" and it
// then opens full-screen from a home-screen icon, with no browser chrome.
// Colours are the dark theme's background (the app's default theme), so the
// launch splash doesn't flash white. Icons are rendered from the sidebar logo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "archprep — Interview Prep",
    short_name: "archprep",
    description: "System Design, OOD, SQL and ML interview prep with an AI tutor",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#090e1b",
    theme_color: "#090e1b",
    icons: [
      { src: "/icons/icon-192.png",     sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png",     sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
