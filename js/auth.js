const API_BASE = 'https://cloud-backend-stxe.onrender.com';

function saveToken(token, stayLoggedIn) {
    if (stayLoggedIn) localStorage.setItem('authToken', token);
    else sessionStorage.setItem('authToken', token);

    // Benutzerordner ableiten aus JWT (dekodieren)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const email = payload.email;
    localStorage.setItem('userFolder', `users/${email}/`);
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
