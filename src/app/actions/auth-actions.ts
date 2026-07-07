"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";

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
        data: { organizationId: org.id, name: businessName, slug },
      });
    }
  });

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
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

  try {
    await signIn("credentials", { email, password, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=Email ou senha invalidos");
    }
    throw error;
  }
}
