// auth.js

const TOKEN_KEY = 'authToken';

function saveToken(token, stayLoggedIn) {
    (stayLoggedIn ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
}

function getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
}

function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
}

function logout() {
    removeToken();
    window.location.href = 'index.html';
}

function parseJwt(token) {
    try {
        const payload = token.split('.')[1];
        return JSON.parse(atob(payload));
    } catch {
        return null;
    }
}

function getUserEmail() {
    const token = getToken();
    const payload = parseJwt(token);
    return payload?.email || null;
}
