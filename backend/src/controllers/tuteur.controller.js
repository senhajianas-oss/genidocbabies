const db = require("../db");

async function step1(req, res) {
    const uid = req.user?.user_id;
    const {
        nom,
        prenom,
        date_naissance,
        sexe,
        groupe_sanguin,
        relation // 'mere' ou 'pere'
    } = req.body;

    if (!nom || !prenom || !date_naissance || !sexe || !relation) {
        return res.status(400).json({ message: "Tous les champs de l'enfant sont obligatoires." });
    }

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        // 1. Créer l'enfant
        const [insEnfant] = await conn.execute(
            `INSERT INTO genidoc_enfant (nom, prenom, date_naissance, sexe, groupe_sanguin)
       VALUES (:nom, :prenom, :date_naissance, :sexe, :groupe_sanguin)`,
            { nom, prenom, date_naissance, sexe, groupe_sanguin }
        );
        const enfantId = insEnfant.insertId;

        // 2. Lier le tuteur à l'enfant
        await conn.execute(
            `INSERT INTO genidoc_tuteur_enfant (genidoc_enfant_id, genidoc_user_id, relation)
       VALUES (:enfantId, :uid, :relation)`,
            { enfantId, uid, relation }
        );

        // 3. Mettre à jour l'onboarding tuteur
        await conn.execute(
            `UPDATE genidoc_onboarding_tuteur 
       SET last_enfant_id = :enfantId
       WHERE genidoc_user_id = :uid`,
            { enfantId, uid }
        );

        // 4. Avancer l'onboarding général
        await conn.execute(
            `UPDATE genidoc_onboarding 
       SET current_step = GREATEST(current_step, 2) 
       WHERE genidoc_user_id = :uid`,
            { uid }
        );

        await conn.commit();
        return res.json({ message: "Enfant enregistré", next: "/onboarding/tuteur/step2", enfant_id: enfantId });
    } catch (e) {
        if (conn) await conn.rollback();
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    } finally {
        if (conn) conn.release();
    }
}

async function step2(req, res) {
    const uid = req.user?.user_id;
    const { mode } = req.body;
    const file = req.file;

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        if (file) {
            // Récupérer l'enfant_id
            const [t] = await conn.execute("SELECT last_enfant_id FROM genidoc_onboarding_tuteur WHERE genidoc_user_id = :uid", { uid });
            const enfantId = t[0]?.last_enfant_id;

            await conn.execute(
                `INSERT INTO genidoc_documents (owner_role, genidoc_user_id, genidoc_enfant_id, input_name, file_original_name, file_path, mime_type, file_size_bytes)
         VALUES ('TUTEUR', :uid, :enfantId, :input, :orig, :path, :mime, :size)`,
                {
                    uid,
                    enfantId,
                    input: file.fieldname,
                    orig: file.originalname,
                    path: file.path.replace(/\\/g, "/"),
                    mime: file.mimetype,
                    size: file.size
                }
            );
        }

        await conn.execute(
            `UPDATE genidoc_onboarding_tuteur 
       SET carnet_mode = :mode, carnet_uploaded = 1 
       WHERE genidoc_user_id = :uid`,
            { mode, uid }
        );
        await conn.execute(
            `UPDATE genidoc_onboarding SET current_step = GREATEST(current_step, 3) WHERE genidoc_user_id = :uid`,
            { uid }
        );

        await conn.commit();
        return res.json({ message: "Mode carnet enregistré", next: "/onboarding/tuteur/step3" });
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
            `UPDATE genidoc_onboarding_tuteur SET confirm_step3 = 1 WHERE genidoc_user_id = :uid`,
            { uid }
        );
        await conn.execute(
            `UPDATE genidoc_onboarding 
       SET is_completed = 1, completed_at = NOW() 
       WHERE genidoc_user_id = :uid`,
            { uid }
        );

        await conn.commit();
        return res.json({ message: "Onboarding terminé", next: "/tuteur/dashboard" });
    } catch (e) {
        if (conn) await conn.rollback();
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    } finally {
        if (conn) conn.release();
    }
}

