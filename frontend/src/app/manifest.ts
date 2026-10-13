import type { MetadataRoute } from "next";

/**
 * Web app manifest (served at /manifest.webmanifest). Makes the portal
 * installable on Android, iOS and desktop Chrome.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hall 12 Mess Portal",
    short_name: "Hall 12",
    description: "Mess menu, extras booking and notices for IIT Kanpur Hall of Residence XII.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "en",
    categories: ["food", "education", "utilities"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Book extras", url: "/student/browse", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "My bookings", url: "/student/history", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
