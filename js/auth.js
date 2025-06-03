const API_BASE = 'https://cloud-backend-2-ttrb.onrender.com';

function saveToken(token, stayLoggedIn) {
    if (stayLoggedIn) localStorage.setItem('authToken', token);
    else sessionStorage.setItem('authToken', token);
}

function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

function isAuthenticated() {
    return !!getToken();
}

function logout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}
function parseJwt(token) {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
}

function getUserEmail() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = parseJwt(token);
        return payload.email;
    } catch {
        return null;
    }
}
