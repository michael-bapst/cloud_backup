const allowedImages = /\.(jpe?g|png|gif|bmp|webp)$/i;
const allowedDocs = /\.(pdf|zip|docx?|xlsx?|txt|json)$/i;

window.handleUpload = async function (e) {
    e.preventDefault();

    const fileInput = document.querySelector('#uploadForm input[name="file"]');
    const files = fileInput.files;
    if (!files.length) {
        UIkit.notification({ message: 'Keine Datei gewählt', status: 'danger' });
        return;
    }

    const token = getToken();
    const userFolder = getUserFolder()?.replace(/\/$/, '');
    if (!token || !userFolder) {
        UIkit.notification({ message: 'Benutzerdaten fehlen', status: 'danger' });
        return;
    }

    const relativePath = currentPath.join('/');

    if (!relativePath.startsWith(userFolder) || !folders[relativePath]) {
        UIkit.notification({ message: 'Ungültiger Zielpfad', status: 'danger' });
        return;
    }

    const targetPath = relativePath;

    const progressBar = document.getElementById('uploadProgressBar');
    progressBar.max = files.length;
    progressBar.value = 0;
    progressBar.parentElement.style.display = 'block';

    let completed = 0;

    await Promise.all([...files].map(file => {
        return new Promise((resolve) => {
            if (activeView === 'fotos' && !allowedImages.test(file.name)) {
                UIkit.notification({ message: 'Nur Bilder erlaubt', status: 'warning' });
                return resolve();
            }

            if (activeView === 'dateien' && !allowedDocs.test(file.name)) {
                UIkit.notification({ message: 'Nur Dokumente erlaubt', status: 'warning' });
                return resolve();
            }

            const xhr = new XMLHttpRequest();
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', targetPath);

            xhr.open('POST', `${API_BASE}/upload`);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);

            xhr.onload = () => {
                completed++;
                progressBar.value = completed;
                if (xhr.status === 200) {
                    resolve();
                } else {
                    UIkit.notification({ message: `Fehler bei ${file.name}`, status: 'danger' });
                    resolve();
                }
            };

            xhr.onerror = () => {
                UIkit.notification({ message: `Netzwerkfehler bei ${file.name}`, status: 'danger' });
                resolve();
            };

            xhr.send(formData);
        });
    }));

    UIkit.notification({ message: 'Upload abgeschlossen', status: 'success' });
    UIkit.modal('#uploadModal').hide();
    fileInput.value = '';
    progressBar.parentElement.style.display = 'none';

    sessionStorage.setItem('lastView', activeView);
    sessionStorage.setItem('lastPath', JSON.stringify(currentPath));

    await init();
    switchViewTo(activeView);
};