async function getEnfants(req, res) {
    const uid = req.user?.user_id;
    try {
        const [enfants] = await db.execute(
            `SELECT e.*, te.relation
       FROM genidoc_enfant e
       JOIN genidoc_tuteur_enfant te ON te.genidoc_enfant_id = e.genidoc_enfant_id
       WHERE te.genidoc_user_id = :uid`,
            { uid }
        );
        return res.json({ enfants });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function getCarnetSante(req, res) {
    const { enfant_id } = req.params;
    const uid = req.user?.user_id;

    try {
        // Vérifier les droits du tuteur sur cet enfant
        const [check] = await db.execute(
            "SELECT 1 FROM genidoc_tuteur_enfant WHERE genidoc_enfant_id = :enfant_id AND genidoc_user_id = :uid",
            { enfant_id, uid }
        );
        if (!check.length) return res.status(403).json({ message: "Accès refusé" });

        const [vitals] = await db.execute(
            "SELECT * FROM genidoc_vital_enfant WHERE genidoc_enfant_id = :enfant_id ORDER BY measured_at DESC",
            { enfant_id }
        );
        const [vaccinations] = await db.execute(
            `SELECT ve.*, vc.vaccin_nom 
       FROM genidoc_vaccination_enfant ve
       JOIN genidoc_vaccin_catalog vc ON vc.genidoc_vaccin_id = ve.genidoc_vaccin_id
       WHERE ve.genidoc_enfant_id = :enfant_id ORDER BY ve.vaccinated_at DESC`,
            { enfant_id }
        );
        const [consultations] = await db.execute(
            "SELECT * FROM genidoc_consultation WHERE genidoc_enfant_id = :enfant_id ORDER BY consulted_at DESC",
            { enfant_id }
        );

        return res.json({ vitals, vaccinations, consultations });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function createUrgence(req, res) {
    const uid = req.user?.user_id;
    const { enfant_id, severity, reason, notes } = req.body;

    try {
        // Récupérer l'organisation liée à l'enfant (via le dernier pédiatre ou l'admin)
        const [orgRows] = await db.execute(
            `SELECT uo.genidoc_org_id 
       FROM genidoc_user_organisation uo
       JOIN genidoc_pediatre_enfant pe ON pe.genidoc_user_id = uo.genidoc_user_id
       WHERE pe.genidoc_enfant_id = :enfant_id LIMIT 1`,
            { enfant_id }
        );
        const orgId = orgRows[0]?.genidoc_org_id;

        if (!orgId) return res.status(400).json({ message: "Impossible de déterminer l'organisation de santé." });

        await db.execute(
            `INSERT INTO genidoc_urgence (genidoc_org_id, genidoc_enfant_id, created_by_user_id, severity, reason, notes)
       VALUES (:orgId, :enfant_id, :uid, :severity, :reason, :notes)`,
            { orgId, enfant_id, uid, severity, reason, notes }
        );

        return res.status(201).json({ message: "Alerte d'urgence créée" });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function getNotifications(req, res) {
    const uid = req.user?.user_id;

    try {
        // 1. Récupérer tous les enfants du tuteur
        const [enfants] = await db.execute(
            "SELECT genidoc_enfant_id, nom, prenom, date_naissance FROM genidoc_tuteur_enfant te JOIN genidoc_enfant e ON e.genidoc_enfant_id = te.genidoc_enfant_id WHERE genidoc_user_id = :uid",
            { uid }
        );

        const alerts = [];
        const today = new Date();

        for (const enfant of enfants) {
            const birthDate = new Date(enfant.date_naissance);
            const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());

            // Vérifier les vaccins manquants
            const [missing] = await db.execute(
                `SELECT vc.* FROM genidoc_vaccin_catalog vc
         WHERE vc.age_recommande_mois <= :ageInMonths
         AND vc.genidoc_vaccin_id NOT IN (
           SELECT genidoc_vaccin_id FROM genidoc_vaccination_enfant WHERE genidoc_enfant_id = :eid
         )`,
                { ageInMonths, eid: enfant.genidoc_enfant_id }
            );

            missing.forEach(v => {
                alerts.push({
                    type: "VACCIN_LATE",
                    priority: "HIGH",
                    title: `Vaccin en retard : ${v.vaccin_nom}`,
                    message: `${enfant.prenom} aurait dû recevoir ce vaccin à ${v.age_recommande_mois} mois.`,
                    enfant_id: enfant.genidoc_enfant_id
                });
            });
        }

        return res.json({ notifications: alerts });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

module.exports = {
    step1,
    step2,
    step3,
    getEnfants,
    getCarnetSante,
    createUrgence,
    getNotifications
};
