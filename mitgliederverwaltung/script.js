let allRecords = [];
let selectedRecord = null;
let currentSuggestionIndex = -1;
let editingMode = false;

const API_BASE = './api';

$(document).ready(function () {
  loadMembers();

  $('#searchField').on('keydown', function (e) {
    const suggestions = $('#suggestions .suggestion-item');
    if (!suggestions.length) return;

    if (e.key === 'ArrowDown') {
      currentSuggestionIndex = (currentSuggestionIndex + 1) % suggestions.length;
      suggestions.removeClass('selected');
      suggestions.eq(currentSuggestionIndex).addClass('selected');
      e.preventDefault();
    } else if (e.key === 'ArrowUp') {
      currentSuggestionIndex = (currentSuggestionIndex - 1 + suggestions.length) % suggestions.length;
      suggestions.removeClass('selected');
      suggestions.eq(currentSuggestionIndex).addClass('selected');
      e.preventDefault();
    } else if (e.key === 'Enter' && currentSuggestionIndex >= 0) {
      suggestions.eq(currentSuggestionIndex).click();
      currentSuggestionIndex = -1;
      e.preventDefault();
    }
  });

  $('.datepicker').datepicker({ dateFormat: 'dd.mm.yy' });
});

async function loadMembers() {
  try {
    const response = await fetch(`${API_BASE}/members.php`);
    const payload = await response.json();

    if (!payload.ok) {
      throw new Error(payload.error || 'Mitglieder konnten nicht geladen werden.');
    }

    allRecords = payload.members || [];
  } catch (error) {
    console.error(error);
    alert(`Fehler beim Laden der Mitglieder: ${error.message}`);
  }
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  return ['1', 'ja', 'true', 'yes'].includes(String(value || '').toLowerCase());
}

function boolTo01(value) {
  return toBool(value) ? 1 : 0;
}


function formatDateForDisplay(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const matchIso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchIso) {
    return `${matchIso[3]}.${matchIso[2]}.${matchIso[1]}`;
  }

  const matchDisplay = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (matchDisplay) return raw;

  return raw;
}

function toApiDate(value) {
  const raw = String(value || '').trim();
  const matchDisplay = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (matchDisplay) {
    return `${matchDisplay[3]}-${matchDisplay[2]}-${matchDisplay[1]}`;
  }
  return raw;
}

function showSaveOverlay(message) {
  $('#saveOverlayMessage').text(message);
  $('#saveOverlay').addClass('visible').attr('aria-hidden', 'false');
}

function closeSaveOverlay() {
  $('#saveOverlay').removeClass('visible').attr('aria-hidden', 'true');
}

function searchSuggestions() {
  const query = $('#searchField').val().trim().toLowerCase();
  if (query.length < 1) {
    $('#suggestions').empty();
    return;
  }

  const filtered = allRecords.filter((r) =>
    String(r.member_no || '').toLowerCase().includes(query) ||
    String(r.vorname || '').toLowerCase().includes(query) ||
    String(r.nachname || '').toLowerCase().includes(query)
  );

  const suggestionsBox = $('#suggestions');
  suggestionsBox.empty();
  currentSuggestionIndex = -1;

  filtered.slice(0, 20).forEach((record) => {
    const item = $(`<div class="suggestion-item">${record.member_no || '-'} - ${record.vorname || ''} ${record.nachname || ''}</div>`);
    item.on('click', () => {
      selectedRecord = { ...record };
      fillForm(selectedRecord);
      suggestionsBox.empty();
    });
    suggestionsBox.append(item);
  });
}

