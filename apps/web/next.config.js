/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['lh3.googleusercontent.com', 'localhost','graph.facebook.com','casinoapi.goodlikeedu.com'],
    remotePatterns: [
      // Supabase Storage public bucket URLs (banners, avatars, etc).
      { protocol: 'https', hostname: '*.supabase.co', pathname: '/storage/v1/object/public/**' },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
  