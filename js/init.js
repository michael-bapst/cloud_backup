async function init() {
    const token = getToken();
    const userFolder = getUserFolder();
    if (!token || !userFolder) return (window.location.href = 'index.html');

    const res = await fetch(`${API_BASE}/list-full`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
        UIkit.notification({ message: 'Ordnerstruktur konnte nicht geladen werden', status: 'danger' });
        return;
    }

    const data = await res.json();

    folders = {
        'Home': { id: 'Home', name: 'Home', parent: null, items: [], subfolders: [] }
    };

    data.forEach(entry => {
        const key = entry.Key;
        if (!key || !key.startsWith(userFolder)) return;

        const isFolder = key.endsWith('/');
        const parts = key.split('/').filter(Boolean);
        const name = parts.at(-1);
        const fullPath = parts.join('/');
        const parentPath = parts.slice(0, -1).join('/') || 'Home';

        if (isFolder) {
            for (let i = 1; i <= parts.length; i++) {
                const segPath = parts.slice(0, i).join('/');
                const parent = parts.slice(0, i - 1).join('/') || 'Home';
                const segName = parts[i - 1];

                if (!folders[parent]) {
                    folders[parent] = {
                        id: parent,
                        name: segName,
                        items: [],
                        subfolders: [],
                        parent: parent.includes('/') ? parent.split('/').slice(0, -1).join('/') : 'Home'
                    };
                }

                if (!folders[segPath]) {
                    folders[segPath] = {
                        id: segPath,
                        name: segName,
                        items: [],
                        subfolders: [],
                        parent
                    };
                }

                if (!folders[parent].subfolders.includes(segPath) && segPath !== parent) {
                    folders[parent].subfolders.push(segPath);
                }
            }
        } else {
            if (!folders[parentPath]) {
                folders[parentPath] = {
                    id: parentPath,
                    name: parentPath.split('/').pop(),
                    items: [],
                    subfolders: [],
                    parent: parentPath.includes('/') ? parentPath.split('/').slice(0, -1).join('/') : 'Home'
                };
            }

            folders[parentPath].items.push({
                id: Date.now() + Math.random(),
                name,
                key,
                size: formatFileSize(entry.Size || 0),
                date: entry.LastModified?.split('T')[0] || ''
            });
        }
    });

    const baseKey = userFolder.replace(/\/$/, '');
    if (!folders['Home'] && folders[baseKey]) {
        folders['Home'] = folders[baseKey];
    }

    const basePath = userFolder.split('/').filter(Boolean);
    const lastView = sessionStorage.getItem('lastView');
    const lastPath = JSON.parse(sessionStorage.getItem('lastPath') || '[]');

    if (lastView && Array.isArray(lastPath) && lastPath.join('/').startsWith(userFolder)) {
        currentPath = lastPath;
        switchViewTo(lastView);
    } else {
        currentPath = basePath;
        switchViewTo('fotos');
    }

    sessionStorage.setItem('lastPath', JSON.stringify(currentPath));
}
