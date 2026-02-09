import type { NextConfig } from "next";
import { config } from "dotenv";
import { resolve } from "path";

// Load env vars from root .env (monorepo: frontend needs NEXT_PUBLIC_* vars
// for the Supabase browser client and API URL)
config({ path: resolve(process.cwd(), "../.env") });

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: resolve(process.cwd(), ".."),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "*.ggpht.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "**" },
    ],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  },
};

export default nextConfig;
