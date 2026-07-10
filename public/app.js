const form = document.getElementById("lookup-form");
const submitBtn = document.getElementById("submit-btn");
const statusRow = document.getElementById("status");
const statusText = document.getElementById("status-text");
const statusSpinner = document.getElementById("status-spinner");
const statsSection = document.getElementById("stats-section");
const statsGrid = document.getElementById("stats-grid");
const resultsSection = document.getElementById("results-section");
const resultsSubtitle = document.getElementById("results-subtitle");
const tableBody = document.querySelector("#results-table tbody");
const errorsPanel = document.getElementById("errors-panel");
const exportCsvBtn = document.getElementById("export-csv");
const exportJsonBtn = document.getElementById("export-json");
const dropZone = document.getElementById("drop-zone");
const fileInput = document.getElementById("ips-file");
const fileChip = document.getElementById("file-chip");
const fileNameLabel = document.getElementById("file-name");
const removeFileBtn = document.getElementById("remove-file-btn");

let lastResults = [];

/* ---------- Auth gate ---------- */

requireSession().then((user) => {
  initAccountMenu(user);
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("session");
  if (sessionId) loadHistorySession(sessionId);
});

/* ---------- File input ---------- */

dropZone.addEventListener("click", () => fileInput.click());

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("dragover");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("dragover"));
dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("dragover");
  if (event.dataTransfer.files.length) {
    fileInput.files = event.dataTransfer.files;
    syncFileChip();
  }
});

fileInput.addEventListener("change", syncFileChip);

function syncFileChip() {
  const hasFile = fileInput.files.length > 0;
  fileChip.hidden = !hasFile;
  fileNameLabel.textContent = hasFile ? fileInput.files[0].name : "";
}

removeFileBtn.addEventListener("click", () => {
  fileInput.value = "";
  syncFileChip();
});

/* ---------- Status ---------- */

function setStatus(message, { error = false, busy = false } = {}) {
  statusRow.hidden = !message;
  statusText.textContent = message;
  statusRow.classList.toggle("error", error);
  statusSpinner.style.display = busy ? "" : "none";
}

/* ---------- Rendering ---------- */

function renderTable(results) {
  tableBody.innerHTML = "";
  for (const result of results) {
    const row = document.createElement("tr");
    const resolvedFrom = esc(result.resolvedFrom ?? "—");
    if (result.bogon) {
      row.innerHTML = `
        <td class="mono">${esc(result.ip)}</td>
        <td class="muted">${resolvedFrom}</td>
        <td colspan="4" class="private-note">Private range — not queried</td>
        <td><span class="badge neutral">—</span></td>
      `;
    } else {
      row.innerHTML = `
        <td class="mono">${esc(result.ip)}</td>
        <td class="muted">${resolvedFrom}</td>
        <td class="mono">${esc(result.asn)}</td>
        <td>${esc(result.as_name)}</td>
        <td>${esc(result.country)}</td>
        <td>${esc(result.continent)}</td>
        <td><span class="badge ${result.fromCache ? "success" : "neutral"}">${result.fromCache ? "cached" : "live"}</span></td>
      `;
    }
    tableBody.appendChild(row);
  }
}

function renderErrorGroup(groupId, listId, countId, entries, keyField) {
  const group = document.getElementById(groupId);
  const list = document.getElementById(listId);
  const count = document.getElementById(countId);
  group.hidden = entries.length === 0;
  count.textContent = entries.length;
  list.innerHTML = entries.map((e) => `<li>${esc(e[keyField])}: ${esc(e.reason)}</li>`).join("");
}

function renderErrors(invalid, dnsErrors, apiErrors) {
  renderErrorGroup("invalid-errors", "invalid-list", "invalid-count", invalid, "ip");
  renderErrorGroup("dns-errors", "dns-list", "dns-count", dnsErrors, "host");
  renderErrorGroup("api-errors", "api-list", "api-count", apiErrors, "ip");
  errorsPanel.hidden = invalid.length === 0 && dnsErrors.length === 0 && apiErrors.length === 0;
}

function renderStatCard(title, entries) {
  const items = entries.length
    ? entries.map((e) => `<li><span>${esc(e.name)}</span><span>${e.count}</span></li>`).join("")
    : "<li><span>No data</span><span>—</span></li>";
  return `<div class="stats-card"><h3>${esc(title)}</h3><ul>${items}</ul></div>`;
}

function renderStats(stats, meta) {
  statsGrid.innerHTML =
    renderStatCard("By Country", stats.byCountry) +
    renderStatCard("By Continent", stats.byContinent) +
    renderStatCard("By Organization (ASN)", stats.byAsn) +
    `<div class="stats-card"><h3>Summary</h3><div class="metric-grid">
      <div class="metric-tile"><div class="metric-value">${stats.totalLookups}</div><div class="metric-label">Total queried</div></div>
      <div class="metric-tile"><div class="metric-value">${stats.bogonCount}</div><div class="metric-label">Private IPs</div></div>
      <div class="metric-tile"><div class="metric-value">${meta.cacheHits}</div><div class="metric-label">Cache hits</div></div>
      <div class="metric-tile"><div class="metric-value">${meta.apiCalls}</div><div class="metric-label">API calls</div></div>
    </div></div>`;
}

function renderResponse(data) {
  lastResults = data.results;
  renderTable(data.results);
  renderErrors(data.invalid, data.dnsErrors, data.apiErrors);
  renderStats(data.stats, data.meta);

  const resolved = data.results.filter((r) => !r.bogon).length;
  const skipped = data.results.length - resolved;
  resultsSubtitle.textContent = `${data.requested} entries · ${resolved} resolved · ${skipped} skipped`;

  statsSection.hidden = false;
  resultsSection.hidden = false;
}

/* ---------- History session loading ---------- */

async function loadHistorySession(id) {
  setStatus("Loading saved session…", { busy: true });
  try {
    const response = await fetch(`/api/history/${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) {
      setStatus(data.error || "Could not load session.", { error: true });
      return;
    }
    renderResponse(data);
    const when = new Date(data.createdAt + "Z").toLocaleString();
    setStatus(`Viewing saved session from ${when}.`);
  } catch {
    setStatus("Could not load session.", { error: true });
  }
}

/* ---------- Exports ---------- */

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function toCsv(results) {
  const headers = ["ip", "resolvedFrom", "asn", "as_name", "country", "continent", "bogon", "fromCache"];
  const escape = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [headers.join(",")];
  for (const result of results) {
    lines.push(headers.map((h) => escape(result[h])).join(","));
  }
  return lines.join("\n");
}

exportCsvBtn.addEventListener("click", () => {
  if (!lastResults.length) return;
  downloadBlob(toCsv(lastResults), "ip-lookup-results.csv", "text/csv");
});

exportJsonBtn.addEventListener("click", () => {
  if (!lastResults.length) return;
  downloadBlob(JSON.stringify(lastResults, null, 2), "ip-lookup-results.json", "application/json");
});

/* ---------- Submit ---------- */

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setStatus("Querying ipinfo.io…", { busy: true });
  statsSection.hidden = true;
  resultsSection.hidden = true;

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/lookup", { method: "POST", body: formData });
    const data = await response.json();

    if (response.status === 401) {
      window.location.href = "/login.html";
      return;
    }

    if (!response.ok) {
      setStatus(data.error || "Something went wrong.", { error: true });
      return;
    }

    renderResponse(data);
    setStatus(`Processed ${data.requested} entries.`);
  } catch {
    setStatus("Could not reach the server.", { error: true });
  } finally {
    submitBtn.disabled = false;
  }
});
