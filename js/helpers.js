const API_BASE = 'https://cloud-backend-2-ttrb.onrender.com';

export function getToken() {
    return localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
}

export function getUserFolderTrimmed() {
    const f = localStorage.getItem('userFolder') || '';
    return f.endsWith('/') ? f.slice(0, -1) : f;
}

export function handleLogout() {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    window.location.href = 'index.html';
}

export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + sizes[i];
}

export function showLoading(container) {
    container.innerHTML = `
        <div class="uk-width-1-1 uk-text-center uk-margin-top uk-margin-bottom">
            <span uk-spinner="ratio: 1.5"></span>
        </div>
    `;
}
