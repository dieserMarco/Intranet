/********************* GLOBAL VARIABLEN *********************/
let allRecords = [];
let selectedRecord = null;
let currentSuggestionIndex = -1;
let activeMembers = [];
let csvHeaders = [];

const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbydfJRfAAyFCQfHnxE3Ee5aSyiYgpf8yns8-hT9Uomk4QbRvqAj9MxyEtyogjpBn6eh/exec";

$(document).ready(function () {
  loadDataFromCSV();

  $('#searchField').on('keydown', function (e) {
    const suggestions = $('#suggestions .suggestion-item');

    if (e.key === 'ArrowDown') {
      if (suggestions.length > 0) {
        currentSuggestionIndex = (currentSuggestionIndex + 1) % suggestions.length;
        suggestions.removeClass('selected');
        suggestions.eq(currentSuggestionIndex).addClass('selected');
        e.preventDefault();
      }
    } else if (e.key === 'ArrowUp') {
      if (suggestions.length > 0) {
        currentSuggestionIndex = (currentSuggestionIndex - 1 + suggestions.length) % suggestions.length;
        suggestions.removeClass('selected');
        suggestions.eq(currentSuggestionIndex).addClass('selected');
        e.preventDefault();
      }
    } else if (e.key === 'Enter') {
      if (currentSuggestionIndex >= 0 && suggestions.length > 0) {
        suggestions.eq(currentSuggestionIndex).click();
        currentSuggestionIndex = -1;
        e.preventDefault();
      }
    }
  });

  $('.datepicker').datepicker({ dateFormat: 'dd.mm.yy' });
  $('#ausbildnerEditContainer').hide();
});

/******************** CSV Laden & Parsen ********************/
function loadDataFromCSV() {
  const csvUrl = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQJhQbJMxG8s7oSw__c97Z55koBtE2Dlgc0OYR8idpZtdTq3o9g7LbmyEve3KPNkV5yaRZGIHVjJPkk/pub?gid=294937836&single=true&output=csv';

  fetch(csvUrl)
    .then(response => response.text())
    .then(csvText => {
      allRecords = parseCSV(csvText);
      activeMembers = allRecords.filter(r => (r['Aktives Mitglied?'] || '').toLowerCase() === 'ja');
      fillActiveMembersDatalist(activeMembers);

      const trainerMembers = activeMembers.filter(r => (r['Ausbildner?'] || '').toLowerCase() === 'ja');
      fillTrainersDatalist(trainerMembers);
    })
    .catch(err => console.error('Fehler beim Laden der CSV:', err));
}

function parseCSV(csvText) {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length);
  if (!lines.length) return [];

  csvHeaders = parseCSVLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const obj = {};

    csvHeaders.forEach((header, i) => {
      obj[header.trim()] = (values[i] || '').trim();
    });

    return obj;
  });
}

function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);
  return fields;
}

function fillActiveMembersDatalist(members) {
  const datalist = $('#activeMembersList');
  datalist.empty();

  members.forEach(m => {
    const name = `${m['Namen'] || ''} ${m['Nachnamen'] || ''}`.trim();
    datalist.append(`<option value="${name}">`);
  });
}

function fillTrainersDatalist(ausbildner) {
  const datalist = $('#trainersList');
  datalist.empty();

  ausbildner.forEach(m => {
    const name = `${m['Namen'] || ''} ${m['Nachnamen'] || ''}`.trim();
    datalist.append(`<option value="${name}">`);
  });
}

function getRecordValue(record, keys) {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null && String(record[key]).trim() !== '') {
      return record[key];
    }
  }
  return '';
}

/********************* Suche & Vorschläge *******************/
function searchSuggestions() {
  const query = $('#searchField').val().toLowerCase();
  if (query.length < 2) {
    $('#suggestions').empty();
    return;
  }

  const filtered = allRecords.filter(r =>
    (r['Mitgliedsnummer'] && r['Mitgliedsnummer'].toLowerCase().includes(query)) ||
    (r['Namen'] && r['Namen'].toLowerCase().includes(query)) ||
    (r['Nachnamen'] && r['Nachnamen'].toLowerCase().includes(query))
  );

  displaySuggestions(filtered);
}

