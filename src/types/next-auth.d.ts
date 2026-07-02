import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    organizationId: string;
    organizationType: "DONO" | "AGENCIA";
    organizationName: string;
  }

  interface Session {
    user: {
      id: string;
      organizationId: string;
      organizationType: "DONO" | "AGENCIA";
      organizationName: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    organizationId: string;
    organizationType: "DONO" | "AGENCIA";
    organizationName: string;
  }
}
