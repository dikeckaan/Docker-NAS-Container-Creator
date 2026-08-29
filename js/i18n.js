/* i18n.js — English/Turkish UI strings for Docker NAS Container Creator. */
(function (global) {
  'use strict';

  var STRINGS = {
    en: {
      'app.title': 'Docker NAS Container Creator',
      'app.tagline': 'Generate ready-to-run Docker commands for SMB, NFS, WebDAV and FTP NAS containers — right in your browser, nothing is uploaded anywhere.',

      'toolbar.preset': 'Preset',
      'preset.custom': '— choose a preset —',
      'preset.publicGuest': 'Single public guest share',
      'preset.family': 'Family multi-user',
      'preset.mediaRo': 'Read-only media share',
      'preset.timeMachine': 'Time Machine backup target',
      'toolbar.profiles': 'Profiles',
      'profiles.placeholder': 'profile name',
      'profiles.save': 'Save',
      'profiles.load': 'Load',
      'profiles.delete': 'Delete',
      'profiles.none': '— saved profiles —',
      'profiles.saved': 'Profile saved.',
      'profiles.loaded': 'Profile loaded.',
      'profiles.deleted': 'Profile deleted.',
      'profiles.needName': 'Give the profile a name first.',
      'toolbar.shareLink': 'Copy shareable link',
      'toolbar.shareLinkDone': 'Link copied (passwords are not included).',
      'toolbar.import': 'Import command',
      'toolbar.reset': 'Reset form',
      'theme.toggle': 'Toggle dark mode',
      'lang.label': 'Language',

      'import.title': 'Import an existing docker run command',
      'import.hint': 'Paste a dperson/samba "docker run" command and the form will be filled from it.',
      'import.parse': 'Parse & fill form',
      'import.ok': 'Command imported.',

      'proto.label': 'Protocol',
      'proto.smb': 'SMB / Samba (Windows file sharing)',
      'proto.nfs': 'NFS (Unix/Linux)',
      'proto.webdav': 'WebDAV (HTTP)',
      'proto.ftp': 'FTP',
      'proto.portNote.nfs': 'NFS publishes port 2049/tcp and needs --cap-add SYS_ADMIN plus nfs/nfsd kernel modules on the host.',
      'proto.portNote.ftp': 'FTP publishes port 21/tcp and passive ports 21000-21010.',

      'image.label': 'Samba image',
      'image.dperson': 'dperson/samba (classic, unmaintained)',
      'image.sc': 'ghcr.io/servercontainers/samba (maintained)',
      'image.warn': '⚠ dperson/samba has not been updated in years. It still works, but the maintained ghcr.io/servercontainers/samba image (with built-in WSDD/avahi discovery) is recommended for new setups.',

      'name.label': 'Container Name',

      'net.label': 'Network Mode',
      'net.bridge': 'bridge (default, map ports)',
      'net.host': 'host (best for discovery)',
      'net.macvlan': 'macvlan (own LAN IP)',
      'net.macvlanNet': 'macvlan network name (pre-created)',
      'net.macvlanIp': 'Static IP (optional)',
      'net.hostNote': 'With host/macvlan networking the container listens on its standard ports directly; port mappings below are not used.',

      'ports.title': 'Ports',
      'ports.all': 'Expose all SMB ports (137/udp, 138/udp, 139/tcp, 445/tcp)',
      'ports.expose': 'Expose',
      'ports.cport': 'Container Port',
      'ports.proto': 'Protocol',
      'ports.host': 'Host Port (bind)',
      'ports.tip': 'Only the selected rows will be exposed. Host ports may differ from container ports; container ports are fixed. Tip: if you do not enable NetBIOS (-n), exposing only 139/tcp and 445/tcp is sufficient.',
      'ports.permfix': 'Fix permissions (-p)',
      'ports.nmbd': 'Enable NetBIOS discovery (-n)',
      'ports.netbiosNote': 'If you enable NetBIOS (-n) without host networking, also expose 137/udp and 138/udp above.',
      'webdav.port': 'Host port (container port 80)',

      'ids.uid': 'User ID (UID)',
      'ids.gid': 'Group ID (GID)',
      'ids.tz': 'Timezone (TZ)',
      'ids.workgroup': 'Workgroup',
      'ids.note': 'Leave UID/GID empty to omit them from the command.',

      'restart.label': 'Restart Policy',
      'restart.no': 'No',
      'restart.always': 'Always',
      'restart.unless-stopped': 'Unless Stopped',
      'restart.on-failure': 'On Failure',

      'smb.title': 'Samba Options',
      'smb.recycle': 'Disable recycle bin (-r)',
      'smb.wsdd': 'Windows network discovery (WS-Discovery / wsdd)',
      'smb.global': 'Extra global smb.conf options (one per line, passed as -g)',
      'smb.globalHint': 'e.g. server min protocol = SMB2',
      'smb.scNote': 'This image is configured entirely through environment variables; discovery (avahi + wsdd2) is built in.',

      'env.title': 'Environment Variables',
      'env.none': 'No .env (recommended for multi-user; passwords are in the command)',
      'env.file': 'Use external .env file',
      'env.editor': 'Build .env here',
      'env.path': '.env file path',
      'env.filename': '.env filename for command & download',
      'env.sync': 'Sync UI → .env',
      'env.apply': 'Apply .env → UI',
      'env.include': 'Include users from .env in command',
      'env.contents': '.env contents',
      'env.validate': 'Validate .env',
      'env.download': 'Download .env',
      'env.synced': 'Synced UI → .env',
      'env.applied': 'Applied .env → UI',
      'env.valid': '.env looks valid ✔',
      'env.downloaded': 'Downloaded {0}',

      'users.title': 'Users',
      'users.username': 'Username',
      'users.password': 'Password',
      'users.remove': 'Remove',
      'users.add': '+ Add User',
      'users.hintNone': 'Users are included in the command as -u entries.',
      'users.hintEnv': 'Users are included in the command only in No .env mode — unless you toggle "Include users from .env in command".',
      'users.show': 'Show/hide password',
      'users.gen': 'Generate a strong random password',
      'strength.weak': 'weak',
      'strength.ok': 'ok',
      'strength.strong': 'strong',
      'users.plainWarn': '⚠ In "No .env" mode passwords end up in your shell history and in "docker inspect" output. Use a .env mode for anything beyond testing.',

      'shares.title': 'Shares & Paths (multiple supported)',
      'shares.hostPath': 'Host Path',
      'shares.name': 'Share Name',
      'shares.allowed': 'Allowed Users (comma)',
      'shares.addAll': 'Add All Users',
      'shares.ro': 'Read-only',
      'shares.guest': 'Guest',
      'shares.remove': 'Remove',
      'shares.add': '+ Add Share',
      'shares.hint': 'Each host path is bind-mounted into the container at a unique path (e.g. /data0, /data1). If "Allowed Users" is empty the share is available to all users; otherwise only the listed usernames can access it. Share names must be unique.',

      'adv.title': 'Advanced (optional)',
      'adv.health': 'Add healthcheck (smbclient)',
      'adv.memory': 'Memory limit (e.g. 512m)',
      'adv.cpus': 'CPU limit (e.g. 1.5)',

      'out.title': 'Generated Output',
      'out.single': 'Output as single line (avoids shell copy issues)',
      'out.run': 'docker run',
      'out.compose': 'docker compose',
      'out.systemd': 'systemd unit',
      'out.copy': 'Copy',
      'out.copied': 'Copied ✔',
      'out.downloadCompose': 'Download docker-compose.yml',
      'out.downloadSystemd': 'Download .service file',
      'out.warnings': 'Warnings',
      'out.notes': 'Notes',
      'out.composeNote': 'The compose file can be pasted directly into a Portainer stack.',

      'footer.text': 'Runs entirely in your browser — no data leaves this page.',
      'footer.source': 'Source on GitHub'
    },

    tr: {
      'app.title': 'Docker NAS Container Creator',
      'app.tagline': 'SMB, NFS, WebDAV ve FTP NAS container’ları için çalışmaya hazır Docker komutları üretin — her şey tarayıcınızda, hiçbir veri gönderilmez.',

      'toolbar.preset': 'Hazır şablon',
      'preset.custom': '— şablon seçin —',
      'preset.publicGuest': 'Tek herkese açık misafir paylaşımı',
      'preset.family': 'Aile (çok kullanıcılı)',
      'preset.mediaRo': 'Salt okunur medya paylaşımı',
      'preset.timeMachine': 'Time Machine yedek hedefi',
      'toolbar.profiles': 'Profiller',
      'profiles.placeholder': 'profil adı',
      'profiles.save': 'Kaydet',
      'profiles.load': 'Yükle',
      'profiles.delete': 'Sil',
      'profiles.none': '— kayıtlı profiller —',
      'profiles.saved': 'Profil kaydedildi.',
      'profiles.loaded': 'Profil yüklendi.',
      'profiles.deleted': 'Profil silindi.',
      'profiles.needName': 'Önce profile bir ad verin.',
      'toolbar.shareLink': 'Paylaşılabilir bağlantıyı kopyala',
      'toolbar.shareLinkDone': 'Bağlantı kopyalandı (parolalar dahil edilmez).',
      'toolbar.import': 'Komut içe aktar',
      'toolbar.reset': 'Formu sıfırla',
      'theme.toggle': 'Karanlık modu aç/kapat',
      'lang.label': 'Dil',

      'import.title': 'Mevcut bir docker run komutunu içe aktar',
      'import.hint': 'Bir dperson/samba "docker run" komutu yapıştırın; form ondan doldurulur.',
      'import.parse': 'Çözümle ve formu doldur',
      'import.ok': 'Komut içe aktarıldı.',

      'proto.label': 'Protokol',
      'proto.smb': 'SMB / Samba (Windows dosya paylaşımı)',
      'proto.nfs': 'NFS (Unix/Linux)',
      'proto.webdav': 'WebDAV (HTTP)',
      'proto.ftp': 'FTP',
      'proto.portNote.nfs': 'NFS 2049/tcp portunu yayınlar; --cap-add SYS_ADMIN ve host üzerinde nfs/nfsd çekirdek modülleri gerekir.',
      'proto.portNote.ftp': 'FTP 21/tcp portunu ve 21000-21010 pasif portlarını yayınlar.',

      'image.label': 'Samba imajı',
      'image.dperson': 'dperson/samba (klasik, bakımsız)',
      'image.sc': 'ghcr.io/servercontainers/samba (bakımlı)',
      'image.warn': '⚠ dperson/samba yıllardır güncellenmiyor. Hâlâ çalışıyor, ancak yeni kurulumlar için bakımlı ghcr.io/servercontainers/samba imajı (yerleşik WSDD/avahi keşfi ile) önerilir.',

      'name.label': 'Container Adı',

      'net.label': 'Ağ Modu',
      'net.bridge': 'bridge (varsayılan, port eşle)',
      'net.host': 'host (keşif için en iyisi)',
      'net.macvlan': 'macvlan (kendi LAN IP’si)',
      'net.macvlanNet': 'macvlan ağ adı (önceden oluşturulmuş)',
      'net.macvlanIp': 'Sabit IP (isteğe bağlı)',
      'net.hostNote': 'host/macvlan modunda container standart portlarını doğrudan dinler; aşağıdaki port eşlemeleri kullanılmaz.',

      'ports.title': 'Portlar',
      'ports.all': 'Tüm SMB portlarını aç (137/udp, 138/udp, 139/tcp, 445/tcp)',
      'ports.expose': 'Aç',
      'ports.cport': 'Container Portu',
      'ports.proto': 'Protokol',
      'ports.host': 'Host Portu (bağlama)',
      'ports.tip': 'Yalnızca seçili satırlar açılır. Host portları container portlarından farklı olabilir; container portları sabittir. İpucu: NetBIOS (-n) kullanmıyorsanız yalnızca 139/tcp ve 445/tcp yeterlidir.',
      'ports.permfix': 'İzinleri düzelt (-p)',
      'ports.nmbd': 'NetBIOS keşfini aç (-n)',
      'ports.netbiosNote': 'Host ağı olmadan NetBIOS (-n) açarsanız yukarıda 137/udp ve 138/udp portlarını da açın.',
      'webdav.port': 'Host portu (container portu 80)',

      'ids.uid': 'Kullanıcı ID (UID)',
      'ids.gid': 'Grup ID (GID)',
      'ids.tz': 'Saat dilimi (TZ)',
      'ids.workgroup': 'Çalışma grubu',
      'ids.note': 'Komuttan çıkarmak için UID/GID alanlarını boş bırakın.',

      'restart.label': 'Yeniden Başlatma Politikası',
      'restart.no': 'Hayır',
      'restart.always': 'Her zaman',
      'restart.unless-stopped': 'Durdurulmadıkça',
      'restart.on-failure': 'Hata durumunda',

      'smb.title': 'Samba Seçenekleri',
      'smb.recycle': 'Geri dönüşüm kutusunu kapat (-r)',
      'smb.wsdd': 'Windows ağ keşfi (WS-Discovery / wsdd)',
      'smb.global': 'Ek global smb.conf ayarları (her satır bir -g olur)',
      'smb.globalHint': 'örn. server min protocol = SMB2',
      'smb.scNote': 'Bu imaj tamamen ortam değişkenleriyle yapılandırılır; keşif (avahi + wsdd2) yerleşiktir.',

      'env.title': 'Ortam Değişkenleri',
      'env.none': '.env yok (çok kullanıcı için önerilir; parolalar komutun içindedir)',
      'env.file': 'Harici .env dosyası kullan',
      'env.editor': '.env dosyasını burada oluştur',
      'env.path': '.env dosya yolu',
      'env.filename': 'Komut ve indirme için .env dosya adı',
      'env.sync': 'Arayüz → .env',
      'env.apply': '.env → Arayüz',
      'env.include': '.env içindeki kullanıcıları komuta ekle',
      'env.contents': '.env içeriği',
      'env.validate': '.env doğrula',
      'env.download': '.env indir',
      'env.synced': 'Arayüz → .env eşitlendi',
      'env.applied': '.env → arayüze uygulandı',
      'env.valid': '.env geçerli görünüyor ✔',
      'env.downloaded': '{0} indirildi',

      'users.title': 'Kullanıcılar',
      'users.username': 'Kullanıcı adı',
      'users.password': 'Parola',
      'users.remove': 'Sil',
      'users.add': '+ Kullanıcı Ekle',
      'users.hintNone': 'Kullanıcılar komuta -u parametreleri olarak eklenir.',
      'users.hintEnv': 'Kullanıcılar yalnızca ".env yok" modunda komuta eklenir — ".env içindeki kullanıcıları komuta ekle" seçeneğini açmadıysanız.',
      'users.show': 'Parolayı göster/gizle',
      'users.gen': 'Güçlü rastgele parola üret',
      'strength.weak': 'zayıf',
      'strength.ok': 'orta',
      'strength.strong': 'güçlü',
      'users.plainWarn': '⚠ ".env yok" modunda parolalar shell geçmişinize ve "docker inspect" çıktısına düşer. Test dışında .env modlarını kullanın.',

      'shares.title': 'Paylaşımlar ve Yollar (birden fazla desteklenir)',
      'shares.hostPath': 'Host Yolu',
      'shares.name': 'Paylaşım Adı',
      'shares.allowed': 'İzinli Kullanıcılar (virgülle)',
      'shares.addAll': 'Tüm Kullanıcıları Ekle',
      'shares.ro': 'Salt okunur',
      'shares.guest': 'Misafir',
      'shares.remove': 'Sil',
      'shares.add': '+ Paylaşım Ekle',
      'shares.hint': 'Her host yolu container içinde benzersiz bir yola bağlanır (örn. /data0, /data1). "İzinli Kullanıcılar" boşsa paylaşım tüm kullanıcılara açıktır; doluysa yalnızca listelenenler erişebilir. Paylaşım adları benzersiz olmalıdır.',

      'adv.title': 'Gelişmiş (isteğe bağlı)',
      'adv.health': 'Healthcheck ekle (smbclient)',
      'adv.memory': 'Bellek sınırı (örn. 512m)',
      'adv.cpus': 'CPU sınırı (örn. 1.5)',

      'out.title': 'Üretilen Çıktı',
      'out.single': 'Tek satır çıktı (kabuğa kopyalama sorunlarını önler)',
      'out.run': 'docker run',
      'out.compose': 'docker compose',
      'out.systemd': 'systemd unit',
      'out.copy': 'Kopyala',
      'out.copied': 'Kopyalandı ✔',
      'out.downloadCompose': 'docker-compose.yml indir',
      'out.downloadSystemd': '.service dosyasını indir',
      'out.warnings': 'Uyarılar',
      'out.notes': 'Notlar',
      'out.composeNote': 'Compose dosyası doğrudan bir Portainer stack’ine yapıştırılabilir.',

      'footer.text': 'Tamamen tarayıcınızda çalışır — hiçbir veri bu sayfadan çıkmaz.',
      'footer.source': 'GitHub’da kaynak kodu',

      /* dynamic error/warning/note translations (fallback: English text from the builder) */
      'err.badName': '"{0}" geçersiz bir container adı (harf, rakam, "_", ".", "-").',
      'err.needShare': 'En az bir paylaşım ekleyin.',
      'err.needHostPath': 'Her paylaşım için Host Yolu gereklidir.',
      'err.relPath': '"{0}" mutlak bir yol değil; bind mount’lar normalde mutlak yol ister.',
      'err.needShareName': 'Her paylaşım için Paylaşım Adı gereklidir.',
      'err.shareSemicolon': '"{0}" paylaşım adı ";" içeremez.',
      'err.shareCharset': '"{0}" paylaşım adı bazı SMB istemcilerinin sevmediği karakterler içeriyor.',
      'err.shareSpace': '"{0}" paylaşım adında boşluk var; bazı istemciler bunu iyi işlemez.',
      'err.dupShares': 'Paylaşım adları benzersiz olmalı. Tekrar edenler: {0}',
      'err.userSemicolon': '"{0}" kullanıcı adı ";" içeremez.',
      'err.credSemicolon': 'Kullanıcı adı/parola ";" içeremez (alan ayırıcıdır).',
      'err.userCharset': '"{0}" kullanıcı adı container tarafından kabul edilmeyebilir.',
      'err.weakPassword': '"{0}" kullanıcısının parolası 8 karakterden kısa.',
      'err.badId': '{0} "{1}" sayısal olmalı.',
      'err.needMacvlan': 'macvlan modu, önceden oluşturulmuş bir docker ağının adını ister.',
      'err.badPort': '"{0}" host portu 1-65535 arasında bir sayı olmalı.',
      'err.dupPort': '{0} host portu birden fazla kez bağlanmış.',
      'err.noPorts': 'Hiç port açılmamış; bridge modunda ağdaki istemciler paylaşıma erişemez.',
      'err.badMemory': '"{0}" bellek sınırı docker biçimine benzemiyor (örn. 512m, 2g).',
      'err.badCpus': '"{0}" CPU sınırı bir sayı olmalı (örn. 1.5).',
      'err.needUser': 'En az bir kullanıcı ekleyin (veya tüm paylaşımları misafir yapın ya da bir .env moduna geçin).',
      'err.userIncomplete': 'Her kullanıcı için hem kullanıcı adı hem parola gerekir.',
      'err.needEnvPath': 'Harici .env dosyanızın yolunu girin.',
      'err.unknownUsers': '"{0}" paylaşımı tanımsız kullanıcı(lar) içeriyor: {1}.',
      'err.badProtocol': 'Bilinmeyen protokol.',
      'err.ftpPipe': 'FTP kullanıcı adı/parolası "|" içeremez.',
      'err.notePlaintext': 'Parolalar komutta düz metin olarak görünür (shell geçmişi, "docker inspect"). Test dışı kullanım için .env modlarını tercih edin.',
      'err.noteWsdd': 'Modern Windows’un paylaşımı bulması için yardımcı bir WS-Discovery (wsdd) container’ı eklendi; host ağı gerektirir. Tercih ettiğiniz bir wsdd imajı varsa değiştirebilirsiniz.',
      'err.noteNetbios': 'NetBIOS (-n) açık: 137/udp ve 138/udp portlarını da açın veya host ağı kullanın.',
      'err.noteDperson': 'dperson/samba yıllardır bakımsız. Bakımlı ghcr.io/servercontainers/samba imajını değerlendirin (yukarıdan seçilebilir).',
      'err.scEnvMode': '.env modları dperson/samba için tasarlandı; bu imajda hesap/paylaşım ayarları -e değişkenleri olarak üretilir.',
      'err.scHealth': 'Hazır healthcheck dperson/samba içindir; bu imajda smbclient bulunduğunu doğrulamadan güvenmeyin.',
      'err.noteScWsdd': 'ghcr.io/servercontainers/samba, avahi + wsdd2 ile gelir — ek container gerekmez. Keşif için host ağı önerilir.',
      'err.noteScDocs': 'Tüm seçenekler için: https://github.com/ServerContainers/samba',
      'err.noteNfs': 'NFS erişimi host tabanlıdır; kullanıcı listesi yok sayılır. Host çekirdeğinde nfs/nfsd modülleri yüklü olmalıdır.',
      'err.nfsUsers': 'NFS dışa aktarımları kullanıcı bazlı değildir; tanımladığınız kullanıcılar bu yapılandırmada yer almaz.',
      'err.webdavNoUser': 'Kullanıcı tanımlanmadı — kimliksiz WebDAV önerilmez; bir kullanıcı ekleyin.',
      'err.webdavOneUser': 'bytemark/webdav tek kullanıcı adı/parola destekler; yalnızca ilk kullanıcı kullanıldı.',
      'err.webdavOneShare': 'WebDAV tek bir ağaç sunar; yalnızca ilk paylaşım bağlandı.',
      'err.ftpRo': 'Salt okunurluk :ro bind mount ile sağlanır; FTP sunucusunun paylaşım bazlı izni yoktur.',
      'err.noteFtp': '21000-21010 pasif portları yayınlandı; kurulumunuz farklıysa ADDRESS/MIN/MAX değişkenlerini ayarlayın (delfer/alpine-ftp-server belgeleri).',
      'err.noteHostNet': 'host/macvlan ağı ile port eşlemeleri kullanılmaz — servis standart portlarını doğrudan dinler.',
      'err.envUnknownKey': 'Bilinmeyen anahtar "{0}" (araç tarafından yok sayılır).',
      'err.envBadPort': 'PORTS_SELECTED bilinmeyen port içeriyor: "{0}".',
      'err.envPortCount': 'PORTS_SELECTED {0} öge, PORTS_HOST {1} öge içeriyor.',
      'err.envBadHostPort': 'PORTS_HOST içindeki "{0}" geçerli bir port değil (1-65535).',
      'err.envNotNumeric': '{0}="{1}" sayısal olmalı.',
      'err.envBadRestart': 'RESTART="{0}" geçerli bir docker politikası değil.',
      'err.envBadUser': 'USERS içindeki "{0}" "kullanıcı:parola" biçiminde olmalı.',
      'err.envBadShareCount': 'SHARE_COUNT="{0}" bir sayı olmalı.',
      'err.envMissing': '{0} eksik.',
      'err.envBadMount': '{0} "/host/yol:/dataN" biçiminde olmalı.',
      'err.envBadShare': '{0} "name=..." içermeli.',
      'err.envExtraShare': '{0} SHARE_COUNT dışında kaldığı için yok sayılacak.',
      'err.importNotRun': 'Bu bir "docker run" komutuna benzemiyor.',
      'err.importNoImage': 'Komutta imaj adı bulunamadı.',
      'err.importOnlyDperson': 'İçe aktarma şimdilik yalnızca dperson/samba komutlarını anlar ("{0}" bulundu).',
      'err.importSkippedFlag': '"{0}" docker parametresi yok sayıldı.',
      'err.importSkippedEnv': '"{0}" ortam değişkeni yok sayıldı.',
      'err.importBadPort': '"{0}" port eşlemesi yok sayıldı.',
      'err.importBadVolume': '"{0}" volume tanımı yok sayıldı.',
      'err.importSkippedArg': '"{0}" samba argümanı yok sayıldı.'
    }
  };

  function format(tpl, args) {
    return tpl.replace(/\{(\d+)\}/g, function (m, i) {
      return args && args[+i] !== undefined ? args[+i] : m;
    });
  }

  function t(lang, key) {
    var d = STRINGS[lang] || STRINGS.en;
    return d[key] !== undefined ? d[key] : (STRINGS.en[key] !== undefined ? STRINGS.en[key] : key);
  }

  // Translate a builder issue ({code, args, text}); falls back to its English text.
  function issueText(lang, issue) {
    if (!issue) return '';
    var d = STRINGS[lang] || {};
    var tpl = d['err.' + issue.code];
    return tpl ? format(tpl, issue.args) : issue.text;
  }

  function applyTo(root, lang) {
    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(lang, el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(function (el) {
      el.setAttribute('placeholder', t(lang, el.getAttribute('data-i18n-ph')));
    });
    root.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.setAttribute('title', t(lang, el.getAttribute('data-i18n-title')));
      el.setAttribute('aria-label', t(lang, el.getAttribute('data-i18n-title')));
    });
  }

  var api = { STRINGS: STRINGS, t: t, format: format, issueText: issueText, applyTo: applyTo };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else global.I18N = api;
})(typeof window !== 'undefined' ? window : this);
