import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import pino from "pino";
import fetch from "node-fetch";

const PHONE_NUMBER  = process.env.BOT_PHONE_NUMBER  || "6285725483343";
const BOT_SECRET    = process.env.BOT_WEBHOOK_SECRET || "";
const API_BASE_URL  = process.env.API_BASE_URL       || "";
const POLL_INTERVAL = 3000;

const BOT_READY = !!(BOT_SECRET && API_BASE_URL);

if (!BOT_READY) {
  console.log("⚠️  API_BASE_URL atau BOT_WEBHOOK_SECRET belum diset.");
  console.log("   Bot hanya mode PAIRING — OTP polling tidak aktif.\n");
}

const logger = pino({ level: "silent" });

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

  if (!sock.authState.creds.registered) {
    console.log(`\n⏳ Meminta pairing code untuk nomor +${PHONE_NUMBER}...\n`);
    await new Promise((r) => setTimeout(r, 2000));
    try {
      const code = await sock.requestPairingCode(PHONE_NUMBER);
      const formatted = code.match(/.{1,4}/g).join("-");
      console.log("╔══════════════════════════════════════╗");
      console.log("║       WHATSAPP PAIRING CODE          ║");
      console.log("╠══════════════════════════════════════╣");
      console.log(`║   Kode: ${formatted.padEnd(29)}║`);
      console.log("╚══════════════════════════════════════╝\n");
      console.log("📱 Cara pairing di WhatsApp:");
      console.log(`   1. Buka WhatsApp di HP nomor +${PHONE_NUMBER}`);
      console.log("   2. Pengaturan → Perangkat Tertaut → Tautkan Perangkat");
      console.log("   3. Pilih 'Tautkan dengan nomor telepon'");
      console.log("   4. Masukkan kode di atas\n");
      console.log("⏳ Menunggu kamu scan / masukkan kode...\n");
    } catch (err) {
      console.error("❌ Gagal dapat pairing code:", err.message);
      console.error("   Kemungkinan koneksi ke WhatsApp diblokir di server ini.");
      console.error("   Coba set BOT_PHONE_NUMBER di env lalu restart workflow.\n");
    }
  }

  sock.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      console.log("✅ Bot WhatsApp berhasil terhubung!\n");
      if (BOT_READY) {
        startPolling(sock);
      } else {
        console.log("ℹ️  Terhubung tapi polling OTP tidak aktif.");
        console.log("   Set API_BASE_URL + BOT_WEBHOOK_SECRET lalu restart untuk aktifkan.\n");
      }
    }
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = code !== DisconnectReason.loggedOut;
      console.log(`⚠️  Koneksi terputus (kode: ${code}). Reconnect: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startBot, 5000);
      } else {
        console.log("❌ Logged out. Hapus folder auth_info/ lalu restart bot.");
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

startBot().catch((err) => {
  console.error("❌ Error fatal:", err.message);
  process.exit(1);
});
