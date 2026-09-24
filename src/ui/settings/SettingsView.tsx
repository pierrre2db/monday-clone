"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/ui/kit/Button";
import { api, type Settings } from "@/ui/board/api";

// Local editable shape for the SMTP form — `pass` starts empty (write-only field,
// see src/db/settings.ts: the server never sends the real password back).
type SmtpForm = { host: string; port: number; user: string; from: string; secure: boolean; pass: string };

export default function SettingsView() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [targetHours, setTargetHours] = useState(8);
  const [smtp, setSmtp] = useState<SmtpForm>({ host: "", port: 587, user: "", from: "", secure: false, pass: "" });
  const [passSet, setPassSet] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then((s: Settings) => {
        setDailyEnabled(s.dailyCheck.enabled);
        setTargetHours(s.dailyCheck.targetHours);
        setSmtp({ host: s.smtp.host, port: s.smtp.port, user: s.smtp.user, from: s.smtp.from, secure: s.smtp.secure, pass: "" });
        setPassSet(s.smtp.passSet);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setError("");
    try {
      const result = await api.updateSettings({
        dailyCheck: { enabled: dailyEnabled, targetHours },
        smtp: {
          host: smtp.host,
          port: smtp.port,
          user: smtp.user,
          from: smtp.from,
          secure: smtp.secure,
          // Only send a password when the user actually typed one — an empty
          // field means "keep the current password" (server also enforces this).
          ...(smtp.pass ? { pass: smtp.pass } : {}),
        },
      });
      setPassSet(result.smtp.passSet);
      setSmtp((f) => ({ ...f, pass: "" }));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p style={{ color: "var(--text-muted)" }}>Chargement…</p>;

  return (
    <div>
      <div className="settings-head">
        <div>
          <Link href="/" className="settings-back">← Retour</Link>
          <h1 style={{ margin: "4px 0 0" }}>Paramètres</h1>
        </div>
      </div>

      <form onSubmit={save} className="settings-cards">
        <section className="settings-card">
          <h2>Suivi du temps</h2>
          <p className="settings-help">
            Affiche un rappel du temps que vous avez enregistré aujourd&apos;hui.
          </p>
          <div className="settings-row">
            <input
              id="daily-enabled"
              type="checkbox"
              className="settings-checkbox"
              checked={dailyEnabled}
              onChange={(e) => setDailyEnabled(e.target.checked)}
            />
            <label htmlFor="daily-enabled" className="settings-checkbox-label">
              Vérifier mes heures de travail chaque jour
            </label>
          </div>
          {dailyEnabled && (
            <div className="settings-field" style={{ maxWidth: 220 }}>
              <label htmlFor="target-hours">Objectif d&apos;heures par jour</label>
              <input
                id="target-hours"
                type="number"
                min={0}
                max={24}
                className="text-input"
                value={targetHours}
                onChange={(e) => setTargetHours(Math.min(24, Math.max(0, Number(e.target.value))))}
              />
            </div>
          )}
        </section>

        <section className="settings-card">
          <h2>Envoi d&apos;emails (SMTP)</h2>
          <p className="settings-help">
            Nécessaire pour envoyer des emails (rappels). Demandez ces informations à votre fournisseur d&apos;email.
          </p>

          <div className="settings-grid">
            <div className="settings-field">
              <label htmlFor="smtp-host">Serveur (hôte)</label>
              <input
                id="smtp-host"
                type="text"
                className="text-input"
                placeholder="smtp.exemple.com"
                value={smtp.host}
                onChange={(e) => setSmtp((f) => ({ ...f, host: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="smtp-port">Port</label>
              <input
                id="smtp-port"
                type="number"
                min={1}
                max={65535}
                className="text-input"
                value={smtp.port}
                onChange={(e) => setSmtp((f) => ({ ...f, port: Number(e.target.value) }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="smtp-user">Identifiant</label>
              <input
                id="smtp-user"
                type="text"
                className="text-input"
                autoComplete="off"
                value={smtp.user}
                onChange={(e) => setSmtp((f) => ({ ...f, user: e.target.value }))}
              />
            </div>
            <div className="settings-field">
              <label htmlFor="smtp-pass">Mot de passe</label>
              <input
                id="smtp-pass"
                type="password"
                className="text-input"
                autoComplete="new-password"
                placeholder={passSet ? "•••• (inchangé)" : ""}
                value={smtp.pass}
                onChange={(e) => setSmtp((f) => ({ ...f, pass: e.target.value }))}
              />
              <span className="settings-field-hint">Laissez vide pour ne pas changer le mot de passe.</span>
            </div>
            <div className="settings-field">
              <label htmlFor="smtp-from">Adresse d&apos;expéditeur</label>
              <input
                id="smtp-from"
                type="email"
                className="text-input"
                placeholder="notifications@exemple.com"
                value={smtp.from}
                onChange={(e) => setSmtp((f) => ({ ...f, from: e.target.value }))}
              />
            </div>
          </div>

          <div className="settings-row" style={{ marginTop: 4 }}>
            <input
              id="smtp-secure"
              type="checkbox"
              className="settings-checkbox"
              checked={smtp.secure}
              onChange={(e) => setSmtp((f) => ({ ...f, secure: e.target.checked }))}
            />
            <label htmlFor="smtp-secure" className="settings-checkbox-label">
              Connexion sécurisée (TLS)
            </label>
          </div>
        </section>

        <div className="settings-footer">
          <Button type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          {saved && <span className="settings-saved">Enregistré ✓</span>}
          {error && <span style={{ color: "var(--c-red)", fontSize: 13, fontWeight: 600 }}>{error}</span>}
        </div>
      </form>
    </div>
  );
}
