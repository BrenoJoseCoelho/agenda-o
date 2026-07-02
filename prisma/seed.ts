import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

function atHour(daysAgo: number, hour: number, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  await prisma.$transaction([
    prisma.appointment.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.contact.deleteMany(),
    prisma.service.deleteMany(),
    prisma.business.deleteMany(),
    prisma.user.deleteMany(),
    prisma.organization.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash("demo1234", 10);

  // --- DONO demo: Barbearia do Ze ---
  const donoOrg = await prisma.organization.create({
    data: { name: "Ze", type: "DONO" },
  });
  await prisma.user.create({
    data: {
      name: "Ze",
      email: "demo@barbearia.com",
      passwordHash,
      organizationId: donoOrg.id,
    },
  });
  const barbearia = await prisma.business.create({
    data: {
      organizationId: donoOrg.id,
      name: "Barbearia do Ze",
      slug: "barbearia-do-ze",
      aiName: "Bia",
      tone: "Simpatica, direta, fala como gente de verdade. Usa poucas emojis.",
      openingHours: "Seg a Sex 09:00-19:00, Sab 09:00-13:00",
      rules: "Nunca invente precos ou horarios. Sempre confirme o servico antes de agendar.",
      billingStatus: "ATIVO",
    },
  });

  const [corte, , combo] = await Promise.all([
    prisma.service.create({
      data: { businessId: barbearia.id, name: "Corte masculino", priceCents: 4500, durationMinutes: 30 },
    }),
    prisma.service.create({
      data: { businessId: barbearia.id, name: "Barba", priceCents: 2500, durationMinutes: 20 },
    }),
    prisma.service.create({
      data: { businessId: barbearia.id, name: "Corte + Barba", priceCents: 6000, durationMinutes: 45 },
    }),
  ]);

  // Conversation 1: "Cliente novo" - open, ready for the live demo
  const contact1 = await prisma.contact.create({
    data: { businessId: barbearia.id, name: "Cliente novo", phone: "5511988887777" },
  });
  await prisma.conversation.create({
    data: {
      businessId: barbearia.id,
      contactId: contact1.id,
      status: "NOVA",
      lastMessageAt: hoursAgo(0.1),
    },
  });

  // Conversation 2: closed a booking at 22h (the money screenshot)
  const contact2 = await prisma.contact.create({
    data: { businessId: barbearia.id, name: "Marcos Silva", phone: "5511977776666" },
  });
  const conv2 = await prisma.conversation.create({
    data: { businessId: barbearia.id, contactId: contact2.id, status: "AGENDOU", lastMessageAt: atHour(0, 22, 10) },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: conv2.id, sender: "CLIENTE", content: "boa noite, voces abrem amanha?", createdAt: atHour(0, 22, 2) },
      { conversationId: conv2.id, sender: "IA", content: "Boa noite! Sim, abrimos amanha das 9h as 19h. Quer marcar um horario?", createdAt: atHour(0, 22, 3) },
      { conversationId: conv2.id, sender: "CLIENTE", content: "quero, corte e barba", createdAt: atHour(0, 22, 5) },
      { conversationId: conv2.id, sender: "IA", content: "Combo Corte + Barba, R$ 60,00, 45min. Que horas fica bom amanha?", createdAt: atHour(0, 22, 6) },
      { conversationId: conv2.id, sender: "CLIENTE", content: "10h", createdAt: atHour(0, 22, 9) },
      { conversationId: conv2.id, sender: "IA", content: "Fechado! Corte + Barba amanha as 10h. Te espero!", createdAt: atHour(0, 22, 10) },
    ],
  });
  await prisma.appointment.create({
    data: {
      businessId: barbearia.id,
      contactId: contact2.id,
      serviceId: combo.id,
      conversationId: conv2.id,
      scheduledAt: atHour(-1, 10, 0),
    },
  });

  // A spread of extra conversations across the day/night to populate the hourly chart
  const hoursSample = [9, 10, 11, 14, 15, 16, 19, 21, 23, 1, 2, 6];
  for (let i = 0; i < hoursSample.length; i++) {
    const hour = hoursSample[i];
    const contact = await prisma.contact.create({
      data: {
        businessId: barbearia.id,
        name: `Cliente ${i + 3}`,
        phone: `551190000${String(i).padStart(2, "0")}`,
      },
    });
    const status = i % 3 === 0 ? "AGENDOU" : i % 3 === 1 ? "EM_ATENDIMENTO" : "PERDIDA";
    const conv = await prisma.conversation.create({
      data: {
        businessId: barbearia.id,
        contactId: contact.id,
        status,
        lastMessageAt: atHour(Math.floor(i / 3), hour),
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        sender: "CLIENTE",
        content: "oi, quanto e o corte?",
        createdAt: atHour(Math.floor(i / 3), hour),
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conv.id,
        sender: "IA",
        content: `Corte masculino sai por ${(corte.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Quer marcar?`,
        createdAt: atHour(Math.floor(i / 3), hour, 1),
      },
    });
    if (status === "AGENDOU") {
      await prisma.appointment.create({
        data: {
          businessId: barbearia.id,
          contactId: contact.id,
          serviceId: corte.id,
          conversationId: conv.id,
          scheduledAt: atHour(-1, 12, 0),
        },
      });
    }
  }

  // --- AGENCIA demo: Agencia XYZ, reselling Atende AI to 2 clients ---
  const agenciaOrg = await prisma.organization.create({
    data: { name: "Agencia XYZ", type: "AGENCIA" },
  });
  await prisma.user.create({
    data: {
      name: "Camila",
      email: "demo@agencia.com",
      passwordHash,
      organizationId: agenciaOrg.id,
    },
  });

  const clienteA = await prisma.business.create({
    data: {
      organizationId: agenciaOrg.id,
      name: "Clinica Sorriso",
      slug: "clinica-sorriso",
      aiName: "Sofia",
      tone: "Acolhedora e profissional.",
      openingHours: "Seg a Sex 08:00-18:00",
      billingStatus: "ATIVO",
    },
  });
  await prisma.service.create({
    data: { businessId: clienteA.id, name: "Consulta avaliacao", priceCents: 15000, durationMinutes: 40 },
  });

  const clienteB = await prisma.business.create({
    data: {
      organizationId: agenciaOrg.id,
      name: "Studio Bela",
      slug: "studio-bela",
      aiName: "Lu",
      tone: "Animada e simpatica, adora emojis.",
      openingHours: "Ter a Sab 10:00-20:00",
      billingStatus: "TRIAL",
    },
  });
  await prisma.service.create({
    data: { businessId: clienteB.id, name: "Manicure", priceCents: 3500, durationMinutes: 45 },
  });

  console.log("Seed concluido.");
  console.log("Login dono:", "demo@barbearia.com / demo1234");
  console.log("Login agencia:", "demo@agencia.com / demo1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
