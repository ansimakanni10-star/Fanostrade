// Fano's Trade — backend du formulaire de contact
// Reçoit les demandes de devis du site et les envoie par e-mail via l'API Brevo
// (Render bloque les connexions SMTP sortantes sur son offre gratuite depuis
// septembre 2025, donc on envoie les e-mails via une requête HTTPS classique
// au lieu de Nodemailer/SMTP.)

require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// -- CORS : n'autorise que le(s) domaine(s) de ton site une fois en ligne.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(o => o.trim());

app.use(cors({
  origin: allowedOrigins.includes("*") ? true : allowedOrigins,
}));
app.use(express.json());

// -- Anti-abus très simple : limite le nombre de requêtes par IP.
const submissionsByIp = new Map();
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_PER_WINDOW = 5;

function isRateLimited(ip) {
  const now = Date.now();
  const entry = submissionsByIp.get(ip) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  submissionsByIp.set(ip, entry);
  return entry.count > MAX_PER_WINDOW;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// -- Envoi via l'API HTTPS de Brevo (remplace SMTP)
async function sendBrevoEmail({ to, subject, html, text, replyTo }) {
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "accept": "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY,
    },
    body: JSON.stringify({
      sender: { name: "Fano's Trade", email: process.env.SENDER_EMAIL },
      to: [{ email: to }],
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Brevo API error (${res.status}): ${detail}`);
  }
}

app.get("/", (req, res) => {
  res.send("Fano's Trade backend — OK");
});

app.post("/api/contact", async (req, res) => {
  try {
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    if (isRateLimited(ip)) {
      return res.status(429).json({ error: "Trop de demandes. Réessayez plus tard." });
    }

    const { nom, telephone, email, produit, message } = req.body || {};

    if (!nom || !telephone || !email || !produit) {
      return res.status(400).json({ error: "Champs obligatoires manquants." });
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!emailOk) {
      return res.status(400).json({ error: "Adresse e-mail invalide." });
    }

    const destinataire = process.env.NOTIFY_EMAIL || "ansimakanni10@gmail.com";

    // 1. Notification à Fano's Trade
    await sendBrevoEmail({
      to: destinataire,
      replyTo: email,
      subject: `Nouvelle demande de devis — ${produit}`,
      text:
        `Nouvelle demande reçue depuis le site Fano's Trade\n\n` +
        `Nom : ${nom}\n` +
        `Téléphone : ${telephone}\n` +
        `Email : ${email}\n` +
        `Produit recherché : ${produit}\n` +
        `Message : ${message || "(aucun message)"}\n`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;color:#2B2B2B;">
          <h2 style="color:#FF7A00;">Nouvelle demande de devis</h2>
          <p><strong>Nom :</strong> ${escapeHtml(nom)}</p>
          <p><strong>Téléphone :</strong> ${escapeHtml(telephone)}</p>
          <p><strong>Email :</strong> ${escapeHtml(email)}</p>
          <p><strong>Produit recherché :</strong> ${escapeHtml(produit)}</p>
          <p><strong>Message :</strong><br>${escapeHtml(message || "(aucun message)").replace(/\n/g, "<br>")}</p>
        </div>
      `,
    });

    // 2. Confirmation automatique envoyée au client
    await sendBrevoEmail({
      to: email,
      subject: "Nous avons bien reçu votre demande — Fano's Trade",
      text:
        `Bonjour ${nom},\n\n` +
        `Merci pour votre demande concernant : ${produit}.\n` +
        `Notre équipe vous répond sous 24h ouvrées avec un devis détaillé.\n\n` +
        `À très vite,\nL'équipe Fano's Trade`,
      html: `
        <div style="font-family:Arial,sans-serif;font-size:15px;color:#2B2B2B;">
          <p>Bonjour ${escapeHtml(nom)},</p>
          <p>Merci pour votre demande concernant : <strong>${escapeHtml(produit)}</strong>.</p>
          <p>Notre équipe vous répond sous 24h ouvrées avec un devis détaillé.</p>
          <p>À très vite,<br>L'équipe Fano's Trade</p>
        </div>
      `,
    });

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Erreur d'envoi :", err);
    res.status(500).json({ error: "Erreur serveur, réessayez plus tard." });
  }
});

app.listen(PORT, () => {
  console.log(`Fano's Trade backend en écoute sur le port ${PORT}`);
});
