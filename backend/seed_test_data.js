const bcrypt = require("bcryptjs");
const db = require("./src/db");

async function seed() {
    console.log("Starting seeding test medical record...");
    try {
        // 0. Create Test Pediatre if not exists
        const email = "dr.lahlou@genidoc.ma";
        const password_hash = await bcrypt.hash("test1234", 10);

        let pediatreId;
        const [existing] = await db.execute("SELECT genidoc_user_id FROM genidoc_auth_users WHERE email = ?", [email]);

        if (existing.length) {
            pediatreId = existing[0].genidoc_user_id;
            console.log(`Pediatre LAHLOU already exists (ID: ${pediatreId})`);
        } else {
            const [insUser] = await db.execute(
                "INSERT INTO genidoc_auth_users (nom, prenom, email, password_hash, role) VALUES (?, ?, ?, ?, ?)",
                ["LAHLOU", "Badreddine", email, password_hash, "PEDIATRE"]
            );
            pediatreId = insUser.insertId;
            console.log(`Created Pediatre: Dr. Badreddine LAHLOU (ID: ${pediatreId})`);

            // Setup profile and onboarding
            await db.execute("INSERT INTO genidoc_pediatre_profile (genidoc_user_id, ville, specialite) VALUES (?, ?, ?)", [pediatreId, "Casablanca", "Pédiatrie"]);
            await db.execute("INSERT INTO genidoc_onboarding (genidoc_user_id, role, current_step, is_completed) VALUES (?, 'PEDIATRE', 3, 1)", [pediatreId]);

            // Link to a default org (ID 1)
            try {
                await db.execute("INSERT INTO genidoc_user_organisation (genidoc_user_id, genidoc_org_id, status) VALUES (?, 1, 'ACTIVE')", [pediatreId]);
            } catch (e) { console.warn("Could not link to org 1."); }
        }

        // 1. Create Patient
        const [enfantResult] = await db.execute(
            "INSERT INTO genidoc_enfant (nom, prenom, date_naissance, sexe) VALUES (?, ?, ?, ?)",
            ["SENHAJI", "Anas", "2023-05-15", "M"]
        );
        const enfantId = enfantResult.insertId;
        console.log(`Created child: SENHAJI Anas (ID: ${enfantId})`);

        await db.execute("INSERT INTO genidoc_pediatre_enfant (genidoc_user_id, genidoc_enfant_id) VALUES (?, ?)", [pediatreId, enfantId]);

        const vitals = [
            { date: '2023-06-01', w: 4.2, h: 54, t: 36.8 },
            { date: '2023-09-15', w: 7.5, h: 68, t: 37.1 },
            { date: '2024-01-10', w: 9.8, h: 76, t: 36.5 },
            { date: '2024-05-20', w: 11.2, h: 82, t: 36.7 }
        ];

        for (const v of vitals) {
            await db.execute(
                `INSERT INTO genidoc_vital_enfant 
                (genidoc_enfant_id, poids_kg, taille_cm, temperature_c, measured_at) 
                VALUES (?, ?, ?, ?, ?)`,
                [enfantId, v.w, v.h, v.t, v.date]
            );
        }
        console.log("Added 4 vital records.");

        // 3. Add some Consultations
        const consultations = [
            { date: '2023-09-15', motif: 'Fièvre et toux', diag: 'Rhinopharyngite légère', ord: 'Doliprane sirop, lavage nasal' },
            { date: '2024-05-20', motif: 'Check-up 1 an', diag: 'Enfant en bonne santé, croissance normale', ord: 'Continuer Vitamine D' }
        ];

        // Need a Pediatre and Org ID. We'll pick ID 1 for both as a guess for test env.
        // If they don't exist, this might fail, but let's try.
        for (const c of consultations) {
            try {
                await db.execute(
                    `INSERT INTO genidoc_consultation 
                    (genidoc_org_id, genidoc_enfant_id, genidoc_pediatre_user_id, motif, diagnostic, ordonnance, consulted_at) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [1, enfantId, 1, c.motif, c.diag, c.ord, c.date]
                );
            } catch (err) {
                console.warn("Could not insert consultation (Pediatre/Org 1 might not exist). Carrying on...");
            }
        }
        console.log("Seeding complete!");

        console.log("\n-------------------------------------------");
        console.log("TEST LINK FOR QR CODE / NFC:");
        console.log(`http://localhost:3000/frontend/src/public/scan.html?id=${enfantId}`);
        console.log("-------------------------------------------\n");

        process.exit(0);
    } catch (e) {
        console.error("Seeding failed:", e);
        process.exit(1);
    }
}

seed();
