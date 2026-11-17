import { firebaseConfig, isFirebaseConfigured } from "./firebase-config.js";

const STORAGE_KEY = "printlab-printers-v1";
const FIREBASE_VERSION = "13.3.0";
const demoPrinters = [
  { id: "demo-ender", machine: "Creality Ender 3 V2", project: "Suporte para sensor", material: "PLA", status: "Imprimindo", durationHours: 4.5, filamentGrams: 86, filamentCostPerKg: 100, progress: 68, createdAt: Date.now() - 1000 * 60 * 18 },
  { id: "demo-bambu", machine: "Bambu Lab P1S", project: "Protótipo de engrenagem", material: "PETG", status: "Imprimindo", durationHours: 2.25, filamentGrams: 42, filamentCostPerKg: 135, progress: 32, createdAt: Date.now() - 1000 * 60 * 42 },
  { id: "demo-k1", machine: "Creality K1", project: "Caixa para projeto IoT", material: "PLA", status: "Em espera", durationHours: 6, filamentGrams: 128, filamentCostPerKg: 100, progress: 0, createdAt: Date.now() - 1000 * 60 * 60 * 3 },
  { id: "demo-kobra", machine: "Anycubic Kobra 2", project: "Suporte de câmera", material: "ABS", status: "Concluída", durationHours: 3.5, filamentGrams: 74, filamentCostPerKg: 120, progress: 100, createdAt: Date.now() - 1000 * 60 * 60 * 18 },
  { id: "demo-prusa", machine: "Prusa MK4", project: "Revisão do extrusor", material: "PLA", status: "Manutenção", durationHours: 0, filamentGrams: 0, filamentCostPerKg: 100, progress: 0, createdAt: Date.now() - 1000 * 60 * 60 * 29 }
];

const state = { printers: [], filter: "Todos", search: "", newestFirst: true, editingId: null, backend: "local", firebaseSnapshotReady: false, lastFirestoreSync: null, db: null, firestore: null, toastTimer: null };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const listEl = $("#printer-list");
const form = $("#printer-form");
const modal = $("#modal-backdrop");

const money = (value) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
const number = (value) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value || 0);
const costOf = (printer) => (Number(printer.filamentGrams || 0) * Number(printer.filamentCostPerKg || 0)) / 1000;
const dateLabel = (value) => new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(new Date(value)).replace(" de ", " ");

function localPrinters() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (Array.isArray(saved)) return saved;
  } catch { /* Usa os exemplos caso os dados locais estejam inválidos. */ }
  const initial = demoPrinters.map((printer) => ({ ...printer }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function setConnection(mode, detail) {
  state.backend = mode;
  if (mode !== "firebase") {
    state.firebaseSnapshotReady = false;
    state.lastFirestoreSync = null;
  }
  $("#connection-dot").classList.toggle("connected", mode === "firebase");
  $("#connection-label").textContent = mode === "firebase" ? "Firebase conectado" : "Modo local";
  $("#connection-detail").textContent = detail;
  renderSidebarLive();
}

function saveLocal() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.printers));
  render();
}

function setPrinters(printers) {
  state.printers = printers;
  render();
}

function updateStats() {
  const printers = state.printers;
  const printingCount = printers.filter((printer) => printer.status === "Imprimindo").length;
  const filament = printers.reduce((sum, printer) => sum + Number(printer.filamentGrams || 0), 0);
  const cost = printers.reduce((sum, printer) => sum + costOf(printer), 0);
  const counts = {
    Todos: printers.length,
    Imprimindo: printingCount,
    "Em espera": printers.filter((printer) => printer.status === "Em espera").length,
    Concluída: printers.filter((printer) => printer.status === "Concluída").length,
    Manutenção: printers.filter((printer) => printer.status === "Manutenção").length
  };
  $("#stat-total").textContent = String(printers.length).padStart(2, "0");
  $("#stat-running").textContent = String(printingCount).padStart(2, "0");
  $("#stat-filament").textContent = number(filament);
  $("#stat-cost").textContent = money(cost);
  $("#nav-count").textContent = String(printers.length).padStart(2, "0");
  $("#list-total").textContent = String(printers.length).padStart(2, "0");
  $("#filter-all").textContent = String(counts.Todos).padStart(2, "0");
  $("#filter-printing").textContent = String(counts.Imprimindo).padStart(2, "0");
  $("#filter-waiting").textContent = String(counts["Em espera"]).padStart(2, "0");
  $("#filter-done").textContent = String(counts.Concluída).padStart(2, "0");
  $("#filter-maintenance").textContent = String(counts.Manutenção).padStart(2, "0");
}

