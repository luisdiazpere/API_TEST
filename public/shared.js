function esc(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function requireSession() {
  const response = await fetch("/api/auth/me");
  if (!response.ok) {
    window.location.href = "/login.html";
    throw new Error("not authenticated");
  }
  return response.json();
}

function initAccountMenu(user) {
  const nameLabel = document.getElementById("account-name");
  const menuBtn = document.getElementById("account-menu-btn");
  const dropdown = document.getElementById("account-dropdown");
  const logoutBtn = document.getElementById("logout-btn");

  nameLabel.textContent = user.name;

  menuBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    dropdown.hidden = !dropdown.hidden;
  });

  document.addEventListener("click", () => {
    dropdown.hidden = true;
  });

  logoutBtn.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login.html?signedout=1";
  });
}
