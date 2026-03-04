// For Production (AWS & Cloudflare deployment)
const PROD_API_URL = "https://genidoc-backend.asenhaji2.workers.dev";
const LOCAL_IP = "192.168.234.195";

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? (window.location.port !== '5000' ? `http://${LOCAL_IP}:5000` : "")
    : PROD_API_URL;

async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Ne pas rediriger si on est déjà sur la page de login pour éviter un crash
        if (!window.location.pathname.includes('/auth/login.html')) {
            window.location.href = '/auth/login.html';
        }
    }

    let data;
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
        data = await response.json();
    } else {
        const text = await response.text();
        data = { message: text || `Erreur ${response.status}` };
    }

    if (!response.ok) {
        throw new Error(data.message || 'Une erreur est survenue');
    }
    return data;
}

const api = {
    // Auth
    login: (email, password) => apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    }),
    signup: (userData) => apiFetch('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify(userData)
    }),
    getMe: () => apiFetch('/api/auth/me'),

    // Admin
    admin: {
        step1: (data) => apiFetch('/api/admin/onboarding/step1', { method: 'POST', body: JSON.stringify(data) }),
        step2: (formData) => fetch(`${API_BASE}/api/admin/onboarding/step2`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        }).then(r => r.json()),
        step3: () => apiFetch('/api/admin/onboarding/step3', { method: 'POST' }),
        getStats: () => apiFetch('/api/admin/dashboard/stats'),
        getPediatres: () => apiFetch('/api/admin/pediatres'),
        getPendingPediatres: () => apiFetch('/api/admin/pediatres/pending'),
        updatePediatreStatus: (id, status) => apiFetch('/api/admin/pediatres/update-status', {
            method: 'POST',
            body: JSON.stringify({ pediatre_id: id, status })
        }),
        sendInvitation: (data) => apiFetch('/api/admin/invitations/send', { method: 'POST', body: JSON.stringify(data) }),
        getInvitations: () => apiFetch('/api/admin/invitations')
    },

    // Pédiatre
    pediatre: {
        step1: (data) => apiFetch('/api/pediatre/onboarding/step1', { method: 'POST', body: JSON.stringify(data) }),
        step2: (formData) => fetch(`${API_BASE}/api/pediatre/onboarding/step2`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        }).then(r => r.json()),
        step3: () => apiFetch('/api/pediatre/onboarding/step3', { method: 'POST' }),
        getPatients: () => apiFetch('/api/pediatre/patients'),
        getPatientDetails: (id) => apiFetch(`/api/pediatre/patients/${id}`),
        getGrowthData: (id) => apiFetch(`/api/pediatre/patients/${id}/growth`),
        getVaccinationSchedule: (id) => apiFetch(`/api/pediatre/patients/${id}/schedule`),
        addVital: (data) => apiFetch('/api/pediatre/patients/vitals', { method: 'POST', body: JSON.stringify(data) }),
        addConsultation: (data) => apiFetch('/api/pediatre/patients/consultations', { method: 'POST', body: JSON.stringify(data) }),
        addVaccination: (data) => apiFetch('/api/pediatre/patients/vaccinations', { method: 'POST', body: JSON.stringify(data) }),
        getVaccins: () => apiFetch('/api/pediatre/catalog/vaccins')
    },

    // Tuteur
    tuteur: {
        step1: (data) => apiFetch('/api/tuteur/onboarding/step1', { method: 'POST', body: JSON.stringify(data) }),
        step2: (formData) => fetch(`${API_BASE}/api/tuteur/onboarding/step2`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        }).then(r => r.json()),
        step3: () => apiFetch('/api/tuteur/onboarding/step3', { method: 'POST' }),
        getEnfants: () => apiFetch('/api/tuteur/enfants'),
        getCarnet: (id) => apiFetch(`/api/tuteur/enfants/${id}/carnet`),
        getNotifications: () => apiFetch('/api/tuteur/notifications'),
        createUrgence: (data) => apiFetch('/api/tuteur/urgences', { method: 'POST', body: JSON.stringify(data) })
    }
};

window.genidocApi = api;
