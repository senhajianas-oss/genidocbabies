const express = require("express");
const router = express.Router();

const { auth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const adminController = require("../controllers/admin.controller");
const upload = require("../middleware/upload");

router.get("/ping", (req, res) => res.json({ ok: true, route: "/api/admin/ping" }));

router.post("/onboarding/step1", auth, requireRole("ADMIN"), adminController.step1);
router.post("/onboarding/step2", auth, requireRole("ADMIN"), upload.array("documents"), adminController.step2);
router.post("/onboarding/step3", auth, requireRole("ADMIN"), adminController.step3);

router.get("/dashboard/stats", auth, requireRole("ADMIN"), adminController.getDashboardStats);
router.get("/pediatres", auth, requireRole("ADMIN"), adminController.getAllPediatres);
router.get("/pediatres/pending", auth, requireRole("ADMIN"), adminController.getPendingPediatres);
router.post("/pediatres/update-status", auth, requireRole("ADMIN"), adminController.updatePediatreStatus);

router.post("/invitations/send", auth, requireRole("ADMIN"), adminController.sendInvitation);
router.get("/invitations", auth, requireRole("ADMIN"), adminController.getInvitations);

module.exports = router;
