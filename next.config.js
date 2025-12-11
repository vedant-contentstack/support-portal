/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["images.contentstack.io", "assets.contentstack.io"],
  },
  // Disable caching for development
  experimental: {
    // Disable staleTimes for router cache
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
};

module.exports = nextConfig;
