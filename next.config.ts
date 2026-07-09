import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota o motor nativo do Prisma (libquery_engine-*.so.node) nas funcoes
  // serverless da Vercel. Sem isso o Prisma nao inicia no runtime
  // (rhel-openssl-3.0.x). Chave "/*" = todas as rotas (docs do Next).
  outputFileTracingIncludes: {
    "/*": ["./src/generated/prisma/*.so.node"],
    "/**/*": ["./src/generated/prisma/*.so.node"],
  },
};

export default nextConfig;
