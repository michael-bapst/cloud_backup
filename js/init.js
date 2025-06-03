// init.js

async function init() {
    const token = getToken();
    if (!token) return (window.location.href = 'index.html');

    const email = getUserEmail();
    const userPrefix = `users/${email}`;

    const res = await fetch(`${API_BASE}/list-full`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        UIkit.notification({ message: 'Ordnerstruktur konnte nicht geladen werden', status: 'danger' });
        return;
    }

    const data = await res.json();

    folders = {
        'Home': { id: 'Home', name: 'Home', items: [], subfolders: [], parent: null },
        [userPrefix]: { id: userPrefix, name: 'Meine Dateien', items: [], subfolders: [], parent: 'Home' }
    };

    data.forEach(entry => {
        const key = entry.Key;
        if (!key.startsWith(userPrefix)) return;

        const parts = key.split('/').filter(Boolean);
        const name = parts.at(-1);
        const fullPath = parts.join('/');
        const parentPath = parts.slice(0, -1).join('/') || userPrefix;
        const isFolder = key.endsWith('/');

        if (!folders[parentPath]) {
            folders[parentPath] = {
                id: parentPath,
                name: parentPath.split('/').pop(),
                items: [],
                subfolders: [],
                parent: parentPath.includes('/') ? parentPath.split('/').slice(0, -1).join('/') : userPrefix
            };
        }

        if (isFolder) {
            folders[fullPath] = {
                id: fullPath,
                name,
                items: [],
                subfolders: [],
                parent: parentPath
            };

            if (!folders[parentPath].subfolders.includes(fullPath)) {
                folders[parentPath].subfolders.push(fullPath);
            }
        } else {
            folders[parentPath].items.push({
                id: Date.now() + Math.random(),
                name,
                key,
                size: formatFileSize(entry.Size || 0),
                date: entry.LastModified?.split('T')[0] || ''
            });
        }
    });

    currentPath = [];
    switchViewTo('fotos');
}
