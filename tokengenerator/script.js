const generateButton = document.getElementById('generateButton');
const copyButton = document.getElementById('copyButton');
const tokenOutput = document.getElementById('tokenOutput');
const statusMessage = document.getElementById('statusMessage');

const FIXED_PREFIX = 'FFWN';
const ALPHA_NUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function randomSegment() {
  const length = Math.random() < 0.5 ? 4 : 5;
  let segment = '';

  for (let i = 0; i < length; i += 1) {
    const idx = Math.floor(Math.random() * ALPHA_NUM.length);
    segment += ALPHA_NUM[idx];
  }

  return segment;
}

function setStatus(message, type = '') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message${type ? ` ${type}` : ''}`;
}

async function saveToken(token, prefix) {
  const response = await fetch('api/save_token.php', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ token, prefix }),
  });

  const rawResponse = await response.text();
  let data = null;

  try {
    data = JSON.parse(rawResponse);
  } catch (error) {
    throw new Error('API-Antwort ist ungültig. Prüfe, ob api/save_token.php korrekt erreichbar ist.');
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Token konnte nicht gespeichert werden.');
  }
}

function buildToken() {
  return `${FIXED_PREFIX}-${randomSegment()}-${randomSegment()}`;
}

generateButton.addEventListener('click', async () => {
  generateButton.disabled = true;
  copyButton.disabled = true;
  setStatus('Token wird erstellt ...');

  const token = buildToken();

  try {
    await saveToken(token, FIXED_PREFIX);
    tokenOutput.value = token;
    copyButton.disabled = false;
    setStatus('Token erfolgreich erstellt und gespeichert.', 'success');
  } catch (error) {
    tokenOutput.value = '';
    setStatus(error.message, 'error');
  } finally {
    generateButton.disabled = false;
  }
});

copyButton.addEventListener('click', async () => {
  if (!tokenOutput.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(tokenOutput.value);
    setStatus('Token in die Zwischenablage kopiert.', 'success');
  } catch (error) {
    setStatus('Kopieren fehlgeschlagen. Bitte manuell kopieren.', 'error');
  }
});
