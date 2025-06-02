function createFolderCard(f) {
    const date = new Date().toLocaleDateString('de-DE');
    const safeId = encodeURIComponent(f.id);

    const div = document.createElement('div');
    div.className = 'album-card';

    const thumbnailWrapper = document.createElement('div');
    thumbnailWrapper.className = 'album-thumbnail';

    // Bild-Vorschau als Platzhalter
    thumbnailWrapper.innerHTML = `<span uk-icon="icon: image; ratio: 2" class="album-placeholder-icon"></span>`;

    // Asynchron Bild nachladen (wenn nicht schon vorhanden)
    const loadPreview = async () => {
        let mediaItem = f.items?.find(i => isMediaFile(i.name));

        // Wenn leer: Ordnerinhalt durchsuchen
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
                thumbnailWrapper.innerHTML = ''; // Icon entfernen
                thumbnailWrapper.appendChild(img);
            } catch {
                // kein Bild verfügbar
            }
        }
    };

    loadPreview();

    div.innerHTML = `
        <div class="album-card-inner" onclick="navigateToFolder(decodeURIComponent('${safeId}'))">
            ${thumbnailWrapper.outerHTML}
            <div class="album-meta">
                <div class="album-title">${f.name}</div>
                <div class="album-sub">${date}</div>
            </div>
        </div>
        <div class="album-actions">
            <button class="uk-button uk-button-default uk-button-small" onclick="event.stopPropagation(); editFolder(decodeURIComponent('${safeId}'), event)">
                <span uk-icon="pencil"></span>
            </button>
            <button class="uk-button uk-button-default uk-button-small" onclick="event.stopPropagation(); deleteFolder(decodeURIComponent('${safeId}'), event)">
                <span uk-icon="trash"></span>
            </button>
        </div>
    `;

    return div;
}

function navigateToFolder(path) {
    if (!folders[path]) {
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }
    currentPath = path.split('/');
    switchViewTo('alben');
}

let folderToDelete = null;

function editFolder(path, event) {
    event.stopPropagation();
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

async function handleRename(e) {
    e.preventDefault();
    const oldName = document.getElementById('renameOldName').value.trim();
    const newName = document.getElementById('renameNewName').value.trim();
    if (!newName || newName === oldName) return;

    const token = getToken();
    const currentFullPath = currentPath.length === 0 ? 'Home' : currentPath.join('/');
    let oldPath = null;

    for (const key in folders) {
        const f = folders[key];
        if (f.name === oldName && f.parent === currentFullPath) {
            oldPath = key;
            break;
        }
    }

    if (!oldPath) {
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

    if (activeView === 'alben') {
        renderContent();
    } else if (activeView === 'fotos') {
        renderFotos();
    }
}

function deleteFolder(path, event) {
    event.stopPropagation();
    folderToDelete = path;

    const f = folders[path];
    if (!f) {
        UIkit.notification({ message: `Ordner "${path}" nicht gefunden`, status: 'danger' });
        return;
    }

    document.getElementById('deleteConfirmText').textContent = `Ordner "${f.name}" wirklich löschen?`;
    UIkit.modal('#deleteModal').show();
}

async function confirmDelete() {
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

    if (activeView === 'alben') {
        renderContent();
    } else if (activeView === 'fotos') {
        renderFotos();
    } else if (activeView === 'dateien') {
        renderDateien();
    }
}

async function handleNewFolder(e) {
    e.preventDefault();

    const input = document.querySelector('#newFolderForm input[type="text"]');
    const name = input.value.trim();

    if (!name) {
        UIkit.notification({ message: 'Ordnername fehlt', status: 'danger' });
        return;
    }

    const token = getToken();
    const current = currentPath.join('/') === 'Home' ? '' : currentPath.join('/');
    const fullPath = current ? `${current}/${name}` : name;
    const parentPath = current || 'Home';

    if (folders[fullPath]) {
        UIkit.notification({ message: 'Ordner existiert bereits', status: 'warning' });
        return;
    }

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
        UIkit.notification({
            message: err?.error || 'Ordner konnte nicht erstellt werden',
            status: 'danger'
        });
        return;
    }

    folders[fullPath] = {
        id: fullPath,
        name,
        parent: parentPath,
        items: [],
        subfolders: []
    };

    if (!folders[parentPath]) {
        folders[parentPath] = {
            id: parentPath,
            name: parentPath.split('/').pop(),
            items: [],
            subfolders: [],
            parent: parentPath.includes('/') ? parentPath.split('/').slice(0, -1).join('/') : 'Home'
        };
    }

    if (!folders[parentPath].subfolders.includes(fullPath)) {
        folders[parentPath].subfolders.push(fullPath);
    }

    UIkit.modal('#newFolderModal').hide();
    input.value = '';
    renderContent();
}
