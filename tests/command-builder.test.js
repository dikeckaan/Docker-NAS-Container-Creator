'use strict';
const test = require('node:test');
const assert = require('node:assert');
const CB = require('../js/command-builder.js');

function state(patch) {
  const s = CB.defaultState();
  return Object.assign(s, patch);
}

test('shellEscape passes safe values through', () => {
  assert.strictEqual(CB.shellEscape('nas-container'), 'nas-container');
  assert.strictEqual(CB.shellEscape('/path/to/dir'), '/path/to/dir');
  assert.strictEqual(CB.shellEscape('USERID=1000'), 'USERID=1000');
});

test('shellEscape quotes dangerous values', () => {
  assert.strictEqual(CB.shellEscape('user;pass'), "'user;pass'");
  assert.strictEqual(CB.shellEscape('pa$$ word'), "'pa$$ word'");
  assert.strictEqual(CB.shellEscape("it's"), "'it'\\''s'");
  assert.strictEqual(CB.shellEscape('a"b`c'), '\'a"b`c\'');
  assert.strictEqual(CB.shellEscape(''), "''");
});

test('default state builds a valid dperson command', () => {
  const out = CB.buildOutputs(state({}));
  assert.deepStrictEqual(out.errors, []);
  assert.match(out.run, /^docker run -d --name nas-container -p 445:445\/tcp/);
  assert.match(out.run, /-v \/path\/to\/server:\/data0/);
  assert.match(out.run, /-e USERID=1000 -e GROUPID=1000/);
  assert.match(out.run, /--restart unless-stopped dperson\/samba/);
  assert.match(out.run, /-p -u 'user;password' -s 'shared;\/data0;yes;no;no;all;none'$/);
});

test('multiline output uses backslash continuations', () => {
  const out = CB.buildOutputs(state({ singleLine: false }));
  assert.match(out.run, / \\\n {2}--name nas-container/);
});

test('passwords with quotes and spaces are escaped in commands', () => {
  const s = state({ users: [{ username: 'alice', password: "p'w \"x\" $HOME" }] });
  const out = CB.buildOutputs(s);
  assert.deepStrictEqual(out.errors, []);
  assert.ok(out.run.includes("-u 'alice;p'\\''w \"x\" $HOME'"));
});

test('semicolons in credentials are rejected', () => {
  const s = state({ users: [{ username: 'a', password: 'b;c' }] });
  const out = CB.buildOutputs(s);
  assert.ok(out.errors.some(e => e.code === 'credSemicolon'));
});

test('duplicate share names are rejected case-insensitively', () => {
  const s = state({
    shares: [
      { hostPath: '/a', shareName: 'Media', allowedUsers: '', ro: false, guest: false },
      { hostPath: '/b', shareName: 'media', allowedUsers: '', ro: false, guest: false }
    ]
  });
  const out = CB.buildOutputs(s);
  assert.ok(out.errors.some(e => e.code === 'dupShares'));
});

test('unknown allowed users are rejected', () => {
  const s = state({ shares: [{ hostPath: '/a', shareName: 'x', allowedUsers: 'ghost', ro: false, guest: false }] });
  const out = CB.buildOutputs(s);
  assert.ok(out.errors.some(e => e.code === 'unknownUsers'));
});

test('invalid and duplicate host ports are rejected', () => {
  const s = state({});
  s.ports[3].host = '99999';
  let out = CB.buildOutputs(s);
  assert.ok(out.errors.some(e => e.code === 'badPort'));

  const s2 = state({});
  s2.ports[2].expose = true; s2.ports[2].host = '445';
  s2.ports[3].expose = true; s2.ports[3].host = '445';
  out = CB.buildOutputs(s2);
  assert.ok(out.errors.some(e => e.code === 'dupPort'));
});

test('guest-only shares need no users', () => {
  const s = state({
    users: [],
    shares: [{ hostPath: '/a', shareName: 'pub', allowedUsers: '', ro: false, guest: true }]
  });
  const out = CB.buildOutputs(s);
  assert.deepStrictEqual(out.errors, []);
  assert.ok(!out.run.includes('-u '));
});

test('env-file mode uses --env-file and omits users', () => {
  const s = state({ envMode: 'file', envPath: './nas.env' });
  const out = CB.buildOutputs(s);
  assert.deepStrictEqual(out.errors, []);
  assert.ok(out.run.includes('--env-file ./nas.env'));
  assert.ok(!out.run.includes('-u '));
});

test('host networking drops -p mappings', () => {
  const s = state({ networkMode: 'host' });
  const out = CB.buildOutputs(s);
  assert.ok(out.run.includes('--network host'));
  assert.ok(!out.run.includes('-p 445'));
});

