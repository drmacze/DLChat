import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, ActivityIndicator, Switch, Platform, Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BASE_URL } from "@/utils/api";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  totalUsers: number;
  totalMessages: number;
  totalConversations: number;
  activeUsersToday: number;
  pushTokens: number;
  pendingScheduled: number;
  activeSockets: number;
  uptime: number;
  nodeVersion: string;
  memoryMB: number;
}

interface MaintenanceData {
  is_active: boolean;
  message: string;
}

interface PatchNote {
  id: string;
  version: string;
  title: string;
  is_major: boolean;
  created_at: string;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  type: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

const TABS = ["Overview", "Notifikasi", "Maintenance", "Patch Notes", "Pengumuman", "Users"] as const;
type TabName = typeof TABS[number];

const TAB_ICONS: Record<TabName, string> = {
  Overview: "bar-chart-2",
  Notifikasi: "bell",
  Maintenance: "tool",
  "Patch Notes": "file-text",
  Pengumuman: "bell",
  Users: "users",
};

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [authError, setAuthError] = useState(false);
  const [tab, setTab] = useState<TabName>("Overview");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  // Stats
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Maintenance
  const [maintenance, setMaintenance] = useState<MaintenanceData | null>(null);
  const [maintMsg, setMaintMsg] = useState("Sedang dalam pemeliharaan. Mohon tunggu sebentar.");
  const [maintSaving, setMaintSaving] = useState(false);

  // Notifications
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [pushSegment, setPushSegment] = useState<"all" | "active_7d" | "active_30d">("all");
  const [pushSending, setPushSending] = useState(false);
  const [inAppTitle, setInAppTitle] = useState("");
  const [inAppBody, setInAppBody] = useState("");

  // Patch notes
  const [patchNotes, setPatchNotes] = useState<PatchNote[]>([]);
  const [pnVersion, setPnVersion] = useState("");
  const [pnTitle, setPnTitle] = useState("");
  const [pnContent, setPnContent] = useState("");
  const [pnMajor, setPnMajor] = useState(false);

