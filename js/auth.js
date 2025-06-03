const API_BASE = 'https://cloud-backend-stxe.onrender.com';

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
