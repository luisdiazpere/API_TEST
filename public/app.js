const form = document.getElementById("lookup-form");
const submitBtn = document.getElementById("submit-btn");
const statusBox = document.getElementById("status");
const resultsSection = document.getElementById("results-section");
const tableBody = document.querySelector("#results-table tbody");
const errorsPanel = document.getElementById("errors-panel");
const invalidGroup = document.getElementById("invalid-errors");
const invalidList = document.getElementById("invalid-list");
const dnsGroup = document.getElementById("dns-errors");
const dnsList = document.getElementById("dns-list");
const apiGroup = document.getElementById("api-errors");
const apiList = document.getElementById("api-list");
const statsGrid = document.getElementById("stats-grid");
const exportCsvBtn = document.getElementById("export-csv");
const exportJsonBtn = document.getElementById("export-json");
const fileInput = document.getElementById("ips-file");
const removeFileBtn = document.getElementById("remove-file-btn");
const fileNameLabel = document.getElementById("file-name");

let lastResults = [];

function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

fileInput.addEventListener("change", () => {
  const hasFile = fileInput.files.length > 0;
  removeFileBtn.hidden = !hasFile;
  fileNameLabel.textContent = hasFile ? fileInput.files[0].name : "";
});

removeFileBtn.addEventListener("click", () => {
  fileInput.value = "";
  removeFileBtn.hidden = true;
  fileNameLabel.textContent = "";
});

function setStatus(message, isError) {
  statusBox.hidden = !message;
  statusBox.textContent = message;
  statusBox.classList.toggle("error", Boolean(isError));
}

function renderTable(results) {
  tableBody.innerHTML = "";
  for (const result of results) {
    const row = document.createElement("tr");
    const resolvedFrom = esc(result.resolvedFrom ?? "-");
    if (result.bogon) {
      row.innerHTML = `
        <td>${esc(result.ip)}</td>
        <td>${resolvedFrom}</td>
        <td colspan="4">IP privada / reservada (sin datos publicos)</td>
        <td>${result.fromCache ? "si" : "no"}</td>
      `;
    } else {
      row.innerHTML = `
        <td>${esc(result.ip)}</td>
        <td>${resolvedFrom}</td>
        <td>${esc(result.asn)}</td>
        <td>${esc(result.as_name)}</td>
        <td>${esc(result.country)}</td>
        <td>${esc(result.continent)}</td>
        <td>${result.fromCache ? "si" : "no"}</td>
      `;
    }
    tableBody.appendChild(row);
  }
}

function renderErrorGroup(group, list, entries, keyField) {
  group.hidden = entries.length === 0;
  list.innerHTML = entries.map((e) => `<li>${esc(e[keyField])}: ${esc(e.reason)}</li>`).join("");
}

function renderErrors(invalid, dnsErrors, apiErrors) {
  renderErrorGroup(invalidGroup, invalidList, invalid, "ip");
  renderErrorGroup(dnsGroup, dnsList, dnsErrors, "host");
  renderErrorGroup(apiGroup, apiList, apiErrors, "ip");
  errorsPanel.hidden = invalid.length === 0 && dnsErrors.length === 0 && apiErrors.length === 0;
}

function renderStatCard(title, entries) {
  const items = entries.length
    ? entries.map((e) => `<li><span>${e.name}</span><span>${e.count}</span></li>`).join("")
    : "<li>Sin datos</li>";
  return `<div class="stats-card"><h3>${title}</h3><ul>${items}</ul></div>`;
}

function renderStats(stats, meta) {
  statsGrid.innerHTML =
    renderStatCard("Por pais", stats.byCountry) +
    renderStatCard("Por continente", stats.byContinent) +
    renderStatCard("Por organizacion (ASN)", stats.byAsn) +
    `<div class="stats-card"><h3>Resumen</h3><ul>
      <li><span>Total consultadas</span><span>${stats.totalLookups}</span></li>
      <li><span>IPs privadas/reservadas</span><span>${stats.bogonCount}</span></li>
      <li><span>Desde cache</span><span>${meta.cacheHits}</span></li>
      <li><span>Llamadas a la API</span><span>${meta.apiCalls}</span></li>
    </ul></div>`;
}

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

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setStatus("Consultando ipinfo.io...", false);
  resultsSection.hidden = true;

  try {
    const formData = new FormData(form);
    const response = await fetch("/api/lookup", { method: "POST", body: formData });
    const data = await response.json();

    if (!response.ok) {
      setStatus(data.error || "Ocurrio un error inesperado.", true);
      return;
    }

    lastResults = data.results;
    renderTable(data.results);
    renderErrors(data.invalid, data.dnsErrors, data.apiErrors);
    renderStats(data.stats, data.meta);
    resultsSection.hidden = false;
    setStatus(`Se procesaron ${data.requested} entradas.`, false);
  } catch (error) {
    setStatus("No se pudo conectar con el servidor.", true);
  } finally {
    submitBtn.disabled = false;
  }
});
