import { NextResponse } from "next/server";
import { getMemberById } from "@/db/members";
import { requireAdmin, isResponse } from "@/lib/authz";
import { sendMail } from "@/lib/mailer";

export async function POST(req: Request) {
  const s = await requireAdmin(req); if (isResponse(s)) return s;

  const admin = await getMemberById(s.uid);
  if (!admin?.email) {
    return NextResponse.json({ error: "Impossible de trouver votre adresse email." }, { status: 400 });
  }

  try {
    await sendMail({
      to: admin.email,
      subject: "Test — Monday Clone",
      text: "Ceci est un email de test envoyé depuis Monday Clone. Votre configuration SMTP fonctionne.",
    });
    return NextResponse.json({ ok: true, to: admin.email });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Échec de l'envoi de l'email." }, { status: 400 });
  }
}
