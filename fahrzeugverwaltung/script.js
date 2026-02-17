const STORAGE_KEY = "ff_fahrzeugverwaltung_v3";

const state = {
  vehicles: [],
  selectedId: null,
  search: "",
  statusFilter: "alle",
  activeTab: "stammdaten",
};

const form = document.getElementById("vehicleForm");
const tableBody = document.getElementById("vehicleTableBody");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");
const statusBadge = document.getElementById("statusBadge");
const detailTitle = document.getElementById("detailTitle");
const detailSubtitle = document.getElementById("detailSubtitle");
const imageInput = document.getElementById("imageInput");
const imagePreview = document.getElementById("imagePreview");

const statTotal = document.getElementById("statTotal");
const statReady = document.getElementById("statReady");
const statServiceDue = document.getElementById("statServiceDue");

const newVehicleBtn = document.getElementById("newVehicleBtn");
const deleteBtn = document.getElementById("deleteBtn");
const exportBtn = document.getElementById("exportBtn");
const importInput = document.getElementById("importInput");

const tabButtons = Array.from(document.querySelectorAll(".tab-btn"));
const tabPanels = Array.from(document.querySelectorAll(".tab-panel"));

const fields = [
  "category",
  "designation",
  "tacticalName",
  "radioName",
  "type",
  "fzgType",
  "seats",
  "plate",
  "status",
  "generalData",
  "chassis",
  "body",
  "mileage",
  "pickerlLast",
  "pickerlNext",
  "serviceLast",
  "serviceNext",
  "inspectionNotes",
  "loading",
  "loadingCheck",
  "damages",
  "repairs",
  "notes",
];

const createVehicle = () => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  imageDataUrl: "",
  category: "",
  designation: "",
  tacticalName: "",
  radioName: "",
  type: "",
  fzgType: "",
  seats: "",
  plate: "",
  status: "einsatzbereit",
  generalData: "",
  chassis: "",
  body: "",
  mileage: "",
  pickerlLast: "",
  pickerlNext: "",
  serviceLast: "",
  serviceNext: "",
  inspectionNotes: "",
  loading: "",
  loadingCheck: "",
  damages: "",
  repairs: "",
  notes: "",
});

init();

function init() {
  load();
  bindEvents();

  if (!state.vehicles.length) {
    const seed = createVehicle();
    seed.category = "Löschfahrzeug";
    seed.designation = "RLF-A 2000";
    seed.tacticalName = "RLF 1";
    seed.radioName = "Tank 1";
    seed.type = "RLFA";
    seed.fzgType = "Allrad";
    seed.chassis = "MAN TGM";
    seed.body = "Rosenbauer";
    seed.plate = "FF-100";
    seed.seats = "9";
    seed.mileage = "50234";
    seed.serviceNext = addDays(20);
    seed.pickerlNext = addDays(30);
    state.vehicles.push(seed);
    state.selectedId = seed.id;
    persist();
  }

  if (!state.selectedId && state.vehicles[0]) {
    state.selectedId = state.vehicles[0].id;
  }

  render();
}

function bindEvents() {
  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderTable();
  });

  statusFilter.addEventListener("change", (event) => {
    state.statusFilter = event.target.value;
    renderTable();
  });

  newVehicleBtn.addEventListener("click", () => {
    saveForm();
    const v = createVehicle();
    v.designation = `Neues Fahrzeug ${state.vehicles.length + 1}`;
    state.vehicles.unshift(v);
    state.selectedId = v.id;
    persist();
    render();
  });

  deleteBtn.addEventListener("click", () => {
    if (!state.selectedId) return;
    state.vehicles = state.vehicles.filter((v) => v.id !== state.selectedId);
    state.selectedId = state.vehicles[0]?.id ?? null;
    persist();
    render();
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveForm();
  });

  imageInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    const v = selectedVehicle();
    if (!file || !v) return;
    v.imageDataUrl = await fileToDataUrl(file);
    persist();
    renderImage(v.imageDataUrl);
  });

  exportBtn.addEventListener("click", exportData);

  importInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("format");
      state.vehicles = data.map((item) => ({ ...createVehicle(), ...item, id: item.id || crypto.randomUUID() }));
      state.selectedId = state.vehicles[0]?.id ?? null;
      persist();
      render();
    } catch {
      alert("Import fehlgeschlagen: Bitte gültige JSON-Datei verwenden.");
    } finally {
      importInput.value = "";
    }
  });

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeTab = btn.dataset.tab;
      renderTabs();
    });
  });
}

