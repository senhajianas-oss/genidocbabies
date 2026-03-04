const db = require("../db");

function makeOrgCode(len = 8) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

async function createUniqueOrgCode(conn) {
  for (let i = 0; i < 12; i++) {
    const code = makeOrgCode(8);
    const [rows] = await conn.execute(
      "SELECT genidoc_org_id FROM genidoc_organisation WHERE org_code = :code LIMIT 1",
      { code }
    );
    if (!rows.length) return code;
  }
  throw new Error("Impossible de générer org_code unique");
}

async function step1(req, res) {
  const uid = req.user?.user_id;

  const {
    org_nom,
    org_type,
    org_ville,
    org_adresse,
    org_telephone,
    org_email,
    validation_mode,
    domaines_email,
  } = req.body || {};

  if (!org_nom || !org_type || !org_ville) {
    return res.status(400).json({ message: "org_nom, org_type et org_ville sont obligatoires" });
  }

  const vMode = (validation_mode || "OBLIGATOIRE").toUpperCase();
  const allowedModes = ["OBLIGATOIRE", "AUTO"];
  if (!allowedModes.includes(vMode)) {
    return res.status(400).json({ message: "validation_mode invalide" });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // 1) Est-ce que cet admin a déjà une organisation liée ?
    const [memRows] = await conn.execute(
      "SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid LIMIT 1",
      { uid }
    );

    let orgId;
    let orgCode;

    if (!memRows.length) {
      // 2) Créer une nouvelle organisation
      orgCode = await createUniqueOrgCode(conn);

      const [insOrg] = await conn.execute(
        `INSERT INTO genidoc_organisation (org_code, org_nom, org_type, org_ville, org_adresse, org_telephone, org_email, created_by_user_id)
         VALUES (:code, :nom, :type, :ville, :adresse, :tel, :email, :uid)`,
        {
          code: orgCode,
          nom: String(org_nom).trim(),
          type: String(org_type).trim(),
          ville: String(org_ville).trim(),
          adresse: org_adresse ? String(org_adresse).trim() : null,
          tel: org_telephone ? String(org_telephone).trim() : null,
          email: org_email ? String(org_email).trim() : null,
          uid: uid,
        }
      );

      orgId = insOrg.insertId;

      await conn.execute(
        `INSERT INTO genidoc_organisation_settings (genidoc_org_id, validation_mode, domaines_email)
         VALUES (:orgId, :mode, :domains)`,
        {
          orgId,
          mode: vMode,
          domains: domaines_email ? String(domaines_email).trim() : null,
        }
      );

      // 3) Lier admin ↔ organisation (ACTIVE)
      await conn.execute(
        `INSERT INTO genidoc_user_organisation (genidoc_user_id, genidoc_org_id, status)
         VALUES (:uid, :orgId, 'ACTIVE')`,
        { uid, orgId }
      );
    } else {
      // Déjà une org: on met à jour (pas de création d'une nouvelle)
      orgId = memRows[0].genidoc_org_id;

      const [orgRow] = await conn.execute(
        "SELECT org_code FROM genidoc_organisation WHERE genidoc_org_id = :orgId LIMIT 1",
        { orgId }
      );
      orgCode = orgRow.length ? orgRow[0].org_code : null;

      await conn.execute(
        `UPDATE genidoc_organisation
         SET org_nom = :nom,
             org_type = :type,
             org_ville = :ville,
             org_adresse = :adresse,
             org_telephone = :tel,
             org_email = :email
         WHERE genidoc_org_id = :orgId`,
        {
          orgId,
          nom: String(org_nom).trim(),
          type: String(org_type).trim(),
          ville: String(org_ville).trim(),
          adresse: org_adresse ? String(org_adresse).trim() : null,
          tel: org_telephone ? String(org_telephone).trim() : null,
          email: org_email ? String(org_email).trim() : null,
        }
      );

      // settings : insert si n'existe pas, sinon update
      const [sRows] = await conn.execute(
        "SELECT genidoc_org_id FROM genidoc_organisation_settings WHERE genidoc_org_id = :orgId LIMIT 1",
        { orgId }
      );

      if (!sRows.length) {
        await conn.execute(
          `INSERT INTO genidoc_organisation_settings (genidoc_org_id, validation_mode, domaines_email)
           VALUES (:orgId, :mode, :domains)`,
          {
            orgId,
            mode: vMode,
            domains: domaines_email ? String(domaines_email).trim() : null,
          }
        );
      } else {
        await conn.execute(
          `UPDATE genidoc_organisation_settings
           SET validation_mode = :mode,
               domaines_email = :domains
           WHERE genidoc_org_id = :orgId`,
          {
            orgId,
            mode: vMode,
            domains: domaines_email ? String(domaines_email).trim() : null,
          }
        );
      }
    }

    // 4) Onboarding admin (stocke ce que l’admin a saisi)
    await conn.execute(
      `UPDATE genidoc_onboarding_admin
       SET org_nom = :nom,
           org_type = :type,
           org_ville = :ville,
           org_adresse = :adresse,
           validation_mode = :mode,
           domaines_email = :domains
       WHERE genidoc_user_id = :uid`,
      {
        uid,
        nom: String(org_nom).trim(),
        type: String(org_type).trim(),
        ville: String(org_ville).trim(),
        adresse: org_adresse ? String(org_adresse).trim() : null,
        mode: vMode,
        domains: domaines_email ? String(domaines_email).trim() : null,
      }
    );

    // 5) Avancer l’onboarding (step1 -> step2)
    await conn.execute(
      `UPDATE genidoc_onboarding
       SET current_step = GREATEST(current_step, 2)
       WHERE genidoc_user_id = :uid`,
      { uid }
    );

    // Mettre à jour genidoc_onboarding_admin pour lier l'org
    await conn.execute(
      "UPDATE genidoc_onboarding_admin SET genidoc_org_id = :orgId WHERE genidoc_user_id = :uid",
      { orgId, uid }
    );

    await conn.commit();

    return res.status(200).json({
      message: "Organisation enregistrée",
      organisation: {
        genidoc_org_id: orgId,
        org_code: orgCode,
        org_nom: String(org_nom).trim(),
        org_type: String(org_type).trim(),
        org_ville: String(org_ville).trim(),
      },
      next_route: "step2-documents-regles.html",
    });
  } catch (e) {
    console.error("Error in admin step1:", e);
    try { if (conn) await conn.rollback(); } catch { }
    return res.status(500).json({ message: "Erreur serveur", error: String(e.message || e) });
  } finally {
    try { if (conn) conn.release(); } catch { }
  }
}

