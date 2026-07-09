import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota o Prisma Client gerado e seus motores nativos nas funcoes
  // serverless da Vercel. Sem isso o runtime pode iniciar sem o
  // libquery_engine-rhel-openssl-3.0.x.so.node.
  outputFileTracingIncludes: {
    "/*": ["src/generated/prisma/**/*"],
  },
};

export default nextConfig;
