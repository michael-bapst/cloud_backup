import { saveToken, isAuthenticated } from './auth.js';
import { API_BASE, getUserFolderTrimmed } from './helpers.js';

document.addEventListener('DOMContentLoaded', () => {
    const hasToken = isAuthenticated();
    const folder = getUserFolderTrimmed();

    if (hasToken && folder) {
        window.location.href = 'app.html';
        return;
    }

    if (hasToken && !folder) {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('userFolder');
    }

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const stayLoggedIn = document.getElementById('stayLoggedIn').checked;

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user: email, pass: password })
            });

            if (!response.ok) throw new Error('Login fehlgeschlagen');

            const data = await response.json();
            saveToken(data.token, stayLoggedIn);
            window.location.href = 'app.html';
        } catch (err) {
            UIkit.notification({
                message: err.message || 'Fehler beim Login',
                status: 'danger',
                timeout: 3000
            });
        }
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('service-worker.js').catch(console.error);
    }
});