async function step2(req, res) {
  const uid = req.user?.user_id;
  const files = req.files || [];
  const { validation_mode, domaines_email, note_interne } = req.body || {};

  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    // Récupérer l'org_id
    const [uo] = await conn.execute("SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid", { uid });
    const orgId = uo[0]?.genidoc_org_id;

    for (const f of files) {
      await conn.execute(
        `INSERT INTO genidoc_documents (owner_role, genidoc_user_id, genidoc_org_id, input_name, file_original_name, file_path, mime_type, file_size_bytes)
         VALUES ('ADMIN', :uid, :orgId, :input, :orig, :path, :mime, :size)`,
        {
          uid,
          orgId,
          input: f.fieldname,
          orig: f.originalname,
          path: f.path.replace(/\\/g, "/"),
          mime: f.mimetype,
          size: f.size
        }
      );
    }

    // Update settings if provided
    if (validation_mode) {
      const vMode = validation_mode.toUpperCase();
      await conn.execute(
        `UPDATE genidoc_organisation_settings 
         SET validation_mode = :vMode, domaines_email = :domains, note_interne = :note
         WHERE genidoc_org_id = :orgId`,
        { vMode, domains: domaines_email || null, note: note_interne || null, orgId }
      );

      await conn.execute(
        `UPDATE genidoc_onboarding_admin 
         SET validation_mode = :vMode, domaines_email = :domains
         WHERE genidoc_user_id = :uid`,
        { vMode, domains: domaines_email || null, uid }
      );
    }

    await conn.execute(
      `UPDATE genidoc_onboarding_admin SET documents_uploaded = 1 WHERE genidoc_user_id = :uid`,
      { uid }
    );
    await conn.execute(
      `UPDATE genidoc_onboarding SET current_step = GREATEST(current_step, 3) WHERE genidoc_user_id = :uid`,
      { uid }
    );

    await conn.commit();
    return res.json({ message: "Documents et paramètres enregistrés", next: "/admin/onboarding/step3", count: files.length });
  } catch (e) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  } finally {
    if (conn) conn.release();
  }
}