function printerIconFor(machine) {
  const name = String(machine || "").toLocaleLowerCase("pt-BR");
  if (name.includes("ender")) return "assets/printers/creality-ender3.svg";
  if (name.includes("bambu")) return "assets/printers/bambu-p1s.svg";
  if (name.includes("creality k1") || name === "k1") return "assets/printers/creality-k1.svg";
  if (name.includes("kobra")) return "assets/printers/anycubic-kobra2.svg";
  if (name.includes("prusa")) return "assets/printers/prusa-mk4.svg";
  return "assets/printers/generic.svg";
}

function renderSidebarLive() {
  const list = $("#sidebar-live-list");
  if (!list) return;

  const waitingForFirebase = state.backend === "firebase" && !state.firebaseSnapshotReady;
  const printers = waitingForFirebase ? [] : [...state.printers]
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const count = $("#sidebar-live-count");
  const mode = $("#sidebar-live-mode");
  const dot = $("#sidebar-live-dot");
  const updated = $("#sidebar-live-updated");

  count.textContent = String(printers.length).padStart(2, "0");
  mode.textContent = waitingForFirebase ? "Conectando…" : state.backend === "firebase" ? "Ao vivo" : "Modo local";
  dot.classList.toggle("is-connected", state.backend === "firebase" && state.firebaseSnapshotReady);
  dot.classList.toggle("is-pending", waitingForFirebase);
  updated.textContent = state.lastFirestoreSync
    ? `Atualizado às ${new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(state.lastFirestoreSync)}`
    : waitingForFirebase ? "Lendo coleção printers…" : state.backend === "firebase" ? "Aguardando dados" : "Prévia neste navegador";

  if (printers.length === 0) {
    const empty = document.createElement("p");
    empty.className = "sidebar-live-empty";
    empty.textContent = waitingForFirebase ? "Buscando documentos…" : state.backend === "firebase" ? "A coleção printers está vazia." : "Os registros locais aparecem aqui.";
    list.replaceChildren(empty);
    return;
  }

  const rows = printers.map((printer) => {
    const row = document.createElement("div");
    row.className = "sidebar-live-row";

    const icon = document.createElement("img");
    icon.className = "sidebar-live-icon";
    icon.src = printerIconFor(printer.machine);
    icon.alt = "";
    icon.setAttribute("aria-hidden", "true");
    icon.onerror = () => {
      icon.onerror = null;
      icon.src = "assets/printers/generic.svg";
    };

    const copy = document.createElement("div");
    copy.className = "sidebar-live-copy";
    const name = document.createElement("strong");
    name.className = "sidebar-live-name";
    name.textContent = printer.machine || "Impressora sem nome";
    const status = document.createElement("span");
    status.className = "sidebar-live-status";
    status.dataset.status = printer.status || "";
    status.textContent = printer.status || "Sem status";
    copy.append(name, status);
    row.append(icon, copy);
    return row;
  });
  list.replaceChildren(...rows);
}

function makeRow(printer) {
  const row = $("#row-template").content.firstElementChild.cloneNode(true);
  row.dataset.id = printer.id;
  const avatar = $(".printer-avatar", row);
  avatar.src = printerIconFor(printer.machine);
  avatar.alt = "";
  avatar.loading = "lazy";
  avatar.onerror = () => {
    avatar.onerror = null;
    avatar.src = "assets/printers/generic.svg";
  };
  $(".machine-name", row).textContent = printer.machine;
  $(".project-name", row).textContent = `${printer.project} · ${printer.material || "PLA"}`;
  const badge = $(".status-badge", row);
  badge.textContent = printer.status;
  badge.classList.add(`status-${printer.status.toLowerCase().replaceAll(" ", "-").replace("í", "i")}`);
  const progress = printer.status === "Concluída" ? 100 : Number(printer.progress || 0);
  $(".progress-value", row).textContent = printer.status === "Manutenção" ? "—" : `${progress}%`;
  $(".progress-caption", row).textContent = printer.status === "Concluída" ? "Finalizada" : printer.status === "Manutenção" ? "Indisponível" : "concluído";
  $(".progress-track span", row).style.width = `${printer.status === "Manutenção" ? 0 : progress}%`;
  $(".progress-track", row).classList.toggle("progress-complete", printer.status === "Concluída");
  $(".time-value", row).textContent = printer.durationHours ? `${number(printer.durationHours)} h` : "—";
  $(".filament-value", row).textContent = `${number(printer.filamentGrams)} g`;
  $(".material-value", row).textContent = printer.material || "PLA";
  $(".cost-value", row).textContent = money(costOf(printer));
  return row;
}