test('macvlan requires a network name and emits --network/--ip', () => {
  let out = CB.buildOutputs(state({ networkMode: 'macvlan' }));
  assert.ok(out.errors.some(e => e.code === 'needMacvlan'));
  out = CB.buildOutputs(state({ networkMode: 'macvlan', macvlanNetwork: 'lan', macvlanIp: '192.168.1.5' }));
  assert.deepStrictEqual(out.errors, []);
  assert.ok(out.run.includes('--network lan --ip 192.168.1.5'));
});

test('samba extras: workgroup, recycle, global opts, netbios', () => {
  const s = state({ workgroup: 'HOME' });
  s.smb.recycleOff = true;
  s.smb.nmbd = true;
  s.smb.globalOpts = 'fruit:aapl = yes\nserver min protocol = SMB2';
  const out = CB.buildOutputs(s);
  assert.ok(out.run.includes('dperson/samba -n -p -r -w HOME'));
  assert.ok(out.run.includes("-g 'fruit:aapl = yes'"));
  assert.ok(out.run.includes("-g 'server min protocol = SMB2'"));
});

test('wsdd toggle adds a companion command and compose service', () => {
  const s = state({});
  s.smb.wsdd = true;
  const out = CB.buildOutputs(s);
  assert.ok(out.run.includes('docker run -d --name nas-container-wsdd --network host'));
  assert.ok(out.compose.includes('nas-container-wsdd:'));
  assert.ok(out.compose.includes('network_mode: host'));
});

test('compose output is generated with ports, env, command', () => {
  const out = CB.buildOutputs(state({}));
  assert.ok(out.compose.startsWith('services:'));
  assert.ok(out.compose.includes("image: dperson/samba"));
  assert.ok(out.compose.includes("- '445:445/tcp'"));
  assert.ok(out.compose.includes('- USERID=1000'));
  assert.ok(out.compose.includes("- 'user;password'"));
  assert.ok(out.compose.includes("- 'shared;/data0;yes;no;no;all;none'"));
});

test('systemd unit wraps the same command without -d/--restart', () => {
  const out = CB.buildOutputs(state({}));
  assert.ok(out.systemd.includes('[Unit]'));
  assert.ok(out.systemd.includes('ExecStart=/usr/bin/docker run --rm --name nas-container'));
  assert.ok(!out.systemd.includes('--restart'));
  assert.ok(out.systemd.includes('WantedBy=multi-user.target'));
});

test('healthcheck and resource limits are emitted', () => {
  const s = state({});
  s.advanced = { healthcheck: true, memory: '512m', cpus: '1.5' };
  const out = CB.buildOutputs(s);
  assert.ok(out.run.includes("--health-cmd 'smbclient -L //localhost -U % -m SMB3'"));
  assert.ok(out.run.includes('--memory 512m --cpus 1.5'));
  assert.ok(out.compose.includes('mem_limit:'));
  assert.ok(out.compose.includes('healthcheck:'));
});

test('servercontainers image builds env-based config', () => {
  const s = state({ image: 'servercontainers', workgroup: 'HOME' });
  const out = CB.buildOutputs(s);
  assert.deepStrictEqual(out.errors, []);
  assert.ok(out.run.includes('ghcr.io/servercontainers/samba'));
  assert.ok(out.run.includes('-e ACCOUNT_user=password'));
  assert.ok(out.run.includes('-e UID_user=1000'));
  assert.ok(out.run.includes('-e SAMBA_CONF_WORKGROUP=HOME'));
  assert.ok(out.run.includes('SAMBA_VOLUME_CONFIG_shared='));
  assert.ok(out.run.includes('path=/shares/shared'));
});

test('nfs protocol builds exports and cap-add', () => {
  const s = state({ protocol: 'nfs' });
  s.shares[0].ro = true;
  const out = CB.buildOutputs(s);
  assert.deepStrictEqual(out.errors, []);
  assert.ok(out.run.includes('erichough/nfs-server'));
  assert.ok(out.run.includes('--cap-add SYS_ADMIN'));
  assert.ok(out.run.includes('-p 2049:2049/tcp'));
  assert.ok(out.run.includes("-e '"));
  assert.ok(out.run.includes('ro,no_subtree_check'));
});

test('webdav uses first user and share only', () => {
  const s = state({
    protocol: 'webdav',
    users: [{ username: 'a', password: 'p1' }, { username: 'b', password: 'p2' }],
    shares: [
      { hostPath: '/x', shareName: 's1', allowedUsers: '', ro: false, guest: false },
      { hostPath: '/y', shareName: 's2', allowedUsers: '', ro: false, guest: false }
    ]
  });
  const out = CB.buildOutputs(s);
  assert.deepStrictEqual(out.errors, []);
  assert.ok(out.run.includes('bytemark/webdav'));
  assert.ok(out.run.includes('-e USERNAME=a'));
  assert.ok(out.run.includes('-v /x:/var/lib/dav/data'));
  assert.ok(out.warnings.some(w => w.code === 'webdavOneUser'));
  assert.ok(out.warnings.some(w => w.code === 'webdavOneShare'));
});

