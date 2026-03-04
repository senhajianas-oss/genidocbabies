import { AutoRouter, cors } from 'itty-router';
import { setEnv } from './db';
import authCtrl from './controllers/auth.controllers';
import adminCtrl from './controllers/admin.controller';
import pedCtrl from './controllers/pediatre.controller';
import tutCtrl from './controllers/tuteur.controller';
import jwt from 'jsonwebtoken';

const { preflight, corsify } = cors();
const router = AutoRouter({
    before: [preflight],
    finally: [corsify],
});

// Helper to wrap Express-style controllers for itty-router
const wrap = (controllerFn) => async (request, env) => {
    setEnv(env); // Set env for db.js

    const url = new URL(request.url);
    const req = {
        body: request.method !== 'GET' ? await request.json().catch(() => ({})) : {},
        params: request.params,
        query: Object.fromEntries(url.searchParams),
        headers: Object.fromEntries(request.headers),
        user: request.user,
    };

    let resStatus = 200;
    let responseObj = null;

    const res = {
        status: (s) => { resStatus = s; return res; },
        json: (data) => { responseObj = data; return res; },
    };

    await controllerFn(req, res);

    return new Response(JSON.stringify(responseObj), {
        status: resStatus,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
    });
};

// Middleware: Auth
const authMiddleware = async (request, env) => {
    const h = request.headers.get("Authorization") || "";
    const token = h.startsWith("Bearer ") ? h.slice(7) : null;
    if (!token) return new Response(JSON.stringify({ message: "Token manquant" }), { status: 401 });

    try {
        request.user = jwt.verify(token, env.JWT_SECRET || "genidoc-secret-key-2024");
    } catch {
        return new Response(JSON.stringify({ message: "Token invalide" }), { status: 401 });
    }
};

// Routes: Auth
router.post('/api/auth/signup', wrap(authCtrl.signup));
router.post('/api/auth/login', wrap(authCtrl.login));
router.get('/api/auth/me', authMiddleware, wrap(authCtrl.me));

// Routes: Admin
router.post('/api/admin/onboarding/step1', authMiddleware, wrap(adminCtrl.step1));
router.post('/api/admin/onboarding/step3', authMiddleware, wrap(adminCtrl.step3));
router.get('/api/admin/dashboard/stats', authMiddleware, wrap(adminCtrl.getDashboardStats));
router.get('/api/admin/pediatres/pending', authMiddleware, wrap(adminCtrl.getPendingPediatres));
router.post('/api/admin/pediatres/update-status', authMiddleware, wrap(adminCtrl.updatePediatreStatus));
router.post('/api/admin/invitations/send', authMiddleware, wrap(adminCtrl.sendInvitation));
router.get('/api/admin/invitations', authMiddleware, wrap(adminCtrl.getInvitations));
router.get('/api/admin/pediatres', authMiddleware, wrap(adminCtrl.getAllPediatres));

// Routes: Pediatre
router.post('/api/pediatre/onboarding/step1', authMiddleware, wrap(pedCtrl.step1));
router.post('/api/pediatre/onboarding/step3', authMiddleware, wrap(pedCtrl.step3));
router.get('/api/pediatre/patients', authMiddleware, wrap(pedCtrl.getPatients));
router.get('/api/pediatre/patients/:id', authMiddleware, wrap(pedCtrl.getPatientDetails));
router.get('/api/pediatre/patients/:id/growth', authMiddleware, wrap(pedCtrl.getGrowthData));
router.get('/api/pediatre/patients/:id/schedule', authMiddleware, wrap(pedCtrl.getVaccinationSchedule));
router.post('/api/pediatre/patients/vitals', authMiddleware, wrap(pedCtrl.addVital));
router.post('/api/pediatre/patients/consultations', authMiddleware, wrap(pedCtrl.addConsultation));
router.post('/api/pediatre/patients/vaccinations', authMiddleware, wrap(pedCtrl.addVaccination));
router.get('/api/pediatre/catalog/vaccins', authMiddleware, wrap(pedCtrl.getVaccins));

// Routes: Tuteur
router.post('/api/tuteur/onboarding/step1', authMiddleware, wrap(tutCtrl.step1));
router.post('/api/tuteur/onboarding/step3', authMiddleware, wrap(tutCtrl.step3));
router.get('/api/tuteur/enfants', authMiddleware, wrap(tutCtrl.getEnfants));
router.get('/api/tuteur/enfants/:id/carnet', authMiddleware, wrap(tutCtrl.getCarnet));
router.get('/api/tuteur/notifications', authMiddleware, wrap(tutCtrl.getNotifications));
router.post('/api/tuteur/urgences', authMiddleware, wrap(tutCtrl.createUrgence));

router.get('/health', () => ({ ok: true }));

export default {
    fetch: (request, env, ctx) => router.fetch(request, env, ctx),
};
