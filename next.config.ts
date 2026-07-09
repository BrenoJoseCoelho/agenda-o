import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Garante que o motor nativo do Prisma (libquery_engine-*.so.node) seja
  // empacotado nas funcoes serverless da Vercel — sem isso o Prisma nao inicia
  // no runtime (rhel-openssl-3.0.x).
  outputFileTracingIncludes: {
    "/**": ["./src/generated/prisma/**/*"],
  },
};

export default nextConfig;
