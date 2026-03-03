const db = require("../db");

async function step1(req, res) {
    const uid = req.user?.user_id;
    const {
        numero_ordre,
        telephone_pro,
        specialite,
        type_structure,
        nom_structure,
        ville,
        email_pro,
        adresse
    } = req.body;

    if (!numero_ordre || !specialite || !ville) {
        return res.status(400).json({ message: "Les champs numero_ordre, specialite et ville sont obligatoires." });
    }

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        await conn.execute(
            `UPDATE genidoc_pediatre_profile 
       SET numero_ordre = :numero_ordre,
           telephone_pro = :telephone_pro,
           specialite = :specialite,
           type_structure = :type_structure,
           nom_structure = :nom_structure,
           ville = :ville,
           email_pro = :email_pro,
           adresse = :adresse
       WHERE genidoc_user_id = :uid`,
            {
                uid,
                numero_ordre,
                telephone_pro,
                specialite,
                type_structure,
                nom_structure,
                ville,
                email_pro,
                adresse
            }
        );

        await conn.execute(
            `UPDATE genidoc_onboarding 
       SET current_step = GREATEST(current_step, 2) 
       WHERE genidoc_user_id = :uid`,
            { uid }
        );

        await conn.commit();
        return res.json({ message: "Profil mis à jour", next: "/onboarding/pediatre/step2" });
    } catch (e) {
        if (conn) await conn.rollback();
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    } finally {
        if (conn) conn.release();
    }
}

async function step2(req, res) {
    const uid = req.user?.user_id;
    const files = req.files || [];

    if (!files.length) return res.status(400).json({ message: "Aucun fichier reçu" });

    let conn;
    try {
        conn = await db.getConnection();
        await conn.beginTransaction();

        for (const f of files) {
            await conn.execute(
                `INSERT INTO genidoc_documents (owner_role, genidoc_user_id, input_name, file_original_name, file_path, mime_type, file_size_bytes)
         VALUES ('PEDIATRE', :uid, :input, :orig, :path, :mime, :size)`,
                {
                    uid,
                    input: f.fieldname,
                    orig: f.originalname,
                    path: f.path.replace(/\\/g, "/"),
                    mime: f.mimetype,
                    size: f.size
                }
            );
        }

        await conn.execute(
            `UPDATE genidoc_onboarding_pediatre SET documents_uploaded = 1 WHERE genidoc_user_id = :uid`,
            { uid }
        );
        await conn.execute(
            `UPDATE genidoc_onboarding SET current_step = GREATEST(current_step, 3) WHERE genidoc_user_id = :uid`,
            { uid }
        );

        await conn.commit();
        return res.json({ message: "Documents enregistrés", next: "/onboarding/pediatre/step3", count: files.length });
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
            `UPDATE genidoc_onboarding_pediatre SET confirm_step3 = 1 WHERE genidoc_user_id = :uid`,
            { uid }
        );
        await conn.execute(
            `UPDATE genidoc_onboarding 
       SET is_completed = 1, completed_at = NOW() 
       WHERE genidoc_user_id = :uid`,
            { uid }
        );

        await conn.commit();
        return res.json({ message: "Onboarding terminé", next: "/pediatre/dashboard" });
    } catch (e) {
        if (conn) await conn.rollback();
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    } finally {
        if (conn) conn.release();
    }
}

