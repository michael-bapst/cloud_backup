import { globals } from './globals.js';
import { getToken, getUserFolderTrimmed, API_BASE } from './helpers.js';
import { getSignedFileUrl, isMediaFile } from './media.js';
import { switchViewTo } from './views.js';

function createFolderCard(f) {
    const { folders } = globals;
    const div = document.createElement('div');
    div.className = 'album-card';

    const thumbnailWrapper = document.createElement('div');
    thumbnailWrapper.className = 'album-thumbnail';
    thumbnailWrapper.innerHTML = `<span uk-icon="icon: image; ratio: 2" class="album-placeholder-icon"></span>`;

    const items = f.items?.length ? f.items : folders[f.id]?.items || [];
    const dateStr = items.length ? new Date(items[0].date).toLocaleDateString('de-DE') : '–';

    const loadPreview = async () => {
        let mediaItem = items.find(i => isMediaFile(i.name));
        if (!mediaItem && folders[f.id]?.items?.length) {
            mediaItem = folders[f.id].items.find(i => isMediaFile(i.name));
        }

        if (mediaItem) {
            const img = document.createElement('img');
            img.alt = mediaItem.name;
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '8px';
            try {
                const url = await getSignedFileUrl(mediaItem.key);
                img.src = url;
                thumbnailWrapper.innerHTML = '';
                thumbnailWrapper.appendChild(img);
            } catch {
                // kein Bild verfügbar
            }
        }
    };

    loadPreview();

    const inner = document.createElement('div');
    inner.className = 'album-card-inner';
    inner.onclick = () => navigateToFolder(f.id);

    const thumb = document.createElement('div');
    thumb.className = 'album-thumbnail';
    thumb.appendChild(thumbnailWrapper);

    const meta = document.createElement('div');
    meta.className = 'album-meta';
    meta.innerHTML = `
        <div class="album-title">${f.name}</div>
        <div class="album-sub">${dateStr}</div>
    `;

    inner.appendChild(thumb);
    inner.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'album-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'uk-button uk-button-default uk-button-small';
    editBtn.innerHTML = '<span uk-icon="pencil"></span>';
    editBtn.onclick = (e) => {
        e.stopPropagation();
        editFolder(f.id, e);
    };

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'uk-button uk-button-default uk-button-small';
    deleteBtn.innerHTML = '<span uk-icon="trash"></span>';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteFolder(f.id, e);
    };

    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    div.appendChild(inner);
    div.appendChild(actions);

    return div;
}

function navigateToFolder(path) {
    const { folders } = globals;
    if (!folders[path]) {
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }
    globals.currentPath = [path];
    switchViewTo('alben');
}

let folderToDelete = null;

function editFolder(path, event) {
    event.stopPropagation();
    const { folders } = globals;
    const f = folders[path];
    if (!f) {
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }

    document.getElementById('renameOldName').value = f.name;
    document.getElementById('renameNewName').value = f.name;
    folderToDelete = path;
    UIkit.modal('#renameModal').show();
}

export async function handleRename(e) {
    e.preventDefault();
    const { folders, currentPath, activeView } = globals;

    const oldName = document.getElementById('renameOldName').value.trim();
    const newName = document.getElementById('renameNewName').value.trim();
    if (!newName || newName === oldName) return;

    const token = getToken();
    const currentFullPath = currentPath.join('/');
    let oldPath = null;

    for (const key in folders) {
        const f = folders[key];
        const fParent = typeof f.parent === 'string' ? f.parent.replace(/\/$/, '') : '';
        const pathClean = currentFullPath.replace(/\/$/, '');

        if (f.name === oldName && fParent === pathClean) {
            oldPath = key;
            break;
        }
    }

    if (!oldPath || !folders[oldPath]) {
        UIkit.notification({ message: 'Pfad nicht gefunden', status: 'danger' });
        return;
    }

    const parts = oldPath.split('/');
    parts[parts.length - 1] = newName;
    const newPath = parts.join('/');

    const res = await fetch(`${API_BASE}/rename`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ oldPath, newPath })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({ message: err?.error || 'Umbenennen fehlgeschlagen', status: 'danger' });
        return;
    }

    const f = folders[oldPath];
    folders[newPath] = { ...f, name: newName };
    const parent = f.parent;
    if (folders[parent]) {
        folders[parent].subfolders = folders[parent].subfolders.map(n => n === oldPath ? newPath : n);
    }
    delete folders[oldPath];

    UIkit.modal('#renameModal').hide();

    if (activeView === 'alben') renderContent();
    else if (activeView === 'fotos') renderFotos();
}

function deleteFolder(path, event) {
    event.stopPropagation();
    const { folders } = globals;
    folderToDelete = path;

    const f = folders[path];
    if (!f) {
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }

    document.getElementById('deleteConfirmText').textContent = `Ordner "${f.name}" wirklich löschen?`;
    UIkit.modal('#deleteModal').show();
}

export async function confirmDelete() {
    const { folders, activeView } = globals;
    const fullPath = folderToDelete;
    const token = getToken();

    if (!folders[fullPath]) {
        UIkit.notification({ message: 'Pfad konnte nicht ermittelt werden', status: 'danger' });
        return;
    }

    const res = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: fullPath })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({ message: err?.error || 'Löschen fehlgeschlagen', status: 'danger' });
        return;
    }

    const parent = folders[fullPath]?.parent;
    if (parent && folders[parent]) {
        folders[parent].subfolders = folders[parent].subfolders.filter(n => n !== fullPath);
    }

    delete folders[fullPath];
    UIkit.modal('#deleteModal').hide();
    UIkit.notification({ message: 'Ordner gelöscht', status: 'success' });

    switchViewTo(activeView);
}

export async function handleNewFolder(e) {
    e.preventDefault();
    const { activeView, folders } = globals;

    const input = document.querySelector('#newFolderForm input[type="text"]');
    const name = input.value.trim();

    if (!name) {
        UIkit.notification({ message: 'Ordnername fehlt', status: 'danger' });
        return;
    }

    const token = getToken();
    const userFolder = getUserFolderTrimmed();

    let basePath = '';
    if (activeView === 'fotos') basePath = `${userFolder}/fotos`;
    else if (activeView === 'alben') basePath = `${userFolder}/alben`;
    else if (activeView === 'dateien') basePath = `${userFolder}/dateien`;
    else {
        UIkit.notification({ message: 'Ungültiger Speicherort', status: 'danger' });
        return;
    }

    const fullPath = `${basePath}/${name}`;

    const res = await fetch(`${API_BASE}/create-folder`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: fullPath })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({ message: err?.error || 'Ordner konnte nicht erstellt werden', status: 'danger' });
        return;
    }

    folders[fullPath] = {
        id: fullPath,
        name,
        parent: basePath,
        items: [],
        subfolders: []
    };

    if (!folders[basePath]) {
        folders[basePath] = {
            id: basePath,
            name: basePath.split('/').pop(),
            items: [],
            subfolders: [],
            parent: 'Home'
        };
    }

    if (!folders[basePath].subfolders.includes(fullPath)) {
        folders[basePath].subfolders.push(fullPath);
    }

    UIkit.modal('#newFolderModal').hide();
    input.value = '';
    switchViewTo('alben');
}
