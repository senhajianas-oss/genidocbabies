/**
 * GeniDoc Babies - Shared UI & Auth Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const userJson = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (!userJson || !token) {
        window.location.href = '/frontend/src/public/auth/login.html';
        return;
    }

    const user = JSON.parse(userJson);

    // Update profile info immediately from localStorage
    const updateUI = (u) => {
        const userNameElem = document.getElementById('ped_nom_value') || document.getElementById('admin_nom_value') || document.getElementById('tuteur_nom_value');
        if (userNameElem) {
            userNameElem.textContent = (u.role === 'PEDIATRE' ? 'Dr. ' : '') + `${u.nom} ${u.prenom}`;
        }
    };

    updateUI(user);

    // Then refresh from backend to be sure
    if (window.genidocApi && window.genidocApi.getMe) {
        window.genidocApi.getMe().then(data => {
            if (data && data.user) {
                localStorage.setItem('user', JSON.stringify(data.user));
                updateUI(data.user);
            }
        }).catch(err => console.error("Could not refresh user info", err));
    }

    // Handle logout links
    const logoutLinks = document.querySelectorAll('a[href*="login.html"]');
    logoutLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/frontend/src/public/auth/login.html';
        });
    });
});

window.formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};
