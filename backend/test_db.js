
const db = require("./src/db");

async function init() {
    try {
        const [tables] = await db.execute("SHOW TABLES");
        console.log("Tables:", tables.map(t => Object.values(t)[0]));

        const [enfants] = await db.execute("SELECT * FROM genidoc_enfant");
        console.log("Enfants counts:", enfants.length);

        if (enfants.length === 0) {
            console.log("Creating test child...");
            const [result] = await db.execute(
                "INSERT INTO genidoc_enfant (nom, prenom, date_naissance, sexe) VALUES (?, ?, ?, ?)",
                ["Test", "Enfant", "2023-01-01", "M"]
            );
            console.log("Test child created with ID:", result.insertId);
        } else {
            console.log("First child:", enfants[0]);
        }

        process.exit(0);
    } catch (e) {
        console.error("Error:", e);
        process.exit(1);
    }
}

init();
