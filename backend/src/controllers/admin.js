const genidoc_db = require("../db");

function genidocOrganisationCode(len = 8) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let result = "";
    for (let i = 0; i < len; i++) result += chars[Math.floor(Math.random() * chars.length)];
    return result;
}

async function genidocCreateUniqueOrganisationCode(cgdb) {
    for (let i = 0; i < 12; i++) {
        const code = genidocOrganisationCode(8);
        const [ligne] = await cgdb.execute(
            "SELECT genidoc_org_id FROM genidoc_organisation WHERE org_code = :code LIMIT 1",
            {
                code
            }
        );
        if (!ligne.length) return code;
    }
    throw new Error("Impossible de gen un org_code unique")
}

async function genidoc_first1(req, res) {
    const unique_genidocorgid = req.user?.user_id;

    const
}