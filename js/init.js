import { globals } from './globals.js';
import { getToken, getUserFolderTrimmed, API_BASE, formatFileSize } from './helpers.js';
import { switchViewTo } from './views.js';

export async function init() {
    const token = getToken();
    const userFolder = getUserFolderTrimmed();
    if (!token || !userFolder) {
        window.location.href = 'index.html';
        return;
    }

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(`${API_BASE}/list-full`, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
            throw new Error(`Serverfehler: ${res.status} ${res.statusText}`);
        }

        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Unerwarteter Inhaltstyp: " + contentType);
        }

        const data = await res.json();

        globals.folders = {};

        globals.folders[userFolder] = {
            id: userFolder,
            name: userFolder.split('/').pop(),
            parent: null,
            items: [],
            subfolders: []
        };

        ['fotos', 'alben', 'dateien', 'sync'].forEach(name => {
            const fullPath = `${userFolder}/${name}`;
            globals.folders[fullPath] = {
                id: fullPath,
                name,
                parent: userFolder,
                items: [],
                subfolders: []
            };
            globals.folders[userFolder].subfolders.push(fullPath);
        });

        data.forEach(entry => {
            const key = entry.Key;
            if (!key || !key.startsWith(userFolder + "/") || key.endsWith(".keep")) return;

            const relKey = key.slice(userFolder.length);
            const parts = relKey.split("/").filter(Boolean);
            if (parts.length === 0) return;

            const isFolder = key.endsWith("/");
            const name = parts.at(-1);
            const fullPath = `${userFolder}/${parts.join("/")}`;
            const parentPath = `${userFolder}/${parts.slice(0, -1).join("/")}`;

            const top = `${userFolder}/${parts[0]}`;
            if (!globals.folders[top]) {
                globals.folders[top] = {
                    id: top,
                    name: parts[0],
                    parent: userFolder,
                    items: [],
                    subfolders: []
                };
            }

            if (isFolder) {
                for (let i = 1; i <= parts.length; i++) {
                    const segPath = `${userFolder}/${parts.slice(0, i).join("/")}`;
                    const parent = `${userFolder}/${parts.slice(0, i - 1).join("/")}`;
                    const segName = parts[i - 1];

                    if (!globals.folders[parent]) {
                        globals.folders[parent] = {
                            id: parent,
                            name: parent.split('/').pop(),
                            items: [],
                            subfolders: [],
                            parent: parent.includes("/") ? parent.split("/").slice(0, -1).join("/") : userFolder
                        };
                    }

                    if (!globals.folders[segPath]) {
                        globals.folders[segPath] = {
                            id: segPath,
                            name: segName,
                            items: [],
                            subfolders: [],
                            parent
                        };
                    }

                    if (!globals.folders[parent].subfolders.includes(segPath)) {
                        globals.folders[parent].subfolders.push(segPath);
                    }
                }
            } else {
                if (!globals.folders[parentPath]) {
                    globals.folders[parentPath] = {
                        id: parentPath,
                        name: parentPath.split("/").pop(),
                        items: [],
                        subfolders: [],
                        parent: parentPath.includes("/") ? parentPath.split("/").slice(0, -1).join("/") : userFolder
                    };
                }

                globals.folders[parentPath].items.push({
                    id: Date.now() + Math.random(),
                    name,
                    key,
                    size: formatFileSize(entry.Size || 0),
                    date: entry.LastModified
                        ? new Date(entry.LastModified).toISOString().slice(0, 10)
                        : ""
                });
            }
        });

        const lastView = sessionStorage.getItem('lastView');
        const lastPath = JSON.parse(sessionStorage.getItem('lastPath') || '[]');

        if (lastView && Array.isArray(lastPath)) {
            globals.currentPath = lastPath;
            switchViewTo(lastView);
        } else {
            globals.currentPath = [`${userFolder}/fotos`];
            switchViewTo('fotos');
        }

        sessionStorage.setItem('lastPath', JSON.stringify(globals.currentPath));

    } catch (error) {
        console.error("init()-Fehler:", error);
        const msg = error.name === "AbortError"
            ? "Verbindung zu langsam oder keine Antwort vom Server"
            : error.message;
        UIkit.notification({ message: msg, status: 'danger' });
    }

    console.log("FOLDER KEYS:", Object.keys(globals.folders));
}