function render() {
  renderTable();
  renderDetail();
  renderStats();
  renderTabs();
}

function renderTabs() {
  tabButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.tab === state.activeTab));
  tabPanels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === state.activeTab));
}

function renderStats() {
  statTotal.textContent = String(state.vehicles.length);
  statReady.textContent = String(state.vehicles.filter((v) => v.status === "einsatzbereit").length);
  statServiceDue.textContent = String(state.vehicles.filter((v) => isDueSoon(v.pickerlNext, 30)).length);
}

function renderTable() {
  const selected = state.selectedId;
  const list = filteredVehicles();

  tableBody.innerHTML = "";

  if (!list.length) {
    tableBody.innerHTML = `<tr><td colspan="8" class="muted">Keine Fahrzeuge für aktuellen Filter gefunden.</td></tr>`;
    return;
  }

  list.forEach((v) => {
    const tr = document.createElement("tr");
    if (v.id === selected) tr.classList.add("active");

    tr.innerHTML = `
      <td>${escapeHtml(v.category || "-")}</td>
      <td><strong>${escapeHtml(v.designation || "Unbenannt")}</strong></td>
      <td>${escapeHtml(v.tacticalName || "-")}</td>
      <td>${escapeHtml(v.radioName || "-")}</td>
      <td>${escapeHtml(v.plate || "-")}</td>
      <td>${escapeHtml(v.mileage || "-")}</td>
      <td><span class="status-pill" data-status="${escapeHtml(v.status)}">${escapeHtml(v.status)}</span></td>
      <td>${formatDate(v.pickerlNext)}</td>
    `;

    tr.addEventListener("click", () => {
      saveForm();
      state.selectedId = v.id;
      render();
    });

    tableBody.appendChild(tr);
  });
}

function renderDetail() {
  const v = selectedVehicle();
  const hasVehicle = Boolean(v);

  Array.from(form.elements).forEach((el) => {
    el.disabled = !hasVehicle;
  });
  deleteBtn.disabled = !hasVehicle;
  imageInput.disabled = !hasVehicle;

  if (!v) {
    detailTitle.textContent = "Kein Fahrzeug ausgewählt";
    detailSubtitle.textContent = "Bitte links ein Fahrzeug auswählen oder neu anlegen.";
    statusBadge.textContent = "–";
    statusBadge.dataset.state = "";
    form.reset();
    renderImage("");
    return;
  }

  detailTitle.textContent = v.designation || "Unbenanntes Fahrzeug";
  detailSubtitle.textContent = `${v.category || "Kategorie offen"} • ${v.radioName || "kein Funkrufname"}`;
  statusBadge.textContent = v.status;
  statusBadge.dataset.state = v.status;

  for (const name of fields) {
    const input = form.elements[name];
    if (input) input.value = v[name] ?? "";
  }

  renderImage(v.imageDataUrl);
}

function renderImage(dataUrl) {
  if (!dataUrl) {
    imagePreview.textContent = "Kein Fahrzeugbild hinterlegt";
    return;
  }
  imagePreview.innerHTML = `<img src="${dataUrl}" alt="Fahrzeugbild" />`;
}

function saveForm() {
  const v = selectedVehicle();
  if (!v) return;

  for (const name of fields) {
    const input = form.elements[name];
    if (input) v[name] = input.value;
  }

  persist();
  renderTable();
  renderStats();
  statusBadge.textContent = v.status;
  statusBadge.dataset.state = v.status;
}

function selectedVehicle() {
  return state.vehicles.find((v) => v.id === state.selectedId) ?? null;
}

function filteredVehicles() {
  return state.vehicles.filter((v) => {
    if (state.statusFilter !== "alle" && v.status !== state.statusFilter) return false;
    if (!state.search) return true;
    const haystack = [v.category, v.designation, v.tacticalName, v.radioName, v.plate, v.type, v.fzgType]
      .join(" ")
      .toLowerCase();
    return haystack.includes(state.search);
  });
}

function persist() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.vehicles));
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    state.vehicles = parsed.map((item) => ({ ...createVehicle(), ...item }));
  } catch {
    state.vehicles = [];
  }
}

function exportData() {
  saveForm();
  const blob = new Blob([JSON.stringify(state.vehicles, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `fahrzeuge-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("de-AT");
}

function isDueSoon(value, days) {
  if (!value) return false;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return false;
  const now = new Date();
  const diffDays = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}

function addDays(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
