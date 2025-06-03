document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const resultDiv = document.getElementById('result');
    const form = document.getElementById('pwForm');

    if (!token) {
        form.style.display = 'none';
        resultDiv.innerHTML = `
          <div class="uk-alert-danger" uk-alert>
            <p>Kein Token übergeben – Link ungültig.</p>
          </div>`;
        return;
    }

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        const password = document.getElementById('newPassword').value;
        const repeat = document.getElementById('newPasswordRepeat').value;

        if (password !== repeat) {
            resultDiv.innerHTML = `
              <div class="uk-alert-danger" uk-alert>
                <p>Die Passwörter stimmen nicht überein.</p>
              </div>`;
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/set-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password })
            });

            if (!res.ok) {
                const text = await res.text(); // Sicherstellen, dass auch non-JSON lesbar ist
                let errorMessage = 'Unbekannter Fehler';
                try {
                    const json = JSON.parse(text);
                    if (json?.error) errorMessage = json.error;
                } catch {
                    errorMessage = text;
                }
                throw new Error(errorMessage);
            }

            form.style.display = 'none';
            resultDiv.innerHTML = `
              <div class="uk-alert-success" uk-alert>
                <p>Passwort wurde gespeichert, hier gehts zur <a href="index.html">anmeldung</a>.</p>
              </div>`;
        } catch (err) {
            resultDiv.innerHTML = `
              <div class="uk-alert-danger" uk-alert>
                <p>${err.message}</p>
              </div>`;
        }
    });
});
