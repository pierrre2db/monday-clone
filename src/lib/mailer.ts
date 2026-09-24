import nodemailer from "nodemailer";
import { getSmtpRaw } from "@/db/settings";

export async function sendMail({ to, subject, text }: { to: string; subject: string; text: string }): Promise<void> {
  const { host, port, user, from, secure, pass } = await getSmtpRaw();

  if (!host || !user || !pass) {
    throw new Error("Configuration SMTP incomplète (serveur, identifiant et mot de passe requis).");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });

  try {
    await transport.sendMail({ from: from || user, to, subject, text });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const code = (err as { code?: string } | null)?.code ?? "";

    if (code === "EAUTH" || /auth/i.test(message)) {
      throw new Error("Échec d'authentification SMTP (vérifiez l'identifiant et le mot de passe d'application).");
    }
    if (code === "ECONNECTION" || code === "ETIMEDOUT" || code === "ESOCKET" || code === "ECONNREFUSED" || code === "ENOTFOUND" || /connect|timeout|refused|getaddrinfo/i.test(message)) {
      throw new Error("Impossible de joindre le serveur SMTP (vérifiez le serveur et le port).");
    }
    throw err instanceof Error ? err : new Error(message);
  }
}
