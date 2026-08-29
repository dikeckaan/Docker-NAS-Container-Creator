/* app.js — DOM wiring for Docker NAS Container Creator.
 * All command logic lives in js/command-builder.js (CommandBuilder);
 * all strings live in js/i18n.js (I18N). This file only moves data
 * between the form and the state object, and renders the live preview.
 */
(function () {
  'use strict';

  var CB = window.CommandBuilder;
  var $ = function (id) { return document.getElementById(id); };

  var LS = {
    theme: 'dncc.theme',
    lang: 'dncc.lang',
    autosave: 'dncc.autosave',
    profiles: 'dncc.profiles'
  };

  function lsGet(key, fallback) {
    try { var v = localStorage.getItem(key); return v === null ? fallback : v; }
    catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }
  function lsDel(key) {
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  /* ---------------- language & theme ---------------- */

  var lang = lsGet(LS.lang, (navigator.language || 'en').toLowerCase().indexOf('tr') === 0 ? 'tr' : 'en');
  function t(key) { return window.I18N.t(lang, key); }

  function applyLang() {
    document.documentElement.lang = lang;
    $('langSelect').value = lang;
    window.I18N.applyTo(document, lang);
    refreshVisibility();
    scheduleRender();
  }

  function applyTheme(mode) {
    if (mode === 'dark' || mode === 'light') document.documentElement.setAttribute('data-theme', mode);
    else document.documentElement.removeAttribute('data-theme');
  }
  var theme = lsGet(LS.theme, 'auto');
  applyTheme(theme);

  $('themeToggle').addEventListener('click', function () {
    var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
      (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    theme = dark ? 'light' : 'dark';
    lsSet(LS.theme, theme);
    applyTheme(theme);
  });

  $('langSelect').addEventListener('change', function () {
    lang = $('langSelect').value;
    lsSet(LS.lang, lang);
    applyLang();
  });

  /* ---------------- static port rows ---------------- */

  var portRows = [
    { exp: $('exp-137'), host: $('host-137'), cport: 137, proto: 'udp' },
    { exp: $('exp-138'), host: $('host-138'), cport: 138, proto: 'udp' },
    { exp: $('exp-139'), host: $('host-139'), cport: 139, proto: 'tcp' },
    { exp: $('exp-445'), host: $('host-445'), cport: 445, proto: 'tcp' }
  ];

  $('allPorts').addEventListener('change', function () {
    var on = $('allPorts').checked;
    portRows.forEach(function (r) {
      r.exp.checked = on;
      if (on && !r.host.value.trim()) r.host.value = String(r.cport);
    });
  });

  $('smbNmbd').addEventListener('change', function () {
    if (!$('smbNmbd').checked) return;
    portRows.forEach(function (r) {
      if (r.proto !== 'udp') return;
      r.exp.checked = true;
      if (!r.host.value.trim()) r.host.value = String(r.cport);
    });
  });

  /* ---------------- user rows (safe DOM building, no innerHTML) ---------------- */

  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function strengthBadge(input, badge) {
    var s = CB.passwordStrength(input.value);
    badge.className = 'strength ' + s;
    badge.textContent = s === 'empty' ? '' : t('strength.' + s);
  }

  function addUserRow(username, password) {
    var row = el('div', 'users-grid');

    var uIn = el('input', 'u-username', { type: 'text', placeholder: 'username' });
    uIn.value = username || '';

    var pwCell = el('div', 'pw-cell');
    var pIn = el('input', 'u-password', { type: 'password', placeholder: 'password', autocomplete: 'new-password' });
    pIn.value = password || '';
    var badge = el('span', 'strength empty');
    var eye = el('button', 'secondary btn-icon gridbtn', { type: 'button', 'data-i18n-title': 'users.show' });
    eye.textContent = '👁';
    eye.title = t('users.show');
    eye.setAttribute('aria-label', t('users.show'));
    eye.addEventListener('click', function () {
      pIn.type = pIn.type === 'password' ? 'text' : 'password';
    });
    var gen = el('button', 'secondary btn-icon gridbtn', { type: 'button', 'data-i18n-title': 'users.gen' });
    gen.textContent = '🎲';
    gen.title = t('users.gen');
    gen.setAttribute('aria-label', t('users.gen'));
    gen.addEventListener('click', function () {
      pIn.value = CB.generatePassword(16);
      pIn.type = 'text';
      strengthBadge(pIn, badge);
      scheduleRender();
    });
    pIn.addEventListener('input', function () { strengthBadge(pIn, badge); });
    strengthBadge(pIn, badge);
    pwCell.appendChild(pIn); pwCell.appendChild(badge); pwCell.appendChild(eye); pwCell.appendChild(gen);

    var actions = el('div', 'cell-actions');
    var rm = el('button', 'danger btn-icon gridbtn u-remove', { type: 'button' });
    rm.textContent = 'X';
    rm.setAttribute('aria-label', t('users.remove'));
    rm.addEventListener('click', function () { row.remove(); scheduleRender(); });
    actions.appendChild(rm);

    row.appendChild(uIn); row.appendChild(pwCell); row.appendChild(actions);
    $('usersList').appendChild(row);
  }

  $('btnAddUser').addEventListener('click', function () { addUserRow('', ''); scheduleRender(); });

  function getUsers() {
    return Array.prototype.map.call($('usersList').querySelectorAll('.users-grid'), function (r) {
      return {
        username: r.querySelector('.u-username').value.trim(),
        password: r.querySelector('.u-password').value
      };
    }).filter(function (u) { return u.username || u.password; });
  }
  function getUsernames() {
    return getUsers().map(function (u) { return u.username; }).filter(Boolean);
  }

  /* ---------------- share rows ---------------- */

  function addShareRow(hostPath, shareName, allowed, ro, guest) {
    var row = el('div', 'shares-grid');

    var hIn = el('input', 'hostPath', { type: 'text', placeholder: '/absolute/host/path' });
    hIn.value = hostPath || '';
    var nIn = el('input', 'shareName', { type: 'text', placeholder: 'share-name' });
    nIn.value = shareName || '';
    var aIn = el('input', 'allowedUsers', { type: 'text', placeholder: 'user1,user2' });
    aIn.value = allowed || '';

    var allBtnCell = el('div', 'cell-right');
    var allBtn = el('button', 'secondary btn-small gridbtn', { type: 'button' });
    allBtn.textContent = t('shares.addAll');
    allBtn.setAttribute('data-i18n', 'shares.addAll');
    allBtn.addEventListener('click', function () {
      aIn.value = getUsernames().join(',');
      scheduleRender();
    });
    allBtnCell.appendChild(allBtn);

    function checkCell(cls, label, checked) {
      var c = el('div', 'checkcell');
      var cb = el('input', cls, { type: 'checkbox' });
      cb.checked = !!checked;
      var span = el('span', 'tiny');
      span.textContent = label;
      c.appendChild(cb); c.appendChild(span);
      return c;
    }
    var roCell = checkCell('readOnly', 'RO', ro);
    var guestCell = checkCell('guest', 'Guest', guest);

    var rmCell = el('div', 'cell-right');
    var rm = el('button', 'danger btn-icon gridbtn', { type: 'button' });
    rm.textContent = 'X';
    rm.setAttribute('aria-label', t('shares.remove'));
    rm.addEventListener('click', function () { row.remove(); scheduleRender(); });
    rmCell.appendChild(rm);

    row.appendChild(hIn); row.appendChild(nIn); row.appendChild(aIn);
    row.appendChild(allBtnCell); row.appendChild(roCell); row.appendChild(guestCell); row.appendChild(rmCell);
    $('sharesList').appendChild(row);
  }

  $('btnAddShare').addEventListener('click', function () { addShareRow('', 'shared', '', false, false); scheduleRender(); });

  function getShares() {
    return Array.prototype.map.call($('sharesList').querySelectorAll('.shares-grid'), function (r) {
      return {
        hostPath: r.querySelector('.hostPath').value.trim(),
        shareName: r.querySelector('.shareName').value.trim(),
        allowedUsers: r.querySelector('.allowedUsers').value.trim(),
        ro: r.querySelector('.readOnly').checked,
        guest: r.querySelector('.guest').checked
      };
    });
  }

  /* ---------------- state <-> DOM ---------------- */

  function collectState() {
    var s = CB.defaultState();
    s.protocol = $('protocol').value;
    s.image = $('smbImage').value;
    s.name = $('name').value.trim();
    s.restart = $('restart').value;
    s.networkMode = $('networkMode').value;
    s.macvlanNetwork = $('macvlanNetwork').value.trim();
    s.macvlanIp = $('macvlanIp').value.trim();
    s.ports = portRows.map(function (r) {
      return { cport: r.cport, proto: r.proto, expose: r.exp.checked, host: r.host.value.trim() };
    });
    s.webdavPort = $('webdavPort').value.trim();
    s.uid = $('uid').value.trim();
    s.gid = $('gid').value.trim();
    s.tz = $('tz').value.trim();
    s.workgroup = $('workgroup').value.trim();
    s.envMode = $('envFile').checked ? 'file' : ($('envEditor').checked ? 'editor' : 'none');
    s.envPath = $('envPath').value.trim();
    s.envFilename = $('envFilename').value.trim();
    s.envText = $('envText').value;
    s.includeUsersFromEnv = $('includeUsersFromEnv').checked;
    s.users = getUsers();
    s.shares = getShares();
    s.smb = {
      permFix: $('smbPermFix').checked,
      nmbd: $('smbNmbd').checked,
      recycleOff: $('smbRecycle').checked,
      wsdd: $('smbWsdd').checked,
      globalOpts: $('smbGlobal').value
    };
    s.advanced = {
      healthcheck: $('advHealth').checked,
      memory: $('advMemory').value.trim(),
      cpus: $('advCpus').value.trim()
    };
    s.singleLine = $('singleLineOut').checked;
    return s;
  }

  function applyState(s) {
    var d = CB.defaultState();
    s = Object.assign(d, s || {});
    $('protocol').value = s.protocol;
    $('smbImage').value = s.image;
    $('name').value = s.name;
    $('restart').value = s.restart;
    $('networkMode').value = s.networkMode;
    $('macvlanNetwork').value = s.macvlanNetwork;
    $('macvlanIp').value = s.macvlanIp;
    portRows.forEach(function (r) {
      var match = (s.ports || []).filter(function (p) { return p.cport === r.cport && p.proto === r.proto; })[0];
      r.exp.checked = match ? !!match.expose : false;
      r.host.value = match ? (match.host || '') : '';
    });
    $('allPorts').checked = portRows.every(function (r) { return r.exp.checked; });
    $('webdavPort').value = s.webdavPort;
    $('uid').value = s.uid;
    $('gid').value = s.gid;
    $('tz').value = s.tz;
    $('workgroup').value = s.workgroup;
    $('envNone').checked = s.envMode === 'none';
    $('envFile').checked = s.envMode === 'file';
    $('envEditor').checked = s.envMode === 'editor';
    $('envPath').value = s.envPath;
    $('envFilename').value = s.envFilename;
    $('envText').value = s.envText;
    $('includeUsersFromEnv').checked = !!s.includeUsersFromEnv;

    $('usersList').textContent = '';
    (s.users || []).forEach(function (u) { addUserRow(u.username, u.password); });
    $('sharesList').textContent = '';
    (s.shares || []).forEach(function (sh) { addShareRow(sh.hostPath, sh.shareName, sh.allowedUsers, sh.ro, sh.guest); });

    var smb = s.smb || {};
    $('smbPermFix').checked = !!smb.permFix;
    $('smbNmbd').checked = !!smb.nmbd;
    $('smbRecycle').checked = !!smb.recycleOff;
    $('smbWsdd').checked = !!smb.wsdd;
    $('smbGlobal').value = smb.globalOpts || '';

    var adv = s.advanced || {};
    $('advHealth').checked = !!adv.healthcheck;
    $('advMemory').value = adv.memory || '';
    $('advCpus').value = adv.cpus || '';
    $('singleLineOut').checked = !!s.singleLine;

    refreshVisibility();
    scheduleRender();
  }

  /* ---------------- visibility rules ---------------- */

  function show(id, on) {
    $(id).classList.toggle('hidden', !on);
  }

  function refreshVisibility() {
    var proto = $('protocol').value;
    var image = $('smbImage').value;
    var net = $('networkMode').value;
    var envMode = $('envFile').checked ? 'file' : ($('envEditor').checked ? 'editor' : 'none');
    var smb = proto === 'smb';
    var dperson = smb && image === 'dperson';

    show('imageBlock', smb);
    show('imageWarn', dperson);
    show('scNote', smb && image === 'servercontainers');
    show('portsSection', smb && net === 'bridge');
    show('dpersonPortToggles', dperson);
    show('netbiosNote', dperson);
    show('smbOptions', smb);
    show('dpersonRecycleWrap', dperson);
    show('envSection', dperson);
    show('workgroupBlock', smb);
    show('webdavPortBlock', proto === 'webdav');
    show('macvlanRow', net === 'macvlan');
    show('hostNetNote', net !== 'bridge');

    var portNote = $('protoPortNote');
    if (proto === 'nfs' || proto === 'ftp') {
      portNote.textContent = t('proto.portNote.' + proto);
      portNote.classList.remove('hidden');
    } else portNote.classList.add('hidden');

    // users hidden in dperson+external-file mode (kept from the original tool) and for NFS
    show('usersSection', !(dperson && envMode === 'file') && proto !== 'nfs');
    // UID/GID/TZ/workgroup block: SMB only, and hidden when a dperson .env mode carries them
    show('inlineCreds', smb && !(dperson && envMode !== 'none'));
    show('envFileRow', envMode === 'file');
    show('envEditorPanel', envMode === 'editor');
    show('plainWarn', smb && envMode === 'none');

    $('usersHint').textContent = dperson
      ? (envMode === 'none' ? t('users.hintNone') : t('users.hintEnv'))
      : '';
  }

  /* ---------------- rendering ---------------- */

  var outputs = { run: '', compose: '', systemd: '' };
  var activeTab = 'run';

  function setTab(name) {
    activeTab = name;
    ['run', 'compose', 'systemd'].forEach(function (k) {
      $('tab-' + k).setAttribute('aria-selected', k === name ? 'true' : 'false');
    });
    $('outText').textContent = outputs[name] || '';
    show('composeNote', name === 'compose' && !!outputs.compose);
    show('btnDownloadCompose', name === 'compose' && !!outputs.compose);
    show('btnDownloadSystemd', name === 'systemd' && !!outputs.systemd);
  }
  ['run', 'compose', 'systemd'].forEach(function (k) {
    $('tab-' + k).addEventListener('click', function () { setTab(k); });
  });

  function renderIssueList(listEl, boxId, issues) {
    listEl.textContent = '';
    issues.forEach(function (i) {
      var li = document.createElement('li');
      li.textContent = window.I18N.issueText(lang, i);
      listEl.appendChild(li);
    });
    show(boxId, issues.length > 0);
  }

  function render() {
    var state = collectState();
    var out = CB.buildOutputs(state);

    if (out.errors.length) {
      $('errorBox').textContent = out.errors.map(function (e) {
        return window.I18N.issueText(lang, e);
      }).join('\n');
      outputs = { run: '', compose: '', systemd: '' };
    } else {
      $('errorBox').textContent = '';
      outputs = { run: out.run, compose: out.compose, systemd: out.systemd };
    }
    renderIssueList($('warnList'), 'warnBox', out.warnings || []);
    renderIssueList($('noteList'), 'noteBox', out.notes || []);
    setTab(activeTab);
    autosave(state);
  }

  var renderTimer = null;
  function scheduleRender() {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(render, 150);
  }

  function autosave(state) {
    lsSet(LS.autosave, JSON.stringify(state));
  }

  /* live preview: any change anywhere in the form re-renders */
  document.querySelector('.container').addEventListener('input', function (e) {
    if (e.target.id === 'importText') return;
    scheduleRender();
  });
  document.querySelector('.container').addEventListener('change', function (e) {
    if (e.target.id === 'importText') return;
    refreshVisibility();
    scheduleRender();
  });

  /* ---------------- copy & downloads ---------------- */

  function flash(elId, text, ok) {
    var s = $(elId);
    s.textContent = text;
    s.className = 'status ' + (ok === false ? 'bad' : 'good');
    setTimeout(function () { s.textContent = ''; }, 2500);
  }

  $('btnCopy').addEventListener('click', function () {
    var text = outputs[activeTab] || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(function () {
      flash('copyStatus', t('out.copied'));
    }, function () {
      flash('copyStatus', 'clipboard error', false);
    });
  });

  function download(filename, content) {
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename.replace(/^.*\//, '');
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  }

  $('btnDownloadCompose').addEventListener('click', function () {
    if (outputs.compose) download('docker-compose.yml', outputs.compose);
  });
  $('btnDownloadSystemd').addEventListener('click', function () {
    if (outputs.systemd) {
      var name = $('name').value.trim() || 'nas-container';
      download(name + '.service', outputs.systemd);
    }
  });

  /* ---------------- env editor ---------------- */

  $('btnSyncToEnv').addEventListener('click', function () {
    $('envText').value = CB.buildEnvFromState(collectState());
    $('envIssues').textContent = '';
    flash('envStatus', t('env.synced'));
    scheduleRender();
  });

  $('btnApplyFromEnv').addEventListener('click', function () {
    var patched = CB.applyEnvToState($('envText').value, collectState());
    patched.envMode = 'editor';
    applyState(patched);
    flash('envStatus', t('env.applied'));
  });

  $('btnValidateEnv').addEventListener('click', function () {
    var res = CB.validateEnvText($('envText').value);
    var list = $('envIssues');
    list.textContent = '';
    res.errors.concat(res.warnings).forEach(function (i) {
      var li = document.createElement('li');
      li.textContent = window.I18N.issueText(lang, i);
      if (res.errors.indexOf(i) !== -1) li.style.color = 'var(--error)';
      list.appendChild(li);
    });
    if (res.errors.length) flash('envStatus', res.errors.length + ' ✖', false);
    else flash('envStatus', t('env.valid'));
  });

  $('btnDownloadEnv').addEventListener('click', function () {
    var filename = $('envFilename').value.trim() || 'nas.env';
    download(filename, $('envText').value);
    flash('envStatus', window.I18N.format(t('env.downloaded'), [filename.replace(/^.*\//, '')]));
  });

  /* ---------------- import ---------------- */

  $('btnImportToggle').addEventListener('click', function () {
    $('importPanel').classList.toggle('hidden');
  });

  $('btnImportParse').addEventListener('click', function () {
    var res = CB.parseDockerRunCommand($('importText').value);
    var list = $('importIssues');
    list.textContent = '';
    if (res.error) {
      flash('importStatus', window.I18N.issueText(lang, res.error), false);
      return;
    }
    (res.warnings || []).forEach(function (w) {
      var li = document.createElement('li');
      li.textContent = window.I18N.issueText(lang, w);
      list.appendChild(li);
    });
    applyState(res.state);
    flash('importStatus', t('import.ok'));
  });

  /* ---------------- presets ---------------- */

  var PRESETS = {
    publicGuest: function () {
      var s = CB.defaultState();
      s.users = [];
      s.shares = [{ hostPath: '/srv/nas/public', shareName: 'public', allowedUsers: '', ro: false, guest: true }];
      return s;
    },
    family: function () {
      var s = CB.defaultState();
      s.users = [
        { username: 'alice', password: CB.generatePassword(14) },
        { username: 'bob', password: CB.generatePassword(14) }
      ];
      s.shares = [
        { hostPath: '/srv/nas/family', shareName: 'family', allowedUsers: '', ro: false, guest: false },
        { hostPath: '/srv/nas/alice', shareName: 'alice', allowedUsers: 'alice', ro: false, guest: false }
      ];
      return s;
    },
    mediaRo: function () {
      var s = CB.defaultState();
      s.users = [];
      s.shares = [{ hostPath: '/srv/nas/media', shareName: 'media', allowedUsers: '', ro: true, guest: true }];
      return s;
    },
    timeMachine: function () {
      var s = CB.defaultState();
      s.users = [{ username: 'timemachine', password: CB.generatePassword(14) }];
      s.shares = [{ hostPath: '/srv/nas/timemachine', shareName: 'timemachine', allowedUsers: 'timemachine', ro: false, guest: false }];
      s.smb.globalOpts = [
        'vfs objects = catia fruit streams_xattr',
        'fruit:model = MacSamba',
        'fruit:aapl = yes',
        'fruit:time machine = yes'
      ].join('\n');
      return s;
    }
  };

  $('presetSelect').addEventListener('change', function () {
    var key = $('presetSelect').value;
    if (key && PRESETS[key]) applyState(PRESETS[key]());
    $('presetSelect').value = '';
  });

  /* ---------------- profiles ---------------- */

  function readProfiles() {
    try { return JSON.parse(lsGet(LS.profiles, '{}')) || {}; }
    catch (e) { return {}; }
  }
  function writeProfiles(p) { lsSet(LS.profiles, JSON.stringify(p)); }

  function refreshProfileList() {
    var sel = $('profileSelect');
    var current = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    Object.keys(readProfiles()).sort().forEach(function (name) {
      var opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      sel.appendChild(opt);
    });
    sel.value = current && readProfiles()[current] !== undefined ? current : '';
  }

  $('btnProfileSave').addEventListener('click', function () {
    var name = $('profileName').value.trim() || $('profileSelect').value;
    if (!name) { flash('toolbarStatus', t('profiles.needName'), false); return; }
    var p = readProfiles();
    p[name] = collectState();
    writeProfiles(p);
    refreshProfileList();
    $('profileSelect').value = name;
    flash('toolbarStatus', t('profiles.saved'));
  });

  $('profileSelect').addEventListener('change', function () {
    var name = $('profileSelect').value;
    if (!name) return;
    var p = readProfiles();
    if (p[name]) {
      applyState(p[name]);
      $('profileName').value = name;
      flash('toolbarStatus', t('profiles.loaded'));
    }
  });

  $('btnProfileDelete').addEventListener('click', function () {
    var name = $('profileSelect').value || $('profileName').value.trim();
    if (!name) { flash('toolbarStatus', t('profiles.needName'), false); return; }
    var p = readProfiles();
    delete p[name];
    writeProfiles(p);
    refreshProfileList();
    flash('toolbarStatus', t('profiles.deleted'));
  });

  /* ---------------- shareable link ---------------- */

  function b64encode(str) {
    return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64decode(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    return decodeURIComponent(escape(atob(str)));
  }

  $('btnShareLink').addEventListener('click', function () {
    var state = collectState();
    state.users = (state.users || []).map(function (u) { return { username: u.username, password: '' }; });
    state.envText = '';
    var url = location.origin + location.pathname + '#c=' + b64encode(JSON.stringify(state));
    navigator.clipboard.writeText(url).then(function () {
      flash('toolbarStatus', t('toolbar.shareLinkDone'));
    }, function () {
      flash('toolbarStatus', 'clipboard error', false);
    });
  });

  function loadFromHash() {
    var m = location.hash.match(/^#c=([A-Za-z0-9_-]+)$/);
    if (!m) return false;
    try {
      applyState(JSON.parse(b64decode(m[1])));
      return true;
    } catch (e) { return false; }
  }

  /* ---------------- reset ---------------- */

  $('btnReset').addEventListener('click', function () {
    lsDel(LS.autosave);
    history.replaceState(null, '', location.pathname + location.search);
    $('importPanel').classList.add('hidden');
    $('importText').value = '';
    $('importIssues').textContent = '';
    applyState(CB.defaultState());
  });

  /* ---------------- boot ---------------- */

  refreshProfileList();
  applyLang();

  var booted = false;
  if (loadFromHash()) booted = true;
  if (!booted) {
    var saved = lsGet(LS.autosave, null);
    if (saved) {
      try { applyState(JSON.parse(saved)); booted = true; }
      catch (e) { booted = false; }
    }
  }
  if (!booted) applyState(CB.defaultState());
})();
