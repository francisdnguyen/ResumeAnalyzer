import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Clerk user profile pictures
      { protocol: "https", hostname: "img.clerk.com" },
    ],
  },
};

export default nextConfig;
