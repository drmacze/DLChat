import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger.js";
import { sendPushToUsers } from "../lib/pushNotifications.js";

const router = Router();

const ADMIN_KEY = process.env.ADMIN_KEY ?? "dlchat-dev-2024";

function checkAdmin(req: Request, res: Response): boolean {
  const key = (req.headers["x-admin-key"] as string) ?? req.query["k"];
  if (key !== ADMIN_KEY) {
    res.status(401).json({ error: "Unauthorized — wrong admin key" });
    return false;
  }
  return true;
}

// ─── Admin Dashboard HTML ────────────────────────────────────────────────────
router.get("/", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>DLChat — Dev Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0f1117;--surface:#1a1d27;--card:#21253a;--border:#2e3347;--accent:#6c63ff;--accent2:#00d9ff;--green:#00e676;--red:#ff4757;--yellow:#ffd32a;--text:#e8eaf6;--muted:#8892b0;--font:'Segoe UI',system-ui,sans-serif}
body{background:var(--bg);color:var(--text);font-family:var(--font);min-height:100vh;display:flex;flex-direction:column}
#login{display:flex;align-items:center;justify-content:center;flex:1;padding:20px}
#app{display:none;flex:1;flex-direction:column}
.login-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px;max-width:400px;width:100%;text-align:center}
.login-card h1{font-size:28px;font-weight:700;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px}
.login-card p{color:var(--muted);margin-bottom:28px;font-size:14px}
input{width:100%;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:15px;outline:none;transition:.2s}
input:focus{border-color:var(--accent)}
.btn{display:inline-flex;align-items:center;gap:8px;padding:11px 20px;border-radius:10px;border:none;font-size:14px;font-weight:600;cursor:pointer;transition:.2s}
.btn-primary{background:var(--accent);color:#fff;width:100%;margin-top:14px;justify-content:center;font-size:15px}
.btn-primary:hover{background:#574fd6}
.btn-sm{padding:7px 14px;font-size:13px}
.btn-green{background:var(--green);color:#000}
.btn-green:hover{opacity:.85}
.btn-red{background:var(--red);color:#fff}
.btn-red:hover{opacity:.85}
.btn-outline{background:transparent;border:1px solid var(--border);color:var(--text)}
.btn-outline:hover{border-color:var(--accent);color:var(--accent)}
.btn-yellow{background:var(--yellow);color:#000}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;display:flex;align-items:center;gap:16px;height:60px;flex-shrink:0}
.topbar .logo{font-size:20px;font-weight:800;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.topbar .badge{background:var(--accent);color:#fff;font-size:11px;padding:2px 8px;border-radius:20px;font-weight:600}
.topbar .spacer{flex:1}
.topbar .user-chip{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:13px;cursor:pointer}
.topbar .user-chip:hover{color:var(--text)}
.nav{background:var(--surface);border-bottom:1px solid var(--border);padding:0 24px;display:flex;gap:4px;overflow-x:auto}
.nav-btn{padding:14px 16px;font-size:14px;font-weight:500;border:none;background:none;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:.15s}
.nav-btn.active{color:var(--accent);border-bottom-color:var(--accent)}
.nav-btn:hover{color:var(--text)}
.content{padding:24px;flex:1;overflow-y:auto;max-width:1200px;width:100%;margin:0 auto}
.section{display:none}.section.active{display:block}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px;margin-bottom:24px}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px}
.stat-card .label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
.stat-card .value{font-size:32px;font-weight:800;line-height:1}
.stat-card .sub{font-size:12px;color:var(--muted);margin-top:6px}
.stat-card.accent .value{color:var(--accent)}
.stat-card.green .value{color:var(--green)}
.stat-card.blue .value{color:var(--accent2)}
.stat-card.yellow .value{color:var(--yellow)}
.card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
.card h3{font-size:16px;font-weight:700;margin-bottom:16px;display:flex;align-items:center;gap:8px}
.form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.form-group{display:flex;flex-direction:column;gap:6px;margin-bottom:14px}
.form-group label{font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}
textarea{width:100%;padding:12px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;font-family:inherit;resize:vertical;min-height:90px;outline:none;transition:.2s}
textarea:focus{border-color:var(--accent)}
select{width:100%;padding:11px 14px;background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;outline:none}
.patch-list{display:flex;flex-direction:column;gap:10px}
.patch-item{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px 18px;display:flex;align-items:flex-start;gap:14px}
.patch-version{background:var(--accent);color:#fff;font-size:11px;padding:3px 10px;border-radius:20px;font-weight:700;white-space:nowrap;margin-top:2px}
.patch-version.major{background:var(--green);color:#000}
.patch-info{flex:1}
.patch-title{font-size:15px;font-weight:600;margin-bottom:4px}
.patch-date{font-size:12px;color:var(--muted)}
.patch-content{font-size:13px;color:var(--muted);margin-top:6px;white-space:pre-wrap}
.patch-actions{display:flex;gap:6px;flex-shrink:0}
.users-list{display:flex;flex-direction:column;gap:8px}
.user-item{background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:12px 16px;display:flex;align-items:center;gap:12px}
.user-avatar{width:36px;height:36px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;flex-shrink:0}
.user-name{font-size:14px;font-weight:600}
.user-meta{font-size:12px;color:var(--muted)}
.badge-online{width:8px;height:8px;border-radius:50%;background:var(--green);display:inline-block;margin-left:4px}
.maintenance-box{text-align:center;padding:30px}
.maint-status{font-size:48px;font-weight:900;margin-bottom:12px}
.maint-status.on{color:var(--red)}
.maint-status.off{color:var(--green)}
.tag{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600}
.tag-green{background:rgba(0,230,118,.15);color:var(--green)}
.tag-red{background:rgba(255,71,87,.15);color:var(--red)}
.tag-blue{background:rgba(0,217,255,.15);color:var(--accent2)}
.toast{position:fixed;bottom:24px;right:24px;background:var(--card);border:1px solid var(--border);border-radius:12px;padding:12px 20px;font-size:14px;box-shadow:0 8px 32px rgba(0,0,0,.4);z-index:999;animation:slideIn .3s ease;display:flex;align-items:center;gap:8px}
.toast.success{border-left:4px solid var(--green)}
.toast.error{border-left:4px solid var(--red)}
@keyframes slideIn{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
.empty{text-align:center;padding:40px;color:var(--muted);font-size:14px}
.divider{height:1px;background:var(--border);margin:20px 0}
.loading{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin .6s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.push-preview{background:var(--surface);border-radius:10px;padding:14px;margin-top:12px;border-left:4px solid var(--accent2)}
.push-preview .p-title{font-weight:700;margin-bottom:4px}
.push-preview .p-body{font-size:13px;color:var(--muted)}
.checkbox-row{display:flex;align-items:center;gap:8px;margin-bottom:14px;cursor:pointer;font-size:13px;color:var(--muted)}
.checkbox-row input[type=checkbox]{width:16px;height:16px;accent-color:var(--accent)}
.section-title{font-size:22px;font-weight:800;margin-bottom:6px}
.section-sub{font-size:13px;color:var(--muted);margin-bottom:20px}
</style>
</head>
<body>

<div id="login">
  <div class="login-card">
    <h1>⚡ DLChat</h1>
    <p>Developer Dashboard — restricted access</p>
    <div class="form-group" style="text-align:left">
      <label>Admin Key</label>
      <input type="password" id="keyInput" placeholder="Enter admin key..." onkeydown="if(event.key==='Enter')doLogin()">
    </div>
    <button class="btn btn-primary" onclick="doLogin()">🔑 Sign In</button>
    <p style="margin-top:16px;font-size:12px;color:var(--muted)">Default key: <code>dlchat-dev-2024</code><br>Override with ADMIN_KEY env var</p>
  </div>
</div>

<div id="app">
  <div class="topbar">
    <span class="logo">DLChat</span>
    <span class="badge">DEV</span>
    <div class="spacer"></div>
    <div class="user-chip" onclick="logout()">🚪 Logout</div>
  </div>
  <div class="nav">
    <button class="nav-btn active" onclick="setTab('overview',this)">📊 Overview</button>
    <button class="nav-btn" onclick="setTab('patchnotes',this)">📝 Patch Notes</button>
    <button class="nav-btn" onclick="setTab('push',this)">🔔 Push Notify</button>
    <button class="nav-btn" onclick="setTab('maintenance',this)">🛠 Maintenance</button>
    <button class="nav-btn" onclick="setTab('users',this)">👥 Users</button>
    <button class="nav-btn" onclick="setTab('config',this)">⚙️ Config</button>
  </div>
  <div class="content">

    <!-- OVERVIEW -->
    <div id="sec-overview" class="section active">
      <div class="section-title">Dashboard Overview</div>
      <div class="section-sub" id="overviewTime">Loading stats...</div>
      <div class="grid" id="statsGrid">
        <div class="stat-card accent"><div class="label">Total Users</div><div class="value" id="s-users">—</div></div>
        <div class="stat-card green"><div class="label">Online Now</div><div class="value" id="s-online">—</div></div>
        <div class="stat-card blue"><div class="label">Messages Today</div><div class="value" id="s-msgs">—</div></div>
        <div class="stat-card yellow"><div class="label">Active Polls</div><div class="value" id="s-polls">—</div></div>
        <div class="stat-card accent"><div class="label">Total Conversations</div><div class="value" id="s-convs">—</div></div>
        <div class="stat-card green"><div class="label">Push Tokens</div><div class="value" id="s-tokens">—</div></div>
      </div>
      <div class="card">
        <h3>🕐 Recent Activity</h3>
        <div id="recentUsers" class="users-list"><div class="loading"></div></div>
      </div>
    </div>

    <!-- PATCH NOTES -->
    <div id="sec-patchnotes" class="section">
      <div class="section-title">Patch Notes</div>
      <div class="section-sub">Manage app update notes shown to users</div>
      <div class="card">
        <h3>➕ Create New Patch Note</h3>
        <div class="form-row">
          <div class="form-group"><label>Version</label><input id="pn-version" placeholder="e.g. 2.1.0"></div>
          <div class="form-group"><label>Title</label><input id="pn-title" placeholder="e.g. Major Update — New Features"></div>
        </div>
        <div class="form-group"><label>Content (markdown supported)</label><textarea id="pn-content" rows="5" placeholder="• New feature 1&#10;• Bug fix 2&#10;• Improvement 3"></textarea></div>
        <label class="checkbox-row"><input type="checkbox" id="pn-major"> Mark as major release</label>
        <button class="btn btn-green btn-sm" onclick="createPatch()">📤 Publish Patch Note</button>
      </div>
      <div class="card">
        <h3>📋 Published Notes</h3>
        <div id="patchList">Loading...</div>
      </div>
    </div>

    <!-- PUSH NOTIFICATIONS -->
    <div id="sec-push" class="section">
      <div class="section-title">Push Notifications</div>
      <div class="section-sub">Send real-time notifications to all users or specific targets</div>
      <div class="card">
        <h3>📢 Broadcast to All Users</h3>
        <div class="form-row">
          <div class="form-group"><label>Title</label><input id="push-title" placeholder="e.g. DLChat Update" oninput="updatePreview()"></div>
          <div class="form-group"><label>Target</label>
            <select id="push-target">
              <option value="all">All Users</option>
              <option value="online">Online Users Only</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Message Body</label><textarea id="push-body" rows="3" placeholder="Write your notification message..." oninput="updatePreview()"></textarea></div>
        <div class="form-group"><label>Extra Data (JSON, optional)</label><input id="push-data" placeholder='{"type":"announcement"}'></div>
        <div class="push-preview">
          <div class="p-title" id="prev-title">DLChat</div>
          <div class="p-body" id="prev-body">Your notification preview will appear here</div>
        </div>
        <button class="btn btn-primary btn-sm" style="margin-top:14px" onclick="sendPush()">🚀 Send Notification</button>
      </div>
    </div>

    <!-- MAINTENANCE -->
    <div id="sec-maintenance" class="section">
      <div class="section-title">Maintenance Mode</div>
      <div class="section-sub">When enabled, all API calls return 503. Use during critical updates.</div>
      <div class="card">
        <div class="maintenance-box">
          <div class="maint-status" id="maintStatus">—</div>
          <p style="color:var(--muted);margin-bottom:20px" id="maintDesc">Loading...</p>
          <div style="display:flex;gap:10px;justify-content:center">
            <button class="btn btn-red" onclick="setMaintenance(true)">🔴 Enable Maintenance</button>
            <button class="btn btn-green" onclick="setMaintenance(false)">🟢 Disable Maintenance</button>
          </div>
        </div>
        <div class="divider"></div>
        <div class="form-group"><label>Maintenance Message (shown to users)</label>
          <input id="maint-msg" placeholder="e.g. We'll be back shortly. Please try again in a few minutes.">
        </div>
        <button class="btn btn-outline btn-sm" onclick="saveMaintMessage()">💾 Save Message</button>
      </div>
    </div>

    <!-- USERS -->
    <div id="sec-users" class="section">
      <div class="section-title">User Management</div>
      <div class="section-sub">View registered users and their activity</div>
      <div class="card">
        <h3 style="margin-bottom:14px">👥 All Users <span id="userCount" style="font-size:13px;color:var(--muted)"></span></h3>
        <input id="userSearch" placeholder="Search by name or username..." style="margin-bottom:14px" oninput="filterUsers()">
        <div id="usersList" class="users-list">Loading...</div>
      </div>
    </div>

    <!-- CONFIG -->
    <div id="sec-config" class="section">
      <div class="section-title">Configuration</div>
      <div class="section-sub">Server and app settings</div>
      <div class="card">
        <h3>🔑 Admin Key</h3>
        <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Current key is set via <code>ADMIN_KEY</code> environment variable. Default: <code>dlchat-dev-2024</code></p>
        <div class="form-group"><label>Your Session Key</label>
          <input type="password" id="keyDisplay" readonly>
        </div>
      </div>
      <div class="card">
        <h3>📱 App Info</h3>
        <div id="appInfo" style="font-size:13px;color:var(--muted)">Loading...</div>
      </div>
    </div>

  </div>
</div>

<script>
let adminKey = localStorage.getItem('dlchat_admin_key') || '';
let allUsers = [];

function doLogin() {
  const k = document.getElementById('keyInput').value.trim();
  if (!k) return toast('Enter admin key', 'error');
  adminKey = k;
  localStorage.setItem('dlchat_admin_key', k);
  verifyAndShow();
}

function verifyAndShow() {
  apiFetch('/admin/api/stats').then(d => {
    if (d.error) { toast('Wrong key', 'error'); localStorage.removeItem('dlchat_admin_key'); return; }
    document.getElementById('login').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('app').style.flexDirection = 'column';
    document.getElementById('keyDisplay').value = adminKey;
    loadOverview();
  }).catch(() => toast('Cannot connect to server', 'error'));
}

function logout() {
  localStorage.removeItem('dlchat_admin_key');
  adminKey = '';
  document.getElementById('login').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

function setTab(name, el) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('sec-' + name).classList.add('active');
  el.classList.add('active');
  if (name === 'overview') loadOverview();
  if (name === 'patchnotes') loadPatchNotes();
  if (name === 'maintenance') loadMaintenance();
  if (name === 'users') loadUsers();
  if (name === 'config') loadConfig();
}

async function apiFetch(path, opts = {}) {
  const r = await fetch(path, {
    ...opts, headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey, ...(opts.headers || {}) }
  });
  return r.json();
}

async function loadOverview() {
  const d = await apiFetch('/admin/api/stats');
  if (!d.error) {
    document.getElementById('s-users').textContent = d.users ?? 0;
    document.getElementById('s-online').textContent = d.online ?? 0;
    document.getElementById('s-msgs').textContent = d.msgsToday ?? 0;
    document.getElementById('s-polls').textContent = d.polls ?? 0;
    document.getElementById('s-convs').textContent = d.conversations ?? 0;
    document.getElementById('s-tokens').textContent = d.pushTokens ?? 0;
    document.getElementById('overviewTime').textContent = 'Last updated: ' + new Date().toLocaleTimeString();
  }
  const ru = await apiFetch('/admin/api/recent-users');
  const el = document.getElementById('recentUsers');
  if (ru.users && ru.users.length > 0) {
    el.innerHTML = ru.users.map(u => \`
      <div class="user-item">
        <div class="user-avatar">\${u.displayName?.[0]?.toUpperCase() ?? '?'}</div>
        <div>
          <div class="user-name">\${esc(u.displayName)} \${u.isOnline ? '<span class="badge-online"></span>' : ''}</div>
          <div class="user-meta">@\${esc(u.username ?? 'no-username')} · Joined \${fmtDate(u.createdAt)}</div>
        </div>
        <div style="margin-left:auto">
          <span class="tag \${u.role === 'admin' ? 'tag-red' : 'tag-blue'}">\${u.role}</span>
        </div>
      </div>
    \`).join('');
  } else el.innerHTML = '<div class="empty">No users found</div>';
}

async function loadPatchNotes() {
  const d = await apiFetch('/api/patch-notes');
  const el = document.getElementById('patchList');
  if (!d || !d.length) { el.innerHTML = '<div class="empty">No patch notes yet</div>'; return; }
  el.innerHTML = \`<div class="patch-list">\${d.map(p => \`
    <div class="patch-item">
      <span class="patch-version \${p.is_major ? 'major' : ''}">v\${esc(p.version)}</span>
      <div class="patch-info">
        <div class="patch-title">\${esc(p.title)}</div>
        <div class="patch-date">\${fmtDate(p.created_at)}</div>
        <div class="patch-content">\${esc(p.content)}</div>
      </div>
      <div class="patch-actions">
        <button class="btn btn-red btn-sm" onclick="deletePatch('\${p.id}')">🗑</button>
      </div>
    </div>
  \`).join('')}</div>\`;
}

async function createPatch() {
  const version = document.getElementById('pn-version').value.trim();
  const title = document.getElementById('pn-title').value.trim();
  const content = document.getElementById('pn-content').value.trim();
  const isMajor = document.getElementById('pn-major').checked;
  if (!version || !title || !content) return toast('Fill all fields', 'error');
  const d = await apiFetch('/api/patch-notes', { method: 'POST', body: JSON.stringify({ version, title, content, isMajor }) });
  if (d.id || d.ok) { toast('Patch note published! ✅'); loadPatchNotes(); document.getElementById('pn-version').value = ''; document.getElementById('pn-title').value = ''; document.getElementById('pn-content').value = ''; document.getElementById('pn-major').checked = false; }
  else toast('Failed: ' + (d.error || 'unknown'), 'error');
}

async function deletePatch(id) {
  if (!confirm('Delete this patch note?')) return;
  await apiFetch('/api/patch-notes/' + id, { method: 'DELETE' });
  toast('Deleted'); loadPatchNotes();
}

async function sendPush() {
  const title = document.getElementById('push-title').value.trim();
  const body = document.getElementById('push-body').value.trim();
  const target = document.getElementById('push-target').value;
  if (!title || !body) return toast('Title and body required', 'error');
  let extraData = {};
  try { const raw = document.getElementById('push-data').value.trim(); if (raw) extraData = JSON.parse(raw); } catch { return toast('Invalid JSON in extra data', 'error'); }
  const d = await apiFetch('/admin/api/push', { method: 'POST', body: JSON.stringify({ title, body, target, data: extraData }) });
  if (d.sent !== undefined) toast(\`Sent to \${d.sent} device(s) ✅\`);
  else toast('Failed: ' + (d.error || 'unknown'), 'error');
}

function updatePreview() {
  document.getElementById('prev-title').textContent = document.getElementById('push-title').value || 'DLChat';
  document.getElementById('prev-body').textContent = document.getElementById('push-body').value || 'Your notification preview will appear here';
}

async function loadMaintenance() {
  const d = await apiFetch('/admin/api/maintenance');
  const on = d.maintenance === '1' || d.maintenance === true;
  document.getElementById('maintStatus').textContent = on ? '🔴 ON' : '🟢 OFF';
  document.getElementById('maintStatus').className = 'maint-status ' + (on ? 'on' : 'off');
  document.getElementById('maintDesc').textContent = on ? 'App is in maintenance mode. API returns 503 for most calls.' : 'App is running normally.';
  if (d.message) document.getElementById('maint-msg').value = d.message;
}

async function setMaintenance(on) {
  if (on && !confirm('Enable maintenance mode? Users will not be able to use the app.')) return;
  const msg = document.getElementById('maint-msg').value || 'App is under maintenance. Please try again soon.';
  await apiFetch('/admin/api/maintenance', { method: 'POST', body: JSON.stringify({ on, message: msg }) });
  toast(on ? '🔴 Maintenance enabled' : '🟢 Maintenance disabled');
  loadMaintenance();
}

async function saveMaintMessage() {
  const msg = document.getElementById('maint-msg').value;
  await apiFetch('/admin/api/config', { method: 'PUT', body: JSON.stringify({ key: 'maintenance_message', value: msg }) });
  toast('Message saved');
}

async function loadUsers() {
  const d = await apiFetch('/admin/api/users');
  allUsers = d.users || [];
  document.getElementById('userCount').textContent = '(' + allUsers.length + ')';
  renderUsers(allUsers);
}

function filterUsers() {
  const q = document.getElementById('userSearch').value.toLowerCase();
  renderUsers(allUsers.filter(u => (u.displayName + u.username).toLowerCase().includes(q)));
}

function renderUsers(list) {
  const el = document.getElementById('usersList');
  if (!list.length) { el.innerHTML = '<div class="empty">No users found</div>'; return; }
  el.innerHTML = list.slice(0, 50).map(u => \`
    <div class="user-item">
      <div class="user-avatar">\${u.displayName?.[0]?.toUpperCase() ?? '?'}</div>
      <div style="flex:1">
        <div class="user-name">\${esc(u.displayName)} \${u.isOnline ? '<span class="badge-online"></span>' : ''}</div>
        <div class="user-meta">@\${esc(u.username ?? '—')} · \${esc(u.phoneNumber ?? 'no phone')} · \${fmtDate(u.createdAt)}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <span class="tag \${u.role === 'admin' ? 'tag-red' : u.role === 'moderator' ? 'tag-blue' : 'tag-green'}">\${u.role}</span>
        \${u.isOnline ? '<span class="tag tag-green">online</span>' : ''}
      </div>
    </div>
  \`).join('');
}

function loadConfig() {
  apiFetch('/admin/api/stats').then(d => {
    document.getElementById('appInfo').innerHTML = \`
      <p>Server: DLChat API (Express 5)</p>
      <p>Database: PostgreSQL (Replit built-in)</p>
      <p>Push: Expo Push Notification Service</p>
      <p>Total users: \${d.users ?? '—'}</p>
    \`;
  });
}

function fmtDate(s) { return s ? new Date(s).toLocaleDateString('id-ID', { day:'numeric', month:'short', year:'numeric' }) : '—'; }
function esc(s) { return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function toast(msg, type='success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

// Auto-login if key stored
if (adminKey) verifyAndShow();
</script>
</body>
</html>`);
});

// ─── Admin API Endpoints ──────────────────────────────────────────────────────

router.get("/api/stats", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const [users, online, msgsToday, polls, conversations, pushTokens] = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as c FROM users`),
      db.execute(sql`SELECT COUNT(*) as c FROM users WHERE is_online = true`),
      db.execute(sql`SELECT COUNT(*) as c FROM messages WHERE created_at > now() - interval '24 hours' AND deleted_at IS NULL`),
      db.execute(sql`SELECT COUNT(*) as c FROM polls WHERE closed_at IS NULL`),
      db.execute(sql`SELECT COUNT(*) as c FROM conversations`),
      db.execute(sql`SELECT COUNT(*) as c FROM push_tokens`),
    ]);
    res.json({
      users: Number(users.rows[0]?.c ?? 0),
      online: Number(online.rows[0]?.c ?? 0),
      msgsToday: Number(msgsToday.rows[0]?.c ?? 0),
      polls: Number(polls.rows[0]?.c ?? 0),
      conversations: Number(conversations.rows[0]?.c ?? 0),
      pushTokens: Number(pushTokens.rows[0]?.c ?? 0),
    });
  } catch (err) {
    logger.error({ err }, "Stats error");
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/recent-users", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const result = await db.execute(sql`
      SELECT id, display_name as "displayName", username, phone_number as "phoneNumber",
        is_online as "isOnline", role, created_at as "createdAt"
      FROM users ORDER BY created_at DESC LIMIT 20
    `);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/users", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const result = await db.execute(sql`
      SELECT id, display_name as "displayName", username, phone_number as "phoneNumber",
        is_online as "isOnline", role, created_at as "createdAt"
      FROM users ORDER BY created_at DESC LIMIT 200
    `);
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.post("/api/push", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  const { title, body, target, data } = req.body as { title: string; body: string; target?: string; data?: Record<string, unknown> };
  if (!title || !body) { res.status(400).json({ error: "title and body required" }); return; }
  try {
    let tokensResult;
    if (target === "online") {
      tokensResult = await db.execute(sql`
        SELECT pt.token FROM push_tokens pt
        JOIN users u ON u.id = pt.user_id
        WHERE u.is_online = true
      `);
    } else {
      tokensResult = await db.execute(sql`SELECT token FROM push_tokens`);
    }
    const tokens = tokensResult.rows.map((r: any) => r.token as string);
    await sendPushToUsers(tokens, title, body, { ...(data ?? {}), type: "announcement" });
    res.json({ sent: tokens.length });
  } catch (err) {
    logger.error({ err }, "Admin push failed");
    res.status(500).json({ error: "Failed" });
  }
});

router.get("/api/maintenance", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT key, value FROM app_config WHERE key IN ('maintenance', 'maintenance_message')
    `);
    const cfg: Record<string, string> = {};
    for (const row of result.rows as any[]) cfg[row.key] = row.value;
    res.json({ maintenance: cfg.maintenance ?? "0", message: cfg.maintenance_message ?? "" });
  } catch {
    res.json({ maintenance: "0", message: "" });
  }
});

router.post("/api/maintenance", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  const { on, message } = req.body as { on: boolean; message?: string };
  try {
    await db.execute(sql`
      INSERT INTO app_config (key, value) VALUES ('maintenance', ${on ? "1" : "0"})
      ON CONFLICT (key) DO UPDATE SET value = ${on ? "1" : "0"}, updated_at = now()
    `);
    if (message) {
      await db.execute(sql`
        INSERT INTO app_config (key, value) VALUES ('maintenance_message', ${message})
        ON CONFLICT (key) DO UPDATE SET value = ${message}, updated_at = now()
      `);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

router.put("/api/config", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  const { key, value } = req.body as { key: string; value: string };
  try {
    await db.execute(sql`
      INSERT INTO app_config (key, value) VALUES (${key}, ${value})
      ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = now()
    `);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed" });
  }
});

export default router;
