import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.80"],
  images: {
    remotePatterns: [
      // Firebase Storage public URLs (file.publicUrl())
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
        pathname: "/**",
      },
      // Firebase Storage download URLs (token-based)
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_HOST ?? "firebasestorage.googleapis.com",
        pathname: "/**",
      },
      // Clerk avatar CDN
      {
        protocol: "https",
        hostname: "img.clerk.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
