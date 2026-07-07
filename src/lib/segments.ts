import type { BusinessType } from "@/generated/prisma/client";

// Segmentos oferecidos no cadastro. Cada um recomenda o modo de operacao:
// SERVICO = agenda por horario; HOSPEDAGEM = reserva por diaria (com Airbnb).
export type Segment = { key: string; label: string; type: BusinessType; hint: string };

export const SEGMENTS: Segment[] = [
  { key: "BARBEARIA", label: "Barbearia", type: "SERVICO", hint: "Agenda por horario" },
  { key: "SALAO", label: "Salao de beleza", type: "SERVICO", hint: "Agenda por horario" },
  { key: "ESTETICA", label: "Estetica / spa", type: "SERVICO", hint: "Agenda por horario" },
  { key: "CLINICA", label: "Clinica / consultorio", type: "SERVICO", hint: "Agenda por horario" },
  { key: "HOSPEDAGEM", label: "Hospedagem (cabana, chale, pousada)", type: "HOSPEDAGEM", hint: "Reserva por diaria + Airbnb" },
  { key: "SERVICOS", label: "Servicos gerais (agendados)", type: "SERVICO", hint: "Agenda por horario" },
  { key: "OUTROS", label: "Outros", type: "SERVICO", hint: "Agenda por horario" },
];

export function businessTypeForSegment(key?: string | null): BusinessType {
  return SEGMENTS.find((s) => s.key === key)?.type ?? "SERVICO";
}

export function isValidSegment(key?: string | null): boolean {
  return Boolean(key && SEGMENTS.some((s) => s.key === key));
}
