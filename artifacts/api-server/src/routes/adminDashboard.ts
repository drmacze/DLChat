import { Router, Request, Response } from "express";

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY ?? "dlchat-dev-2024";

router.get("/", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(getDashboardHtml());
});

function getDashboardHtml() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>DLChat Dev Dashboard</title>
<style>
  :root {
    --bg: #0d1117; --surface: #161b22; --surface2: #21262d;
    --border: #30363d; --text: #e6edf3; --muted: #8b949e;
    --primary: #58a6ff; --green: #3fb950; --yellow: #d29922;
    --red: #f85149; --purple: #bc8cff;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', monospace; font-size: 14px; }
  #login { display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  .login-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 40px; width: 360px; }
  .login-card h1 { font-size: 22px; margin-bottom: 6px; color: var(--primary); }
  .login-card p { color: var(--muted); margin-bottom: 24px; font-size: 13px; }
  input { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 14px; outline: none; margin-bottom: 12px; }
  input:focus { border-color: var(--primary); }
  button { cursor: pointer; border: none; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; transition: opacity .15s; }
  button:hover { opacity: .85; }
  .btn-primary { background: var(--primary); color: #0d1117; }
  .btn-danger { background: var(--red); color: #fff; }
  .btn-success { background: var(--green); color: #0d1117; }
  .btn-warning { background: var(--yellow); color: #0d1117; }
  .btn-ghost { background: var(--surface2); color: var(--text); border: 1px solid var(--border); }
  .btn-sm { padding: 5px 12px; font-size: 12px; }
  #app { display: none; height: 100vh; overflow: hidden; flex-direction: column; }
  .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 12px 24px; display: flex; align-items: center; justify-content: space-between; }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .logo { font-size: 18px; font-weight: 700; color: var(--primary); }
  .badge { background: var(--green); color: #0d1117; font-size: 10px; padding: 2px 8px; border-radius: 999px; font-weight: 700; }
  .tabs { display: flex; gap: 2px; background: var(--bg); border-bottom: 1px solid var(--border); padding: 0 24px; }
  .tab { padding: 12px 18px; cursor: pointer; font-size: 13px; font-weight: 500; color: var(--muted); border-bottom: 2px solid transparent; transition: all .15s; }
  .tab:hover { color: var(--text); }
  .tab.active { color: var(--primary); border-bottom-color: var(--primary); }
  .content { flex: 1; overflow-y: auto; padding: 24px; }
  .panel { display: none; }
  .panel.active { display: block; }
  .stats-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
  .stat-card .val { font-size: 28px; font-weight: 700; color: var(--primary); line-height: 1; margin-bottom: 6px; }
  .stat-card .lbl { font-size: 12px; color: var(--muted); }
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 16px; }
  .card h3 { font-size: 15px; font-weight: 600; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { margin-bottom: 12px; }
  .field label { display: block; font-size: 12px; color: var(--muted); margin-bottom: 5px; text-transform: uppercase; letter-spacing: .5px; }
  textarea { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 14px; outline: none; resize: vertical; min-height: 80px; font-family: inherit; }
  textarea:focus { border-color: var(--primary); }
  select { width: 100%; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; color: var(--text); font-size: 14px; outline: none; }
  select:focus { border-color: var(--primary); }
  .table { width: 100%; border-collapse: collapse; }
  .table th { text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: .5px; color: var(--muted); border-bottom: 1px solid var(--border); }
  .table td { padding: 10px 12px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
  .table tr:last-child td { border-bottom: none; }
  .table tr:hover td { background: var(--surface2); }
  .toggle { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .toggle-switch { position: relative; width: 48px; height: 26px; }
  .toggle-switch input { opacity: 0; width: 0; height: 0; }
  .toggle-slider { position: absolute; cursor: pointer; inset: 0; background: var(--surface2); border-radius: 999px; transition: .3s; border: 1px solid var(--border); }
  .toggle-slider:before { content: ""; position: absolute; width: 18px; height: 18px; left: 3px; bottom: 3px; background: var(--muted); border-radius: 50%; transition: .3s; }
  input:checked + .toggle-slider { background: var(--green); border-color: var(--green); }
  input:checked + .toggle-slider:before { transform: translateX(22px); background: #fff; }
  .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; }
  .dot-green { background: var(--green); box-shadow: 0 0 6px var(--green); }
  .dot-red { background: var(--red); box-shadow: 0 0 6px var(--red); }
  .alert { padding: 10px 16px; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }
  .alert-success { background: #0d2e17; border: 1px solid var(--green); color: var(--green); }
  .alert-error { background: #2e0d0d; border: 1px solid var(--red); color: var(--red); }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
  .pill-blue { background: #1b3a5e; color: var(--primary); }
  .pill-green { background: #0d2e17; color: var(--green); }
  .pill-yellow { background: #2e2206; color: var(--yellow); }
  .pill-red { background: #2e0d0d; color: var(--red); }
  .search-bar { display: flex; gap: 8px; margin-bottom: 16px; }
  .search-bar input { margin-bottom: 0; }
  #msgAlert { display: none; }
  .version-suggest { font-size: 11px; color: var(--muted); margin-top: 4px; }
  .mb0 { margin-bottom: 0 !important; }
  .flex { display: flex; align-items: center; gap: 8px; }
  .text-red { color: var(--red); }
  .text-green { color: var(--green); }
  .text-muted { color: var(--muted); }
  .section-title { font-size: 18px; font-weight: 700; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
</style>
</head>
<body>

<!-- LOGIN -->
<div id="login">
  <div class="login-card">
    <h1>🛠 DLChat Dashboard</h1>
    <p>Developer & Admin Panel. Masukkan admin key untuk akses.</p>
    <div class="field"><label>Admin Key</label><input type="password" id="keyInput" placeholder="••••••••" /></div>
    <button class="btn-primary" style="width:100%" onclick="doLogin()">Login</button>
    <div id="loginErr" style="color:var(--red);margin-top:10px;font-size:13px;display:none">Key salah.</div>
  </div>
</div>

<!-- APP -->
<div id="app">
  <div class="header">
    <div class="header-left">
      <span class="logo">🛠 DLChat</span>
      <span class="badge">DEV PANEL</span>
      <span id="serverStatus" style="font-size:12px;color:var(--muted)"></span>
    </div>
    <div class="flex">
      <button class="btn-ghost btn-sm" onclick="refreshAll()">↻ Refresh</button>
      <button class="btn-ghost btn-sm" onclick="doLogout()">Logout</button>
    </div>
  </div>

  <div class="tabs">
    <div class="tab active" onclick="switchTab('overview')">📊 Overview</div>
    <div class="tab" onclick="switchTab('patchnotes')">📋 Patch Notes</div>
    <div class="tab" onclick="switchTab('notifications')">🔔 Notifikasi</div>
    <div class="tab" onclick="switchTab('maintenance')">🔧 Maintenance</div>
    <div class="tab" onclick="switchTab('announcements')">📢 Pengumuman</div>
    <div class="tab" onclick="switchTab('scheduled')">⏰ Terjadwal</div>
    <div class="tab" onclick="switchTab('users')">👥 Users</div>
  </div>

  <div class="content">

    <!-- OVERVIEW -->
    <div class="panel active" id="panel-overview">
      <div class="section-title">📊 Server Overview</div>
      <div class="stats-grid" id="statsGrid">
        <div class="stat-card"><div class="val">—</div><div class="lbl">Total Users</div></div>
      </div>
      <div class="card">
        <h3>⚡ Server Info</h3>
        <table class="table" id="serverInfoTable"></table>
      </div>
    </div>

    <!-- PATCH NOTES -->
    <div class="panel" id="panel-patchnotes">
      <div class="section-title">📋 Patch Notes</div>
      <div class="card">
        <h3>➕ Buat Patch Note Baru</h3>
        <div class="form-row">
          <div class="field"><label>Versi</label><input type="text" id="pnVersion" placeholder="1.2.3" /></div>
          <div class="field"><label>Judul</label><input type="text" id="pnTitle" placeholder="Update keren!" /></div>
        </div>
        <div class="field"><label>Konten (Markdown didukung)</label><textarea id="pnContent" placeholder="- Fitur baru: ...&#10;- Perbaikan: ...&#10;- Perubahan: ..." style="min-height:120px"></textarea></div>
        <div class="flex">
          <label style="font-size:13px;color:var(--muted);display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="pnMajor" style="width:auto;margin:0" /> Major release
          </label>
          <button class="btn-primary btn-sm" onclick="createPatchNote()">Publish Patch Note</button>
        </div>
        <div class="version-suggest" id="versionSuggest"></div>
      </div>
      <div class="card">
        <h3>📋 Semua Patch Notes</h3>
        <table class="table">
          <thead><tr><th>Versi</th><th>Judul</th><th>Tipe</th><th>Tanggal</th><th></th></tr></thead>
          <tbody id="patchNotesList"></tbody>
        </table>
      </div>
    </div>

    <!-- NOTIFIKASI -->
    <div class="panel" id="panel-notifications">
      <div class="section-title">🔔 Kirim Notifikasi</div>
      <div class="card">
        <h3>📲 Broadcast Push Notification</h3>
        <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Kirim push notification ke perangkat user (perlu expo push token terdaftar)</p>
        <div class="field"><label>Judul</label><input type="text" id="pushTitle" placeholder="Judul notifikasi" /></div>
        <div class="field"><label>Pesan</label><textarea id="pushBody" placeholder="Isi pesan notifikasi..."></textarea></div>
        <div class="field"><label>Segment</label>
          <select id="pushSegment">
            <option value="all">Semua User</option>
            <option value="active_7d">Aktif 7 hari terakhir</option>
            <option value="active_30d">Aktif 30 hari terakhir</option>
          </select>
        </div>
        <button class="btn-primary" onclick="sendBroadcastPush()">📲 Kirim Push</button>
        <div id="pushResult" style="margin-top:10px;font-size:13px;color:var(--muted)"></div>
      </div>
      <div class="card">
        <h3>🔔 In-App Notification (Socket)</h3>
        <p style="font-size:12px;color:var(--muted);margin-bottom:14px">Kirim notifikasi ke semua user yang sedang online via socket realtime</p>
        <div class="field"><label>Judul</label><input type="text" id="inAppTitle" placeholder="Judul" /></div>
        <div class="field"><label>Pesan</label><textarea id="inAppBody" placeholder="Pesan..."></textarea></div>
        <button class="btn-warning" onclick="sendInAppNotif()">🔔 Kirim In-App</button>
        <div id="inAppResult" style="margin-top:10px;font-size:13px;color:var(--muted)"></div>
      </div>
    </div>

    <!-- MAINTENANCE -->
    <div class="panel" id="panel-maintenance">
      <div class="section-title">🔧 Maintenance Mode</div>
      <div class="card">
        <div id="maintenanceStatus" style="margin-bottom:16px"></div>
        <div class="toggle">
          <label class="toggle-switch">
            <input type="checkbox" id="maintenanceToggle" onchange="toggleMaintenance()" />
            <span class="toggle-slider"></span>
          </label>
          <span style="font-size:14px;font-weight:600" id="maintenanceLabel">Maintenance OFF</span>
        </div>
        <div class="field"><label>Pesan untuk User</label><textarea id="maintenanceMsg" placeholder="Sedang dalam pemeliharaan. Mohon tunggu sebentar.">Sedang dalam pemeliharaan. Mohon tunggu sebentar.</textarea></div>
        <div class="field"><label>Jadwal Selesai (opsional)</label><input type="datetime-local" id="maintenanceEnd" /></div>
        <button class="btn-warning" onclick="saveMaintenance()">💾 Simpan Pengaturan</button>
        <div id="maintenanceResult" style="margin-top:10px;font-size:13px"></div>
      </div>
    </div>

    <!-- ANNOUNCEMENTS -->
    <div class="panel" id="panel-announcements">
      <div class="section-title">📢 Pengumuman / Popup App</div>
      <div class="card">
        <h3>➕ Buat Pengumuman</h3>
        <div class="field"><label>Judul</label><input type="text" id="annTitle" placeholder="Judul pengumuman" /></div>
        <div class="field"><label>Pesan</label><textarea id="annMessage" placeholder="Isi pengumuman..."></textarea></div>
        <div class="form-row">
          <div class="field"><label>Tipe</label>
            <select id="annType">
              <option value="info">Info</option>
              <option value="warning">Peringatan</option>
              <option value="success">Sukses</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div class="field"><label>Berlaku Hingga</label><input type="datetime-local" id="annExpires" /></div>
        </div>
        <button class="btn-primary" onclick="createAnnouncement()">📢 Publish Pengumuman</button>
        <div id="annResult" style="margin-top:10px;font-size:13px;color:var(--muted)"></div>
      </div>
      <div class="card">
        <h3>📋 Pengumuman Aktif</h3>
        <table class="table">
          <thead><tr><th>Judul</th><th>Tipe</th><th>Aktif</th><th>Kadaluarsa</th><th></th></tr></thead>
          <tbody id="announcementsList"></tbody>
        </table>
      </div>
    </div>

    <!-- SCHEDULED -->
    <div class="panel" id="panel-scheduled">
      <div class="section-title">⏰ Pesan Terjadwal</div>
      <div class="card">
        <p style="font-size:13px;color:var(--muted);margin-bottom:16px">Semua pesan yang dijadwalkan oleh user dan belum terkirim.</p>
        <table class="table">
          <thead><tr><th>Pengirim</th><th>Percakapan</th><th>Isi</th><th>Kirim Pada</th><th></th></tr></thead>
          <tbody id="scheduledList"></tbody>
        </table>
      </div>
    </div>

    <!-- USERS -->
    <div class="panel" id="panel-users">
      <div class="section-title">👥 Manajemen Users</div>
      <div class="search-bar">
        <input type="text" id="userSearch" placeholder="Cari username atau display name..." style="flex:1" />
        <button class="btn-ghost" onclick="searchUsers()">Cari</button>
      </div>
      <div class="card" style="padding:0;overflow:hidden">
        <table class="table">
          <thead><tr><th>Username</th><th>Display Name</th><th>Role</th><th>Status</th><th>Pesan</th><th>Bergabung</th></tr></thead>
          <tbody id="usersList"></tbody>
        </table>
        <div id="usersPage" style="padding:12px;display:flex;gap:8px;justify-content:flex-end"></div>
      </div>
    </div>

  </div>
</div>

<div id="msgAlert" class="alert" style="position:fixed;bottom:20px;right:20px;z-index:9999;min-width:260px;display:none"></div>

<script>
let adminKey = '';
let usersCurrentPage = 1;

function doLogin() {
  const k = document.getElementById('keyInput').value.trim();
  if (!k) return;
  adminKey = k;
  fetch('/api/admin/stats', { headers: { 'x-admin-key': k } })
    .then(r => {
      if (r.status === 401) { document.getElementById('loginErr').style.display='block'; adminKey=''; return; }
      document.getElementById('login').style.display = 'none';
      document.getElementById('app').style.display = 'flex';
      sessionStorage.setItem('adminKey', k);
      refreshAll();
    });
}
document.getElementById('keyInput').addEventListener('keydown', e => { if (e.key==='Enter') doLogin(); });

function doLogout() { sessionStorage.removeItem('adminKey'); adminKey=''; location.reload(); }

const saved = sessionStorage.getItem('adminKey');
if (saved) { adminKey = saved; doLogin(); }

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', ['overview','patchnotes','notifications','maintenance','announcements','scheduled','users'][i]===tab));
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.id==='panel-'+tab));
  if (tab==='patchnotes') loadPatchNotes();
  if (tab==='maintenance') loadMaintenance();
  if (tab==='announcements') loadAnnouncements();
  if (tab==='scheduled') loadScheduled();
  if (tab==='users') { usersCurrentPage=1; loadUsers(); }
}

async function api(path, opts={}) {
  const r = await fetch('/api/admin'+path, { ...opts, headers: { 'x-admin-key': adminKey, 'Content-Type': 'application/json', ...(opts.headers||{}) } });
  return r.json();
}

function toast(msg, ok=true) {
  const el = document.getElementById('msgAlert');
  el.className = 'alert ' + (ok ? 'alert-success' : 'alert-error');
  el.textContent = msg;
  el.style.display = 'block';
  setTimeout(() => el.style.display='none', 3500);
}

function fmt(d) { return d ? new Date(d).toLocaleString('id-ID') : '—'; }
function fmtAgo(d) {
  if (!d) return '—';
  const s = (Date.now() - new Date(d).getTime()) / 1000;
  if (s < 60) return Math.round(s)+'d lalu';
  if (s < 3600) return Math.round(s/60)+'m lalu';
  if (s < 86400) return Math.round(s/3600)+'j lalu';
  return Math.round(s/86400)+'hr lalu';
}

async function refreshAll() {
  const data = await api('/stats');
  const grid = document.getElementById('statsGrid');
  const stats = [
    ['Total Users', data.totalUsers, 'primary'],
    ['Total Pesan', data.totalMessages, 'primary'],
    ['Percakapan', data.totalConversations, 'primary'],
    ['Aktif Hari Ini', data.activeUsersToday, 'primary'],
    ['Push Tokens', data.pushTokens, 'primary'],
    ['Terjadwal', data.pendingScheduled, 'primary'],
    ['Socket Aktif', data.activeSockets, 'primary'],
  ];
  grid.innerHTML = stats.map(([l,v]) => \`<div class="stat-card"><div class="val">\${v??'—'}</div><div class="lbl">\${l}</div></div>\`).join('');
  const info = document.getElementById('serverInfoTable');
  const upt = data.uptime ? \`\${Math.floor(data.uptime/3600)}j \${Math.floor((data.uptime%3600)/60)}m\` : '—';
  info.innerHTML = \`
    <tr><td class="text-muted">Node.js</td><td>\${data.nodeVersion||'—'}</td></tr>
    <tr><td class="text-muted">Uptime</td><td>\${upt}</td></tr>
    <tr><td class="text-muted">RAM</td><td>\${data.memoryMB||'—'} MB</td></tr>
    <tr><td class="text-muted">Socket Aktif</td><td>\${data.activeSockets||0}</td></tr>
  \`;
  document.getElementById('serverStatus').textContent = '● Online · ' + upt + ' uptime';
  suggestVersion();
}

function suggestVersion() {
  const d = new Date();
  const v = d.getFullYear() + '.' + (d.getMonth()+1) + '.' + d.getDate();
  document.getElementById('versionSuggest').textContent = 'Saran versi hari ini: ' + v;
  if (!document.getElementById('pnVersion').value) document.getElementById('pnVersion').value = v;
}

async function loadPatchNotes() {
  const data = await api('/patchnotes');
  const tbody = document.getElementById('patchNotesList');
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="padding:20px;text-align:center">Belum ada patch notes.</td></tr>'; return; }
  tbody.innerHTML = data.map(n => \`
    <tr>
      <td><span class="pill pill-blue">v\${n.version}</span></td>
      <td>\${n.title}</td>
      <td>\${n.is_major ? '<span class="pill pill-green">Major</span>' : '<span class="pill" style="background:var(--surface2);color:var(--muted)">Minor</span>'}</td>
      <td class="text-muted">\${fmt(n.created_at)}</td>
      <td><button class="btn-danger btn-sm" onclick="deletePatchNote('\${n.id}')">Hapus</button></td>
    </tr>
  \`).join('');
}

async function createPatchNote() {
  const version = document.getElementById('pnVersion').value.trim();
  const title = document.getElementById('pnTitle').value.trim();
  const content = document.getElementById('pnContent').value.trim();
  const isMajor = document.getElementById('pnMajor').checked;
  if (!version || !title || !content) { toast('Isi semua field!', false); return; }
  const r = await fetch('/api/patchnotes', { method:'POST', headers:{'Content-Type':'application/json','x-admin-key':adminKey}, body:JSON.stringify({version,title,content,isMajor}) });
  if (r.ok) { toast('Patch note berhasil dipublish!'); document.getElementById('pnTitle').value=''; document.getElementById('pnContent').value=''; loadPatchNotes(); }
  else { toast('Gagal publish.', false); }
}

async function deletePatchNote(id) {
  if (!confirm('Hapus patch note ini?')) return;
  const r = await fetch('/api/patchnotes/'+id, { method:'DELETE', headers:{'x-admin-key':adminKey} });
  if (r.ok) { toast('Dihapus.'); loadPatchNotes(); }
}

async function sendBroadcastPush() {
  const title = document.getElementById('pushTitle').value.trim();
  const body = document.getElementById('pushBody').value.trim();
  const segment = document.getElementById('pushSegment').value;
  if (!title || !body) { toast('Isi title dan pesan!', false); return; }
  document.getElementById('pushResult').textContent = 'Mengirim...';
  const data = await api('/broadcast/push', { method:'POST', body:JSON.stringify({title,body,segment}) });
  document.getElementById('pushResult').textContent = '';
  if (data.ok) toast(\`Terkirim ke \${data.sent} perangkat!\`);
  else toast('Gagal: ' + (data.error||'unknown'), false);
}

async function sendInAppNotif() {
  const title = document.getElementById('inAppTitle').value.trim();
  const body = document.getElementById('inAppBody').value.trim();
  if (!title || !body) { toast('Isi title dan pesan!', false); return; }
  const data = await api('/broadcast/notification', { method:'POST', body:JSON.stringify({title,body}) });
  if (data.ok) toast('In-app notification terkirim ke semua user!');
  else toast('Gagal.', false);
}

async function loadMaintenance() {
  const data = await api('/maintenance');
  document.getElementById('maintenanceToggle').checked = data.is_active;
  document.getElementById('maintenanceLabel').textContent = data.is_active ? '🔴 Maintenance AKTIF' : '🟢 Maintenance OFF';
  if (data.message) document.getElementById('maintenanceMsg').value = data.message;
  const st = document.getElementById('maintenanceStatus');
  st.innerHTML = data.is_active
    ? '<div class="alert alert-error">⚠️ Maintenance mode sedang aktif. App tidak bisa digunakan user.</div>'
    : '<div class="alert alert-success">✅ App berjalan normal.</div>';
}

function toggleMaintenance() {
  const active = document.getElementById('maintenanceToggle').checked;
  document.getElementById('maintenanceLabel').textContent = active ? '🔴 Maintenance AKTIF' : '🟢 Maintenance OFF';
}

async function saveMaintenance() {
  const isActive = document.getElementById('maintenanceToggle').checked;
  const message = document.getElementById('maintenanceMsg').value.trim();
  const end = document.getElementById('maintenanceEnd').value;
  const data = await api('/maintenance', { method:'POST', body:JSON.stringify({ isActive, message, scheduledEndAt: end||undefined }) });
  if (data.ok) { toast(isActive ? 'Maintenance mode diaktifkan!' : 'Maintenance mode dinonaktifkan!'); loadMaintenance(); }
  else toast('Gagal.', false);
}

async function loadAnnouncements() {
  const data = await api('/announcements');
  const tbody = document.getElementById('announcementsList');
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="padding:20px;text-align:center">Tidak ada pengumuman.</td></tr>'; return; }
  const types = { info:'pill-blue', warning:'pill-yellow', success:'pill-green', error:'pill-red' };
  tbody.innerHTML = data.map(a => \`
    <tr>
      <td>\${a.title}</td>
      <td><span class="pill \${types[a.type]||'pill-blue'}">\${a.type}</span></td>
      <td>\${a.is_active ? '<span class="dot-green status-dot"></span>Aktif' : '<span class="dot-red status-dot"></span>Nonaktif'}</td>
      <td class="text-muted">\${a.expires_at ? fmt(a.expires_at) : 'Tidak ada'}</td>
      <td><button class="btn-danger btn-sm" onclick="deleteAnnouncement('\${a.id}')">Hapus</button></td>
    </tr>
  \`).join('');
}

async function createAnnouncement() {
  const title = document.getElementById('annTitle').value.trim();
  const message = document.getElementById('annMessage').value.trim();
  const type = document.getElementById('annType').value;
  const expires = document.getElementById('annExpires').value;
  if (!title || !message) { toast('Isi title dan pesan!', false); return; }
  const data = await api('/announcements', { method:'POST', body:JSON.stringify({title,message,type,expiresAt:expires||undefined}) });
  if (data.id) { toast('Pengumuman dipublish!'); document.getElementById('annTitle').value=''; document.getElementById('annMessage').value=''; loadAnnouncements(); }
  else toast('Gagal.', false);
}

async function deleteAnnouncement(id) {
  if (!confirm('Nonaktifkan pengumuman ini?')) return;
  const data = await api('/announcements/'+id, { method:'DELETE' });
  if (data.ok) { toast('Dinonaktifkan.'); loadAnnouncements(); }
}

async function loadScheduled() {
  const data = await api('/scheduled');
  const tbody = document.getElementById('scheduledList');
  if (!data.length) { tbody.innerHTML = '<tr><td colspan="5" class="text-muted" style="padding:20px;text-align:center">Tidak ada pesan terjadwal.</td></tr>'; return; }
  tbody.innerHTML = data.map(s => \`
    <tr>
      <td>\${s.sender_name||'?'}</td>
      <td class="text-muted">\${s.conv_title||s.conversation_id.slice(0,8)}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${s.content}</td>
      <td>\${fmt(s.send_at)}</td>
      <td><button class="btn-danger btn-sm" onclick="cancelScheduled('\${s.id}')">Batal</button></td>
    </tr>
  \`).join('');
}

async function cancelScheduled(id) {
  if (!confirm('Batalkan pesan terjadwal ini?')) return;
  const data = await api('/scheduled/'+id, { method:'DELETE' });
  if (data.ok) { toast('Dibatalkan.'); loadScheduled(); }
}

let usersCurrentQ = '';
async function searchUsers() { usersCurrentPage=1; usersCurrentQ=document.getElementById('userSearch').value; loadUsers(); }
document.getElementById('userSearch').addEventListener('keydown', e => { if(e.key==='Enter') searchUsers(); });

async function loadUsers(page=usersCurrentPage) {
  usersCurrentPage = page;
  const q = usersCurrentQ || document.getElementById('userSearch').value;
  const data = await api('/users?q='+encodeURIComponent(q)+'&page='+page);
  const tbody = document.getElementById('usersList');
  if (!data.users?.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-muted" style="padding:20px;text-align:center">Tidak ada user.</td></tr>'; return; }
  const roles = { admin:'pill-red', moderator:'pill-yellow', user:'pill-blue' };
  tbody.innerHTML = data.users.map(u => \`
    <tr>
      <td>@\${u.username||'—'}</td>
      <td>\${u.display_name}</td>
      <td><span class="pill \${roles[u.role]||'pill-blue'}">\${u.role}</span></td>
      <td>\${u.is_online ? '<span class="dot-green status-dot"></span>Online' : '<span class="text-muted">' + fmtAgo(u.last_seen_at) + '</span>'}</td>
      <td>\${u.msg_count}</td>
      <td class="text-muted">\${fmt(u.created_at)}</td>
    </tr>
  \`).join('');
  const pages = document.getElementById('usersPage');
  const total = Math.ceil((data.total||0)/20);
  if (total <= 1) { pages.innerHTML=''; return; }
  pages.innerHTML = (page>1 ? \`<button class="btn-ghost btn-sm" onclick="loadUsers(\${page-1})">← Prev</button>\` : '') +
    \`<span class="text-muted" style="font-size:12px">Halaman \${page}/\${total}</span>\` +
    (page<total ? \`<button class="btn-ghost btn-sm" onclick="loadUsers(\${page+1})">Next →</button>\` : '');
}

// Auto refresh stats every 30s
setInterval(() => { if(adminKey && document.getElementById('panel-overview').classList.contains('active')) refreshAll(); }, 30000);
</script>
</body>
</html>`;
}

export default router;
