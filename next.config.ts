import type { NextConfig } from "next";

// Derive the public Cloudinary cloud name from CLOUDINARY_URL when not set explicitly.
const cloudFromUrl = (() => {
  try {
    return process.env.CLOUDINARY_URL ? new URL(process.env.CLOUDINARY_URL).hostname : "";
  } catch {
    return "";
  }
})();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || cloudFromUrl,
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "res.cloudinary.com" }],
  },
  poweredByHeader: false,
};

export default nextConfig;