function render() {
  updateStats();
  const query = state.search.trim().toLocaleLowerCase("pt-BR");
  const visible = state.printers
    .filter((printer) => state.filter === "Todos" || printer.status === state.filter)
    .filter((printer) => !query || `${printer.machine} ${printer.project} ${printer.material} ${printer.status}`.toLocaleLowerCase("pt-BR").includes(query))
    .sort((a, b) => state.newestFirst ? Number(b.createdAt || 0) - Number(a.createdAt || 0) : Number(a.createdAt || 0) - Number(b.createdAt || 0));
  listEl.replaceChildren(...visible.map(makeRow));
  $("#empty-state").classList.toggle("hidden", visible.length !== 0);
  $(".table-wrap table").classList.toggle("hidden", visible.length === 0);
  $("#footer-count").textContent = `Exibindo ${visible.length} ${visible.length === 1 ? "impressora" : "impressoras"}`;
  renderSidebarLive();
}

function showToast(message, type = "success") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.className = `toast toast-${type}`;
  clearTimeout(state.toastTimer);
  state.toastTimer = setTimeout(() => toast.classList.add("hidden"), 3400);
}

function openModal(printer = null) {
  state.editingId = printer?.id || null;
  form.reset();
  $("#modal-title").textContent = printer ? "Editar impressão" : "Nova impressão";
  $("#submit-button").textContent = printer ? "Salvar alterações" : "Salvar impressão";
  $("#form-error").classList.add("hidden");
  if (printer) {
    for (const [key, value] of Object.entries(printer)) {
      if (form.elements[key]) form.elements[key].value = value;
    }
  } else {
    form.elements.filamentCostPerKg.value = "100";
    form.elements.progress.value = "0";
  }
  updateCostPreview();
  modal.classList.remove("hidden");
  document.body.classList.add("modal-open");
  setTimeout(() => form.elements.machine.focus(), 40);
}

function closeModal() {
  modal.classList.add("hidden");
  document.body.classList.remove("modal-open");
}

function updateCostPreview() {
  const grams = Number(form.elements.filamentGrams.value || 0);
  const perKg = Number(form.elements.filamentCostPerKg.value || 0);
  $("#cost-preview").textContent = money((grams * perKg) / 1000);
}

function formData() {
  const values = new FormData(form);
  const status = values.get("status");
  let progress = Number(values.get("progress"));
  if (status === "Concluída") progress = 100;
  return {
    machine: String(values.get("machine")).trim(),
    project: String(values.get("project")).trim(),
    material: String(values.get("material")),
    status,
    durationHours: Number(values.get("durationHours")),
    filamentGrams: Number(values.get("filamentGrams")),
    filamentCostPerKg: Number(values.get("filamentCostPerKg")),
    progress,
    updatedAt: Date.now()
  };
}

async function submitForm(event) {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const record = formData();
  const submit = $("#submit-button");
  submit.disabled = true;
  submit.textContent = "Salvando...";
  $("#form-error").classList.add("hidden");
  try {
    if (state.backend === "firebase") {
      const { collection, addDoc, doc, updateDoc } = state.firestore;
      if (state.editingId) await updateDoc(doc(state.db, "printers", state.editingId), record);
      else await addDoc(collection(state.db, "printers"), { ...record, createdAt: Date.now() });
    } else if (state.editingId) {
      state.printers = state.printers.map((printer) => printer.id === state.editingId ? { ...printer, ...record } : printer);
      saveLocal();
    } else {
      state.printers = [{ ...record, id: crypto.randomUUID(), createdAt: Date.now() }, ...state.printers];
      saveLocal();
    }
    closeModal();
    showToast(state.editingId ? "Impressão atualizada com sucesso." : "Impressão cadastrada com sucesso.");
  } catch (error) {
    $("#form-error").textContent = "Não foi possível salvar. Confira a conexão e as regras do Firestore.";
    $("#form-error").classList.remove("hidden");
    console.error("Falha ao salvar impressão:", error);
  } finally {
    submit.disabled = false;
    submit.textContent = state.editingId ? "Salvar alterações" : "Salvar impressão";
  }
}

