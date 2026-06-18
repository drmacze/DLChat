import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fetch from "node-fetch";

// ─── Konfigurasi ─────────────────────────────────────────────────────────────
const PHONE_NUMBER  = process.env.BOT_PHONE_NUMBER  || "6285725483343";   // nomor bot (tanpa +)
const BOT_SECRET    = process.env.BOT_WEBHOOK_SECRET || "";               // secret dari Replit
const API_BASE_URL  = process.env.API_BASE_URL       || "";               // URL API Replit kamu
const POLL_INTERVAL = 3000; // cek setiap 3 detik

if (!BOT_SECRET || !API_BASE_URL) {
  console.error("❌ Set environment variables dulu:");
  console.error("   BOT_WEBHOOK_SECRET = password secret bot");
  console.error("   API_BASE_URL       = https://xxx.pike.replit.dev");
  process.exit(1);
}

const logger = pino({ level: "silent" }); // sembunyikan log internal Baileys

// ─── API helpers ──────────────────────────────────────────────────────────────
async function fetchPending() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/bot/pending`, {
      headers: { "x-bot-secret": BOT_SECRET },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.otps ?? [];
  } catch {
    return [];
  }
}

async function confirmSent(id) {
  try {
    await fetch(`${API_BASE_URL}/api/bot/confirm`, {
      method: "POST",
      headers: {
        "x-bot-secret": BOT_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });
  } catch {}
}

// ─── Polling OTP ──────────────────────────────────────────────────────────────
function startPolling(sock) {
  console.log(`\n🔄 Memantau OTP baru setiap ${POLL_INTERVAL / 1000} detik...\n`);

  setInterval(async () => {
    const otps = await fetchPending();
    for (const otp of otps) {
      const jid = `${otp.phoneNumber.replace(/^\+/, "")}@s.whatsapp.net`;
      const message =
        `🔐 *Kode Verifikasi DLChat*\n\n` +
        `Kode OTP kamu: *${otp.code}*\n\n` +
        `Berlaku 10 menit. Jangan bagikan kode ini kepada siapa pun.`;

      try {
        await sock.sendMessage(jid, { text: message });
        await confirmSent(otp.id);
        console.log(`✅ OTP terkirim → ${otp.phoneNumber} (kode: ${otp.code})`);
      } catch (err) {
        console.error(`❌ Gagal kirim ke ${otp.phoneNumber}:`, err.message);
      }
    }
  }, POLL_INTERVAL);
}

// ─── Bot utama ────────────────────────────────────────────────────────────────
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info");
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket.default({
    version,
    logger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
  });

  // Pairing code — hanya muncul saat pertama kali (belum login)
  if (!sock.authState.creds.registered) {
    await new Promise((r) => setTimeout(r, 2000));
    const code = await sock.requestPairingCode(PHONE_NUMBER);
    const formatted = code.match(/.{1,4}/g).join("-");

    console.log("\n╔══════════════════════════════════════╗");
    console.log("║       WHATSAPP PAIRING CODE          ║");
    console.log("╠══════════════════════════════════════╣");
    console.log(`║        ${formatted.padEnd(30)}║`);
    console.log("╚══════════════════════════════════════╝\n");
    console.log("📱 Cara pairing di WhatsApp:");
    console.log(`   1. Buka WhatsApp di HP nomor +${PHONE_NUMBER}`);
    console.log("   2. Pengaturan → Perangkat Tertaut → Tautkan Perangkat");
    console.log("   3. Pilih 'Tautkan dengan nomor telepon'");
    console.log("   4. Masukkan kode di atas\n");
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Bot WhatsApp berhasil terhubung!\n");
      startPolling(sock);
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`⚠️  Koneksi terputus (${code}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      } else {
        console.log("❌ Logged out. Hapus folder auth_info/ lalu restart bot.");
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

startBot().catch(console.error);
