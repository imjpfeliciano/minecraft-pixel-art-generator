import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.80"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_HOST ?? "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