async function step3(req, res) {
  const uid = req.user?.user_id;
  let conn;
  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE genidoc_onboarding_admin SET confirm_step3 = 1 WHERE genidoc_user_id = :uid`,
      { uid }
    );
    await conn.execute(
      `UPDATE genidoc_onboarding 
       SET is_completed = 1, completed_at = NOW() 
       WHERE genidoc_user_id = :uid`,
      { uid }
    );

    await conn.commit();
    return res.json({ message: "Onboarding terminé", next_route: "../../dashboard/admin/index.html" });
  } catch (e) {
    if (conn) await conn.rollback();
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  } finally {
    if (conn) conn.release();
  }
}

async function getDashboardStats(req, res) {
  const uid = req.user?.user_id;
  try {
    const [orgRows] = await db.execute(
      "SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid",
      { uid }
    );
    if (!orgRows.length) return res.status(404).json({ message: "Organisation non trouvée" });
    const orgId = orgRows[0].genidoc_org_id;

    const [pediatresCount] = await db.execute(
      "SELECT COUNT(*) as count FROM genidoc_user_organisation WHERE genidoc_org_id = :orgId AND status = 'ACTIVE'",
      { orgId }
    );
    const [pendingPediatres] = await db.execute(
      "SELECT COUNT(*) as count FROM genidoc_user_organisation WHERE genidoc_org_id = :orgId AND status = 'PENDING'",
      { orgId }
    );

    return res.json({
      stats: {
        totalPediatres: pediatresCount[0].count,
        pendingPediatres: pendingPediatres[0].count,
      }
    });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
}

async function getPendingPediatres(req, res) {
  const uid = req.user?.user_id;
  try {
    const [orgRows] = await db.execute(
      "SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid",
      { uid }
    );
    const orgId = orgRows[0]?.genidoc_org_id;

    const [pediatres] = await db.execute(
      `SELECT u.genidoc_user_id, u.nom, u.prenom, u.email, p.numero_ordre, p.specialite, uo.status
       FROM genidoc_auth_users u
       JOIN genidoc_pediatre_profile p ON p.genidoc_user_id = u.genidoc_user_id
       JOIN genidoc_user_organisation uo ON uo.genidoc_user_id = u.genidoc_user_id
       WHERE uo.genidoc_org_id = :orgId AND uo.status = 'PENDING'`,
      { orgId }
    );

    return res.json({ pediatres });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
}

async function updatePediatreStatus(req, res) {
  const { pediatre_id, status } = req.body;
  if (!['ACTIVE', 'REJECTED'].includes(status)) {
    return res.status(400).json({ message: "Status invalide" });
  }

  try {
    await db.execute(
      "UPDATE genidoc_user_organisation SET status = :status WHERE genidoc_user_id = :pediatre_id",
      { status, pediatre_id }
    );
    return res.json({ message: "Statut mis à jour" });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
}

async function sendInvitation(req, res) {
  const uid = req.user?.user_id;
  const { email, nom, prenom } = req.body;

  if (!email) return res.status(400).json({ message: "Email est obligatoire" });

  try {
    const [orgRows] = await db.execute(
      "SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid",
      { uid }
    );
    const orgId = orgRows[0]?.genidoc_org_id;

    await db.execute(
      `INSERT INTO genidoc_admin_invitation (genidoc_user_id, genidoc_org_id, invite_email, invite_nom, invite_prenom, status)
       VALUES (:uid, :orgId, :email, :nom, :prenom, 'SENT')`,
      { uid, orgId, email, nom, prenom }
    );

    // Ici on enverrait normalement un email.

    return res.json({ message: "Invitation envoyée" });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
}

async function getInvitations(req, res) {
  const uid = req.user?.user_id;
  try {
    const [orgRows] = await db.execute(
      "SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid",
      { uid }
    );
    const orgId = orgRows[0]?.genidoc_org_id;

    const [invitations] = await db.execute(
      "SELECT * FROM genidoc_admin_invitation WHERE genidoc_org_id = :orgId ORDER BY created_at DESC",
      { orgId }
    );

    return res.json({ invitations });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
}

async function getAllPediatres(req, res) {
  const uid = req.user?.user_id;
  try {
    const [orgRows] = await db.execute(
      "SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid",
      { uid }
    );
    const orgId = orgRows[0]?.genidoc_org_id;

    const [pediatres] = await db.execute(
      `SELECT u.genidoc_user_id, u.nom, u.prenom, u.email, p.numero_ordre, p.specialite, uo.status, uo.joined_at
       FROM genidoc_auth_users u
       JOIN genidoc_pediatre_profile p ON p.genidoc_user_id = u.genidoc_user_id
       JOIN genidoc_user_organisation uo ON uo.genidoc_user_id = u.genidoc_user_id
       WHERE uo.genidoc_org_id = :orgId`,
      { orgId }
    );

    return res.json({ pediatres });
  } catch (e) {
    return res.status(500).json({ message: "Erreur serveur", error: e.message });
  }
}

module.exports = {
  step1,
  step2,
  step3,
  getDashboardStats,
  getPendingPediatres,
  getAllPediatres,
  updatePediatreStatus,
  sendInvitation,
  getInvitations
};