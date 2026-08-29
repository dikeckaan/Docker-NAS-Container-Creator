/*
 * command-builder.js — pure logic for Docker NAS Container Creator.
 * No DOM access: everything takes a plain state object and returns strings/objects,
 * so it can be unit-tested with `node --test` and reused by the UI layer.
 */
(function (global) {
  'use strict';

  /* ---------------- constants ---------------- */

  var SMB_PORTS = [
    { cport: 137, proto: 'udp' },
    { cport: 138, proto: 'udp' },
    { cport: 139, proto: 'tcp' },
    { cport: 445, proto: 'tcp' }
  ];

  var IMAGES = {
    dperson: 'dperson/samba',
    servercontainers: 'ghcr.io/servercontainers/samba'
  };

  var PROTOCOL_IMAGES = {
    nfs: 'erichough/nfs-server',
    webdav: 'bytemark/webdav',
    ftp: 'delfer/alpine-ftp-server'
  };

  var RESTART_POLICIES = ['no', 'always', 'unless-stopped', 'on-failure'];

  function defaultState() {
    return {
      protocol: 'smb',            // smb | nfs | webdav | ftp
      image: 'dperson',           // dperson | servercontainers (smb only)
      name: 'nas-container',
      restart: 'unless-stopped',
      networkMode: 'bridge',      // bridge | host | macvlan
      macvlanNetwork: '',
      macvlanIp: '',
      ports: SMB_PORTS.map(function (p) {
        return { cport: p.cport, proto: p.proto, expose: p.cport === 445, host: p.cport === 445 ? '445' : '' };
      }),
      webdavPort: '8080',
      uid: '1000',
      gid: '1000',
      tz: '',
      workgroup: '',
      envMode: 'none',            // none | file | editor
      envPath: './nas.env',
      envFilename: './nas.env',
      envText: '',
      includeUsersFromEnv: false,
      users: [{ username: 'user', password: 'password' }],
      shares: [{ hostPath: '/path/to/server', shareName: 'shared', allowedUsers: '', ro: false, guest: false }],
      smb: { permFix: true, nmbd: false, recycleOff: false, wsdd: false, globalOpts: '' },
      advanced: { healthcheck: false, memory: '', cpus: '' },
      singleLine: true
    };
  }

  /* ---------------- small utilities ---------------- */

  function trimCSV(str) {
    return String(str || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  // POSIX-shell-safe quoting. Values made only of clearly safe characters pass
  // through unchanged; everything else is single-quoted with embedded quotes escaped.
  function shellEscape(v) {
    v = String(v);
    if (v === '') return "''";
    if (/^[A-Za-z0-9_@%+=:,.\/-]+$/.test(v)) return v;
    return "'" + v.replace(/'/g, "'\\''") + "'";
  }

  // YAML scalar for our compose output: bare when trivially safe, else single-quoted.
  function yq(v) {
    v = String(v);
    if (v !== '' && /^[A-Za-z0-9_.\/=-]+$/.test(v) && !/^[0-9.]+$/.test(v)) return v;
    return "'" + v.replace(/'/g, "''") + "'";
  }

  function multilineify(parts) {
    return parts.map(function (p, i) { return i === 0 ? p : ('  ' + p); }).join(' \\\n');
  }

  function err(code, args, text) {
    return { code: code, args: args || [], text: text };
  }

  function parseEnv(text) {
    var out = {};
    String(text || '').split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line || line.charAt(0) === '#') return;
      var eq = line.indexOf('=');
      if (eq === -1) return;
      out[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
    });
    return out;
  }

  /* ---------------- .env handling ---------------- */

  function buildEnvFromState(state) {
    var lines = [];
    var selected = state.ports.filter(function (r) { return r.expose; });
    lines.push('PORTS_SELECTED=' + selected.map(function (r) { return r.cport + '/' + r.proto; }).join(','));
    lines.push('PORTS_HOST=' + selected.map(function (r) { return (String(r.host || '').trim() || r.cport); }).join(','));

    if (String(state.uid || '').trim()) lines.push('USERID=' + String(state.uid).trim());
    if (String(state.gid || '').trim()) lines.push('GROUPID=' + String(state.gid).trim());
    if (String(state.tz || '').trim()) lines.push('TZ=' + String(state.tz).trim());
    if (String(state.workgroup || '').trim()) lines.push('WORKGROUP=' + String(state.workgroup).trim());
    lines.push('RESTART=' + state.restart);

    var users = (state.users || []).filter(function (u) { return u.username && u.password; });
    if (users.length) {
      lines.push('USERS=' + users.map(function (u) { return u.username + ':' + u.password; }).join(','));
    }

    var shares = state.shares || [];
    lines.push('SHARE_COUNT=' + shares.length);
    shares.forEach(function (s, i) {
      var mountPath = '/data' + i;
      var name = String(s.shareName || '').trim() || ('share' + i);
      lines.push('MOUNT_' + i + '=' + String(s.hostPath || '').trim() + ':' + mountPath);
      lines.push('SHARE_' + i + '=name=' + name + ';path=' + mountPath +
        ';ro=' + (s.ro ? 'yes' : 'no') + ';guest=' + (s.guest ? 'yes' : 'no') +
        ';users=' + (String(s.allowedUsers || '').trim() || 'all'));
    });
    return lines.join('\n');
  }

  // Real validation of the editor's .env text. Returns { errors: [], warnings: [] }.
  function validateEnvText(text) {
    var errors = [], warnings = [];
    var env = parseEnv(text);
    var known = /^(PORTS_SELECTED|PORTS_HOST|USERID|GROUPID|TZ|WORKGROUP|RESTART|USERS|SHARE_COUNT|MOUNT_\d+|SHARE_\d+)$/;
    var knownPorts = { '137/udp': 1, '138/udp': 1, '139/tcp': 1, '445/tcp': 1 };

    Object.keys(env).forEach(function (k) {
      if (!known.test(k)) warnings.push(err('envUnknownKey', [k], 'Unknown key "' + k + '" (ignored by the tool).'));
    });

    var sel = trimCSV(env.PORTS_SELECTED);
    var hosts = trimCSV(env.PORTS_HOST);
    sel.forEach(function (p) {
      if (!knownPorts[p]) errors.push(err('envBadPort', [p], 'PORTS_SELECTED contains unknown port "' + p + '".'));
    });
    if (sel.length !== hosts.length && (env.PORTS_HOST !== undefined || sel.length)) {
      errors.push(err('envPortCount', [String(sel.length), String(hosts.length)],
        'PORTS_SELECTED has ' + sel.length + ' entries but PORTS_HOST has ' + hosts.length + '.'));
    }
    hosts.forEach(function (h) {
      if (!/^\d+$/.test(h) || +h < 1 || +h > 65535) {
        errors.push(err('envBadHostPort', [h], 'PORTS_HOST entry "' + h + '" is not a valid port (1-65535).'));
      }
    });

    ['USERID', 'GROUPID'].forEach(function (k) {
      if (env[k] !== undefined && !/^\d+$/.test(env[k])) {
        errors.push(err('envNotNumeric', [k, env[k]], k + '="' + env[k] + '" must be numeric.'));
      }
    });

    if (env.RESTART !== undefined && RESTART_POLICIES.indexOf(env.RESTART) === -1) {
      errors.push(err('envBadRestart', [env.RESTART], 'RESTART="' + env.RESTART + '" is not a valid docker restart policy.'));
    }

    if (env.USERS !== undefined) {
      env.USERS.split(',').forEach(function (pair) {
        var idx = pair.indexOf(':');
        if (idx <= 0 || idx === pair.length - 1) {
          errors.push(err('envBadUser', [pair], 'USERS entry "' + pair + '" must be "username:password".'));
        }
      });
    }

    var count = 0;
    if (env.SHARE_COUNT !== undefined) {
      if (!/^\d+$/.test(env.SHARE_COUNT)) {
        errors.push(err('envBadShareCount', [env.SHARE_COUNT], 'SHARE_COUNT="' + env.SHARE_COUNT + '" must be a number.'));
      } else {
        count = parseInt(env.SHARE_COUNT, 10);
      }
    }
    for (var i = 0; i < count; i++) {
      if (env['MOUNT_' + i] === undefined) errors.push(err('envMissing', ['MOUNT_' + i], 'MOUNT_' + i + ' is missing.'));
      else if (env['MOUNT_' + i].indexOf(':') === -1) errors.push(err('envBadMount', ['MOUNT_' + i], 'MOUNT_' + i + ' must look like "/host/path:/data' + i + '".'));
      if (env['SHARE_' + i] === undefined) errors.push(err('envMissing', ['SHARE_' + i], 'SHARE_' + i + ' is missing.'));
      else if (!/(^|;)name=/.test(env['SHARE_' + i])) errors.push(err('envBadShare', ['SHARE_' + i], 'SHARE_' + i + ' must contain "name=...".'));
    }
    Object.keys(env).forEach(function (k) {
      var m = k.match(/^(SHARE|MOUNT)_(\d+)$/);
      if (m && parseInt(m[2], 10) >= count && env.SHARE_COUNT !== undefined) {
        warnings.push(err('envExtraShare', [k], k + ' is beyond SHARE_COUNT and will be ignored.'));
      }
    });

    return { errors: errors, warnings: warnings };
  }

  // Turn env text into a partial state patch (the UI merges it into the form).
  function applyEnvToState(text, baseState) {
    var env = parseEnv(text);
    var state = JSON.parse(JSON.stringify(baseState || defaultState()));

    var sel = trimCSV(env.PORTS_SELECTED);
    var hosts = trimCSV(env.PORTS_HOST);
    state.ports.forEach(function (r) {
      var key = r.cport + '/' + r.proto;
      var pos = sel.indexOf(key);
      r.expose = pos !== -1;
      if (pos !== -1 && hosts[pos]) r.host = hosts[pos];
      else if (!r.host) r.host = String(r.cport);
    });

    state.uid = env.USERID || '';
    state.gid = env.GROUPID || '';
    if (env.TZ !== undefined) state.tz = env.TZ;
    if (env.WORKGROUP !== undefined) state.workgroup = env.WORKGROUP;
    if (env.RESTART) state.restart = env.RESTART;

    if (env.USERS) {
      state.users = env.USERS.split(',').map(function (pair) {
        var idx = pair.indexOf(':');
        return { username: (idx === -1 ? pair : pair.slice(0, idx)).trim(), password: (idx === -1 ? '' : pair.slice(idx + 1)).trim() };
      });
    }

    var count = 0;
    if (env.SHARE_COUNT && /^\d+$/.test(env.SHARE_COUNT)) count = parseInt(env.SHARE_COUNT, 10);
    else Object.keys(env).forEach(function (k) {
      var m = k.match(/^SHARE_(\d+)$/);
      if (m) count = Math.max(count, parseInt(m[1], 10) + 1);
    });

    var shares = [];
    for (var i = 0; i < count; i++) {
      var m = env['MOUNT_' + i], s = env['SHARE_' + i];
      if (!m || !s) continue;
      var hostPath = (m.split(':')[0] || '').trim();
      var parts = {};
      s.split(';').forEach(function (kv) {
        var eq = kv.indexOf('=');
        if (eq !== -1) parts[kv.slice(0, eq).trim()] = kv.slice(eq + 1).trim();
      });
      shares.push({
        hostPath: hostPath,
        shareName: parts.name || ('share' + i),
        allowedUsers: parts.users === 'all' ? '' : (parts.users || ''),
        ro: parts.ro === 'yes',
        guest: parts.guest === 'yes'
      });
    }
    if (shares.length) state.shares = shares;
    return state;
  }

  /* ---------------- validation ---------------- */

  function validateState(state) {
    var errors = [], warnings = [];
    var name = String(state.name || '').trim();

    if (name && !/^[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(name)) {
      errors.push(err('badName', [name], 'Container name "' + name + '" is invalid (letters, digits, "_", ".", "-").'));
    }

    var shares = state.shares || [];
    if (!shares.length) errors.push(err('needShare', [], 'Add at least one share.'));
    var seen = {}, dups = {};
    shares.forEach(function (s) {
      var hostPath = String(s.hostPath || '').trim();
      var shareName = String(s.shareName || '').trim();
      if (!hostPath) errors.push(err('needHostPath', [], 'Every share needs a Host Path.'));
      else if (hostPath.charAt(0) !== '/') warnings.push(err('relPath', [hostPath], 'Host path "' + hostPath + '" is not absolute; bind mounts normally need absolute paths.'));
      if (!shareName) errors.push(err('needShareName', [], 'Every share needs a Share Name.'));
      else {
        if (shareName.indexOf(';') !== -1) errors.push(err('shareSemicolon', [shareName], 'Share name "' + shareName + '" cannot contain ";".'));
        if (!/^[A-Za-z0-9._ -]+$/.test(shareName)) warnings.push(err('shareCharset', [shareName], 'Share name "' + shareName + '" contains characters some SMB clients dislike.'));
        else if (/\s/.test(shareName)) warnings.push(err('shareSpace', [shareName], 'Share name "' + shareName + '" contains spaces; some clients handle this poorly.'));
        var key = shareName.toLowerCase();
        if (seen[key]) dups[shareName] = true; else seen[key] = true;
      }
      trimCSV(s.allowedUsers).forEach(function (u) {
        if (u.indexOf(';') !== -1) errors.push(err('userSemicolon', [u], 'User "' + u + '" cannot contain ";".'));
      });
    });
    var dupNames = Object.keys(dups);
    if (dupNames.length) errors.push(err('dupShares', [dupNames.join(', ')], 'Share names must be unique. Duplicates found: ' + dupNames.join(', ')));

    (state.users || []).forEach(function (u) {
      if (!u.username && !u.password) return;
      if (u.username.indexOf(';') !== -1 || u.password.indexOf(';') !== -1) {
        errors.push(err('credSemicolon', [u.username], 'Usernames/passwords cannot contain ";" (it is the field separator).'));
      }
      if (u.username && !/^[A-Za-z_][A-Za-z0-9._-]*$/.test(u.username)) {
        warnings.push(err('userCharset', [u.username], 'Username "' + u.username + '" may not be accepted by the container.'));
      }
      if (u.username && u.password && u.password.length < 8) {
        warnings.push(err('weakPassword', [u.username], 'Password for "' + u.username + '" is shorter than 8 characters.'));
      }
    });

    ['uid', 'gid'].forEach(function (k) {
      var v = String(state[k] || '').trim();
      if (v && !/^\d+$/.test(v)) errors.push(err('badId', [k.toUpperCase(), v], k.toUpperCase() + ' "' + v + '" must be numeric.'));
    });

    if (state.networkMode === 'macvlan' && !String(state.macvlanNetwork || '').trim()) {
      errors.push(err('needMacvlan', [], 'macvlan mode needs the name of a pre-created docker network.'));
    }

    if (state.protocol === 'smb' && state.networkMode === 'bridge') {
      var used = {};
      var anyExposed = false;
      state.ports.forEach(function (r) {
        if (!r.expose) return;
        anyExposed = true;
        var host = String(r.host || '').trim() || String(r.cport);
        if (!/^\d+$/.test(host) || +host < 1 || +host > 65535) {
          errors.push(err('badPort', [host], 'Host port "' + host + '" must be a number between 1 and 65535.'));
          return;
        }
        var key = host + '/' + r.proto;
        if (used[key]) errors.push(err('dupPort', [key], 'Host port ' + key + ' is bound more than once.'));
        used[key] = true;
      });
      if (!anyExposed) warnings.push(err('noPorts', [], 'No ports are exposed; clients on the network will not reach the share in bridge mode.'));
    }

    if (state.protocol === 'webdav') {
      var wp = String(state.webdavPort || '').trim() || '8080';
      if (!/^\d+$/.test(wp) || +wp < 1 || +wp > 65535) errors.push(err('badPort', [wp], 'Host port "' + wp + '" must be a number between 1 and 65535.'));
    }

    var mem = String((state.advanced || {}).memory || '').trim();
    if (mem && !/^\d+(\.\d+)?[bkmg]?$/i.test(mem)) warnings.push(err('badMemory', [mem], 'Memory limit "' + mem + '" does not look like a docker value (e.g. 512m, 2g).'));
    var cpus = String((state.advanced || {}).cpus || '').trim();
    if (cpus && !/^\d+(\.\d+)?$/.test(cpus)) warnings.push(err('badCpus', [cpus], 'CPU limit "' + cpus + '" must be a number (e.g. 1.5).'));

    return { errors: errors, warnings: warnings };
  }

  // Users that end up as -u flags / accounts, given the env mode.
  function effectiveUsers(state, errors) {
    var users = [];
    if (state.envMode === 'none') {
      users = (state.users || []).filter(function (u) { return u.username || u.password; });
      var allGuest = (state.shares || []).length > 0 && state.shares.every(function (s) { return s.guest; });
      if (!users.length && !allGuest) {
        errors.push(err('needUser', [], 'Add at least one user (or make every share a guest share / switch to a .env mode).'));
      }
      users.forEach(function (u) {
        if (!u.username || !u.password) errors.push(err('userIncomplete', [], 'Each user needs both username and password.'));
      });
    } else if (state.envMode === 'editor' && state.includeUsersFromEnv) {
      var envObj = parseEnv(state.envText);
      if (envObj.USERS) {
        users = envObj.USERS.split(',').map(function (p) {
          var idx = p.indexOf(':');
          return { username: (idx === -1 ? p : p.slice(0, idx)).trim(), password: (idx === -1 ? '' : p.slice(idx + 1)).trim() };
        }).filter(function (u) { return u.username && u.password; });
      }
    }
    return users;
  }

  /* ---------------- spec → output renderers ---------------- */

  function renderRun(spec, singleLine) {
    var parts = ['docker run -d'];
    if (spec.containerName) parts.push('--name ' + shellEscape(spec.containerName));
    if (spec.networkMode === 'host') parts.push('--network host');
    else if (spec.networkMode === 'macvlan') {
      parts.push('--network ' + shellEscape(spec.macvlanNetwork));
      if (spec.macvlanIp) parts.push('--ip ' + shellEscape(spec.macvlanIp));
    }
    if (spec.networkMode === 'bridge') {
      (spec.ports || []).forEach(function (p) { parts.push('-p ' + p); });
    }
    (spec.capAdd || []).forEach(function (c) { parts.push('--cap-add ' + c); });
    (spec.volumes || []).forEach(function (v) { parts.push('-v ' + shellEscape(v)); });
    (spec.env || []).forEach(function (e) { parts.push('-e ' + shellEscape(e)); });
    if (spec.envFile) parts.push('--env-file ' + shellEscape(spec.envFile));
    if (spec.memory) parts.push('--memory ' + shellEscape(spec.memory));
    if (spec.cpus) parts.push('--cpus ' + shellEscape(spec.cpus));
    if (spec.healthcheck) {
      parts.push('--health-cmd ' + shellEscape(spec.healthcheck.cmd));
      parts.push('--health-interval ' + spec.healthcheck.interval);
    }
    parts.push('--restart ' + spec.restart);
    parts.push(spec.image);
    (spec.command || []).forEach(function (a) { parts.push(shellEscape(a)); });

    var main = singleLine ? parts.join(' ') : multilineify(parts);
    var extras = (spec.extraServices || []).map(function (s) {
      var ep = ['docker run -d', '--name ' + shellEscape(s.name)];
      if (s.networkMode === 'host') ep.push('--network host');
      ep.push('--restart ' + spec.restart);
      ep.push(s.image);
      return ep.join(' ');
    });
    return extras.length ? main + '\n\n' + extras.join('\n') : main;
  }

  function renderCompose(spec) {
    var L = [];
    var svc = (spec.containerName || 'nas').replace(/[^A-Za-z0-9_-]/g, '-').toLowerCase() || 'nas';
    L.push('services:');
    L.push('  ' + svc + ':');
    L.push('    image: ' + yq(spec.image));
    if (spec.containerName) L.push('    container_name: ' + yq(spec.containerName));
    L.push('    restart: ' + yq(spec.restart));
    if (spec.networkMode === 'host') L.push('    network_mode: host');
    if (spec.networkMode === 'bridge' && (spec.ports || []).length) {
      L.push('    ports:');
      spec.ports.forEach(function (p) { L.push("      - '" + p.replace(/'/g, "''") + "'"); });
    }
    if (spec.networkMode === 'macvlan') {
      L.push('    networks:');
      L.push('      nasnet:');
      if (spec.macvlanIp) L.push('        ipv4_address: ' + yq(spec.macvlanIp));
      else L.push('        {}');
    }
    if ((spec.capAdd || []).length) {
      L.push('    cap_add:');
      spec.capAdd.forEach(function (c) { L.push('      - ' + c); });
    }
    if ((spec.volumes || []).length) {
      L.push('    volumes:');
      spec.volumes.forEach(function (v) { L.push('      - ' + yq(v)); });
    }
    if ((spec.env || []).length) {
      L.push('    environment:');
      spec.env.forEach(function (e) { L.push('      - ' + yq(e)); });
    }
    if (spec.envFile) {
      L.push('    env_file:');
      L.push('      - ' + yq(spec.envFile));
    }
    if (spec.memory) L.push('    mem_limit: ' + yq(spec.memory));
    if (spec.cpus) L.push('    cpus: ' + yq(spec.cpus));
    if (spec.healthcheck) {
      L.push('    healthcheck:');
      L.push('      test: [' + spec.healthcheck.cmd.split(' ').map(function (t) { return '"' + t.replace(/"/g, '\\"') + '"'; }).join(', ') + ']');
      L.push('      interval: ' + spec.healthcheck.interval);
    }
    if ((spec.command || []).length) {
      L.push('    command:');
      spec.command.forEach(function (a) { L.push('      - ' + yq(a)); });
    }
    (spec.extraServices || []).forEach(function (s) {
      L.push('  ' + s.name.replace(/[^A-Za-z0-9_-]/g, '-') + ':');
      L.push('    image: ' + yq(s.image));
      L.push('    restart: ' + yq(spec.restart));
      if (s.networkMode === 'host') L.push('    network_mode: host');
    });
    if (spec.networkMode === 'macvlan') {
      L.push('');
      L.push('networks:');
      L.push('  nasnet:');
      L.push('    external: true');
      L.push('    name: ' + yq(spec.macvlanNetwork));
    }
    return L.join('\n') + '\n';
  }

  function renderSystemd(spec) {
    var name = spec.containerName || 'nas-container';
    var parts = ['/usr/bin/docker run --rm --name ' + shellEscape(name)];
    if (spec.networkMode === 'host') parts.push('--network host');
    else if (spec.networkMode === 'macvlan') {
      parts.push('--network ' + shellEscape(spec.macvlanNetwork));
      if (spec.macvlanIp) parts.push('--ip ' + shellEscape(spec.macvlanIp));
    }
    if (spec.networkMode === 'bridge') (spec.ports || []).forEach(function (p) { parts.push('-p ' + p); });
    (spec.capAdd || []).forEach(function (c) { parts.push('--cap-add ' + c); });
    (spec.volumes || []).forEach(function (v) { parts.push('-v ' + shellEscape(v)); });
    (spec.env || []).forEach(function (e) { parts.push('-e ' + shellEscape(e)); });
    if (spec.envFile) parts.push('--env-file ' + shellEscape(spec.envFile));
    parts.push(spec.image);
    (spec.command || []).forEach(function (a) { parts.push(shellEscape(a)); });

    return [
      '[Unit]',
      'Description=' + name + ' (Docker NAS container)',
      'After=docker.service network-online.target',
      'Requires=docker.service',
      '',
      '[Service]',
      'ExecStartPre=-/usr/bin/docker rm -f ' + shellEscape(name),
      'ExecStart=' + parts.join(' '),
      'ExecStop=/usr/bin/docker stop ' + shellEscape(name),
      'Restart=always',
      'RestartSec=10',
      '',
      '[Install]',
      'WantedBy=multi-user.target',
      ''
    ].join('\n');
  }

  /* ---------------- protocol builders (state → spec) ---------------- */

  function baseSpec(state) {
    return {
      containerName: String(state.name || '').trim(),
      restart: state.restart,
      networkMode: state.networkMode,
      macvlanNetwork: String(state.macvlanNetwork || '').trim(),
      macvlanIp: String(state.macvlanIp || '').trim(),
      memory: String((state.advanced || {}).memory || '').trim(),
      cpus: String((state.advanced || {}).cpus || '').trim(),
      ports: [], volumes: [], env: [], command: [], capAdd: [], extraServices: [],
      envFile: null, healthcheck: null
    };
  }

  function smbPorts(state) {
    return state.ports.filter(function (r) { return r.expose; }).map(function (r) {
      var host = String(r.host || '').trim() || String(r.cport);
      return host + ':' + r.cport + '/' + r.proto;
    });
  }

  function buildSmbDperson(state, users, errors, warnings, notes) {
    var spec = baseSpec(state);
    spec.image = IMAGES.dperson;
    spec.ports = smbPorts(state);

    var useEnv = state.envMode === 'file' || state.envMode === 'editor';
    var envFilePath = state.envMode === 'file' ? String(state.envPath || '').trim()
      : (state.envMode === 'editor' ? (String(state.envFilename || '').trim() || './nas.env') : '');
    if (state.envMode === 'file' && !envFilePath) {
      errors.push(err('needEnvPath', [], 'Please provide a path to your external .env file.'));
    }

    state.shares.forEach(function (s, i) {
      spec.volumes.push(String(s.hostPath || '').trim() + ':/data' + i);
    });

    if (useEnv) spec.envFile = envFilePath;
    else {
      if (String(state.uid || '').trim()) spec.env.push('USERID=' + String(state.uid).trim());
      if (String(state.gid || '').trim()) spec.env.push('GROUPID=' + String(state.gid).trim());
    }
    if (String(state.tz || '').trim()) spec.env.push('TZ=' + String(state.tz).trim());

    var smb = state.smb || {};
    if (smb.nmbd) spec.command.push('-n');
    if (smb.permFix) spec.command.push('-p');
    if (smb.recycleOff) spec.command.push('-r');
    if (String(state.workgroup || '').trim()) { spec.command.push('-w'); spec.command.push(String(state.workgroup).trim()); }
    String(smb.globalOpts || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean)
      .forEach(function (line) { spec.command.push('-g'); spec.command.push(line); });

    var includeUsers = !useEnv || (state.envMode === 'editor' && state.includeUsersFromEnv);
    if (includeUsers) {
      users.forEach(function (u) { spec.command.push('-u'); spec.command.push(u.username + ';' + u.password); });
      var nameSet = {};
      users.forEach(function (u) { nameSet[u.username] = true; });
      state.shares.forEach(function (s) {
        if (!String(s.allowedUsers || '').trim()) return;
        var missing = trimCSV(s.allowedUsers).filter(function (n) { return !nameSet[n]; });
        if (missing.length) {
          errors.push(err('unknownUsers', [s.shareName, missing.join(', ')],
            'Share "' + s.shareName + '" lists unknown user(s): ' + missing.join(', ') + '.'));
        }
      });
      if (users.length) notes.push(err('notePlaintext', [],
        'Passwords appear in plain text in the command (shell history, "docker inspect"). Prefer a .env mode for anything beyond testing.'));
    }

    state.shares.forEach(function (s, i) {
      var usersField = String(s.allowedUsers || '').trim() ? trimCSV(s.allowedUsers).join(',') : 'all';
      spec.command.push('-s');
      spec.command.push(String(s.shareName).trim() + ';/data' + i + ';yes;' + (s.ro ? 'yes' : 'no') + ';' +
        (s.guest ? 'yes' : 'no') + ';' + usersField + ';none');
    });

    if ((state.advanced || {}).healthcheck) {
      spec.healthcheck = { cmd: 'smbclient -L //localhost -U % -m SMB3', interval: '60s' };
    }

    if (smb.wsdd) {
      spec.extraServices.push({
        name: (spec.containerName || 'nas') + '-wsdd',
        image: 'steilerdev/wsdd',
        networkMode: 'host'
      });
      notes.push(err('noteWsdd', [], 'A companion WS-Discovery (wsdd) container is added so modern Windows finds the share; it needs host networking. Swap the image for your preferred wsdd build if you have one.'));
    }
    if (smb.nmbd && state.networkMode === 'bridge') {
      var has137 = state.ports.some(function (r) { return r.cport === 137 && r.expose; });
      var has138 = state.ports.some(function (r) { return r.cport === 138 && r.expose; });
      if (!has137 || !has138) notes.push(err('noteNetbios', [], 'NetBIOS (-n) is enabled: also expose 137/udp and 138/udp, or use host networking.'));
    }
    notes.push(err('noteDperson', [], 'dperson/samba has been unmaintained for years. Consider the maintained ghcr.io/servercontainers/samba image (selectable above).'));
    return spec;
  }

  function sanitizeEnvKey(name) {
    return String(name).replace(/[^A-Za-z0-9]/g, '_').toLowerCase();
  }

  function buildSmbServercontainers(state, users, errors, warnings, notes) {
    var spec = baseSpec(state);
    spec.image = IMAGES.servercontainers;
    spec.ports = smbPorts(state);

    if (state.envMode !== 'none') {
      warnings.push(err('scEnvMode', [], '.env modes are designed for dperson/samba; for this image the account/share settings are emitted as -e variables instead.'));
    }

    var uid = String(state.uid || '').trim();
    users.forEach(function (u) {
      spec.env.push('ACCOUNT_' + sanitizeEnvKey(u.username) + '=' + u.password);
      if (uid) spec.env.push('UID_' + sanitizeEnvKey(u.username) + '=' + uid);
    });
    if (String(state.tz || '').trim()) spec.env.push('TZ=' + String(state.tz).trim());
    if (String(state.workgroup || '').trim()) spec.env.push('SAMBA_CONF_WORKGROUP=' + String(state.workgroup).trim());

    var globalLines = String((state.smb || {}).globalOpts || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    if (globalLines.length) spec.env.push('SAMBA_GLOBAL_STANZA=' + globalLines.join('; '));

    state.shares.forEach(function (s) {
      var mount = '/shares/' + sanitizeEnvKey(s.shareName);
      spec.volumes.push(String(s.hostPath || '').trim() + ':' + mount);
      var cfg = '[' + String(s.shareName).trim() + ']; path=' + mount + '; browseable = yes' +
        '; read only = ' + (s.ro ? 'yes' : 'no') +
        '; guest ok = ' + (s.guest ? 'yes' : 'no');
      var allowed = trimCSV(s.allowedUsers);
      if (allowed.length) cfg += '; valid users = ' + allowed.join(', ');
      spec.env.push('SAMBA_VOLUME_CONFIG_' + sanitizeEnvKey(s.shareName) + '=' + cfg);
    });

    if ((state.smb || {}).wsdd) {
      notes.push(err('noteScWsdd', [], 'ghcr.io/servercontainers/samba ships avahi + wsdd2 built in — no extra container needed. Host networking is recommended for discovery.'));
    }
    if ((state.advanced || {}).healthcheck) {
      warnings.push(err('scHealth', [], 'The built-in healthcheck preset targets dperson/samba; verify smbclient exists in this image before relying on it.'));
      spec.healthcheck = { cmd: 'smbclient -L //localhost -U % -m SMB3', interval: '60s' };
    }
    notes.push(err('noteScDocs', [], 'Full option reference: https://github.com/ServerContainers/samba'));
    return spec;
  }

  function buildNfs(state, users, errors, warnings, notes) {
    var spec = baseSpec(state);
    spec.image = PROTOCOL_IMAGES.nfs;
    spec.capAdd = ['SYS_ADMIN'];
    spec.ports = ['2049:2049/tcp'];
    state.shares.forEach(function (s, i) {
      var mount = '/export/' + sanitizeEnvKey(s.shareName);
      spec.volumes.push(String(s.hostPath || '').trim() + ':' + mount);
      spec.env.push('NFS_EXPORT_' + i + '=' + mount + ' *(' + (s.ro ? 'ro' : 'rw') + ',no_subtree_check' + (s.guest ? ',insecure,all_squash' : '') + ')');
    });
    notes.push(err('noteNfs', [], 'NFS uses host-based access control, so the users list is ignored. The host kernel needs the nfs/nfsd modules loaded.'));
    if ((state.users || []).some(function (u) { return u.username; })) {
      warnings.push(err('nfsUsers', [], 'NFS exports are not per-user; the users you defined are not part of this configuration.'));
    }
    return spec;
  }

  function buildWebdav(state, users, errors, warnings, notes) {
    var spec = baseSpec(state);
    spec.image = PROTOCOL_IMAGES.webdav;
    var hostPort = String(state.webdavPort || '').trim() || '8080';
    spec.ports = [hostPort + ':80/tcp'];
    var first = users[0];
    if (first) {
      spec.env.push('AUTH_TYPE=Digest');
      spec.env.push('USERNAME=' + first.username);
      spec.env.push('PASSWORD=' + first.password);
    } else {
      warnings.push(err('webdavNoUser', [], 'No user defined — the WebDAV server will be unauthenticated only if the image allows it; add a user.'));
    }
    if (users.length > 1) warnings.push(err('webdavOneUser', [], 'bytemark/webdav supports a single username/password; only the first user is used.'));
    if (state.shares.length > 1) warnings.push(err('webdavOneShare', [], 'WebDAV serves one tree; only the first share is mounted.'));
    var s = state.shares[0];
    if (s) spec.volumes.push(String(s.hostPath || '').trim() + ':/var/lib/dav/data' + (s.ro ? ':ro' : ''));
    return spec;
  }

  function buildFtp(state, users, errors, warnings, notes) {
    var spec = baseSpec(state);
    spec.image = PROTOCOL_IMAGES.ftp;
    spec.ports = ['21:21/tcp', '21000-21010:21000-21010/tcp'];
    if (!users.length) errors.push(err('needUser', [], 'Add at least one user (or make every share a guest share / switch to a .env mode).'));
    users.forEach(function (u) {
      if (u.username.indexOf('|') !== -1 || u.password.indexOf('|') !== -1) {
        errors.push(err('ftpPipe', [u.username], 'FTP usernames/passwords cannot contain "|".'));
      }
    });
    spec.env.push('USERS=' + users.map(function (u) { return u.username + '|' + u.password + '|/ftp/data'; }).join(' '));
    state.shares.forEach(function (s) {
      spec.volumes.push(String(s.hostPath || '').trim() + ':/ftp/data/' + sanitizeEnvKey(s.shareName) + (s.ro ? ':ro' : ''));
    });
    if (state.shares.some(function (s) { return s.ro; })) {
      warnings.push(err('ftpRo', [], 'Read-only is enforced by the :ro bind mount; the FTP server itself has no per-share permissions.'));
    }
    notes.push(err('noteFtp', [], 'Passive-mode ports 21000-21010 are published; set ADDRESS/MIN/MAX env vars if your setup differs (see delfer/alpine-ftp-server docs).'));
    return spec;
  }

  /* ---------------- main entry ---------------- */

  function buildOutputs(state) {
    var v = validateState(state);
    var errors = v.errors, warnings = v.warnings, notes = [];

    var users = [];
    if (state.protocol === 'smb') {
      users = effectiveUsers(state, errors);
    } else {
      users = (state.users || []).filter(function (u) { return u.username && u.password; });
      if (state.protocol === 'webdav' || state.protocol === 'ftp') {
        (state.users || []).forEach(function (u) {
          if ((u.username && !u.password) || (!u.username && u.password)) {
            errors.push(err('userIncomplete', [], 'Each user needs both username and password.'));
          }
        });
      }
    }

    if (errors.length) return { errors: errors, warnings: warnings, notes: notes, run: '', compose: '', systemd: '' };

    var spec;
    if (state.protocol === 'smb') {
      spec = state.image === 'servercontainers'
        ? buildSmbServercontainers(state, users, errors, warnings, notes)
        : buildSmbDperson(state, users, errors, warnings, notes);
    } else if (state.protocol === 'nfs') spec = buildNfs(state, users, errors, warnings, notes);
    else if (state.protocol === 'webdav') spec = buildWebdav(state, users, errors, warnings, notes);
    else if (state.protocol === 'ftp') spec = buildFtp(state, users, errors, warnings, notes);
    else { errors.push(err('badProtocol', [String(state.protocol)], 'Unknown protocol.')); }

    if (errors.length) return { errors: errors, warnings: warnings, notes: notes, run: '', compose: '', systemd: '' };

    if (state.networkMode !== 'bridge' && state.protocol === 'smb') {
      notes.push(err('noteHostNet', [], 'With host/macvlan networking, port mappings are not used — the service listens on its standard ports directly.'));
    }

    return {
      errors: [],
      warnings: warnings,
      notes: notes,
      run: renderRun(spec, !!state.singleLine),
      compose: renderCompose(spec),
      systemd: renderSystemd(spec),
      spec: spec
    };
  }

  /* ---------------- docker run import ---------------- */

  function tokenize(text) {
    var tokens = [], cur = '', i = 0, n = text.length, inS = false, inD = false, has = false;
    text = text.replace(/\\\r?\n/g, ' ');
    n = text.length;
    while (i < n) {
      var c = text[i];
      if (inS) {
        if (c === "'") inS = false; else cur += c;
      } else if (inD) {
        if (c === '"') inD = false;
        else if (c === '\\' && i + 1 < n && '"\\$`'.indexOf(text[i + 1]) !== -1) { cur += text[++i]; }
        else cur += c;
      } else if (c === "'") { inS = true; has = true; }
      else if (c === '"') { inD = true; has = true; }
      else if (c === '\\' && i + 1 < n) { cur += text[++i]; has = true; }
      else if (/\s/.test(c)) { if (cur || has) tokens.push(cur); cur = ''; has = false; }
      else { cur += c; has = true; }
      i++;
    }
    if (cur || has) tokens.push(cur);
    return tokens;
  }

  var DOCKER_VALUE_FLAGS = {
    '--name': 1, '-p': 1, '--publish': 1, '-v': 1, '--volume': 1, '-e': 1, '--env': 1,
    '--env-file': 1, '--restart': 1, '--network': 1, '--net': 1, '--ip': 1, '--cap-add': 1,
    '--memory': 1, '-m': 1, '--cpus': 1, '--health-cmd': 1, '--health-interval': 1,
    '-u': 1, '--user': 1, '-w': 1, '--workdir': 1, '--hostname': 1, '-h': 1, '--label': 1, '-l': 1,
    '--mount': 1, '--dns': 1, '--entrypoint': 1
  };

  function parseDockerRunCommand(text) {
    var warnings = [];
    var tokens = tokenize(String(text || '').trim());
    // strip leading "sudo", find "docker run"
    while (tokens.length && tokens[0] === 'sudo') tokens.shift();
    if (tokens[0] !== 'docker' || tokens[1] !== 'run') {
      return { error: err('importNotRun', [], 'That does not look like a "docker run" command.') };
    }
    tokens = tokens.slice(2);

    var state = defaultState();
    state.ports.forEach(function (r) { r.expose = false; r.host = ''; });
    state.users = [];
    state.shares = [];
    state.smb = { permFix: false, nmbd: false, recycleOff: false, wsdd: false, globalOpts: '' };
    state.uid = ''; state.gid = '';

    var i = 0, image = null, imageArgs = [];
    var ports = [], volumes = [], envs = [];

    while (i < tokens.length) {
      var t = tokens[i];
      if (image) { imageArgs.push(t); i++; continue; }
      if (t.charAt(0) === '-') {
        var flag = t, val = null;
        var eq = t.indexOf('=');
        if (t.slice(0, 2) === '--' && eq !== -1) { flag = t.slice(0, eq); val = t.slice(eq + 1); }
        if (DOCKER_VALUE_FLAGS[flag] && val === null) { val = tokens[i + 1]; i++; }
        switch (flag) {
          case '--name': state.name = val || ''; break;
          case '-p': case '--publish': if (val) ports.push(val); break;
          case '-v': case '--volume': if (val) volumes.push(val); break;
          case '-e': case '--env': if (val) envs.push(val); break;
          case '--env-file': state.envMode = 'file'; state.envPath = val || './nas.env'; break;
          case '--restart': if (val && RESTART_POLICIES.indexOf(val.split(':')[0]) !== -1) state.restart = val.split(':')[0]; break;
          case '--network': case '--net':
            if (val === 'host') state.networkMode = 'host';
            else if (val && val !== 'bridge') { state.networkMode = 'macvlan'; state.macvlanNetwork = val; }
            break;
          case '--ip': state.macvlanIp = val || ''; break;
          case '--memory': case '-m': state.advanced.memory = val || ''; break;
          case '--cpus': state.advanced.cpus = val || ''; break;
          case '--health-cmd': state.advanced.healthcheck = true; break;
          case '-d': case '--detach': case '-it': case '-t': case '-i': case '--rm': case '--init': case '--privileged': break;
          default:
            if (DOCKER_VALUE_FLAGS[flag]) warnings.push(err('importSkippedFlag', [flag], 'Docker flag "' + flag + '" was ignored.'));
            else warnings.push(err('importSkippedFlag', [flag], 'Docker flag "' + flag + '" was ignored.'));
        }
        i++;
      } else { image = t; i++; }
    }

    if (!image) return { error: err('importNoImage', [], 'Could not find an image name in the command.') };
    if (!/dperson\/samba/.test(image)) {
      return { error: err('importOnlyDperson', [image], 'Import currently understands dperson/samba commands only (found "' + image + '").') };
    }

    // docker-level envs
    envs.forEach(function (e) {
      var eq = e.indexOf('=');
      var k = eq === -1 ? e : e.slice(0, eq), vv = eq === -1 ? '' : e.slice(eq + 1);
      if (k === 'USERID') state.uid = vv;
      else if (k === 'GROUPID') state.gid = vv;
      else if (k === 'TZ') state.tz = vv;
      else warnings.push(err('importSkippedEnv', [k], 'Environment variable "' + k + '" was ignored.'));
    });

    // ports → known SMB rows
    ports.forEach(function (p) {
      var m = p.match(/^(?:([\d.]+):)?(\d+):(\d+)(?:\/(tcp|udp))?$/);
      if (!m) { warnings.push(err('importBadPort', [p], 'Port mapping "' + p + '" was ignored.')); return; }
      var host = m[2], cport = +m[3], proto = m[4] || 'tcp';
      var row = null;
      state.ports.forEach(function (r) { if (r.cport === cport && r.proto === proto) row = r; });
      if (row) { row.expose = true; row.host = host; }
      else warnings.push(err('importBadPort', [p], 'Port mapping "' + p + '" was ignored (not an SMB port).'));
    });

    // image args
    var mounts = {}; // containerPath -> hostPath
    volumes.forEach(function (v) {
      var idx = v.lastIndexOf(':');
      // handle host:cont and host:cont:ro
      var partsV = v.split(':');
      if (partsV.length >= 2) {
        var hostPath = partsV[0], contPath = partsV[1];
        mounts[contPath] = hostPath;
      } else warnings.push(err('importBadVolume', [v], 'Volume "' + v + '" was ignored.'));
    });

    var j = 0;
    var globals = [];
    while (j < imageArgs.length) {
      var a = imageArgs[j];
      switch (a) {
        case '-n': state.smb.nmbd = true; break;
        case '-p': state.smb.permFix = true; break;
        case '-r': state.smb.recycleOff = true; break;
        case '-w': state.workgroup = imageArgs[++j] || ''; break;
        case '-g': globals.push(imageArgs[++j] || ''); break;
        case '-u': {
          var uv = imageArgs[++j] || '';
          var up = uv.split(';');
          state.users.push({ username: up[0] || '', password: up[1] || '' });
          break;
        }
        case '-s': {
          var sv = imageArgs[++j] || '';
          var f = sv.split(';');
          var contPath = f[1] || '';
          state.shares.push({
            hostPath: mounts[contPath] || '',
            shareName: f[0] || '',
            allowedUsers: (f[5] && f[5] !== 'all') ? f[5] : '',
            ro: f[3] === 'yes',
            guest: f[4] === 'yes'
          });
          break;
        }
        default:
          warnings.push(err('importSkippedArg', [a], 'Samba argument "' + a + '" was ignored.'));
      }
      j++;
    }
    state.smb.globalOpts = globals.join('\n');

    if (!state.shares.length) {
      // volumes with no -s flags: turn /dataN mounts into shares
      Object.keys(mounts).forEach(function (cp) {
        var m2 = cp.match(/^\/data(\d+)$/);
        if (m2) state.shares.push({ hostPath: mounts[cp], shareName: 'share' + m2[1], allowedUsers: '', ro: false, guest: false });
      });
    }
    if (!state.shares.length) state.shares = defaultState().shares;
    if (!state.users.length && state.envMode === 'none') state.users = [{ username: '', password: '' }];

    return { state: state, warnings: warnings };
  }

  /* ---------------- password helpers ---------------- */

  function passwordStrength(pw) {
    pw = String(pw || '');
    if (!pw) return 'empty';
    var classes = 0;
    if (/[a-z]/.test(pw)) classes++;
    if (/[A-Z]/.test(pw)) classes++;
    if (/[0-9]/.test(pw)) classes++;
    if (/[^A-Za-z0-9]/.test(pw)) classes++;
    if (pw.length >= 16 && classes >= 3) return 'strong';
    if (pw.length >= 10 && classes >= 2) return 'ok';
    return 'weak';
  }

  function generatePassword(len, rng) {
    len = len || 16;
    // avoid characters that break dperson (-u uses ';') or FTP ('|') or shell-confusing quotes
    var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789.-_@#%+=!';
    var out = '';
    for (var i = 0; i < len; i++) {
      var r = rng ? rng() : Math.random();
      out += chars.charAt(Math.floor(r * chars.length));
    }
    return out;
  }

  var api = {
    SMB_PORTS: SMB_PORTS,
    IMAGES: IMAGES,
    PROTOCOL_IMAGES: PROTOCOL_IMAGES,
    RESTART_POLICIES: RESTART_POLICIES,
    defaultState: defaultState,
    trimCSV: trimCSV,
    shellEscape: shellEscape,
    multilineify: multilineify,
    parseEnv: parseEnv,
    buildEnvFromState: buildEnvFromState,
    validateEnvText: validateEnvText,
    applyEnvToState: applyEnvToState,
    validateState: validateState,
    buildOutputs: buildOutputs,
    parseDockerRunCommand: parseDockerRunCommand,
    passwordStrength: passwordStrength,
    generatePassword: generatePassword
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.CommandBuilder = api;
})(typeof window !== 'undefined' ? window : this);
