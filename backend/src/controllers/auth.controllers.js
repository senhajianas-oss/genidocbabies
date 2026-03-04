const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { normalizeRole } = require("../utils/role");

function signToken(user) {
  const secret = process.env.JWT_SECRET || "genidoc-secret-key-2024";
  return jwt.sign(
    { user_id: user.genidoc_user_id, role: user.role, email: user.email },
    secret,
    { expiresIn: process.env.JWT_EXPIRES || "7d" }
  );
}

async function signup(req, res) {
  const {
    genidoc_nom,
    genidoc_prenom,
    genidoc_email,
    genidoc_password,
    genidoc_confirm_password,
    genidoc_role,
    org_code,
  } = req.body;

  if (!genidoc_nom || !genidoc_prenom || !genidoc_email || !genidoc_password || !genidoc_confirm_password || !genidoc_role) {
    return res.status(400).json({ message: "Tous les champs sont obligatoires" });
  }
  if (genidoc_password !== genidoc_confirm_password) {
    return res.status(400).json({ message: "Mots de passe ne correspondent pas" });
  }

  const role = normalizeRole(genidoc_role);
  if (!role) return res.status(400).json({ message: "Rôle invalide" });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [orgCountRows] = await conn.execute("SELECT COUNT(*) AS c FROM genidoc_organisation");
    const hasOrg = Number(orgCountRows[0].c) > 0;

    if (!hasOrg && role !== "ADMIN") {
      await conn.rollback();
      return res.status(400).json({ message: "Aucune organisation. Crée d’abord un compte ADMIN." });
    }

    const [existing] = await conn.execute(
      "SELECT genidoc_user_id FROM genidoc_auth_users WHERE email = :email",
      { email: genidoc_email }
    );
    if (existing.length) {
      await conn.rollback();
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    const password_hash = await bcrypt.hash(genidoc_password, 10);

    const [insUser] = await conn.execute(
      `INSERT INTO genidoc_auth_users (nom, prenom, email, password_hash, role)
       VALUES (:nom, :prenom, :email, :hash, :role)`,
      { nom: genidoc_nom, prenom: genidoc_prenom, email: genidoc_email, hash: password_hash, role }
    );
    const userId = insUser.insertId;

    await conn.execute(
      `INSERT INTO genidoc_onboarding (genidoc_user_id, role, current_step, is_completed)
       VALUES (:uid, :role, 1, 0)`,
      { uid: userId, role }
    );

    if (role === "ADMIN") {
      await conn.execute("INSERT INTO genidoc_admin (genidoc_user_id) VALUES (:uid)", { uid: userId });
      await conn.execute("INSERT INTO genidoc_onboarding_admin (genidoc_user_id) VALUES (:uid)", { uid: userId });
    }

    if (role === "TUTEUR") {
      await conn.execute("INSERT INTO genidoc_tuteur_profile (genidoc_user_id) VALUES (:uid)", { uid: userId });
      await conn.execute("INSERT INTO genidoc_onboarding_tuteur (genidoc_user_id) VALUES (:uid)", { uid: userId });
    }

    if (role === "PEDIATRE") {
      await conn.execute("INSERT INTO genidoc_pediatre_profile (genidoc_user_id) VALUES (:uid)", { uid: userId });
      await conn.execute("INSERT INTO genidoc_onboarding_pediatre (genidoc_user_id) VALUES (:uid)", { uid: userId });
    }

    let membership = null;

    if (role === "TUTEUR" || role === "PEDIATRE") {
      const code = String(org_code || "").trim();
      if (!code) {
        await conn.rollback();
        return res.status(400).json({ message: "org_code est obligatoire" });
      }

      const [orgRows] = await conn.execute(
        "SELECT genidoc_org_id FROM genidoc_organisation WHERE org_code = :code",
        { code }
      );
      if (!orgRows.length) {
        await conn.rollback();
        return res.status(404).json({ message: "Organisation introuvable (org_code)" });
      }
      const orgId = orgRows[0].genidoc_org_id;

      let status = "ACTIVE";
      if (role === "PEDIATRE") {
        const [sRows] = await conn.execute(
          "SELECT validation_mode FROM genidoc_organisation_settings WHERE genidoc_org_id = :orgId",
          { orgId }
        );
        const mode = sRows.length ? sRows[0].validation_mode : "OBLIGATOIRE";
        status = mode === "AUTO" ? "ACTIVE" : "PENDING";
      }

      await conn.execute(
        `INSERT INTO genidoc_user_organisation (genidoc_user_id, genidoc_org_id, status)
         VALUES (:uid, :orgId, :status)`,
        { uid: userId, orgId, status }
      );

      membership = { genidoc_org_id: orgId, status };
    }

    await conn.commit();

    const user = { genidoc_user_id: userId, nom: genidoc_nom, prenom: genidoc_prenom, email: genidoc_email, role };
    const token = signToken(user);

    return res.status(201).json({
      message: "Compte créé",
      token,
      user,
      onboarding: { current_step: 1, is_completed: 0 },
      membership,
      next_route: role === "ADMIN" ? "/frontend/src/public/onboarding/admin/step1-organisation.html" : "/frontend/src/public/onboarding/tuteur/step1-profil.html",
    });
  } catch (e) {
    await conn.rollback();
    return res.status(500).json({ message: "Erreur serveur", error: String(e.message || e) });
  } finally {
    conn.release();
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ message: "Email et mot de passe requis" });

    const [rows] = await db.execute(
      `SELECT genidoc_user_id, nom, prenom, email, password_hash, role
       FROM genidoc_auth_users
       WHERE email = :email`,
      { email: String(email).trim() }
    );

    if (!rows || !rows.length) return res.status(401).json({ message: "Identifiants invalides" });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ message: "Identifiants invalides" });

    const token = signToken(u);

    const [onb] = await db.execute(
      "SELECT current_step, is_completed FROM genidoc_onboarding WHERE genidoc_user_id = :uid",
      { uid: u.genidoc_user_id }
    );

    const [mem] = await db.execute(
      `SELECT uo.genidoc_org_id, uo.status, o.org_code, o.org_nom
       FROM genidoc_user_organisation uo
       JOIN genidoc_organisation o ON o.genidoc_org_id = uo.genidoc_org_id
       WHERE uo.genidoc_user_id = :uid`,
      { uid: u.genidoc_user_id }
    );

    return res.json({
      token,
      user: { genidoc_user_id: u.genidoc_user_id, nom: u.nom, prenom: u.prenom, email: u.email, role: u.role },
      onboarding: (onb && onb[0]) || { current_step: 1, is_completed: 0 },
      membership: (mem && mem[0]) || null,
    });
  } catch (e) {
    console.error("Login Error:", e);
    return res.status(500).json({ message: "Erreur serveur (Login)", error: e.message });
  }
}

async function me(req, res) {
  try {
    const [rows] = await db.execute(
      "SELECT genidoc_user_id, nom, prenom, email, role FROM genidoc_auth_users WHERE genidoc_user_id = :uid",
      { uid: req.user.user_id }
    );
    if (!rows || !rows.length) return res.status(404).json({ message: "User introuvable" });
    return res.json({ user: rows[0] });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur (Me)", error: e.message });
  }
}

module.exports = { signup, login, me };