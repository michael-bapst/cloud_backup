window.currentPath = window.currentPath || [];
window.folders = window.folders || {};

let activeView = 'fotos';
let viewMode = 'grid';

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('#viewTabs li').forEach(li => {
        li.addEventListener('click', (e) => {
            e.preventDefault();
            const view = li.dataset.view;
            if (view) switchViewTo(view);
        });
    });

    document.getElementById('gridViewBtn')?.addEventListener('click', () => switchView('grid'));
    document.getElementById('listViewBtn')?.addEventListener('click', () => switchView('list'));
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);

    document.getElementById('uploadForm')?.addEventListener('submit', e => {
        if (typeof handleUpload === 'function') handleUpload(e);
    });

    document.getElementById('newFolderForm')?.addEventListener('submit', handleNewFolder);
    document.getElementById('renameForm')?.addEventListener('submit', handleRename);
    document.getElementById('confirmDeleteBtn')?.addEventListener('click', confirmDelete);

    document.getElementById('breadcrumb')?.addEventListener('click', e => {
        if (e.target.tagName === 'A') {
            e.preventDefault();
            const idx = Array.from(e.target.parentElement.parentElement.children)
                .indexOf(e.target.parentElement);
            navigateToPath(currentPath.slice(0, idx + 1));
        }
    });

    switchViewTo('fotos');
});

function switchViewTo(view) {
    const userFolder = getUserFolder()?.replace(/\/$/, '');
    if (!userFolder) return;

    if (view !== activeView) {
        if (view === 'fotos') {
            currentPath = [`${userFolder}/fotos`];
        } else if (view === 'alben') {
            currentPath = [`${userFolder}/alben`];
        } else if (view === 'dateien') {
            currentPath = [`${userFolder}/dateien`];
        } else if (view === 'sync') {
            currentPath = [`${userFolder}/sync`];
        } else {
            currentPath = [];
        }
    }

    activeView = view;

    document.querySelectorAll('#viewTabs li').forEach(li =>
        li.classList.toggle('uk-active', li.dataset.view === view)
    );

    const heading = document.getElementById('viewHeading');
    const toggleGroup = document.getElementById('viewModeToggles');
    const fabFotos = document.getElementById('fabFotos');
    const fabAlben = document.getElementById('fabAlben');
    const fabDateien = document.getElementById('fabDateien');

    const isInAlbumRoot = view === 'alben' && currentPath.length === 1;
    const isInAlbumFolder = view === 'alben' && currentPath.length > 1;

    if (heading) {
        heading.textContent =
            view === 'fotos' ? 'Fotos' :
                isInAlbumFolder ? `Alben / ${currentPath.at(-1)}` :
                    view === 'alben' ? 'Alben' :
                        view === 'dateien' ? 'Dateien' : '';
    }

    toggleGroup.style.display = (view === 'alben' || view === 'dateien') ? 'flex' : 'none';

    fabFotos.style.display = (view === 'fotos' || isInAlbumFolder) ? 'block' : 'none';
    fabAlben.style.display = isInAlbumRoot ? 'block' : 'none';
    fabDateien.style.display = view === 'dateien' ? 'block' : 'none';

    document.getElementById('breadcrumb')?.style.setProperty(
        'display',
        view === 'alben' && currentPath.length > 1 ? 'block' : 'none'
    );

    sessionStorage.setItem('lastView', view);
    sessionStorage.setItem('lastPath', JSON.stringify(currentPath));

    if (view === 'fotos') {
        renderFotos();
    } else if (view === 'alben') {
        if (currentPath.length === 1) {
            renderContent();
        } else {
            renderFotos();
        }
    } else if (view === 'dateien') {
        renderDateien();
    } else if (view === 'sync') {
        renderSyncView();
    }
}

function renderFotos() {
    const grid = document.getElementById('contentGrid');
    showLoading(grid);

    const path = currentPath.join('/');
    if (!folders[path]) {
        UIkit.notification({ message: `Pfad "${path}" nicht gefunden`, status: 'danger' });
        return;
    }

    const fotos = folders[path].items?.filter(i => isMediaFile(i.name)) || [];
    fotos.sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.createElement('div');
    container.className = 'uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l';
    container.setAttribute('uk-grid', '');

    fotos.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.appendChild(createFileCard(item));
        container.appendChild(wrapper);
    });

    grid.innerHTML = '';
    grid.appendChild(container);
    UIkit.update(grid);
}

function renderDateien() {
    const grid = document.getElementById('contentGrid');
    showLoading(grid);

    const path = `${getUserFolder()?.replace(/\/$/, '')}/dateien`;

    if (!folders[path]) {
        UIkit.notification({ message: `Pfad "${path}" nicht gefunden`, status: 'danger' });
        grid.innerHTML = `
            <div class="uk-alert uk-alert-warning" uk-alert>
                <p>Keine Dateien vorhanden.</p>
            </div>
        `;
        return;
    }

    const data = folders[path];
    const files = data.items.filter(i => !isMediaFile(i.name));
    files.sort((a, b) => new Date(b.date) - new Date(a.date));

    const container = document.createElement('div');
    container.className = 'uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l';
    container.setAttribute('uk-grid', '');

    files.forEach(file => {
        const cardWrapper = document.createElement('div');
        cardWrapper.appendChild(createFileCard(file));
        container.appendChild(cardWrapper);
    });

    grid.innerHTML = '';
    grid.appendChild(container);
    UIkit.update(grid);
}