  // Announcements
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annMsg, setAnnMsg] = useState("");
  const [annType, setAnnType] = useState<"info" | "warning" | "success" | "error">("info");

  // Users
  const [users, setUsers] = useState<any[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [userTotal, setUserTotal] = useState(0);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const api = useCallback(async (path: string, opts: RequestInit = {}) => {
    const res = await fetch(`${BASE_URL}/api/admin${path}`, {
      ...opts,
      headers: {
        "x-admin-key": adminKey,
        "Content-Type": "application/json",
        ...(opts.headers ?? {}),
      },
    });
    return res;
  }, [adminKey]);

  const doLogin = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/admin/stats`, {
        headers: { "x-admin-key": keyInput },
      });
      if (res.status === 401) { setAuthError(true); return; }
      setAdminKey(keyInput);
      setAuthError(false);
    } catch {
      setAuthError(true);
    }
  };

  const loadStats = useCallback(async () => {
    if (!adminKey) return;
    setStatsLoading(true);
    try {
      const res = await api("/stats");
      const data = await res.json();
      setStats(data);
    } finally {
      setStatsLoading(false);
    }
  }, [api, adminKey]);

  const loadMaintenance = useCallback(async () => {
    if (!adminKey) return;
    const res = await api("/maintenance");
    const data = await res.json();
    setMaintenance(data);
    if (data.message) setMaintMsg(data.message);
  }, [api, adminKey]);

  const loadPatchNotes = useCallback(async () => {
    if (!adminKey) return;
    const res = await api("/patchnotes");
    setPatchNotes(await res.json());
  }, [api, adminKey]);

  const loadAnnouncements = useCallback(async () => {
    if (!adminKey) return;
    const res = await api("/announcements");
    setAnnouncements(await res.json());
  }, [api, adminKey]);

  const loadUsers = useCallback(async (q = "") => {
    if (!adminKey) return;
    const res = await api(`/users?q=${encodeURIComponent(q)}&page=1`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setUserTotal(data.total ?? 0);
  }, [api, adminKey]);

  useEffect(() => {
    if (!adminKey) return;
    loadStats();
    const today = new Date();
    setPnVersion(`${today.getFullYear()}.${today.getMonth() + 1}.${today.getDate()}`);
  }, [adminKey]);

  useEffect(() => {
    if (!adminKey) return;
    if (tab === "Overview") loadStats();
    if (tab === "Maintenance") loadMaintenance();
    if (tab === "Patch Notes") loadPatchNotes();
    if (tab === "Pengumuman") loadAnnouncements();
    if (tab === "Users") loadUsers();
  }, [tab, adminKey]);

  const saveMaintenance = async () => {
    setMaintSaving(true);
    try {
      const res = await api("/maintenance", {
        method: "POST",
        body: JSON.stringify({ isActive: !!maintenance?.is_active, message: maintMsg }),
      });
      if (res.ok) { showToast("Disimpan!"); loadMaintenance(); }
      else showToast("Gagal", false);
    } finally { setMaintSaving(false); }
  };

  const toggleMaintenance = async (val: boolean) => {
    const res = await api("/maintenance", {
      method: "POST",
      body: JSON.stringify({ isActive: val, message: maintMsg }),
    });
    if (res.ok) { showToast(val ? "Maintenance AKTIF" : "Maintenance dimatikan"); loadMaintenance(); }
  };

  const sendBroadcastPush = async () => {
    if (!pushTitle || !pushBody) { showToast("Isi semua field!", false); return; }
    setPushSending(true);
    try {
      const res = await api("/broadcast/push", {
        method: "POST",
        body: JSON.stringify({ title: pushTitle, body: pushBody, segment: pushSegment }),
      });
      const data = await res.json();
      if (data.ok) { showToast(`Terkirim ke ${data.sent} perangkat!`); setPushTitle(""); setPushBody(""); }
      else showToast("Gagal: " + (data.error ?? "unknown"), false);
    } finally { setPushSending(false); }
  };

  const sendInApp = async () => {
    if (!inAppTitle || !inAppBody) { showToast("Isi semua field!", false); return; }
    const res = await api("/broadcast/notification", {
      method: "POST",
      body: JSON.stringify({ title: inAppTitle, body: inAppBody }),
    });
    const data = await res.json();
    if (data.ok) { showToast("In-app notification terkirim!"); setInAppTitle(""); setInAppBody(""); }
    else showToast("Gagal", false);
  };

  const createPatchNote = async () => {
    if (!pnVersion || !pnTitle || !pnContent) { showToast("Isi semua field!", false); return; }
    const res = await fetch(`${BASE_URL}/api/patchnotes`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-admin-key": adminKey },
      body: JSON.stringify({ version: pnVersion, title: pnTitle, content: pnContent, isMajor: pnMajor }),
    });
    if (res.ok) { showToast("Patch note dipublish!"); setPnTitle(""); setPnContent(""); loadPatchNotes(); }
    else showToast("Gagal", false);
  };

  const deletePatchNote = async (id: string) => {
    const res = await fetch(`${BASE_URL}/api/patchnotes/${id}`, {
      method: "DELETE",
      headers: { "x-admin-key": adminKey },
    });
    if (res.ok) { showToast("Dihapus"); loadPatchNotes(); }
  };

  const createAnnouncement = async () => {
    if (!annTitle || !annMsg) { showToast("Isi semua field!", false); return; }
    const res = await api("/announcements", {
      method: "POST",
      body: JSON.stringify({ title: annTitle, message: annMsg, type: annType }),
    });
    const data = await res.json();
    if (data.id) { showToast("Pengumuman dipublish!"); setAnnTitle(""); setAnnMsg(""); loadAnnouncements(); }
    else showToast("Gagal", false);
  };

  const deleteAnnouncement = async (id: string) => {
    await api(`/announcements/${id}`, { method: "DELETE" });
    showToast("Dinonaktifkan");
    loadAnnouncements();
  };

  const fmtUptime = (s: number) => `${Math.floor(s / 3600)}j ${Math.floor((s % 3600) / 60)}m`;
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  // ─── Login Screen ─────────────────────────────────────────────────────────
  if (!adminKey) {
    return (
      <View style={[s.fill, s.loginBg, { paddingTop: insets.top }]}>
        <View style={s.loginCard}>
          <Text style={s.loginIcon}>🛠</Text>
          <Text style={s.loginTitle}>DLChat Dashboard</Text>
          <Text style={s.loginSub}>Developer & Admin Panel</Text>
          <TextInput
            style={s.loginInput}
            value={keyInput}
            onChangeText={setKeyInput}
            placeholder="Admin Key..."
            placeholderTextColor="#555"
            secureTextEntry
            onSubmitEditing={doLogin}
            autoCapitalize="none"
          />
          {authError && <Text style={s.loginErr}>Key salah. Coba lagi.</Text>}
          <TouchableOpacity style={s.loginBtn} onPress={doLogin}>
            <Text style={s.loginBtnText}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────
  return (
    <View style={[s.fill, { backgroundColor: "#0d1117" }]}>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 10 }]}>
        <Text style={s.headerTitle}>🛠 DLChat <Text style={s.headerBadge}>DEV PANEL</Text></Text>
        <TouchableOpacity onPress={loadStats}>
          <Feather name="refresh-cw" size={18} color="#58a6ff" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[s.tabBtn, tab === t && s.tabBtnActive]} onPress={() => setTab(t)}>
            <Feather name={TAB_ICONS[t] as any} size={13} color={tab === t ? "#58a6ff" : "#8b949e"} />
            <Text style={[s.tabText, tab === t && s.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView style={s.content} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ── Overview ── */}
        {tab === "Overview" && (
          <View>
            {statsLoading && <ActivityIndicator color="#58a6ff" style={{ marginVertical: 20 }} />}
            {stats && (
              <>
                <View style={s.grid}>
                  {([
                    ["👥 Users", stats.totalUsers],
                    ["💬 Pesan", stats.totalMessages],
                    ["📁 Konversasi", stats.totalConversations],
                    ["🟢 Aktif Hari Ini", stats.activeUsersToday],
                    ["📲 Push Tokens", stats.pushTokens],
                    ["⏰ Terjadwal", stats.pendingScheduled],
                    ["🔌 Socket Aktif", stats.activeSockets],
                  ] as [string, number][]).map(([label, val]) => (
                    <View key={label} style={s.statCard}>
                      <Text style={s.statVal}>{val}</Text>
                      <Text style={s.statLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.card}>
                  <Text style={s.cardTitle}>⚡ Server Info</Text>
                  {([
                    ["Node.js", stats.nodeVersion],
                    ["Uptime", fmtUptime(stats.uptime)],
                    ["RAM", `${stats.memoryMB} MB`],
                  ] as [string, string][]).map(([k, v]) => (
                    <View key={k} style={s.infoRow}>
                      <Text style={s.infoKey}>{k}</Text>
                      <Text style={s.infoVal}>{v}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Notifikasi ── */}
        {tab === "Notifikasi" && (
          <View>
            <View style={s.card}>
              <Text style={s.cardTitle}>📲 Broadcast Push</Text>
              <Text style={s.cardDesc}>Kirim push notification ke perangkat user</Text>
              <TextInput style={s.inp} value={pushTitle} onChangeText={setPushTitle} placeholder="Judul notifikasi" placeholderTextColor="#555" />
              <TextInput style={[s.inp, s.inpMulti]} value={pushBody} onChangeText={setPushBody} placeholder="Isi pesan..." placeholderTextColor="#555" multiline numberOfLines={3} />
              <Text style={s.label}>Segment:</Text>
              <View style={s.segRow}>
                {(["all", "active_7d", "active_30d"] as const).map((seg) => (
                  <TouchableOpacity key={seg} style={[s.segBtn, pushSegment === seg && s.segBtnActive]} onPress={() => setPushSegment(seg)}>
                    <Text style={[s.segText, pushSegment === seg && s.segTextActive]}>{seg === "all" ? "Semua" : seg === "active_7d" ? "7 Hari" : "30 Hari"}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[s.btn, s.btnPrimary, pushSending && { opacity: 0.6 }]} onPress={sendBroadcastPush} disabled={pushSending}>
                {pushSending ? <ActivityIndicator color="#0d1117" /> : <Text style={s.btnText}>📲 Kirim Push</Text>}
              </TouchableOpacity>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>🔔 In-App Notification</Text>
              <Text style={s.cardDesc}>Kirim ke semua user yang online via socket</Text>
              <TextInput style={s.inp} value={inAppTitle} onChangeText={setInAppTitle} placeholder="Judul" placeholderTextColor="#555" />
              <TextInput style={[s.inp, s.inpMulti]} value={inAppBody} onChangeText={setInAppBody} placeholder="Pesan..." placeholderTextColor="#555" multiline numberOfLines={3} />
              <TouchableOpacity style={[s.btn, s.btnWarning]} onPress={sendInApp}>
                <Text style={s.btnText}>🔔 Kirim In-App</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Maintenance ── */}
        {tab === "Maintenance" && (
          <View style={s.card}>
            <Text style={s.cardTitle}>🔧 Maintenance Mode</Text>
            <View style={s.toggleRow}>
              <Text style={[s.toggleLabel, { color: maintenance?.is_active ? "#f85149" : "#3fb950" }]}>
                {maintenance?.is_active ? "🔴 AKTIF — App tidak bisa digunakan user" : "🟢 OFF — App berjalan normal"}
              </Text>
              {maintenance !== null && (
                <Switch
                  value={!!maintenance.is_active}
                  onValueChange={toggleMaintenance}
                  trackColor={{ false: "#21262d", true: "#3fb950" }}
                  thumbColor="#fff"
                />
              )}
            </View>
            <Text style={s.label}>Pesan untuk User:</Text>
            <TextInput
              style={[s.inp, s.inpMulti]}
              value={maintMsg}
              onChangeText={setMaintMsg}
              placeholder="Pesan maintenance..."
              placeholderTextColor="#555"
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity style={[s.btn, s.btnWarning, maintSaving && { opacity: 0.6 }]} onPress={saveMaintenance} disabled={maintSaving}>
              {maintSaving ? <ActivityIndicator color="#0d1117" /> : <Text style={s.btnText}>💾 Simpan</Text>}
            </TouchableOpacity>
          </View>
        )}

        {/* ── Patch Notes ── */}
        {tab === "Patch Notes" && (
          <View>
            <View style={s.card}>
              <Text style={s.cardTitle}>➕ Buat Patch Note</Text>
              <View style={s.row2}>
                <TextInput style={[s.inp, { flex: 1 }]} value={pnVersion} onChangeText={setPnVersion} placeholder="Versi (1.2.3)" placeholderTextColor="#555" />
                <TextInput style={[s.inp, { flex: 2 }]} value={pnTitle} onChangeText={setPnTitle} placeholder="Judul..." placeholderTextColor="#555" />
              </View>
              <TextInput style={[s.inp, s.inpMulti]} value={pnContent} onChangeText={setPnContent} placeholder={"- Fitur baru: ...\n- Perbaikan: ..."} placeholderTextColor="#555" multiline numberOfLines={4} />
              <View style={s.toggleRow}>
                <Text style={s.label}>Major release</Text>
                <Switch value={pnMajor} onValueChange={setPnMajor} trackColor={{ false: "#21262d", true: "#3fb950" }} thumbColor="#fff" />
              </View>
              <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={createPatchNote}>
                <Text style={s.btnText}>📋 Publish Patch Note</Text>
              </TouchableOpacity>
            </View>

            {patchNotes.map((pn) => (
              <View key={pn.id} style={[s.card, s.listCard]}>
                <View style={s.row}>
                  <View style={s.versionBadge}><Text style={s.versionText}>v{pn.version}</Text></View>
                  {pn.is_major && <View style={s.majorBadge}><Text style={s.majorText}>Major</Text></View>}
                  <Text style={s.listDate}>{fmtDate(pn.created_at)}</Text>
                </View>
                <Text style={s.listTitle}>{pn.title}</Text>
                <TouchableOpacity onPress={() => deletePatchNote(pn.id)} style={s.deleteBtn}>
                  <Feather name="trash-2" size={14} color="#f85149" />
                  <Text style={s.deleteText}>Hapus</Text>
                </TouchableOpacity>
              </View>
            ))}
            {patchNotes.length === 0 && <Text style={s.empty}>Belum ada patch notes.</Text>}
          </View>
        )}

        {/* ── Announcements ── */}
        {tab === "Pengumuman" && (
          <View>
            <View style={s.card}>
              <Text style={s.cardTitle}>➕ Buat Pengumuman</Text>
              <TextInput style={s.inp} value={annTitle} onChangeText={setAnnTitle} placeholder="Judul pengumuman" placeholderTextColor="#555" />
              <TextInput style={[s.inp, s.inpMulti]} value={annMsg} onChangeText={setAnnMsg} placeholder="Isi pengumuman..." placeholderTextColor="#555" multiline numberOfLines={3} />
              <Text style={s.label}>Tipe:</Text>
              <View style={s.segRow}>
                {(["info", "warning", "success", "error"] as const).map((t) => (
                  <TouchableOpacity key={t} style={[s.segBtn, annType === t && s.segBtnActive]} onPress={() => setAnnType(t)}>
                    <Text style={[s.segText, annType === t && s.segTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={[s.btn, s.btnPrimary]} onPress={createAnnouncement}>
                <Text style={s.btnText}>📢 Publish</Text>
              </TouchableOpacity>
            </View>

            {announcements.map((ann) => (
              <View key={ann.id} style={[s.card, s.listCard]}>
                <View style={s.row}>
                  <View style={[s.typeBadge, { backgroundColor: ann.type === "warning" ? "#2e2206" : ann.type === "error" ? "#2e0d0d" : ann.type === "success" ? "#0d2e17" : "#1b3a5e" }]}>
                    <Text style={[s.typeText, { color: ann.type === "warning" ? "#d29922" : ann.type === "error" ? "#f85149" : ann.type === "success" ? "#3fb950" : "#58a6ff" }]}>{ann.type}</Text>
                  </View>
                  <Text style={s.listDate}>{ann.is_active ? "Aktif" : "Nonaktif"}</Text>
                </View>
                <Text style={s.listTitle}>{ann.title}</Text>
                <Text style={s.listDesc} numberOfLines={2}>{ann.message}</Text>
                <TouchableOpacity onPress={() => deleteAnnouncement(ann.id)} style={s.deleteBtn}>
                  <Feather name="trash-2" size={14} color="#f85149" />
                  <Text style={s.deleteText}>Nonaktifkan</Text>
                </TouchableOpacity>
              </View>
            ))}
            {announcements.length === 0 && <Text style={s.empty}>Tidak ada pengumuman aktif.</Text>}
          </View>
        )}

        {/* ── Users ── */}
        {tab === "Users" && (
          <View>
            <View style={[s.searchBar]}>
              <Feather name="search" size={16} color="#8b949e" style={{ marginRight: 8 }} />
              <TextInput
                style={[s.searchInput]}
                value={userQuery}
                onChangeText={setUserQuery}
                placeholder="Cari username / nama..."
                placeholderTextColor="#555"
                onSubmitEditing={() => loadUsers(userQuery)}
                returnKeyType="search"
              />
              <TouchableOpacity onPress={() => loadUsers(userQuery)} style={s.searchBtn}>
                <Text style={{ color: "#58a6ff", fontSize: 13, fontWeight: "600" }}>Cari</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.totalLabel}>{userTotal} total user</Text>
            {users.map((u) => (
              <View key={u.id} style={s.userRow}>
                <View style={s.userAvatar}>
                  <Text style={{ color: "#fff", fontSize: 16, fontWeight: "700" }}>
                    {(u.display_name ?? u.username ?? "?")[0].toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.userName}>{u.display_name}</Text>
                  <Text style={s.userHandle}>@{u.username ?? "—"}</Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 3 }}>
                  <View style={[s.roleBadge, { backgroundColor: u.role === "admin" ? "#2e0d0d" : "#1b3a5e" }]}>
                    <Text style={[s.roleText, { color: u.role === "admin" ? "#f85149" : "#58a6ff" }]}>{u.role}</Text>
                  </View>
                  <Text style={s.userMeta}>{u.msg_count ?? 0} pesan · {u.is_online ? "🟢" : "⚫"}</Text>
                </View>
              </View>
            ))}
            {users.length === 0 && <Text style={s.empty}>Tidak ada user ditemukan.</Text>}
          </View>
        )}

      </ScrollView>

      {/* Toast */}
      {toast && (
        <View style={[s.toast, { bottom: insets.bottom + 16, backgroundColor: toast.ok ? "#0d2e17" : "#2e0d0d", borderColor: toast.ok ? "#3fb950" : "#f85149" }]}>
          <Text style={[s.toastText, { color: toast.ok ? "#3fb950" : "#f85149" }]}>{toast.msg}</Text>
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  fill: { flex: 1 },
  loginBg: { backgroundColor: "#0d1117", alignItems: "center", justifyContent: "center", padding: 24 },
  loginCard: { backgroundColor: "#161b22", borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: "#30363d", padding: 32, width: "100%", maxWidth: 400, alignItems: "center" },
  loginIcon: { fontSize: 44, marginBottom: 12 },
  loginTitle: { color: "#e6edf3", fontSize: 22, fontWeight: "700", marginBottom: 4 },
  loginSub: { color: "#8b949e", fontSize: 13, marginBottom: 24 },
  loginInput: { width: "100%", backgroundColor: "#0d1117", borderWidth: StyleSheet.hairlineWidth, borderColor: "#30363d", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, color: "#e6edf3", fontSize: 15, marginBottom: 10 },
  loginErr: { color: "#f85149", fontSize: 13, marginBottom: 8 },
  loginBtn: { width: "100%", backgroundColor: "#58a6ff", borderRadius: 10, paddingVertical: 13, alignItems: "center" },
  loginBtnText: { color: "#0d1117", fontWeight: "700", fontSize: 15 },
  header: { backgroundColor: "#161b22", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#30363d", paddingHorizontal: 16, paddingBottom: 12, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  headerTitle: { color: "#e6edf3", fontSize: 18, fontWeight: "700" },
  headerBadge: { backgroundColor: "#3fb950", color: "#0d1117", fontSize: 10, paddingHorizontal: 6, borderRadius: 4 },
  tabBar: { backgroundColor: "#0d1117", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#30363d", flexGrow: 0 },
  tabBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: "#58a6ff" },
  tabText: { color: "#8b949e", fontSize: 13, fontWeight: "600" },
  tabTextActive: { color: "#58a6ff" },
  content: { flex: 1, backgroundColor: "#0d1117" },
  card: { backgroundColor: "#161b22", borderWidth: StyleSheet.hairlineWidth, borderColor: "#30363d", borderRadius: 12, margin: 12, padding: 16, marginBottom: 0 },
  listCard: { marginBottom: 0 },
  cardTitle: { color: "#e6edf3", fontSize: 16, fontWeight: "700", marginBottom: 4 },
  cardDesc: { color: "#8b949e", fontSize: 12, marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", padding: 8, gap: 8 },
  statCard: { backgroundColor: "#161b22", borderWidth: StyleSheet.hairlineWidth, borderColor: "#30363d", borderRadius: 10, padding: 14, minWidth: 100, flex: 1, minHeight: 70 },
  statVal: { color: "#58a6ff", fontSize: 26, fontWeight: "700", marginBottom: 4 },
  statLabel: { color: "#8b949e", fontSize: 11 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#21262d" },
  infoKey: { color: "#8b949e", fontSize: 13 },
  infoVal: { color: "#e6edf3", fontSize: 13 },
  toggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  toggleLabel: { fontSize: 13, fontWeight: "600", flex: 1, marginRight: 12 },
  label: { color: "#8b949e", fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6, marginTop: 6 },
  inp: { backgroundColor: "#0d1117", borderWidth: StyleSheet.hairlineWidth, borderColor: "#30363d", borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === "ios" ? 12 : 8, color: "#e6edf3", fontSize: 14, marginBottom: 10 },
  inpMulti: { minHeight: 80, textAlignVertical: "top" },
  segRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  segBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, backgroundColor: "#21262d", borderWidth: StyleSheet.hairlineWidth, borderColor: "#30363d" },
  segBtnActive: { backgroundColor: "#1b3a5e", borderColor: "#58a6ff" },
  segText: { color: "#8b949e", fontSize: 12, fontWeight: "600" },
  segTextActive: { color: "#58a6ff" },
  btn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnPrimary: { backgroundColor: "#58a6ff" },
  btnWarning: { backgroundColor: "#d29922" },
  btnText: { color: "#0d1117", fontWeight: "700", fontSize: 14 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  row2: { flexDirection: "row", gap: 8 },
  versionBadge: { backgroundColor: "#1b3a5e", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  versionText: { color: "#58a6ff", fontSize: 11, fontWeight: "700" },
  majorBadge: { backgroundColor: "#0d2e17", borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  majorText: { color: "#3fb950", fontSize: 11, fontWeight: "700" },
  listDate: { color: "#8b949e", fontSize: 11, marginLeft: "auto" },
  listTitle: { color: "#e6edf3", fontSize: 14, fontWeight: "600", marginBottom: 4 },
  listDesc: { color: "#8b949e", fontSize: 12, marginBottom: 6 },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", marginTop: 4 },
  deleteText: { color: "#f85149", fontSize: 12 },
  typeBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  typeText: { fontSize: 11, fontWeight: "700" },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#161b22", borderWidth: StyleSheet.hairlineWidth, borderColor: "#30363d", borderRadius: 10, margin: 12, paddingHorizontal: 12, paddingVertical: 8 },
  searchInput: { flex: 1, color: "#e6edf3", fontSize: 14 },
  searchBtn: { paddingHorizontal: 10, paddingVertical: 4 },
  totalLabel: { color: "#8b949e", fontSize: 12, paddingHorizontal: 14, marginBottom: 6 },
  userRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#161b22", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#30363d", paddingHorizontal: 14, paddingVertical: 12 },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1f6feb", alignItems: "center", justifyContent: "center" },
  userName: { color: "#e6edf3", fontSize: 14, fontWeight: "600" },
  userHandle: { color: "#8b949e", fontSize: 12, marginTop: 1 },
  roleBadge: { borderRadius: 4, paddingHorizontal: 8, paddingVertical: 2 },
  roleText: { fontSize: 10, fontWeight: "700" },
  userMeta: { color: "#8b949e", fontSize: 11 },
  empty: { color: "#8b949e", textAlign: "center", paddingVertical: 32, fontSize: 14 },
  toast: { position: "absolute", left: 16, right: 16, borderWidth: 1, borderRadius: 10, padding: 12 },
  toastText: { fontSize: 13, fontWeight: "600", textAlign: "center" },
});