async function deletePrinter(id) {
  const printer = state.printers.find((item) => item.id === id);
  if (!printer || !window.confirm(`Excluir “${printer.machine} — ${printer.project}”? Esta ação não pode ser desfeita.`)) return;
  try {
    if (state.backend === "firebase") await state.firestore.deleteDoc(state.firestore.doc(state.db, "printers", id));
    else {
      state.printers = state.printers.filter((item) => item.id !== id);
      saveLocal();
    }
    showToast("Impressão excluída.");
  } catch (error) {
    showToast("Não foi possível excluir. Verifique a conexão com o Firebase.", "error");
    console.error("Falha ao excluir impressão:", error);
  }
}

async function connectFirebase() {
  const base = `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}`;
  const [appSdk, authSdk, firestoreSdk] = await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  const app = appSdk.initializeApp(firebaseConfig);
  const auth = authSdk.getAuth(app);
  await authSdk.signInAnonymously(auth);
  const db = firestoreSdk.getFirestore(app);
  state.db = db;
  state.firestore = firestoreSdk;

  const printersRef = firestoreSdk.collection(db, "printers");
  const snapshot = await firestoreSdk.getDocs(printersRef);
  if (snapshot.empty) {
    const batch = firestoreSdk.writeBatch(db);
    demoPrinters.forEach(({ id, ...printer }) => batch.set(firestoreSdk.doc(printersRef), printer));
    await batch.commit();
  }
  setConnection("firebase", "Dados salvos no Firestore");
  firestoreSdk.onSnapshot(printersRef, (result) => {
    state.firebaseSnapshotReady = true;
    state.lastFirestoreSync = Date.now();
    setPrinters(result.docs.map((item) => ({ id: item.id, ...item.data() })));
    $(".live-indicator").innerHTML = "<span></span> Sincronizado com Firebase";
  }, (error) => {
    console.error("Falha na sincronização:", error);
    setConnection("local", "Falha ao sincronizar com Firebase");
    showToast("A conexão com o Firestore foi interrompida.", "error");
  });
}

function bindEvents() {
  $("#add-printer-button").addEventListener("click", () => openModal());
  $("#empty-add-button").addEventListener("click", () => openModal());
  $$(".close-modal").forEach((button) => button.addEventListener("click", closeModal));
  modal.addEventListener("click", (event) => { if (event.target === modal) closeModal(); });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) closeModal();
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); $("#search-input").focus(); }
  });
  form.addEventListener("submit", submitForm);
  form.elements.filamentGrams.addEventListener("input", updateCostPreview);
  form.elements.filamentCostPerKg.addEventListener("input", updateCostPreview);
  $("#search-input").addEventListener("input", (event) => { state.search = event.target.value; render(); });
  $$(".filter-button").forEach((button) => button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    $$(".filter-button").forEach((item) => item.classList.toggle("selected", item === button));
    render();
  }));
  $("#sort-button").addEventListener("click", (event) => {
    state.newestFirst = !state.newestFirst;
    $("#sort-button span").textContent = state.newestFirst ? "Mais recentes" : "Mais antigas";
    render();
  });
  listEl.addEventListener("click", (event) => {
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    if (event.target.closest(".edit-action")) openModal(state.printers.find((item) => item.id === row.dataset.id));
    if (event.target.closest(".delete-action")) deletePrinter(row.dataset.id);
  });
}

function start() {
  $("#today-label").textContent = new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).format(new Date());
  bindEvents();
  setPrinters(localPrinters());
  if (isFirebaseConfigured()) {
    connectFirebase().catch((error) => {
      console.error("Não foi possível iniciar o Firebase:", error);
      setConnection("local", "Firebase indisponível · dados locais");
      showToast("Firebase não conectado. O painel continua em modo local.", "error");
    });
  }
}

start();
