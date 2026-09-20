import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // FakeStoreAPI serves every product image from this host.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "fakestoreapi.com",
        pathname: "/img/**",
      },
    ],
  },
};

export default nextConfig;
