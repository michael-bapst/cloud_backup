function saveToken(token, stayLoggedIn) {
    try {
        if (stayLoggedIn) {
            localStorage.setItem('authToken', token);
        } else {
            sessionStorage.setItem('authToken', token);
        }

        const parts = token.split('.');
        if (parts.length !== 3) throw new Error("Ungültiges Token-Format");

        const payload = JSON.parse(atob(parts[1]));
        const email = payload.email;

        if (typeof email === 'string') {
            localStorage.setItem('userFolder', `users/${email.toLowerCase()}/`);
        } else {
            console.warn("Token enthält keine gültige Email:", payload);
        }

    } catch (err) {
        console.error("Token-Verarbeitung fehlgeschlagen:", err);
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('userFolder');
        alert("Ungültiger Login-Token. Bitte erneut anmelden.");
        window.location.href = 'index.html';
    }
}

function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function getUserFolder() {
    return localStorage.getItem('userFolder');
}

function isAuthenticated() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userFolder');
    window.location.href = 'index.html';
}
