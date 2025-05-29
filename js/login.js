document.addEventListener('DOMContentLoaded', () => {
    if (isAuthenticated()) {
        window.location.href = 'app.html';
        return;
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
});
