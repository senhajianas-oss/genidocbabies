const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const tuteurController = require("../controllers/tuteur.controller");
const upload = require("../middleware/upload");

// Onboarding
router.post("/onboarding/step1", auth, requireRole("TUTEUR"), tuteurController.step1);
router.post("/onboarding/step2", auth, requireRole("TUTEUR"), upload.single("carnet_scan"), tuteurController.step2);
router.post("/onboarding/step3", auth, requireRole("TUTEUR"), tuteurController.step3);

// Enfants & Carnet
router.get("/enfants", auth, requireRole("TUTEUR"), tuteurController.getEnfants);
router.get("/enfants/:enfant_id/carnet", auth, requireRole("TUTEUR"), tuteurController.getCarnetSante);
router.get("/notifications", auth, requireRole("TUTEUR"), tuteurController.getNotifications);

// Urgences
router.post("/urgences", auth, requireRole("TUTEUR"), tuteurController.createUrgence);

module.exports = router;
