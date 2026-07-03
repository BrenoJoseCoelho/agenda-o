import type { Business } from "@/generated/prisma/client";

export type WhatsappMedia = { data: ArrayBuffer; mimeType: string };

// A WhatsApp provider abstracts how outbound messages are sent and how inbound
// media is fetched. Adding a new BSP = implementing this interface.
export interface WhatsappProviderAdapter {
  readonly id: "META" | "D360";
  // True when the business has the credentials this provider needs.
  isConnected(business: Business): boolean;
  sendMessage(business: Business, toPhone: string, text: string): Promise<{ skipped: boolean }>;
  downloadMedia(business: Business, mediaId: string): Promise<WhatsappMedia | null>;
}
