const historyBody = document.getElementById("history-body");
const emptyState = document.getElementById("empty-state");

requireSession().then((user) => {
  initAccountMenu(user);
  loadHistory();
});

function relativeTime(isoDate) {
  const then = new Date(isoDate + "Z");
  const seconds = Math.floor((Date.now() - then.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  return `${months} month${months === 1 ? "" : "s"} ago`;
}

function formatTimestamp(isoDate) {
  return new Date(isoDate + "Z").toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadHistory() {
  const response = await fetch("/api/history");
  if (!response.ok) return;
  const { sessions } = await response.json();

  emptyState.hidden = sessions.length > 0;

  historyBody.innerHTML = "";
  for (const session of sessions) {
    const row = document.createElement("tr");
    const breakdown = session.topRegion
      ? `<span class="badge neutral">${esc(session.topRegion)}</span> <span class="muted" style="color: var(--text-secondary); margin-left: 6px;">mostly ${esc(session.topRegion)}</span>`
      : `<span class="badge neutral">—</span>`;
    row.innerHTML = `
      <td>
        <div class="history-timestamp">${formatTimestamp(session.createdAt)}</div>
        <div class="history-relative">${relativeTime(session.createdAt)}</div>
      </td>
      <td class="mono">${session.requestedCount.toLocaleString()} entries</td>
      <td>${breakdown}</td>
      <td class="mono">${session.cachePercent}% cached</td>
      <td style="text-align: right;">
        <button class="btn-secondary btn-small" data-view="${session.id}">View Results</button>
        <button class="btn-secondary btn-small" data-delete="${session.id}" title="Delete" style="color: var(--danger);">✕</button>
      </td>
    `;
    historyBody.appendChild(row);
  }
}

historyBody.addEventListener("click", async (event) => {
  const viewId = event.target.dataset.view;
  const deleteId = event.target.dataset.delete;

  if (viewId) {
    window.location.href = `/?session=${viewId}`;
  }

  if (deleteId) {
    await fetch(`/api/history/${deleteId}`, { method: "DELETE" });
    loadHistory();
  }
});
