import { NextResponse } from "next/server";
import { requireBusinessApi } from "@/lib/api-access";
import { extractServicesFromImage } from "@/lib/vision";

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type Allowed = (typeof ALLOWED)[number];

// Recebe a foto da tabela de precos e devolve os servicos lidos (sem salvar
// ainda — o dono revisa antes de confirmar).
export async function POST(
  request: Request,
  { params }: { params: Promise<{ businessId: string }> }
) {
  const { businessId } = await params;
  const access = await requireBusinessApi(businessId);
  if ("error" in access) return access.error;

  const body = await request.json().catch(() => null);
  const image = typeof body?.image === "string" ? body.image : "";
  const mediaType = typeof body?.mediaType === "string" ? body.mediaType : "";

  if (!image || !ALLOWED.includes(mediaType as Allowed)) {
    return NextResponse.json({ error: "Envie uma imagem JPG, PNG ou WEBP." }, { status: 400 });
  }

  const result = await extractServicesFromImage(image, mediaType as Allowed);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }
  return NextResponse.json({ services: result.services });
}
