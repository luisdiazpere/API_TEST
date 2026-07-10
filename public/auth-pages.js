const formError = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

function showError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Unexpected error.");
  return data;
}

const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formError.hidden = true;
    submitBtn.disabled = true;
    try {
      await postJson("/api/auth/login", {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      });
      window.location.href = "/";
    } catch (error) {
      showError(error.message);
      submitBtn.disabled = false;
    }
  });

  document.getElementById("forgot-link").addEventListener("click", (event) => {
    event.preventDefault();
    showError("Password reset isn't available in this prototype.");
  });
}

const signupForm = document.getElementById("signup-form");
if (signupForm) {
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    formError.hidden = true;

    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm-password").value;
    if (password !== confirm) {
      showError("Passwords don't match.");
      return;
    }

    submitBtn.disabled = true;
    try {
      await postJson("/api/auth/register", {
        name: document.getElementById("name").value,
        email: document.getElementById("email").value,
        password,
      });
      window.location.href = "/";
    } catch (error) {
      showError(error.message);
      submitBtn.disabled = false;
    }
  });
}
