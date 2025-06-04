async function init() {
    const token = getToken();
    const userFolder = getUserFolder()?.replace(/\/$/, '');
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
        fotos: { id: 'fotos', name: 'Fotos', parent: null, items: [], subfolders: [] },
        alben: { id: 'alben', name: 'Alben', parent: null, items: [], subfolders: [] },
        dateien: { id: 'dateien', name: 'Dateien', parent: null, items: [], subfolders: [] },
        sync: { id: 'sync', name: 'Sync', parent: null, items: [], subfolders: [] }
    };

    data.forEach(entry => {
        const key = entry.Key;
        if (!key || !key.startsWith(userFolder)) return;

        const relKey = key.replace(userFolder + '/', '');
        const isFolder = key.endsWith('/');
        const parts = relKey.split('/').filter(Boolean);
        const name = parts.at(-1);
        const fullPath = parts.join('/');
        const parentPath = parts.slice(0, -1).join('/');

        const top = parts[0];
        if (!folders[top]) {
            folders[top] = { id: top, name: top, items: [], subfolders: [], parent: null };
        }

        if (isFolder) {
            for (let i = 1; i <= parts.length; i++) {
                const segPath = parts.slice(0, i).join('/');
                const parent = parts.slice(0, i - 1).join('/') || top;
                const segName = parts[i - 1];

                if (!folders[parent]) {
                    folders[parent] = {
                        id: parent,
                        name: segName,
                        items: [],
                        subfolders: [],
                        parent: parent.includes('/') ? parent.split('/').slice(0, -1).join('/') : top
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

                if (!folders[parent].subfolders.includes(segPath)) {
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
                    parent: parentPath.includes('/') ? parentPath.split('/').slice(0, -1).join('/') : top
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

    const lastView = sessionStorage.getItem('lastView');
    const lastPath = JSON.parse(sessionStorage.getItem('lastPath') || '[]');

    if (lastView && Array.isArray(lastPath)) {
        currentPath = lastPath;
        switchViewTo(lastView);
    } else {
        currentPath = [];
        switchViewTo('fotos');
    }

    sessionStorage.setItem('lastPath', JSON.stringify(currentPath));
}