function renderContent() {
    const grid = document.getElementById('contentGrid');
    showLoading(grid);

    const fullCurrentPath = currentPath.join('/');
    const data = folders[fullCurrentPath];

    if (!data) {
        UIkit.notification({ message: `Pfad "${fullCurrentPath}" nicht gefunden`, status: 'danger' });
        grid.innerHTML = `
            <div class="uk-alert uk-alert-warning" uk-alert>
                <p>Kein Inhalt gefunden.</p>
            </div>
        `;
        return;
    }

    const container = document.createElement('div');
    container.className = 'uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l';
    container.setAttribute('uk-grid', '');

    const frag = document.createDocumentFragment();

    if (data.subfolders.length) {
        data.subfolders.sort((a, b) => {
            const dA = new Date(folders[a].items?.[0]?.date || '1970-01-01');
            const dB = new Date(folders[b].items?.[0]?.date || '1970-01-01');
            return dB - dA;
        });

        data.subfolders.forEach(n => frag.appendChild(createFolderCard(folders[n])));
    }

    container.appendChild(frag);
    grid.innerHTML = '';
    grid.appendChild(container);
    UIkit.update(grid);

    updateBreadcrumb();
}

function switchView(mode) {
    viewMode = mode;
    document.getElementById('gridViewBtn')?.classList.toggle('uk-button-primary', mode === 'grid');
    document.getElementById('listViewBtn')?.classList.toggle('uk-button-primary', mode === 'list');
    renderContent();
}

function updateBreadcrumb() {
    const bc = document.getElementById('breadcrumb');
    if (!bc) return;
    bc.innerHTML = currentPath.map((p, i) =>
        i === currentPath.length - 1
            ? `<li><span>${p}</span></li>`
            : `<li><a href="#">${p}</a></li>`
    ).join('');
}

function navigateToPath(path) {
    currentPath = path;
    switchViewTo('alben');
}

function renderSyncView() {
    const grid = document.getElementById('contentGrid');
    grid.innerHTML = '';

    const heading = document.getElementById('viewHeading');
    if (heading) heading.textContent = 'Sync';

    const toggleGroup = document.getElementById('viewModeToggles');
    if (toggleGroup) toggleGroup.style.display = 'none';

    const wrapper = document.createElement('div');
    wrapper.className = 'uk-card uk-card-default uk-card-body';

    wrapper.innerHTML = `
      <div class="uk-margin-bottom">
        <label class="uk-form-label">Wähle einen lokalen Ordner (einmalig):</label>
        <div class="uk-form-controls">
          <input class="uk-input" type="file" id="syncFolderInput" webkitdirectory multiple />
        </div>
      </div>

      <button class="uk-button uk-button-primary uk-button-small" id="syncUploadBtn">
        <span uk-icon="upload"></span><span class="uk-margin-small-left">Hochladen</span>
      </button>

      <div id="syncResult" class="uk-margin-top uk-text-muted uk-text-small"></div>
    `;

    grid.appendChild(wrapper);

    document.getElementById('syncUploadBtn').addEventListener('click', async () => {
        const input = document.getElementById('syncFolderInput');
        const files = input.files;

        if (!files.length) {
            UIkit.notification({ message: 'Kein Ordner ausgewählt', status: 'warning' });
            return;
        }

        const token = getToken();
        const folderName = files[0].webkitRelativePath.split('/')[0];

        for (const file of files) {
            const form = new FormData();
            form.append('file', file);
            form.append('folder', `sync/${folderName}`);

            await fetch(`${API_BASE}/upload`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: form
            });
        }

        UIkit.notification({ message: 'Ordner synchronisiert', status: 'success' });
        renderSyncOverview();
    });

    renderSyncOverview();
}
function renderSyncOverview() {
    const grid = document.getElementById('contentGrid');

    const container = document.createElement('div');
    container.className = 'uk-grid-small uk-child-width-1-2@s uk-child-width-1-3@m uk-child-width-1-4@l';
    container.setAttribute('uk-grid', '');

    const syncFolders = Object.keys(folders)
        .filter(p => p.startsWith('sync/') && folders[p].parent === 'sync');

    syncFolders.sort((a, b) => {
        const dA = new Date(folders[a].items?.[0]?.date || '1970-01-01');
        const dB = new Date(folders[b].items?.[0]?.date || '1970-01-01');
        return dB - dA;
    });

    const frag = document.createDocumentFragment();
    syncFolders.forEach(p => frag.appendChild(createFolderCard(folders[p])));

    container.appendChild(frag);
    grid.appendChild(container);
}
