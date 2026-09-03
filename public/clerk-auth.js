window.addEventListener("load", async () => {
  const btn = document.getElementById("clerk-btn");
  const formError = document.getElementById("form-error");

  await Clerk.load({ ui: { ClerkUI: window.__internal_ClerkUICtor } });

  // Our logout destroys connect.sid but not the Clerk session. Without this the
  // listener below would immediately sign the user straight back in.
  if (new URLSearchParams(location.search).has("signedout")) {
    await Clerk.signOut();
  }

  let posting = false;
  Clerk.addListener(async ({ session }) => {
    if (!session || posting) return;
    posting = true;
    try {
      const token = await session.getToken();
      const res = await fetch("/api/auth/clerk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ token }),
      });
      if (res.ok) return window.location.assign("/");
      formError.textContent = (await res.json()).error || "Clerk sign-in failed.";
      formError.hidden = false;
    } finally {
      posting = false;
    }
  });

  btn.disabled = false;
  btn.addEventListener("click", () => {
    const opts = { forceRedirectUrl: location.pathname };
    document.getElementById("signup-form") ? Clerk.openSignUp(opts) : Clerk.openSignIn(opts);
  });
});