function fillForm(record) {
  $('#member_no').val(record.member_no || '');
  $('#vorname').val(record.vorname || '');
  $('#nachname').val(record.nachname || '');
  $('#geburtsdatum').val(formatDateForDisplay(record.geburtsdatum));
  $('#identifikationsnummer').val(record.identifikationsnummer || '');

  $('#telefonnummer').val(record.telefonnummer || '');
  $('#forumsname').val(record.forumsname || '');
  $('#discord_id').val(record.discord_id || '');
  $('#dmail').val(record.dmail || '');
  $('#login_mail').val(record.login_mail || '');

  $('#adresse').val(record.adresse || '');
  $('#postleitzahl').val(record.postleitzahl || '');
  $('#stadt').val(record.stadt || '');

  $('#aktueller_dienstgrad').val(record.aktueller_dienstgrad || '');
  $('#funktion').val(record.funktion || '');
  $('#dienstzuteilung').val(record.dienstzuteilung || '');
  $('#is_instructor').val(boolTo01(record.is_instructor));
  $('#has_special_unit').val(boolTo01(record.has_special_unit));
  $('#created_at').val(formatDateForDisplay(record.created_at));
  $('#updated_at').val(formatDateForDisplay(record.updated_at));
  $('#updated_by').val(record.updated_by || 'Kommt mit Login-System');

  const dg = record.aktueller_dienstgrad;
  if (dg && dienstgradBilder[dg]) {
    $('#dienstgradImage').html(`<img src="${dienstgradBilder[dg]}" alt="${dg}">`);
  } else {
    $('#dienstgradImage').text('Dienstgrad');
  }

  $('#personalImage').text('Foto');
  setActiveStatus(toBool(record.aktives_mitglied));
  updateHeaderTitle(record);
  setEditMode(false);
}

function setEditMode(enabled) {
  editingMode = enabled;
  $('.content input, .content select').prop('disabled', !enabled);
  $('#created_at, #updated_at, #updated_by, #password_display').prop('disabled', true);

  $('#statusToggle')
    .prop('disabled', !enabled)
    .css('cursor', enabled ? 'pointer' : 'default')
    .off('click.__status');

  if (enabled) {
    $('#statusToggle').on('click.__status', toggleActiveStatus);
  }

  $('#editStammdatenButton').text(enabled ? 'Stammdaten speichern' : 'Stammdaten bearbeiten');
}

function setActiveStatus(isActive) {
  const btn = $('#statusToggle');
  btn.toggleClass('active', isActive).toggleClass('inactive', !isActive);
  btn.text(isActive ? 'Aktiv' : 'Inaktiv');
}

function toggleActiveStatus() {
  setActiveStatus(!$('#statusToggle').hasClass('active'));
}

function updateHeaderTitle(record) {
  const title = `${record.member_no || ''} - ${record.aktueller_dienstgrad || ''} ${record.vorname || ''} ${record.nachname || ''}`;
  $('#headerTitle').text(`[${title.trim()}]`);
}

async function activateStammdatenEditingMode() {
  if (!selectedRecord) {
    alert('Bitte zuerst ein Mitglied auswählen.');
    return;
  }

  if (!editingMode) {
    setEditMode(true);
    return;
  }

  const payload = {
    id: selectedRecord.id,
    member_no: $('#member_no').val().trim(),
    vorname: $('#vorname').val().trim(),
    nachname: $('#nachname').val().trim(),
    geburtsdatum: toApiDate($('#geburtsdatum').val().trim()),
    identifikationsnummer: $('#identifikationsnummer').val().trim(),
    forumsname: $('#forumsname').val().trim(),
    telefonnummer: $('#telefonnummer').val().trim(),
    discord_id: $('#discord_id').val().trim(),
    dmail: $('#dmail').val().trim(),
    adresse: $('#adresse').val().trim(),
    postleitzahl: $('#postleitzahl').val().trim(),
    stadt: $('#stadt').val().trim(),
    login_mail: $('#login_mail').val().trim(),
    aktueller_dienstgrad: $('#aktueller_dienstgrad').val().trim(),
    funktion: $('#funktion').val().trim(),
    dienstzuteilung: $('#dienstzuteilung').val().trim(),
    aktives_mitglied: $('#statusToggle').hasClass('active') ? 1 : 0,
    is_instructor: Number($('#is_instructor').val() || 0),
    has_special_unit: Number($('#has_special_unit').val() || 0)
  };

  try {
    const response = await fetch(`${API_BASE}/members.php`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'Speichern fehlgeschlagen.');

    await loadMembers();
    const refreshed = allRecords.find((item) => Number(item.id) === Number(selectedRecord.id));
    selectedRecord = refreshed || payload;
    fillForm(selectedRecord);
    showSaveOverlay('Mitglied erfolgreich gespeichert.');
  } catch (error) {
    console.error(error);
    showSaveOverlay(`Fehler beim Speichern: ${error.message}`);
  }
}