test('ftp builds USERS env and passive ports', () => {
  const s = state({ protocol: 'ftp' });
  const out = CB.buildOutputs(s);
  assert.deepStrictEqual(out.errors, []);
  assert.ok(out.run.includes('delfer/alpine-ftp-server'));
  assert.ok(out.run.includes('-p 21:21/tcp -p 21000-21010:21000-21010/tcp'));
  assert.ok(out.run.includes("-e 'USERS=user|password|/ftp/data'"));
});

test('env round-trip: build → validate → apply', () => {
  const s = state({ tz: 'Europe/Istanbul', workgroup: 'HOME' });
  const text = CB.buildEnvFromState(s);
  const v = CB.validateEnvText(text);
  assert.deepStrictEqual(v.errors, []);
  const applied = CB.applyEnvToState(text, CB.defaultState());
  assert.strictEqual(applied.uid, '1000');
  assert.strictEqual(applied.tz, 'Europe/Istanbul');
  assert.strictEqual(applied.workgroup, 'HOME');
  assert.strictEqual(applied.shares[0].shareName, 'shared');
  assert.strictEqual(applied.users[0].username, 'user');
});

test('env validation catches real problems', () => {
  const v = CB.validateEnvText([
    'PORTS_SELECTED=445/tcp,80/tcp',
    'PORTS_HOST=445',
    'USERID=abc',
    'RESTART=sometimes',
    'USERS=alice:pw,broken',
    'SHARE_COUNT=2',
    'MOUNT_0=/a:/data0',
    'SHARE_0=name=x;path=/data0',
    'MYSTERY=1'
  ].join('\n'));
  const codes = v.errors.map(e => e.code);
  assert.ok(codes.includes('envBadPort'));
  assert.ok(codes.includes('envPortCount'));
  assert.ok(codes.includes('envNotNumeric'));
  assert.ok(codes.includes('envBadRestart'));
  assert.ok(codes.includes('envBadUser'));
  assert.ok(codes.includes('envMissing'));
  assert.ok(v.warnings.some(w => w.code === 'envUnknownKey'));
});

test('import: parses a generated dperson command back into state', () => {
  const src = CB.buildOutputs(state({ workgroup: 'HOME' }));
  const parsed = CB.parseDockerRunCommand(src.run);
  assert.ok(!parsed.error);
  const st = parsed.state;
  assert.strictEqual(st.name, 'nas-container');
  assert.strictEqual(st.uid, '1000');
  assert.strictEqual(st.workgroup, 'HOME');
  assert.strictEqual(st.users[0].username, 'user');
  assert.strictEqual(st.users[0].password, 'password');
  assert.strictEqual(st.shares[0].hostPath, '/path/to/server');
  assert.strictEqual(st.shares[0].shareName, 'shared');
  assert.strictEqual(st.ports[3].expose, true);
  assert.strictEqual(st.smb.permFix, true);
  // and it round-trips to the same command
  const rebuilt = CB.buildOutputs(st);
  assert.strictEqual(rebuilt.run, src.run);
});

test('import: rejects non docker run text and foreign images', () => {
  assert.ok(CB.parseDockerRunCommand('ls -la').error);
  assert.ok(CB.parseDockerRunCommand('docker run -d nginx').error);
});

test('import: handles quotes, --flag=value and line continuations', () => {
  const cmd = 'docker run -d --name=my-nas \\\n -p 445:445/tcp -v "/mnt/my data:/data0" ' +
    '-e USERID=1001 --restart=always dperson/samba -u "bob;s3cret" -s "docs;/data0;yes;no;no;bob;none"';
  const parsed = CB.parseDockerRunCommand(cmd);
  assert.ok(!parsed.error);
  assert.strictEqual(parsed.state.name, 'my-nas');
  assert.strictEqual(parsed.state.restart, 'always');
  assert.strictEqual(parsed.state.shares[0].hostPath, '/mnt/my data');
  assert.strictEqual(parsed.state.shares[0].allowedUsers, 'bob');
  assert.strictEqual(parsed.state.users[0].password, 's3cret');
});

test('password helpers', () => {
  assert.strictEqual(CB.passwordStrength(''), 'empty');
  assert.strictEqual(CB.passwordStrength('abc'), 'weak');
  assert.strictEqual(CB.passwordStrength('abcdef12345'), 'ok');
  assert.strictEqual(CB.passwordStrength('Abcdef12345!@#xyz'), 'strong');
  const pw = CB.generatePassword(20);
  assert.strictEqual(pw.length, 20);
  assert.ok(!/[;|'"\\ ]/.test(pw));
});
