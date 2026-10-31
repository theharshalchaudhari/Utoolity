import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,

  allowedDevOrigins: ["172.31.*.*", "10.*.*.*", "localhost", "127.0.0.1"],

  async rewrites() {
    return {
      afterFiles: [
        {
          source: "/api/:path*",
          destination: `${process.env.BACKEND_URL ?? "http://127.0.0.1:4000"}/api/:path*`,
        },
      ],
    };
  },
};

export default nextConfig;
