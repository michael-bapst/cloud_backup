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

    folders = {};

    data.forEach(entry => {
        const key = entry.Key;
        if (!key || !key.startsWith(userFolder)) return;

        const isFolder = key.endsWith('/');
        const relative = key.slice(userFolder.length); // z.B. "fotos/bild1.jpg"
        const parts = relative.split('/').filter(Boolean);

        if (parts.length === 0) return;

        const name = parts.at(-1);
        const fullPath = parts.join('/');
        const parentPath = parts.slice(0, -1).join('/') || null;

        if (isFolder) {
            for (let i = 1; i <= parts.length; i++) {
                const segPath = parts.slice(0, i).join('/');
                const parent = parts.slice(0, i - 1).join('/') || null;
                const segName = parts[i - 1];

                if (!folders[parent]) {
                    folders[parent] = {
                        id: parent,
                        name: parent?.split('/').pop() || '',
                        items: [],
                        subfolders: [],
                        parent: parent?.includes('/') ? parent.split('/').slice(0, -1).join('/') : null
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
                    parent: parentPath.includes('/') ? parentPath.split('/').slice(0, -1).join('/') : null
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

    const basePath = userFolder.split('/').filter(Boolean);
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