async function getPatients(req, res) {
    const uid = req.user?.user_id;
    try {
        // On récupère les enfants liés à ce pédiatre via genidoc_pediatre_enfant
        // OU via l'organisation du pédiatre si on veut tous les enfants de la clinique
        const [patients] = await db.execute(
            `SELECT e.*, 
              (SELECT MAX(measured_at) FROM genidoc_vital_enfant WHERE genidoc_enfant_id = e.genidoc_enfant_id) as last_visit
       FROM genidoc_enfant e
       JOIN genidoc_pediatre_enfant pe ON pe.genidoc_enfant_id = e.genidoc_enfant_id
       WHERE pe.genidoc_user_id = :uid`,
            { uid }
        );

        return res.json({ patients });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function getPatientDetails(req, res) {
    const { id } = req.params;
    try {
        const [enfant] = await db.execute("SELECT * FROM genidoc_enfant WHERE genidoc_enfant_id = :id", { id });
        if (!enfant.length) return res.status(404).json({ message: "Enfant non trouvé" });

        const [vitals] = await db.execute(
            "SELECT * FROM genidoc_vital_enfant WHERE genidoc_enfant_id = :id ORDER BY measured_at DESC",
            { id }
        );
        const [vaccins] = await db.execute(
            `SELECT ve.*, cv.vaccin_nom 
       FROM genidoc_vaccination_enfant ve
       JOIN genidoc_vaccin_catalog cv ON cv.genidoc_vaccin_id = ve.genidoc_vaccin_id
       WHERE ve.genidoc_enfant_id = :id 
       ORDER BY ve.vaccinated_at DESC`,
            { id }
        );
        const [consultations] = await db.execute(
            "SELECT * FROM genidoc_consultation WHERE genidoc_enfant_id = :id ORDER BY consulted_at DESC",
            { id }
        );

        return res.json({
            enfant: enfant[0],
            vitals,
            vaccins,
            consultations
        });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function addVital(req, res) {
    const { enfant_id, poids_kg, taille_cm, temperature_c, frequence_cardiaque_bpm, saturation_o2_pct, tension_sys, tension_dia, perimetre_cranien_cm, notes } = req.body;

    try {
        await db.execute(
            `INSERT INTO genidoc_vital_enfant 
       (genidoc_enfant_id, poids_kg, taille_cm, temperature_c, frequence_cardiaque_bpm, saturation_o2_pct, tension_sys, tension_dia, perimetre_cranien_cm, notes)
       VALUES (:enfant_id, :poids_kg, :taille_cm, :temperature_c, :frequence_cardiaque_bpm, :saturation_o2_pct, :tension_sys, :tension_dia, :perimetre_cranien_cm, :notes)`,
            { enfant_id, poids_kg, taille_cm, temperature_c, frequence_cardiaque_bpm, saturation_o2_pct, tension_sys, tension_dia, perimetre_cranien_cm, notes }
        );
        return res.status(201).json({ message: "Mesures ajoutées" });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function addConsultation(req, res) {
    const uid = req.user?.user_id;
    const { enfant_id, motif, diagnostic, ordonnance, notes } = req.body;

    try {
        // Récupérer l'org_id du pédiatre
        const [orgRows] = await db.execute(
            "SELECT genidoc_org_id FROM genidoc_user_organisation WHERE genidoc_user_id = :uid",
            { uid }
        );
        const orgId = orgRows[0]?.genidoc_org_id;

        await db.execute(
            `INSERT INTO genidoc_consultation 
       (genidoc_org_id, genidoc_enfant_id, genidoc_pediatre_user_id, motif, diagnostic, ordonnance, notes)
       VALUES (:orgId, :enfant_id, :uid, :motif, :diagnostic, :ordonnance, :notes)`,
            { orgId, enfant_id, uid, motif, diagnostic, ordonnance, notes }
        );
        return res.status(201).json({ message: "Consultation enregistrée" });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function addVaccination(req, res) {
    const uid = req.user?.user_id;
    const { enfant_id, vaccin_id, dose_no, notes, lot, vaccinated_at } = req.body;

    try {
        await db.execute(
            `INSERT INTO genidoc_vaccination_enfant 
       (genidoc_enfant_id, genidoc_vaccin_id, dose_no, notes, lot, genidoc_pediatre_user_id, vaccinated_at)
       VALUES (:enfant_id, :vaccin_id, :dose_no, :notes, :lot, :uid, :vaccinated_at)`,
            { enfant_id, vaccin_id, dose_no, notes, lot, uid, vaccinated_at: vaccinated_at || new Date() }
        );
        return res.status(201).json({ message: "Vaccination enregistrée" });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function getVaccinCatalog(req, res) {
    try {
        const [rows] = await db.execute("SELECT * FROM genidoc_vaccin_catalog ORDER BY age_recommande_mois");
        return res.json({ catalog: rows });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function getGrowthData(req, res) {
    const { id } = req.params;
    try {
        const [vitals] = await db.execute(
            `SELECT measured_at, poids_kg, taille_cm, perimetre_cranien_cm 
       FROM genidoc_vital_enfant 
       WHERE genidoc_enfant_id = :id 
       ORDER BY measured_at ASC`,
            { id }
        );
        return res.json({ growth: vitals });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

async function getVaccinationSchedule(req, res) {
    const { id } = req.params;
    try {
        const [enfant] = await db.execute("SELECT date_naissance FROM genidoc_enfant WHERE genidoc_enfant_id = :id", { id });
        if (!enfant.length) return res.status(404).json({ message: "Enfant non trouvé" });

        const birthDate = new Date(enfant[0].date_naissance);
        const today = new Date();
        const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());

        // Récupérer le catalogue complet
        const [catalog] = await db.execute("SELECT * FROM genidoc_vaccin_catalog ORDER BY age_recommande_mois");

        // Récupérer ce qui a été fait
        const [done] = await db.execute(
            "SELECT genidoc_vaccin_id, dose_no FROM genidoc_vaccination_enfant WHERE genidoc_enfant_id = :id",
            { id }
        );

        const schedule = catalog.map(v => {
            const isDone = done.some(d => d.genidoc_vaccin_id === v.genidoc_vaccin_id);
            const isOverdue = !isDone && v.age_recommande_mois < ageInMonths;
            return { ...v, status: isDone ? 'DONE' : (isOverdue ? 'LATE' : 'UPCOMING') };
        });

        return res.json({ schedule, ageInMonths });
    } catch (e) {
        return res.status(500).json({ message: "Erreur serveur", error: e.message });
    }
}

module.exports = {
    step1,
    step2,
    step3,
    getPatients,
    getPatientDetails,
    addVital,
    addConsultation,
    addVaccination,
    getVaccinCatalog,
    getGrowthData,
    getVaccinationSchedule
};
