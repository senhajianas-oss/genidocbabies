function normalizeRole(input) {
  if (!input) return null;
  const v = String(input).trim().toUpperCase();
  if (v === "GENIDOC_PARENT") return "TUTEUR";
  if (v === "GENIDOC_PEDIATRE") return "PEDIATRE";
  if (["ADMIN", "TUTEUR", "PEDIATRE"].includes(v)) return v;
  return null;
}

module.exports = { normalizeRole };