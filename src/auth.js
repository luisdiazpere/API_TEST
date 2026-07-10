const express = require("express");
const bcrypt = require("bcrypt");
const db = require("./db");

const router = express.Router();
const SALT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Necesitas iniciar sesion." });
  }
  next();
}

router.post("/register", async (req, res) => {
  const { name, email, password } = req.body || {};

  if (!name || !name.trim()) return res.status(400).json({ error: "El nombre es obligatorio." });
  if (!email || !EMAIL_REGEX.test(email)) return res.status(400).json({ error: "Email invalido." });
  if (!password || password.length < 8) {
    return res.status(400).json({ error: "La contrasena debe tener al menos 8 caracteres." });
  }

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email.trim());
  if (existing) return res.status(409).json({ error: "Ya existe una cuenta con ese email." });

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run(name.trim(), email.trim(), passwordHash);

  req.session.userId = info.lastInsertRowid;
  res.status(201).json({ name: name.trim(), email: email.trim() });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email y contrasena son obligatorios." });

  const user = db.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").get(email.trim());
  const validPassword = user ? await bcrypt.compare(password, user.password_hash) : false;
  if (!validPassword) return res.status(401).json({ error: "Email o contrasena incorrectos." });

  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: "No se pudo iniciar sesion." });
    req.session.userId = user.id;
    res.json({ name: user.name, email: user.email });
  });
});

router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true });
  });
});

router.get("/me", requireAuth, (req, res) => {
  const user = db.prepare("SELECT name, email FROM users WHERE id = ?").get(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Sesion invalida." });
  }
  res.json(user);
});

module.exports = { router, requireAuth };
