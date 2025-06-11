import { getToken, API_BASE } from './helpers.js';
import { globals } from './globals.js';

export function isMediaFile(name) {
    return /\.(jpe?g|png|gif|bmp|webp|mp4|webm)$/i.test(name);
}

export async function getSignedFileUrl(key) {
    const token = getToken();
    const apiUrl = `${API_BASE}/file-url?key=${encodeURIComponent(key)}`;

    const res = await fetch(apiUrl, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        mode: 'cors',
        cache: 'no-store'
    });

    if (!res.ok) throw new Error(`Presign fehlgeschlagen (${res.status})`);
    const data = await res.json();
    return data.url;
}

async function deleteFile(key, e) {
    e.stopPropagation();
    const token = getToken();

    const res = await fetch(`${API_BASE}/delete`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ path: key })
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        UIkit.notification({ message: err?.error || 'Löschen fehlgeschlagen', status: 'danger' });
        return;
    }

    UIkit.notification({ message: 'Datei gelöscht', status: 'success' });
    import('./views.js').then(m => m.switchViewTo(globals.activeView));
}

async function downloadFile(key) {
    try {
        const url = await getSignedFileUrl(key);
        window.open(url, '_blank');
    } catch (err) {
        UIkit.notification({ message: 'Download fehlgeschlagen', status: 'danger' });
        console.warn('Download-Fehler:', err.message);
    }
}

export function createFileCard(item) {
    const container = document.createElement('div');
    container.className = 'file-tile';
    container.style.position = 'relative';

    const preview = document.createElement('div');
    preview.className = 'file-preview';

    const isImage = /\.(jpe?g|png|gif|bmp|webp)$/i.test(item.name);
    const isVideo = /\.(mp4|webm)$/i.test(item.name);
    const isPDF = /\.pdf$/i.test(item.name);
    const isDoc = /\.(docx?|xlsx?|pptx?|txt|json)$/i.test(item.name);
    const isZip = /\.(zip|rar|7z)$/i.test(item.name);

    if (isImage) {
        const img = document.createElement('img');
        img.alt = item.name;
        img.style.objectFit = 'contain';
        getSignedFileUrl(item.key).then(url => img.src = url);
        preview.appendChild(img);
    } else if (isVideo) {
        const video = document.createElement('video');
        video.autoplay = true;
        video.loop = true;
        video.muted = true;
        video.playsInline = true;
        getSignedFileUrl(item.key).then(url => video.src = url);
        preview.appendChild(video);
    } else {
        const icon = document.createElement('span');
        icon.setAttribute('uk-icon', `icon: ${isPDF ? 'file-pdf' : isDoc ? 'file-text' : isZip ? 'file-zip' : 'file'}; ratio: 2`);
        preview.appendChild(icon);
    }

    const actions = document.createElement('div');
    actions.className = 'file-actions';

    const btnDownload = document.createElement('button');
    btnDownload.innerHTML = '<span uk-icon="icon: download"></span>';
    btnDownload.title = 'Herunterladen';
    btnDownload.onclick = async (e) => {
        e.stopPropagation();
        await downloadFile(item.key);
    };

    const btnDelete = document.createElement('button');
    btnDelete.innerHTML = '<span uk-icon="icon: trash"></span>';
    btnDelete.title = 'Löschen';
    btnDelete.onclick = async (e) => {
        await deleteFile(item.key, e);
    };

    actions.appendChild(btnDownload);
    actions.appendChild(btnDelete);

    const meta = document.createElement('div');
    meta.className = 'file-meta';
    meta.innerHTML = `
    <div class="uk-text-small uk-text-truncate" title="${item.name}">${item.name}</div>
    <div class="uk-text-meta">${item.size} • ${item.date}</div>
  `;

    container.appendChild(preview);
    container.appendChild(actions);
    container.appendChild(meta);

    container.onclick = () => {
        if (isImage || isVideo) {
            getSignedFileUrl(item.key).then(url => {
                UIkit.lightboxPanel({ items: [{ source: url, type: isImage ? 'image' : 'video' }] }).show();
            });
        }
    };

    return container;
}
