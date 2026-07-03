import type { Business, WhatsappProvider } from "@/generated/prisma/client";
import type { WhatsappMedia, WhatsappProviderAdapter } from "./types";
import { metaProvider } from "./meta";
import { d360Provider } from "./d360";

const PROVIDERS: Record<WhatsappProvider, WhatsappProviderAdapter> = {
  META: metaProvider,
  D360: d360Provider,
};

function adapterFor(business: Business): WhatsappProviderAdapter {
  return PROVIDERS[business.whatsappProvider] ?? metaProvider;
}

export function isWhatsappConnected(business: Business): boolean {
  return adapterFor(business).isConnected(business);
}

export async function sendWhatsappMessage(business: Business, toPhone: string, text: string) {
  return adapterFor(business).sendMessage(business, toPhone, text);
}

export async function downloadWhatsappMedia(
  business: Business,
  mediaId: string
): Promise<WhatsappMedia | null> {
  return adapterFor(business).downloadMedia(business, mediaId);
}

export type { WhatsappMedia };
