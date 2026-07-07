"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { businessTypeForSegment } from "@/lib/segments";
import {
  loginKeys,
  loginRetryAfter,
  recordLoginFailure,
  clearLoginAttempts,
} from "@/lib/rate-limit";

async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconhecido"
  );
}

// A successful signIn throws a NEXT_REDIRECT; distinguish it from a real error.
function isRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function slugify(name: string) {
  const stripped = name
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
  return stripped.replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function registerAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const orgType = String(formData.get("orgType") || "DONO") as "DONO" | "AGENCIA";
  const orgName = String(formData.get("orgName") || "").trim();
  const businessName = String(formData.get("businessName") || "").trim();
  const segment = String(formData.get("segment") || "").trim() || null;
  const businessType = businessTypeForSegment(segment);

  if (!name || !email || !password || !orgName) {
    redirect("/registrar?error=Preencha todos os campos");
  }
  if (password.length < 8) {
    redirect("/registrar?error=A senha precisa ter ao menos 8 caracteres");
  }
  if (orgType === "DONO" && !businessName) {
    redirect("/registrar?error=Informe o nome do seu negocio");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    redirect("/registrar?error=Ja existe uma conta com esse email");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let businessSlug: string | null = null;
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: orgName, type: orgType },
    });
    await tx.user.create({
      data: { name, email, passwordHash, organizationId: org.id },
    });
    if (orgType === "DONO") {
      const base = slugify(businessName) || "negocio";
      let slug = base;
      let attempt = 0;
      while (await tx.business.findUnique({ where: { slug } })) {
        attempt += 1;
        slug = `${base}-${attempt}`;
      }
      await tx.business.create({
        data: { organizationId: org.id, name: businessName, slug, segment, businessType },
      });
      businessSlug = slug;
    }
  });

  // Hospedagem ja cai na aba de cadastrar as unidades; o resto vai pro painel.
  const redirectTo =
    businessType === "HOSPEDAGEM" && businessSlug
      ? `/negocios/${businessSlug}/hospedagem`
      : "/";

  try {
    await signIn("credentials", { email, password, redirectTo });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=Conta criada, mas o login falhou. Tente entrar.");
    }
    throw error;
  }
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");

  const keys = loginKeys(email, await clientIp());

  // Bloqueia forca bruta: se email ou IP estao travados, nem tenta autenticar.
  const retryAfter = await loginRetryAfter(keys);
  if (retryAfter !== null) {
    const minutes = Math.ceil(retryAfter / 60);
    redirect(`/login?error=Muitas tentativas. Tente de novo em ${minutes} min.`);
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    // Sucesso: signIn lanca um redirect. Limpa os contadores e deixa seguir.
    if (isRedirect(error)) {
      await clearLoginAttempts(keys);
      throw error;
    }
    if (error instanceof AuthError) {
      await recordLoginFailure(keys);
      redirect("/login?error=Email ou senha invalidos");
    }
    throw error;
  }
}