const dienstgradBilder = {
  "PFM": "https://i.postimg.cc/ZRjqKjH4/Dgrd-pfm-noe-svg.png",
  "FM": "https://i.postimg.cc/hjqrx4bs/Dgrd-fm-noe-svg.png",
  "OFM": "https://i.postimg.cc/63j8KY3Z/Dgrd-ofm-noe-svg.png",
  "HFM": "https://i.postimg.cc/T1536xB8/Dgrd-hfm-noe-svg.png",
  "LM": "https://i.postimg.cc/sDRMrQfw/Dgrd-lm-noe-svg.png",
  "OLM": "https://i.postimg.cc/Bv13bpMD/Dgrd-olm-noe-svg.png",
  "HLM": "https://i.postimg.cc/Gtggkwpp/Dgrd-hlm-noe-svg.png",
  "BM": "https://i.postimg.cc/rs5CwBtb/Dgrd-bm-noe-svg.png",
  "OBM": "https://i.postimg.cc/C54BtS8F/Dgrd-obm-noe-svg.png",
  "HBM": "https://i.postimg.cc/wT6sNRK3/Dgrd-hbm-noe-svg.png",
  "BI": "https://i.postimg.cc/HxZFt7ZH/Dgrd-bi-noe-svg-Kopie.png",
  "OBI": "https://i.postimg.cc/TYYJ643k/Dgrd-obi-noe-svg.png",
  "HBI": "https://i.postimg.cc/Rh06j2LK/Dgrd-hbi-noe-svg.png",
  "ABI": "https://i.postimg.cc/j2v9jnfB/Dgrd-abi2-bgld-svg.png",
  "BR": "https://i.postimg.cc/gcf4vDz4/Dgrd-br2-noe-svg.png",
  "OBR": "https://i.postimg.cc/3NH4wdhj/Dgrd-obr-noe-svg.png",
  "LFR": "https://i.postimg.cc/fTss8Y5j/Dgrd-lfr-noe-svg.png",
  "LBDSTV": "https://i.postimg.cc/LXFQm3Jx/Dgrd-lbdstv-noe-svg.png",
  "LBD": "https://i.postimg.cc/fbcjfnbv/Dgrd-lbd-noe-svg.png",
  "VM": "https://i.postimg.cc/Y9jfFXvr/Dgrd-vm-noe-svg.png",
  "OVM": "https://i.postimg.cc/4dhHZjK9/Dgrd-ovm-noe-svg.png",
  "HVM": "https://i.postimg.cc/PJTXc71h/Dgrd-hvm-noe-svg.png",
  "V": "https://i.postimg.cc/YSM8mfYh/Dgrd-v-noe-svg.png",
  "OV": "https://i.postimg.cc/R0wzBRS0/Dgrd-ov-noe-svg.png",
  "HV": "https://i.postimg.cc/44S2WcG2/Dgrd-hv-noe-svg.png",
  "VI": "https://i.postimg.cc/DzvR9KMx/Dgrd-vi-noe-svg.png",
  "VR": "https://i.postimg.cc/V6SZwsBW/Dgrd-vr-noe-svg.png"
};
