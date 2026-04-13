/** @type {import('next').NextConfig} */
const nextConfig = {
  // CSR 전용 — 모든 페이지를 클라이언트에서 렌더링
  reactStrictMode: true,
  // 환경변수 NEXT_PUBLIC_ 접두사로 클라이언트 노출
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  // 이미지 최적화 (Supabase Storage 도메인 허용)
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Tailwind CSS 호환
  transpilePackages: ['lucide-react'],
};

export default nextConfig;