function displaySuggestions(records) {
  const suggestionsBox = $('#suggestions');
  suggestionsBox.empty();
  currentSuggestionIndex = -1;

  records.forEach(r => {
    const item = $(`<div class="suggestion-item">${r['Mitgliedsnummer']} - ${r['Namen']} ${r['Nachnamen']}</div>`);
    item.on('click', () => {
      selectedRecord = Object.assign({}, r);
      fillForm(selectedRecord);
      suggestionsBox.empty();
      displayCourses(selectedRecord);
    });
    suggestionsBox.append(item);
  });
}

/**************** Formular füllen & Editing ****************/
function fillForm(record) {
  $('#anrede').val(getRecordValue(record, ['anrede', 'Anrede']));
  $('#titel').val(getRecordValue(record, ['titel', 'Titel']));
  $('#vorname').val(getRecordValue(record, ['vorname', 'Namen', 'Vorname']));
  $('#nachname').val(getRecordValue(record, ['nachname', 'Nachnamen', 'Nachname']));
  $('#geburtsdatum').val(getRecordValue(record, ['geburtsdatum', 'Geburtsdatum']));
  $('#beruf').val(getRecordValue(record, ['beruf', 'Beruf']));
  $('#geburtsort').val(getRecordValue(record, ['geburtsort', 'Geburtsort']));
  $('#familienstand').val(getRecordValue(record, ['familienstand', 'Familienstand']));
  $('#staatsbuergerschaft').val(getRecordValue(record, ['staatsburgerschaft', 'staatsbuergerschaft', 'Staatsbürgerschaft']));

  $('#identifikationsnummer').val(getRecordValue(record, ['identifikationsnummer', 'Identifikationsnummer']));
  $('#telefonnummer').val(getRecordValue(record, ['telefonnummer', 'Telefonnummer']));
  $('#forumsname').val(getRecordValue(record, ['forumsname', 'Forumsname']));
  $('#discord_id').val(getRecordValue(record, ['discord_id', 'Discord ID', 'DiscordID']));
  $('#dmail').val(getRecordValue(record, ['dmail', 'D-Mail Adresse', 'email', 'E-Mail']));

  $('#adresse').val(getRecordValue(record, ['adresse', 'Adresse']));
  $('#postleitzahl').val(getRecordValue(record, ['postleitzahl', 'Postleitzahl', 'plz']));
  $('#stadt').val(getRecordValue(record, ['stadt', 'Stadt']));
  $('#personalbild_url').val(getRecordValue(record, ['personalbild_url', 'Personalbild URL', 'Personalbild']));

  $('#login_mail').val(getRecordValue(record, ['login_mail', 'Login Mail']));
  $('#password').val(getRecordValue(record, ['password', 'Password']));

  const personalbildUrl = getRecordValue(record, ['personalbild_url', 'Personalbild URL', 'Personalbild']);
  if (personalbildUrl) {
    $('#personalImage').html(`<img src="${personalbildUrl}" alt="Personalbild">`);
  $('#mitgliedsnummer').val(record['Mitgliedsnummer'] || '');
  $('#anrede').val(record['Anrede'] || '');
  $('#titel').val(record['Titel'] || '');
  $('#namen').val(record['Namen'] || '');
  $('#nachnamen').val(record['Nachnamen'] || '');
  $('#geburtsdatum').val(record['Geburtsdatum'] || '');
  $('#beruf').val(record['Beruf'] || '');
  $('#geburtsort').val(record['Geburtsort'] || '');
  $('#familienstand').val(record['Familienstand'] || '');
  $('#staatsbuergerschaft').val(record['Staatsbürgerschaft'] || '');
  $('#identifikationsnummer').val(record['Identifikationsnummer'] || '');
  $('#telefonnummer').val(record['Telefonnummer'] || '');
  $('#forumsname').val(record['Forumsname'] || '');
  $('#adresse').val(record['Adresse'] || '');
  $('#plz').val(record['Postleitzahl'] || '');
  $('#stadt').val(record['Stadt'] || '');
  $('#email').val(record['D-Mail Adresse'] || '');
  $('#abgemeldet_grund').val(record['Abgemeldet Grund'] || '');
  $('#dienstgrad').val(record['Aktueller Dienstgrad'] || '');
  $('#beforderung').val(record['Letzte Beförderung'] || '');
  $('#funktion').val(record['Funktion'] || '');

  if (record['Personalbild']) {
    $('#personalImage').html(`<img src="${record['Personalbild']}" alt="Personalbild">`);
  } else {
    $('#personalImage').text('Foto');
  }

  const dg = getRecordValue(record, ['Aktueller Dienstgrad']);
  if (dg && dienstgradBilder[dg]) {
    $('#dienstgradImage').html(`<img src="${dienstgradBilder[dg]}" alt="${dg}">`);
  } else {
    $('#dienstgradImage').text('Dienstgrad');
  }

  setActiveStatus((record['Aktives Mitglied?'] || '').toLowerCase() === 'ja');
  updateHeaderTitle(record);

  $('.content input, .content select').prop('disabled', true);
}

function setActiveStatus(isActive) {
  const btn = $('#statusToggle');
  btn.toggleClass('active', isActive).toggleClass('inactive', !isActive);
  btn.text(isActive ? 'Aktiv' : 'Inaktiv');
}

function toggleActiveStatus() {
  const btn = $('#statusToggle');
  setActiveStatus(!btn.hasClass('active'));
}

function updateHeaderTitle(record) {
  const vorname = getRecordValue(record, ['vorname', 'Namen', 'Vorname']);
  const nachname = getRecordValue(record, ['nachname', 'Nachnamen', 'Nachname']);
  const title = `${record['Mitgliedsnummer'] || ''} - ${record['Aktueller Dienstgrad'] || ''} ${vorname} ${nachname}`;
  $('#headerTitle').text(`[${title.trim()}]`);
}

/**************** Kurs-Konfiguration & Anzeige *************/
const coursesConfig = {
  'AKL-Test': { category: 'generalModules', hasTrainer: false, hasInfo: false, hasCompleted: false, hasWithdrawn: false, hasValidUntil: true },
  'ÖFAST': { category: 'generalModules', hasTrainer: false, hasInfo: false, hasCompleted: false, hasWithdrawn: false, hasValidUntil: true },
  'GFÜ': { category: 'officerModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'FWBW': { category: 'branddienstModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'BD10': { category: 'branddienstModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'BD20': { category: 'branddienstModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'BD70': { category: 'branddienstModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'BD80': { category: 'branddienstModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'AT': { category: 'branddienstModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'TE10': { category: 'techModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'TE20': { category: 'techModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'TE30': { category: 'techModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'TE40': { category: 'techModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'T1': { category: 'techModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'TBS20': { category: 'techModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'TBS30': { category: 'techModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'EMA B': { category: 'emModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'EMA C': { category: 'emModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'EMA C2': { category: 'emModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'FÜ10': { category: 'officerModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'ASM10': { category: 'officerModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'FÜ20': { category: 'officerModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'NRD10': { category: 'officerModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'NRD20': { category: 'officerModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'SD10': { category: 'hazardModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'SD20': { category: 'hazardModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'SD25': { category: 'hazardModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'SD35': { category: 'hazardModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'SD40': { category: 'hazardModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'WD10': { category: 'waterModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'WD20': { category: 'waterModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'WFBB1': { category: 'waterModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true },
  'WFBB2': { category: 'waterModules', hasTrainer: true, hasInfo: true, hasCompleted: true, hasWithdrawn: true }
};

const courseCategories = {
  generalModules: ['AKL-Test', 'ÖFAST', 'GFÜ'],
  branddienstModules: ['FWBW', 'AT', 'BD10', 'BD20', 'BD70', 'BD80'],
  techModules: ['TE10', 'TE20', 'TE30', 'TE40', 'T1', 'TBS20', 'TBS30'],
  hazardModules: ['SD10', 'SD20', 'SD25', 'SD35', 'SD40'],
  waterModules: ['WD10', 'WD20', 'WFBB1', 'WFBB2'],
  emModules: ['EMA B', 'EMA C', 'EMA C2'],
  officerModules: ['FÜ10', 'ASM10', 'FÜ20', 'NRD10', 'NRD20']
};

function makeCourseCard(courseName, record) {
  const cfg = coursesConfig[courseName] || {};
  const date = record[`${courseName} - Datum`] || '';
  const trainer = cfg.hasTrainer ? (record[`${courseName} - Ausbildner`] || '') : '';
  const info = cfg.hasInfo ? (record[`${courseName} - Information`] || '') : '';
  const validUntil = cfg.hasValidUntil ? (record[`${courseName} - GÜLTIG BIS`] || '') : '';
  const completed = cfg.hasCompleted ? ((record[`${courseName} - Absolviert`] || '').toLowerCase() === 'ja') : false;
  const withdrawn = cfg.hasWithdrawn ? (record[`${courseName} - Zurückgezogen`] || '') : '';

  const card = $('<li class="course-card"></li>');
  card.append(`<h4>${courseName}</h4>`);

  const details = [];
  if (date) details.push(`Datum: ${date}`);
  if (validUntil) details.push(`Gültig bis: ${validUntil}`);
  if (trainer) details.push(`Ausbildner: ${trainer}`);
  if (info) details.push(`Info: ${info}`);
  if (withdrawn) details.push(`Zurückgezogen: ${withdrawn}`);
  if (details.length) card.append(`<p class="course-meta">${details.join(' • ')}</p>`);

  if (completed) card.append('<span class="course-chip">Absolviert</span>');
  if (withdrawn) card.addClass('withdrawn');

  return card;
}

function displayCourses(record) {
  for (const id of Object.keys(courseCategories)) {
    $(`#${id}`).empty();
  }

  for (const [category, list] of Object.entries(courseCategories)) {
    const container = $(`#${category}`);

    list.forEach(courseName => {
      const cfg = coursesConfig[courseName] || {};
      let show = false;

      if (cfg.hasCompleted) {
        show = ((record[`${courseName} - Absolviert`] || '').toLowerCase() === 'ja');
      } else if (cfg.hasValidUntil) {
        show = !!record[`${courseName} - GÜLTIG BIS`];
      } else {
        show = !!record[`${courseName} - Datum`];
      }

      if (!show) return;
      container.append(makeCourseCard(courseName, record));
    });
  }
}

function activateStammdatenEditingMode() {
  const fields = document.querySelectorAll('.content input, .content select');
  const isEditing = fields[0] && !fields[0].disabled;

  if (!isEditing) {
    fields.forEach(f => { f.disabled = false; });

    $('#statusToggle')
      .prop('disabled', false)
      .css('cursor', 'pointer')
      .off('click.__status')
      .on('click.__status', toggleActiveStatus);

    $('#vorname, #nachname')
      .off('input.__live')
      .on('input.__live', function () {
        const tempRecord = Object.assign({}, selectedRecord);
        tempRecord['Namen'] = $('#vorname').val();
        tempRecord['Nachnamen'] = $('#nachname').val();
        updateHeaderTitle(tempRecord);
      });

    document.getElementById('editStammdatenButton').textContent = 'Stammdaten speichern';
  } else {
    fields.forEach(f => { f.disabled = true; });

    $('#statusToggle')
      .prop('disabled', true)
      .css('cursor', 'default')
      .off('click.__status');

    $('#vorname, #nachname').off('input.__live');

    document.getElementById('editStammdatenButton').textContent = 'Stammdaten bearbeiten';
    saveStammdaten();
  }
}

function saveStammdaten() {
  if (!selectedRecord) return;

  selectedRecord['anrede'] = $('#anrede').val() || '';
  selectedRecord['titel'] = $('#titel').val() || '';
  selectedRecord['vorname'] = $('#vorname').val() || '';
  selectedRecord['nachname'] = $('#nachname').val() || '';
  selectedRecord['geburtsdatum'] = $('#geburtsdatum').val() || '';
  selectedRecord['beruf'] = $('#beruf').val() || '';
  selectedRecord['geburtsort'] = $('#geburtsort').val() || '';
  selectedRecord['familienstand'] = $('#familienstand').val() || '';
  selectedRecord['staatsburgerschaft'] = $('#staatsbuergerschaft').val() || '';

  selectedRecord['identifikationsnummer'] = $('#identifikationsnummer').val() || '';
  selectedRecord['telefonnummer'] = $('#telefonnummer').val() || '';
  selectedRecord['forumsname'] = $('#forumsname').val() || '';
  selectedRecord['discord_id'] = $('#discord_id').val() || '';
  selectedRecord['dmail'] = $('#dmail').val() || '';

  selectedRecord['adresse'] = $('#adresse').val() || '';
  selectedRecord['postleitzahl'] = $('#postleitzahl').val() || '';
  selectedRecord['stadt'] = $('#stadt').val() || '';
  selectedRecord['personalbild_url'] = $('#personalbild_url').val() || '';

  selectedRecord['login_mail'] = $('#login_mail').val() || '';
  selectedRecord['password'] = $('#password').val() || '';

  selectedRecord['Aktives Mitglied?'] = $('#statusToggle').hasClass('active') ? 'Ja' : 'Nein';

  const index = allRecords.findIndex(r => r['Mitgliedsnummer'] === selectedRecord['Mitgliedsnummer']);
  if (index !== -1) {
    allRecords[index] = selectedRecord;
  }

  uploadCSVToGoogle();
}

/********************* Dienstgrad-Bilder *******************/
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

/********************** CSV Upload ************************/
function uploadCSVToGoogle() {
  const csvContent = generateCSV(allRecords);

  fetch(WEB_APP_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csv: csvContent })
  })
    .then(response => response.text())
    .then(data => {
      console.log('Antwort vom Google-Script:', data);
    })
    .catch(err => {
      console.error('Fehler beim Hochladen:', err);
    });
}

function generateCSV(records) {
  records.forEach(record => {
    for (const key in record) {
      if (!csvHeaders.includes(key)) csvHeaders.push(key);
    }
  });

  Object.keys(coursesConfig).forEach(c => {
    const fields = [`${c} - Datum`];
    if (coursesConfig[c].hasValidUntil) fields.push(`${c} - GÜLTIG BIS`);
    if (coursesConfig[c].hasTrainer) fields.push(`${c} - Ausbildner`);
    if (coursesConfig[c].hasInfo) fields.push(`${c} - Information`);
    if (coursesConfig[c].hasCompleted) fields.push(`${c} - Absolviert`);
    if (coursesConfig[c].hasWithdrawn) fields.push(`${c} - Zurückgezogen`);

    fields.forEach(f => {
      if (!csvHeaders.includes(f)) csvHeaders.push(f);
    });
  });

  let csv = csvHeaders.join(',') + '\n';
  records.forEach(record => {
    const row = csvHeaders.map(header => {
      let value = record[header] || '';
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        value = '"' + value.replace(/"/g, '""') + '"';
      }
      return value;
    }).join(',');

    csv += row + '\n';
  });

  return csv;
}
