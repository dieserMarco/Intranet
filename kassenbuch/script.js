const ORG_ID = "ffwn";
const API_BASE = "api";

const el = (id) => document.getElementById(id);

function setMsg(kind, text){
  const ok = el("msgOk");
  const err = el("msgErr");
  if (ok) { ok.style.display="none"; ok.textContent=""; }
  if (err){ err.style.display="none"; err.textContent=""; }
  if (!text) return;
  if (kind === "ok" && ok){ ok.textContent = text; ok.style.display="block"; }
  if (kind === "err" && err){ err.textContent = text; err.style.display="block"; }
}

async function apiFetch(path, options = {}){
  const res = await fetch(`${API_BASE}/${path}`, {
    ...options,
    headers: { "Content-Type":"application/json", ...(options.headers||{}) }
  });
  let data = null;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Serverfehler (${res.status})`);
  return data;
}

function initTheme(){
  const stored = localStorage.getItem("ffwn_theme");
  const initial = stored || "dark";
  document.documentElement.setAttribute("data-theme", initial);
  el("themeLabel").textContent = initial === "dark" ? "Dark" : "Light";
  el("themeToggle")?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    const next = cur === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("ffwn_theme", next);
    el("themeLabel").textContent = next === "dark" ? "Dark" : "Light";
  });
}

function formatEURFromCents(cents){
  const v = (Number(cents || 0) / 100);
  return v.toLocaleString("de-AT", { style:"currency", currency:"EUR" });
}

function todayISO(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}

function typeBadge(type){
  const t = String(type||"");
  if (t === "EINNAHME") return `<span class="pill pill--ok">Einnahme</span>`;
  if (t === "AUSGABE")  return `<span class="pill pill--warn">Ausgabe</span>`;
  return `<span class="pill">Vermögen</span>`;
}

function statusBadge(status){
  const s = String(status||"");
  if (s === "VERBUCHT") return `<span class="pill pill--ok">Verbucht</span>`;
  if (s === "STORNIERT") return `<span class="pill pill--danger">Storniert</span>`;
  return `<span class="pill">Erfasst</span>`;
}

function rowActions(item){
  const id = item.id;
  // Verbuchen/Stornieren als schnelle Aktionen (nachvollziehbar über Audit)
  return `
    <button class="mini" data-act="verbuchen" data-id="${id}">Verbuchen</button>
    <button class="mini mini--ghost" data-act="storno" data-id="${id}">Storno</button>
  `;
}

async function loadList(){
  setMsg(null, "");
  const params = new URLSearchParams();
  params.set("orgId", ORG_ID);

  const from = el("from").value;
  const to = el("to").value;
  const q = el("q").value.trim();
  const type = el("filterType").value;
  const showStorno = el("showStorno").checked ? "1" : "0";

  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (q) params.set("q", q);
  if (type) params.set("type", type);
  params.set("showStorno", showStorno);

  const res = await fetch(`${API_BASE}/cashbook-list.php?${params.toString()}`);
  const data = await res.json();
  if (!res.ok || !data?.ok) throw new Error(data?.error || `Serverfehler (${res.status})`);

  // Summen
  el("sumIncome").textContent = formatEURFromCents(data.totals?.income_cents);
  el("sumExpense").textContent = formatEURFromCents(data.totals?.expense_cents);
  el("sumBalance").textContent = formatEURFromCents(data.totals?.balance_cents);

  // Table
  const tbody = el("tbody");
  tbody.innerHTML = "";

  for (const it of (data.items || [])){
    const tr = document.createElement("tr");
    const amount = formatEURFromCents(it.amount_cents);
    tr.innerHTML = `
      <td>${it.id}</td>
      <td>${it.receipt_no ? escapeHtml(it.receipt_no) : "<span class='muted'>—</span>"}</td>
      <td>${typeBadge(it.type)}</td>
      <td class="tdDesc">${it.description ? escapeHtml(it.description) : "<span class='muted'>—</span>"}</td>
      <td class="tdAmt">${amount}</td>
      <td>${escapeHtml(it.booking_date)}</td>
      <td>${it.created_by ? escapeHtml(it.created_by) : "<span class='muted'>—</span>"}</td>
      <td>${statusBadge(it.status)}</td>
      <td>${rowActions(it)}</td>
    `;
    tbody.appendChild(tr);
  }
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

async function createEntry(){
  setMsg(null, "");

  const type = el("type").value;
  const amount = el("amount").value;
  const date = el("date").value;

  if (!type) return setMsg("err","Bitte Typ wählen.");
  if (!amount || Number(amount) === 0) return setMsg("err","Bitte Betrag eingeben.");
  if (!date) return setMsg("err","Bitte Datum wählen.");

  const payload = {
    orgId: ORG_ID,
    receipt_no: el("receipt_no").value.trim() || null,
    type,
    amount: Number(amount),
    date,
    description: el("description").value.trim() || null,
    created_by: el("created_by").value.trim() || null,
    status: "ERFASST"
  };

  await apiFetch("cashbook-create.php", {
    method: "POST",
    body: JSON.stringify(payload)
  });

  setMsg("ok","✅ Buchung gespeichert (Status: Erfasst).");

  // reset fields (nicht Theme/Filter)
  el("receipt_no").value = "";
  el("amount").value = "";
  el("description").value = "";

  await loadList();
}

async function setStatus(entryId, status){
  // kleines, eigenes endpoint (kannst du gleich hinzufügen)
  await apiFetch("cashbook-status.php", {
    method: "POST",
    body: JSON.stringify({ orgId: ORG_ID, id: entryId, status, actor: el("created_by").value.trim() || null })
  });
  await loadList();
}

function initActions(){
  el("saveBtn")?.addEventListener("click", createEntry);
  el("filterBtn")?.addEventListener("click", () => loadList().catch(e => setMsg("err", e.message)));
  el("printBtn")?.addEventListener("click", () => window.print());

  // Delegation für Aktionen in Tabelle
  el("tbody")?.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-act]");
    if (!btn) return;
    const id = Number(btn.getAttribute("data-id"));
    const act = btn.getAttribute("data-act");
    if (!id) return;

    if (act === "verbuchen"){
      setStatus(id, "VERBUCHT").catch(err => setMsg("err", err.message));
    }
    if (act === "storno"){
      setStatus(id, "STORNIERT").catch(err => setMsg("err", err.message));
    }
  });
}

// Boot
initTheme();
el("date").value = todayISO();
loadList().catch(e => setMsg("err", e.message));
initActions();
