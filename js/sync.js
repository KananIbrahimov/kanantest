/* Safe Money — Google Drive backup + Firebase sinxron */
function driveLog(msg) {
  console.log('[Drive]', msg);
}

// GIS yalnız istifadəçi "Bağlan / Göndər / Çək" basanda yüklənir — hər səhifə açılışında Google-a sorğu yoxdur.
function driveGisSkriptiniYukle() {
  return new Promise((resolve, reject) => {
    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      resolve();
      return;
    }
    const movcud = document.getElementById('googleGisClient');
    if (movcud) {
      movcud.addEventListener('load', () => resolve(), { once: true });
      movcud.addEventListener('error', () => reject(new Error('gis-load')), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.id = 'googleGisClient';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('gis-load'));
    document.head.appendChild(s);
  });
}

function driveTokenClientHazirla() {
  if (driveTokenClient) return;
  if (typeof google === 'undefined' || !google.accounts) return; // GIS hələ yüklənməyib
  driveTokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_DRIVE_CLIENT_ID,
    scope: DRIVE_SCOPE,
    callback: (resp) => {
      if (resp && resp.access_token) {
        driveAccessToken = resp.access_token;
        driveTokenBitisZamani = Date.now() + (Number(resp.expires_in || 3600) - 60) * 1000;
        driveBagli = true;
        localStorage.setItem('drive_bagli', '1');
        driveTokenYaddaSaxla();
        driveEpoctunuOyren();
        const cb = driveGeriCagirisFn; driveGeriCagirisFn = null;
        driveMenyuGuncelle();
        if (cb) cb();
      } else {
        driveSyncGedirmi = false; driveGeriCagirisFn = null; // düzəliş: pəncərə bağlananda "Əməliyyat gedir…" ilişib qalmasın
        driveMenyuGuncelle(tr('drive.girisAlinmadi', 'Daxil olmaq alınmadı. Yenidən cəhd et.'), true);
      }
    },
    error_callback: () => { driveSyncGedirmi = false; driveGeriCagirisFn = null; driveMenyuGuncelle(tr('drive.girisAlinmadi', 'Daxil olmaq alınmadı. Yenidən cəhd et.'), true); }
  });
}

function driveTokenGerekliyse(sessiz, sonra) {
  driveGisSkriptiniYukle().then(() => {
    driveTokenClientHazirla();
    if (!driveTokenClient) {
      driveSyncGedirmi = false; driveGeriCagirisFn = null;
      driveMenyuGuncelle(tr('drive.qosulmaAlinmadi', 'Google-a qoşulmaq alınmadı. İnterneti yoxla.'), true);
      return;
    }
    if (driveAccessToken && Date.now() < driveTokenBitisZamani) { sonra(); return; }
    driveGeriCagirisFn = sonra;
    // prompt:'' — Google təsdiq ekranını yalnız həqiqətən lazım olanda (ilk dəfə / icazə geri alınıbsa) göstərir.
    // Əvvəllər həmişə 'consent' göndərilirdi və buna görə hər dəfə yenidən təsdiq istənilirdi.
    const ayar = { prompt: '' };
    const ipucu = localStorage.getItem('drive_email');
    if (ipucu) ayar.login_hint = ipucu; // hesab seçimi ekranını da ötürür
    driveTokenClient.requestAccessToken(ayar);
  }).catch(() => {
    driveSyncGedirmi = false; driveGeriCagirisFn = null;
    driveMenyuGuncelle(tr('drive.qosulmaAlinmadi', 'Google-a qoşulmaq alınmadı. İnterneti yoxla.'), true);
  });
}

function driveBaglan() {
  if (demoRejim) { alertAc(tr('demo.driveYox', 'Nümunə rejimində Google Drive istifadə olunmur.')); return; }
  if (GOOGLE_DRIVE_CLIENT_ID.indexOf('BURAYA_OZ_CLIENT_ID') === 0) {
    alertAc(tr('ayarlar.clientIdTeyinEdilmeyibXeta', 'Əvvəlcə kodda GOOGLE_DRIVE_CLIENT_ID sətrinə öz Google Client ID-ni yaz.'));
    return;
  }
  driveTokenGerekliyse(false, () => driveMenyuGuncelle());
}

function driveBaglantiKes() {
  confirmAc(tr('ayarlar.driveBaglantisiniKesBaslik', 'Drive bağlantısını kəs'), tr('ayarlar.driveBaglantisiniKesSual', 'Drive bağlantısı kəsilsin? Drive-dakı fayllar silinməyəcək.'), () => {
    driveBagli = false; driveAccessToken = null; driveTokenBitisZamani = 0;
    localStorage.setItem('drive_bagli', '0');
    driveTokenSil();
    driveMenyuGuncelle();
    menuKapat();
  });
}

function driveMenyuGuncelle(mesaj, xetaMi) {
  const statusEl = document.getElementById('driveStatus');
  const subEl = document.getElementById('driveSub');
  const btnsEl = document.getElementById('driveBtns');
  if (!statusEl) return;
  if (!driveBagli) {
    statusEl.className = 'drive-status' + (xetaMi ? ' err' : '');
    statusEl.innerText = xetaMi ? mesaj : tr('drive.bagliDeyil', 'Google Drive-a qoşulmayıb');
    subEl.innerText = tr('ayarlar.driveBaglanaBilersen', 'Qoşulandan sonra məlumatlarını "Göndər" və "Yüklə" düymələri ilə özün idarə edəcəksən.');
    btnsEl.innerHTML = `<button onclick="driveBaglan()">${tr('ayarlar.baglan', 'Qoşul')}</button>` + faylDuymeleriHtml();
    return;
  }
  if (driveSyncGedirmi) {
    statusEl.className = 'drive-status';
    statusEl.innerText = tr('ayarlar.driveEmeliyyatGedir', 'İcra olunur…');
  } else if (xetaMi) {
    statusEl.className = 'drive-status err';
    statusEl.innerText = mesaj;
  } else {
    statusEl.className = 'drive-status ok';
    statusEl.innerText = tr('ayarlar.driveBagli', 'Drive-a qoşulub');
  }
  subEl.innerText = driveSonSync ? tr('drive.sonEmeliyyat', 'Son əməliyyat: {vaxt}', { vaxt: driveSonSync }) : tr('drive.helelik', 'Hələ heç nə göndərilməyib və ya yüklənməyib.');
  btnsEl.innerHTML = `<button onclick="driveManualGonder()">${tr('ayarlar.driveGonder', 'Drive-a göndər')}</button><button onclick="driveManualCek()">${tr('ayarlar.driveCek', 'Drive-dan yüklə')}</button><button onclick="driveBaglantiKes()">${tr('ayarlar.baglantiniKes', 'Bağlantını kəs')}</button>` + faylDuymeleriHtml();
}
function faylDuymeleriHtml() {
  return `<div class="drive-btns-ayrac"></div><button onclick="faylaYukle()">${escapeHtml(tr('fayl.saxla', 'Faylda saxla'))}</button><button onclick="fayldanBerpaAc()">${escapeHtml(tr('berpa.fayl', 'Fayldan bərpa et'))}</button>`;
}

function driveBackupVerisi() {
  // schema 2: hesablar massivi. Köhnə sahələr (anaHesap, nagdBakiye, krediBorcu ...) güzgü kimi də yazılır —
  // hələ yenilənməmiş cihaz datanı boş görüb onu silməsin.
  return Object.assign({ schema: 2, kategoriler, giderler, hesablar, hesabTransferleri, gunlukLimit, profil: istifadeciProfili, backupTarixi: sonDeyisiklikVaxti || new Date().toISOString() }, hesablarGuzgusu());
}

function driveYeniBackupAdi() {
  const s = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${DRIVE_FILE_PREFIX}_${s.getFullYear()}-${pad(s.getMonth() + 1)}-${pad(s.getDate())}_${pad(s.getHours())}-${pad(s.getMinutes())}.json`;
}

function driveTarixSaatFormat(iso) {
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' · ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

async function driveFayliOxu(fileId) {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: 'Bearer ' + driveAccessToken }
  });
  if (!res.ok) throw new Error('download-failed:' + res.status);
  return await res.json();
}

function driveVerisiniTetbiqEt(parsed) {
  // Kateqoriyaları normallaşdır: köhnə backup-larda sahələr çatışmaya bilər (sabitTutar, renk, ikon).
  const hamKat = Array.isArray(parsed.kategoriler) && parsed.kategoriler.length ? parsed.kategoriler : varsayilanKategoriler;
  kategoriler = hamKat.filter(k => k && typeof k.ad === 'string' && k.ad.trim()).map(k => ({
    ...k,
    sabitTutar: (typeof k.sabitTutar === 'number' && isFinite(k.sabitTutar) && k.sabitTutar > 0) ? k.sabitTutar : null,
    renk: k.renk || '#9a8a8f',
    ikon: k.ikon || '💰'
  }));
  if (!kategoriler.length) kategoriler = varsayilanKategoriler.map(k => ({ ...k }));
  // Pozulmuş qeydlər (məbləği rəqəm olmayan) cəmləri NaN etməsin deyə süzülür.
  // Hesablar: yeni model (hesablar massivi) və ya köhnə sahələrdən köçürmə (hesablar.js)
  const hd = hesabDatasiniHazirla(parsed);
  hesablar = hd.hesablar;
  giderler = hd.giderler.filter(g => g && typeof g.tutar === 'number' && isFinite(g.tutar));
  anaHesap = (typeof parsed.anaHesap === 'number') ? parsed.anaHesap : null;
  kreditLimit = (typeof parsed.kreditLimit === 'number') ? parsed.kreditLimit : null;
  krediBorcu = parsed.krediBorcu || krediBorcuKohnaBackupdanCixar(parsed.aylikXerclar);
  nagdBakiye = (typeof parsed.nagdBakiye === 'number') ? parsed.nagdBakiye : 0;
  debitBakiye = (typeof parsed.debitBakiye === 'number') ? parsed.debitBakiye : 0;
  depozitBakiye = (typeof parsed.depozitBakiye === 'number') ? parsed.depozitBakiye : 0;
  hesabTransferleri = hd.transferler;
  gunlukLimit = (typeof parsed.gunlukLimit === 'number') ? parsed.gunlukLimit : null;
  hesabEklenib = parsed.hesabEklenib || { nagd: false, debit: false, depozit: false };
  istifadeciProfili = parsed.profil || { ad: '', soyad: '' };
  sonDeyisiklikVaxti = parsed.backupTarixi || new Date().toISOString();
  // QƏSDƏN localStorage-a YAZILMIR — yeganə mənbə Firestore-dur.
}

// Drive-dakı bütün "gider-takibi-backup_*" fayllarını (ən yenidən köhnəyə) qaytarır.
async function driveBackupFayllariniListele() {
  const q = encodeURIComponent(`name contains '${DRIVE_FILE_PREFIX}' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,createdTime)&orderBy=createdTime desc`, {
    headers: { Authorization: 'Bearer ' + driveAccessToken }
  });
  if (!res.ok) throw new Error('list-failed');
  const data = await res.json();
  return data.files || [];
}

// Hər göndərişdə köhnəni əvəz etmək əvəzinə tarix/saat möhürlü YENİ fayl yaradır.
async function driveYukleEt() {
  const data = driveBackupVerisi();
  const boundary = 'gidertakibi_' + Date.now();
  const metadata = { name: driveYeniBackupAdi(), mimeType: 'application/json' };
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n` +
    `--${boundary}--`;
  const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + driveAccessToken, 'Content-Type': `multipart/related; boundary="${boundary}"` },
    body
  });
  if (!res.ok) throw new Error('upload-failed:' + res.status);
  return await res.json();
}

function driveSonSyncQeydEt() {
  const simdi = new Date();
  driveSonSync = tarixSaatYaz(simdi);
  localStorage.setItem('drive_son_sync', driveSonSync);
}

// İstifadəçi özü basanda işə düşür — heç bir avtomatik/sakit gözləmə yoxdur.
// Token artıq yaddaşdadırsa dərhal davam edir; deyilsə, bir dəfə görünən Google
// pəncərəsi açılır (bu, istifadəçi kliki ilə açıldığı üçün brauzer bunu bloklamır).
// Hər göndəriş köhnə backup-ın üstünə yazmır — tarix/saat möhürü ilə YENİ fayl yaradır.
function driveManualGonder() {
  if (!driveBagli) { driveBaglan(); return; }
  if (driveSyncGedirmi) return;
  driveSyncGedirmi = true;
  driveMenyuGuncelle();
  driveTokenGerekliyse(false, async () => {
    try {
      await driveYukleEt();
      driveSonSyncQeydEt();
      driveBackupVaxtiQeydEt();
      driveXatirlatmaGizle();
      driveSyncGedirmi = false;
      driveMenyuGuncelle();
    } catch (e) {
      driveSyncGedirmi = false;
      driveMenyuGuncelle(tr('drive.gonderilmedi', 'Göndərmək alınmadı: {xeta}', { xeta: (e && e.message ? e.message : e) }), true);
    }
  });
}

// Drive-dakı bütün backupları siyahılayır ki, istifadəçi hansını çəkəcəyini özü seçsin.
function driveManualCek() {
  if (!driveBagli) { driveBaglan(); return; }
  if (driveSyncGedirmi) return;
  driveSyncGedirmi = true;
  driveMenyuGuncelle();
  driveTokenGerekliyse(false, async () => {
    try {
      const fayllar = await driveBackupFayllariniListele();
      driveSyncGedirmi = false;
      driveMenyuGuncelle();
      if (!fayllar.length) {
        driveMenyuGuncelle(tr('drive.backupYoxdur', 'Drive-da hələ ehtiyat nüsxə yoxdur.'), true);
        return;
      }
      driveBackupSecimGoster(fayllar);
    } catch (e) {
      driveSyncGedirmi = false;
      driveMenyuGuncelle(tr('drive.siyahiAlinmadi', 'Siyahını yükləmək alınmadı: {xeta}', { xeta: (e && e.message ? e.message : e) }), true);
    }
  });
}

function driveBackupSecimGoster(fayllar) {
  const konteyner = document.getElementById('driveBackupSecListesi');
  if (!konteyner) return;
  konteyner.innerHTML = '';
  fayllar.forEach(f => {
    const item = document.createElement('div');
    item.className = 'modal-item';
    item.style.cursor = 'pointer';
    const enSon = konteyner.children.length === 0;
    item.innerHTML = `<div class="field-row between"><span>${escapeHtml(driveTarixSaatFormat(f.createdTime))}${enSon ? ` <span class="en-son-etiket">${escapeHtml(tr('drive.enSon', 'Ən son'))}</span>` : ''}</span><span style="color:var(--brand-ink); font-size:12px; font-weight:600;">${escapeHtml(tr('drive.sec', 'Seç →'))}</span></div>`;
    item.onclick = () => driveBackupSecildi(f.id, f.createdTime);
    konteyner.appendChild(item);
  });
  modalAc('driveBackupSecModal');
}

function driveBackupSecildi(fileId, createdTime) {
  modalKapat('driveBackupSecModal');
  confirmAc(tr('drive.berpaBaslik', 'Ehtiyat nüsxə bərpa edilsin?'), tr('drive.berpaSual', '{tarix} tarixli nüsxə indiki məlumatların yerinə yazılacaq. Bu əməliyyatı geri qaytarmaq olmur.', { tarix: driveTarixSaatFormat(createdTime) }), () => {
    driveSyncGedirmi = true;
    driveMenyuGuncelle();
    driveTokenGerekliyse(false, async () => {
      try {
        const remote = await driveFayliOxu(fileId);
        if (!remote || typeof remote !== 'object' || Array.isArray(remote)) throw new Error('etibarsız backup faylı');
        driveVerisiniTetbiqEt(remote);
        veriKaydet(); // bərpa olunan məlumat buluda da yazılsın
        ekraniGuncelle();
        const hesablarModalEl = document.getElementById('hesablarModal');
        if (hesablarModalEl && hesablarModalEl.classList.contains('active') && typeof hesablarGoster === 'function') {
          hesablarGoster();
          if (typeof krediBorcuGoster === 'function') krediBorcuGoster();
        }
        driveSonSyncQeydEt();
        driveSyncGedirmi = false;
        driveMenyuGuncelle();
        toastGoster(tr('berpa.olundu', 'Məlumatlar bərpa olundu.'));
      } catch (e) {
        driveSyncGedirmi = false;
        driveMenyuGuncelle(tr('drive.berpaAlinmadi', 'Bərpa alınmadı: {xeta}', { xeta: (e && e.message ? e.message : e) }), true);
      }
    });
  });
}
// ---- Token keşi: tətbiq 1 saat ərzində yenidən açılsa Google pəncərəsi ümumiyyətlə açılmır ----
// (icazə yalnız bu tətbiqin yaratdığı fayllara aiddir — drive.file)
function driveTokenYaddaSaxla() {
  try { localStorage.setItem('drive_token', JSON.stringify({ t: driveAccessToken, b: driveTokenBitisZamani })); } catch (e) {}
}
function driveTokenSil() {
  try { localStorage.removeItem('drive_token'); } catch (e) {}
}
(function driveTokenBerpa() {
  try {
    const x = JSON.parse(localStorage.getItem('drive_token') || 'null');
    if (x && x.t && x.b > Date.now()) { driveAccessToken = x.t; driveTokenBitisZamani = x.b; }
    else localStorage.removeItem('drive_token');
  } catch (e) {}
})();
// Google hesabının e-poçtunu yadda saxla — növbəti dəfə hesab seçimi ekranı çıxmasın (login_hint).
function driveEpoctunuOyren() {
  if (!driveAccessToken) return;
  fetch('https://www.googleapis.com/drive/v3/about?fields=user(emailAddress)', { headers: { Authorization: 'Bearer ' + driveAccessToken } })
    .then(r => r.ok ? r.json() : null)
    .then(d => { const e = d && d.user && d.user.emailAddress; if (e) localStorage.setItem('drive_email', e); })
    .catch(() => {});
}

// ---- 24 saatlıq ehtiyat nüsxə ----
const DRIVE_BACKUP_ARALIQ = 24 * 60 * 60 * 1000;
function driveBackupVaxtiQeydEt() {
  try { localStorage.setItem('drive_son_backup_ms', String(Date.now())); } catch (e) {}
}
function driveBackupVaxtiGelib() {
  const son = Number(localStorage.getItem('drive_son_backup_ms') || 0);
  return !son || Date.now() - son >= DRIVE_BACKUP_ARALIQ;
}
function driveXatirlatmaGizle() {
  const el = document.getElementById('driveXatirlatma');
  if (el) el.remove();
}
function driveXatirlatmaGoster() {
  if (document.getElementById('driveXatirlatma')) return;
  const el = document.createElement('div');
  el.id = 'driveXatirlatma';
  el.className = 'drive-xatirlatma';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="dx-ikon">${ikon('bulud', 18)}</span><span class="dx-metn">${escapeHtml(tr('drive.xatirlatma', 'Son ehtiyat nüsxədən 24 saatdan çox keçib.'))}</span>` +
    `<button class="dx-btn" onclick="driveXatirlatmaBas()">${escapeHtml(tr('drive.indiGonder', 'İndi göndər'))}</button>` +
    `<button class="dx-bagla" onclick="driveXatirlatmaGizle()" aria-label="${escapeHtml(tr('umumi.bagla', 'Bağla'))}">${ikon('sil', 16)}</button>`;
  document.body.appendChild(el);
}
function driveXatirlatmaBas() {
  const btn = document.querySelector('#driveXatirlatma .dx-btn');
  if (btn) { btn.disabled = true; btn.innerText = tr('ayarlar.driveEmeliyyatGedir', 'İcra olunur…'); }
  driveArxaPlanGonder(false);
}
// Göndərişi edir. Token keşdədirsə heç bir pəncərə açılmır; deyilsə (yalnız istifadəçi basanda) Google
// pəncərəsi açılıb adətən sual vermədən özü bağlanır.
function driveArxaPlanGonder(sessizMi) {
  if (driveSyncGedirmi) return;
  driveSyncGedirmi = true;
  driveMenyuGuncelle();
  const et = async () => {
    try {
      await driveYukleEt();
      driveSonSyncQeydEt();
      driveBackupVaxtiQeydEt();
      driveXatirlatmaGizle();
      driveSyncGedirmi = false;
      driveMenyuGuncelle();
      toastGoster(tr('drive.gonderildiToast', 'Ehtiyat nüsxə Google Drive-a göndərildi.'));
    } catch (e) {
      driveSyncGedirmi = false;
      driveMenyuGuncelle(tr('drive.gonderilmedi', 'Göndərmək alınmadı: {xeta}', { xeta: (e && e.message ? e.message : e) }), true);
      if (e && /401|403/.test(String(e.message))) { driveAccessToken = null; driveTokenBitisZamani = 0; driveTokenSil(); }
      if (sessizMi) driveXatirlatmaGoster();
      else { const btn = document.querySelector('#driveXatirlatma .dx-btn'); if (btn) { btn.disabled = false; btn.innerText = tr('drive.indiGonder', 'İndi göndər'); } }
    }
  };
  if (sessizMi) et(); // yalnız keşdə etibarlı token olanda çağırılır
  else driveTokenGerekliyse(true, et);
}
// Tətbiq açılanda (məlumat yükləndikdən sonra) bir dəfə çağırılır.
let driveAcilisYoxlanib = false;
function driveAcilisYoxla() {
  if (driveAcilisYoxlanib || demoRejim || !veriMenbeGuvenli) return;
  driveAcilisYoxlanib = true;
  let yeniGiris = false;
  try { yeniGiris = sessionStorage.getItem('berpa_teklif') === '1'; sessionStorage.removeItem('berpa_teklif'); } catch (e) {}
  // Google skriptini əvvəlcədən yüklə: düyməyə basanda pəncərə dərhal açılsın (iPhone Safari toxunuşdan
  // sonra gecikən pəncərəni bloklayır).
  if (yeniGiris || driveBagli) driveGisSkriptiniYukle().then(driveTokenClientHazirla).catch(() => {});
  if (yeniGiris) { setTimeout(() => modalAc('berpaModal'), 300); return; }
  if (!driveBagli || !driveBackupVaxtiGelib()) return;
  if (driveAccessToken && Date.now() < driveTokenBitisZamani) driveArxaPlanGonder(true);
  else setTimeout(driveXatirlatmaGoster, 800);
}

// ---- Girişdən sonra bərpa seçimi ----
function berpaDriveSec() {
  modalKapat('berpaModal');
  if (GOOGLE_DRIVE_CLIENT_ID.indexOf('BURAYA_OZ_CLIENT_ID') === 0) return;
  driveSyncGedirmi = true;
  driveTokenGerekliyse(true, async () => {
    try {
      const fayllar = await driveBackupFayllariniListele();
      driveSyncGedirmi = false;
      driveMenyuGuncelle();
      if (!fayllar.length) { alertAc(tr('drive.backupYoxdur', 'Drive-da hələ ehtiyat nüsxə yoxdur.')); return; }
      driveBackupSecimGoster(fayllar);
    } catch (e) {
      driveSyncGedirmi = false;
      alertAc(tr('drive.siyahiAlinmadi', 'Siyahını yükləmək alınmadı: {xeta}', { xeta: (e && e.message ? e.message : e) }));
    }
  });
}
function berpaFaylSec() { modalKapat('berpaModal'); fayldanBerpaAc(); }

// ---- Fayl ehtiyatı (Google pəncərəsindən asılı deyil — iPhone-da ana ekran tətbiqi üçün etibarlı yol) ----
function faylaYukle() {
  if (demoRejim) { alertAc(tr('demo.driveYox', 'Nümunə rejimində Google Drive istifadə olunmur.')); return; }
  const ad = driveYeniBackupAdi().replace(DRIVE_FILE_PREFIX, 'safe-money-backup');
  const metn = JSON.stringify(driveBackupVerisi(), null, 1);
  const blob = new Blob([metn], { type: 'application/json' });
  const iosMu = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  try {
    const fayl = new File([blob], ad, { type: 'application/json' });
    if (iosMu && navigator.canShare && navigator.canShare({ files: [fayl] })) {
      navigator.share({ files: [fayl], title: ad }).catch(() => {});
      return;
    }
  } catch (e) { /* köhnə brauzer — adi yükləməyə keç */ }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = ad; document.body.appendChild(a); a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1500);
}
function fayldanBerpaAc() {
  if (demoRejim) { alertAc(tr('demo.driveYox', 'Nümunə rejimində Google Drive istifadə olunmur.')); return; }
  let inp = document.getElementById('berpaFaylInput');
  if (!inp) {
    inp = document.createElement('input');
    inp.type = 'file'; inp.id = 'berpaFaylInput'; inp.accept = '.json,application/json'; inp.style.display = 'none';
    inp.addEventListener('change', () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) fayldanBerpaOxu(f); });
    document.body.appendChild(inp);
  }
  inp.click();
}
function fayldanBerpaOxu(fayl) {
  const oxu = new FileReader();
  oxu.onload = () => {
    let d = null;
    try { d = JSON.parse(String(oxu.result)); } catch (e) { d = null; }
    if (!d || typeof d !== 'object' || Array.isArray(d) || !(Array.isArray(d.giderler) || Array.isArray(d.kategoriler))) {
      alertAc(tr('fayl.etibarsiz', 'Bu fayl Safe Money ehtiyat nüsxəsi deyil.'));
      return;
    }
    const tarix = d.backupTarixi ? driveTarixSaatFormat(d.backupTarixi) : fayl.name;
    confirmAc(tr('drive.berpaBaslik', 'Ehtiyat nüsxə bərpa edilsin?'), tr('drive.berpaSual', '{tarix} tarixli nüsxə indiki məlumatların yerinə yazılacaq. Bu əməliyyatı geri qaytarmaq olmur.', { tarix }), () => {
      try {
        driveVerisiniTetbiqEt(d);
        veriKaydet();
        ekraniGuncelle();
        const hm = document.getElementById('hesablarModal');
        if (hm && hm.classList.contains('active') && typeof hesablarGoster === 'function') hesablarGoster();
        toastGoster(tr('berpa.olundu', 'Məlumatlar bərpa olundu.'));
      } catch (e) {
        alertAc(tr('drive.berpaAlinmadi', 'Bərpa alınmadı: {xeta}', { xeta: (e && e.message ? e.message : e) }));
      }
    });
  };
  oxu.readAsText(fayl);
}
// ==================== /Google Drive ====================

// ==================== Firebase: hər istifadəçi öz hesabı ilə ====================
// Sinxronizasiya artıq təsadüfi "Sync Key" ilə deyil, email/şifrə girişi ilədir.
// Hər istifadəçinin Firestore sənədi onun öz uid-i ilə adlanır
// (syncs/{uid}) və Firestore Security Rules yalnız sahibinin ora yazmasına
// icazə verir (request.auth.uid == syncId). apiKey/authDomain/projectId
// "sirr" deyil — Firebase veb konfiqləri həmişə client-side görünür, əsl
// qorunma Authentication + Security Rules-dadır, ona görə kod daxilinə
// yazmaq təhlükəsizdir.
function firebaseConfigOxu() {
  // TEST layihəsi (kanantest) üçün konfiq — Firebase Console > Project settings
  // (dişli işarə) > General > "Your apps" bölməsindən öz dəyərlərinlə əvəz et.
  return {
    apiKey: 'AIzaSyAF39Xt36SUvjpYp55eIGR9XDmUaHHT7oo',
    authDomain: 'kanantest.firebaseapp.com',
    projectId: 'kanantest'
  };
}
let firebaseConfig = firebaseConfigOxu();

let firestoreDb = null;
let firebaseHazir = false;
let firebaseUnsubscribe = null;
let firebaseYazTimer = null;
let senkronKey = null; // artıq Google uid-i olacaq, giriş edəndə təyin olunur
let cihazId = localStorage.getItem('device_id') || null;
if (!cihazId) {
  cihazId = 'cihaz_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  localStorage.setItem('device_id', cihazId);
}

// Konfiq artıq sabitdir (kod daxilində), ona görə tətbiq faylını app-i cəmi
// BİR DƏFƏ başladır — hər sync əməliyyatında yenidən yaratmağa ehtiyac yoxdur.
// Bu həm sürəti artırır, həm də Google giriş sessiyasının qorunmasına kömək edir.
function firebaseBaslat() {
  return new Promise((resolve) => {
    if (firestoreDb) { resolve(true); return; }
    if (typeof firebase === 'undefined') { resolve(false); return; } // internet yoxdursa SDK yüklənməyib
    try {
      if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(firebaseConfig);
      firestoreDb = firebase.firestore();
      firebaseHazir = true;
      resolve(true);
    } catch (e) {
      console.warn('Firebase init xətası:', e);
      resolve(false);
    }
  });
}

// ==================== Email / Şifrə ilə giriş və qeydiyyat ====================
// Google/Apple OAuth (popup və ya redirect) iOS-da "Ana ekrana əlavə et" ilə
// açılan standalone tətbiqlərdə xarici domenə (accounts.google.com və s.)
// keçib-qayıdanda sessiyanı itirir — bu, sınaqla təsdiqləndi. Email/şifrə isə
// heç bir xarici səhifəyə getmir, hər şey birbaşa səhifənin öz içində baş verir,
// ona görə standalone rejimdə də 100% etibarlı işləyir.
// Firebase xəta kodlarını istifadəçi üçün anlaşılan mətnə çevirir (tanınmayan kod olduğu kimi qalır).
function firebaseXetaMetni(e) {
  const kod = e && e.code ? e.code : '';
  if (kod === 'auth/too-many-requests') return tr('xeta.cokCehd', 'Həddən çox cəhd edildi. Bir neçə dəqiqə gözlə və yenidən yoxla.');
  if (kod === 'auth/network-request-failed') return tr('xeta.internet', 'İnternet bağlantısı yoxdur.');
  if (kod === 'auth/user-disabled') return tr('xeta.hesabBloklanib', 'Bu hesab deaktiv edilib.');
  return kod || (e && e.message) || tr('umumi.namelumXeta', 'naməlum xəta');
}

function emailSifreOxu() {
  const email = document.getElementById('emailGirisEmail').value.trim();
  const sifre = document.getElementById('emailGirisSifre').value;
  return { email, sifre };
}

// Təsdiqlənməmiş (emailVerified === false) istifadəçini tətbiqə buraxmır:
// dərhal signOut edir və "Yenidən göndər" düyməsini göstərir.
let tesdiqGozleyenIstifadeci = null;

function emailIleGirisEt() {
  const xetaEl = document.getElementById('googleGirisXeta');
  xetaEl.classList.remove('ugur');
  const { email, sifre } = emailSifreOxu();
  xetaEl.innerText = '';
  document.getElementById('tesdiqYenidenBtn').style.display = 'none';
  if (!email || !sifre) { xetaEl.innerText = tr('giris.epoctVeSifreYaz', 'E-poçtu və şifrəni daxil et.'); return; }
  firebaseBaslat().then((hazir) => {
    if (!hazir) { xetaEl.innerText = tr('giris.baglantiAlinmadi', 'Bağlantı alınmadı. İnterneti yoxla və yenidən cəhd et.'); return; }
    try { sessionStorage.setItem('berpa_teklif', '1'); } catch (e) {}
    firebase.auth().signInWithEmailAndPassword(email, sifre).then((deyisim) => {
      const istifadeci = deyisim.user;
      if (istifadeci && !istifadeci.emailVerified) {
        tesdiqGozleyenIstifadeci = istifadeci;
        xetaEl.innerText = tr('giris.epoctTesdiqlenmeyibUzun', 'E-poçtun hələ təsdiqlənməyib. Poçt qutunu ("Spam" qovluğunu da) yoxla, linkə keçid et və yenidən daxil ol.');
        document.getElementById('tesdiqYenidenBtn').style.display = 'block';
        try { sessionStorage.removeItem('berpa_teklif'); } catch (e) {}
        firebase.auth().signOut();
      }
    }).catch((e) => {
      try { sessionStorage.removeItem('berpa_teklif'); } catch (e2) {}
      console.warn('Email giriş xətası:', e);
      if (e && e.code === 'auth/user-not-found') xetaEl.innerText = tr('giris.hesabTapilmadi', 'Bu e-poçtla hesab tapılmadı. Əvvəlcə "Hesab yarat" ilə qeydiyyatdan keç.');
      else if (e && (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')) xetaEl.innerText = tr('giris.sifreSehvdir', 'Şifrə yanlışdır.');
      else xetaEl.innerText = tr('giris.girisAlinmadi', 'Daxil olmaq alınmadı: {xeta}', { xeta: firebaseXetaMetni(e) });
    });
  });
}

// Şifrə tələbi: ən az 6 simvol, ən az 1 böyük hərf, 1 kiçik hərf, 1 simvol (məs: Aa12345@).
function sifreGuclumu(sifre) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{6,}$/.test(sifre || '');
}

// Qeydiyyat zamanı yazılan ad/soyad Firestore Rules email_verified tələb
// etdiyi üçün hesab təsdiqlənənə qədər buluda yazıla bilmir. Ona görə təsdiqə
// qədər bu məlumatı müvəqqəti localStorage-da (email-ə bağlı) saxlayırıq, ilk
// uğurlu (təsdiqlənmiş) girişdə isə istifadeciProfili-ə köçürüb Firestore-a göndəririk.
function gozleyenProfilAcari(email) { return 'gozleyen_profil_' + encodeURIComponent((email || '').trim().toLowerCase()); }
function gozleyenProfilYaz(email, profil) {
  try { localStorage.setItem(gozleyenProfilAcari(email), JSON.stringify(profil)); } catch (e) { /* sakit keç */ }
}
function gozleyenProfilOxu(email) {
  try {
    const xam = localStorage.getItem(gozleyenProfilAcari(email));
    return xam ? JSON.parse(xam) : null;
  } catch (e) { return null; }
}
function gozleyenProfilSil(email) {
  try { localStorage.removeItem(gozleyenProfilAcari(email)); } catch (e) { /* sakit keç */ }
}

function qeydiyyatModalAc() {
  document.getElementById('qeydiyyatAd').value = '';
  document.getElementById('qeydiyyatSoyad').value = '';
  document.getElementById('qeydiyyatEmail').value = document.getElementById('emailGirisEmail').value.trim();
  document.getElementById('qeydiyyatSifre1').value = '';
  document.getElementById('qeydiyyatSifre2').value = '';
  document.getElementById('qeydiyyatXeta').innerText = '';
  modalAc('qeydiyyatModal');
}

function qeydiyyatGonder() {
  const xetaEl = document.getElementById('qeydiyyatXeta');
  const ad = document.getElementById('qeydiyyatAd').value.trim();
  const soyad = document.getElementById('qeydiyyatSoyad').value.trim();
  const email = document.getElementById('qeydiyyatEmail').value.trim();
  const sifre1 = document.getElementById('qeydiyyatSifre1').value;
  const sifre2 = document.getElementById('qeydiyyatSifre2').value;
  xetaEl.innerText = '';

  if (!ad || !soyad) { xetaEl.innerText = tr('qeyd.adSoyadYaz', 'Adını və soyadını yaz.'); return; }
  if (!email) { xetaEl.innerText = tr('qeyd.epoctunuYaz', 'E-poçt ünvanını yaz.'); return; }
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) { xetaEl.innerText = tr('qeyd.yalnizGmailXeta', 'Qeydiyyat yalnız Gmail (@gmail.com) ünvanı ilə mümkündür.'); return; }
  if (!sifre1 || !sifre2) { xetaEl.innerText = tr('qeyd.sifreni2DefeYaz', 'Şifrəni iki dəfə yaz.'); return; }
  if (sifre1 !== sifre2) { xetaEl.innerText = tr('qeyd.sifrelerUstUsteDusmur', 'Şifrələr eyni deyil.'); return; }
  if (!sifreGuclumu(sifre1)) { xetaEl.innerText = tr('qeyd.sifreQaydasiXeta', 'Şifrə ən azı 6 simvoldan ibarət olmalı və 1 böyük hərf, 1 kiçik hərf və 1 xüsusi simvol daxil etməlidir (məs.: Aa12345@).'); return; }

  firebaseBaslat().then((hazir) => {
    if (!hazir) { xetaEl.innerText = tr('giris.baglantiAlinmadi', 'Bağlantı alınmadı. İnterneti yoxla və yenidən cəhd et.'); return; }
    firebase.auth().createUserWithEmailAndPassword(email, sifre1).then((deyisim) => {
      const istifadeci = deyisim.user;
      gozleyenProfilYaz(email, { ad, soyad });
      return istifadeci.updateProfile({ displayName: ad + ' ' + soyad }).catch(() => {}).then(() => istifadeci.sendEmailVerification()).then(() => {
        tesdiqGozleyenIstifadeci = istifadeci;
        modalKapat('qeydiyyatModal');
        const girisXetaEl = document.getElementById('googleGirisXeta');
        document.getElementById('emailGirisEmail').value = email;
        girisXetaEl.innerText = tr('qeyd.hesabYaradildiMesaj', 'Hesab yaradıldı! Təsdiq linkini e-poçtuna göndərdik. Poçtunu ("Spam" qovluğunu da) yoxla, linkə keçid et və sonra "Daxil ol" düyməsinə bas.');
        document.getElementById('tesdiqYenidenBtn').style.display = 'block';
        return firebase.auth().signOut();
      });
    }).catch((e) => {
      console.warn('Email qeydiyyat xətası:', e);
      if (e && e.code === 'auth/email-already-in-use') xetaEl.innerText = tr('qeyd.hesabArtiqVarXeta', 'Bu e-poçtla artıq hesab var. "Geri" düyməsinə bas və "Daxil ol" ilə gir.');
      else if (e && e.code === 'auth/invalid-email') xetaEl.innerText = tr('qeyd.epoctDuzgunDeyil', 'E-poçt ünvanı düzgün deyil.');
      else if (e && e.code === 'auth/weak-password') xetaEl.innerText = tr('qeyd.sifreCoxZeifdir', 'Şifrə çox zəifdir.');
      else xetaEl.innerText = tr('qeyd.qeydiyyatAlinmadi', 'Qeydiyyat alınmadı: {xeta}', { xeta: firebaseXetaMetni(e) });
    });
  });
}

// Şifrəni unutdum: giriş ekranındakı e-poçta Firebase sıfırlama linki göndərir.
// Təhlükəsizlik: hesabın olub-olmadığını açıqlamamaq üçün "hesab tapılmadı" halında da eyni uğur mətni göstərilir.
function sifreSifirla() {
  const xetaEl = document.getElementById('googleGirisXeta');
  xetaEl.classList.remove('ugur');
  const email = document.getElementById('emailGirisEmail').value.trim();
  xetaEl.innerText = '';
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { xetaEl.innerText = tr('giris.sifirlamaEpoctYaz', 'Əvvəlcə e-poçt ünvanını yaz, sonra "Şifrəni unutdum" düyməsinə bas.'); return; }
  firebaseBaslat().then((hazir) => {
    if (!hazir) { xetaEl.innerText = tr('giris.baglantiAlinmadi', 'Bağlantı alınmadı. İnterneti yoxla və yenidən cəhd et.'); return; }
    try { firebase.auth().languageCode = dilKodu; } catch (e) { /* sakit keç */ }
    firebase.auth().sendPasswordResetEmail(email).then(() => {
      xetaEl.classList.add('ugur');
      xetaEl.innerText = tr('giris.sifirlamaGonderildi', 'Şifrəni yeniləmək üçün link {email} ünvanına göndərildi. Poçtunu ("Spam" qovluğunu da) yoxla.', { email });
    }).catch((e) => {
      if (e && (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential')) {
        xetaEl.classList.add('ugur');
      xetaEl.innerText = tr('giris.sifirlamaGonderildi', 'Şifrəni yeniləmək üçün link {email} ünvanına göndərildi. Poçtunu ("Spam" qovluğunu da) yoxla.', { email });
      } else if (e && e.code === 'auth/invalid-email') {
        xetaEl.innerText = tr('qeyd.epoctDuzgunDeyil', 'E-poçt ünvanı düzgün deyil.');
      } else {
        xetaEl.innerText = tr('giris.gonderilmedi', 'Göndərmək alınmadı: {xeta}. Bir az sonra yenidən cəhd et.', { xeta: firebaseXetaMetni(e) });
      }
    });
  });
}

// ==================== Qonaq (nümunə) rejimi ====================
// Qeydiyyatsız baxış: hazır nümunə data yalnız yaddaşda yaradılır; Firebase-ə heç nə yazılmır/oxunmur.
function qonaqKimiDaxilOl() {
  demoRejim = true;
  demoDatasiniQur();
  veriMenbeGuvenli = true;
  veriYuklendi = true;
  document.getElementById('googleGirisEkrani').classList.remove('active');
  appIskeletiOlustur();
  ekraniGuncelle();
  demoBannerGoster();
}
function qonaqdanCix() {
  // Səhifəni yenidən yüklə → nümunə data silinir, giriş ekranı açılır
  location.replace(location.origin + location.pathname);
}
function demoBannerGoster() {
  if (document.getElementById('demoBanner')) return;
  const el = document.createElement('div');
  el.id = 'demoBanner';
  el.className = 'demo-banner';
  el.innerHTML = `<span>${escapeHtml(tr('demo.banner', 'Nümunə rejimi — dəyişikliklər saxlanılmır'))}</span><button onclick="qonaqdanCix()">${escapeHtml(tr('demo.qeydiyyat', 'Hesab yarat'))}</button>`;
  document.body.appendChild(el);
  document.body.classList.add('demo-aktiv');
}
function demoDatasiniQur() {
  yerliVeriniYukle();
  istifadeciProfili = { ad: tr('demo.qonaqAd', 'Qonaq'), soyad: '' };
  gunlukLimit = 20;
  const bugun = new Date();
  const gunEvvel = (g, saat, deq) => { const d = new Date(bugun); d.setDate(d.getDate() - g); d.setHours(saat, deq, 0, 0); return d; };
  const bas = new Date(bugun.getFullYear(), bugun.getMonth() - 4, 5);
  hesablar = [
    hesabNormallasdir({ tip: 'debit', ad: tr('demo.maas', 'Maaş kartı'), bank: 'Kapital Bank', kartSon4: '4821', balans: 1860.5, ana: true }),
    hesabNormallasdir({ tip: 'kredit', ad: tr('hesabAd.kredit', 'Kredit kartı'), bank: 'ABB', kartSon4: '1034', balans: -412.35, limit: 2000 }),
    hesabNormallasdir({ tip: 'nagd', ad: tr('hesabAd.nagd', 'Nağd pul'), balans: 240 }),
    hesabNormallasdir({ tip: 'depozit', ad: tr('hesabAd.depozit', 'Depozit'), bank: 'Kapital Bank', balans: 5000, menfiOlar: true }),
    hesabNormallasdir({ tip: 'krediXett', ad: tr('demo.avtokredit', 'Avtokredit'), bank: 'ABB', aylikMebleg: 180, taksitSayi: 12, odenmisTaksitSayi: 4, baslangic: yerliTarixStr(bas) })
  ];
  const [debet, kart, nagd, , xett] = hesablar;
  // Son 40 gün üçün nümunə xərclər (sabit "təsadüfi" ardıcıllıq — hər dəfə eyni görünür)
  let toxum = 7; const rnd = () => { toxum = (toxum * 9301 + 49297) % 233280; return toxum / 233280; };
  const kat = kategoriler;
  const nov = [[0, 0.6], [1, 0.6], [2, 3.5], [4, 12], [5, 4.5], [7, 9], [6, 15], [3, 4.6]];
  giderler = [];
  for (let g = 40; g >= 0; g--) {
    const say = 1 + Math.floor(rnd() * 3);
    for (let i = 0; i < say; i++) {
      const [ki, taban] = nov[Math.floor(rnd() * nov.length)];
      if (!kat[ki]) continue;
      const tutar = pulYuvarla(taban * (0.8 + rnd() * 0.6));
      const dt = gunEvvel(g, 8 + Math.floor(rnd() * 12), Math.floor(rnd() * 60));
      if (dt > bugun) continue;
      giderler.push({ kategori: kat[ki].ad, tutar, tamTarix: dt.toISOString(), tarix: tarixSaatYaz(dt), hesabId: (i === 2 ? kart.id : debet.id) });
    }
  }
  // Aylıq sabit xərclər (kirayə, kommunal və s.) — bu ay və keçən ay üçün, hesabat qrafiki boş qalmasın
  const sabitler = [
    ['demo.katKiraye', 'Kirayə', '🏠', '#8f9bb0', 450, 1],
    ['demo.katKommunal', 'Kommunal', '💡', '#b3a27a', 68.4, 3],
    ['demo.katInternet', 'İnternet', '📶', '#7f9fa8', 25, 2],
    ['demo.katMobil', 'Mobil rabitə', '📱', '#a08aa6', 15, 2],
    ['demo.katIdman', 'İdman zalı', '🏋️', '#8fa58a', 60, 4]
  ];
  sabitler.forEach(([acar, ad, ikonu, renk, tutar, gun]) => {
    const katAd = tr(acar, ad);
    kategoriler.push({ ad: katAd, ikon: ikonu, renk, sabitTutar: tutar, aylik: true });
    [0, 1].forEach(ayGeri => {
      const dt = new Date(bugun.getFullYear(), bugun.getMonth() - ayGeri, Math.min(gun, ayGeri ? gun : bugun.getDate()), 11, 0, 0, 0);
      const mebleg = acar === 'demo.katKommunal' && ayGeri ? 74.9 : tutar;
      giderler.push({ kategori: katAd, tutar: mebleg, tamTarix: dt.toISOString(), tarix: tarixSaatYaz(dt), hesabId: debet.id });
    });
  });
  giderler.sort((a, b) => new Date(b.tamTarix) - new Date(a.tamTarix));
  const t1 = gunEvvel(3, 10, 15), t2 = gunEvvel(12, 9, 0), t3 = gunEvvel(20, 18, 30);
  hesabTransferleri = [
    { menbeId: debet.id, hedefId: kart.id, menbeTip: 'debit', hedefTip: 'kredit', tutar: 200, tamTarix: t1.toISOString(), tarix: tarixSaatYaz(t1) },
    { menbeId: debet.id, hedefId: xett.id, menbeTip: 'debit', hedefTip: 'krediXett', tutar: 180, taksit: true, tamTarix: t2.toISOString(), tarix: tarixSaatYaz(t2) },
    { menbeId: debet.id, hedefId: nagd.id, menbeTip: 'debit', hedefTip: 'nagd', tutar: 100, tamTarix: t3.toISOString(), tarix: tarixSaatYaz(t3) }
  ];
}

function tesdiqEmailiYenidenGonder() {
  const xetaEl = document.getElementById('googleGirisXeta');
  if (!tesdiqGozleyenIstifadeci) { xetaEl.innerText = tr('giris.evvelceDaxilOlVeyaHesabYarat', 'Əvvəlcə "Daxil ol" və ya "Hesab yarat" düyməsini sına.'); return; }
  tesdiqGozleyenIstifadeci.sendEmailVerification().then(() => {
    xetaEl.innerText = tr('giris.tesdiqEpoctuYenidenGonderildi', 'Təsdiq məktubu yenidən göndərildi.');
  }).catch((e) => {
    xetaEl.innerText = tr('giris.gonderilmedi', 'Göndərmək alınmadı: {xeta}. Bir az sonra yenidən cəhd et.', { xeta: firebaseXetaMetni(e) });
  });
}

function cixisEt() {
  if (demoRejim) { qonaqdanCix(); return; }
  confirmAc(tr('ayarlar.cixisEt', 'Çıxış et'), tr('ayarlar.cixisSual', 'Hesabdan çıxmaq istəyirsən? Bu cihazda yenidən giriş ekranı açılacaq.'), () => {
    if (firebaseUnsubscribe) { firebaseUnsubscribe(); firebaseUnsubscribe = null; }
    driveTokenSil();
    firebase.auth().signOut().then(() => location.reload());
  });
}

// Tətbiqin əsas "qapısı": giriş olmadan heç bir data yüklənmir/göstərilmir.
let cariGoogleIstifadeci = null;
async function uygulamaGirisBaslat() {
  // İlk ekran çəkilməmişdən əvvəl dil lüğətini gözlə (maks. 4 san — dil faylı ilişsə tətbiq gecikməsin).
  await Promise.race([dilHazirPromise, new Promise((res) => setTimeout(res, 4000))]);
  const hazir = await firebaseBaslat();
  if (!hazir) {
    document.getElementById('googleGirisEkrani').classList.add('active');
    document.getElementById('googleGirisXeta').innerText = tr('giris.baglantiAlinmadiSehifeniYenile', 'Bağlantı alınmadı. İnterneti yoxla və səhifəni yenilə.');
    return;
  }
  firebase.auth().onAuthStateChanged((istifadeci) => {
    if (demoRejim) return; // qonaq nümunəyə baxır — giriş vəziyyəti ekranı dəyişməsin
    if (istifadeci && !istifadeci.emailVerified) {
      // Köhnə sessiyadan qalan, hələ təsdiqlənməmiş istifadəçi — buraxma.
      tesdiqGozleyenIstifadeci = istifadeci;
      document.getElementById('googleGirisXeta').innerText = tr('giris.epoctTesdiqlenmeyibQisa', 'E-poçtun hələ təsdiqlənməyib. Poçtunu yoxla, linkə keçid et və yenidən daxil ol.');
      document.getElementById('tesdiqYenidenBtn').style.display = 'block';
      document.getElementById('googleGirisEkrani').classList.add('active');
      firebase.auth().signOut();
      return;
    }
    if (istifadeci) {
      cariGoogleIstifadeci = istifadeci;
      senkronKey = istifadeci.uid;
      document.getElementById('googleGirisEkrani').classList.remove('active');
      firebasePanelGuncelle();
      veriYuklendi = false;
      veriYukle();
    } else {
      cariGoogleIstifadeci = null;
      senkronKey = null;
      veriYuklendi = false;
      istifadeciProfili = { ad: '', soyad: '' };
      document.getElementById('googleGirisEkrani').classList.add('active');
    }
  });
}

function firebasePanelGuncelle(mesaj, xetaMi) {
  const statusEl = document.getElementById('firebaseStatus');
  const subEl = document.getElementById('firebaseSub');
  const btnsEl = document.getElementById('firebaseBtns');
  if (!statusEl) return;

  if (demoRejim) {
    statusEl.innerText = tr('demo.banner', 'Nümunə rejimi — dəyişikliklər saxlanılmır');
    subEl.innerText = tr('demo.hesabIzah', 'Öz məlumatlarını saxlamaq üçün hesab yarat.');
    btnsEl.innerHTML = `<button onclick="qonaqdanCix()">${escapeHtml(tr('demo.qeydiyyat', 'Hesab yarat'))}</button>`;
    const xk = document.getElementById('ayarlarXosGeldinKutu'); if (xk) xk.style.display = 'none';
    return;
  }
  if (xetaMi) {
    statusEl.innerText = (mesaj || tr('umumi.xetaBasVerdi', 'Xəta baş verdi.'));
  } else if (cariGoogleIstifadeci) {
    statusEl.innerText = tr('ayarlar.anlikSinxronizasiyaAktiv', 'Canlı sinxronizasiya aktivdir');
  } else {
    statusEl.innerText = tr('ayarlar.baglanmayib', 'Qoşulmayıb');
  }

  if (cariGoogleIstifadeci) {
    subEl.innerText = (istifadeciProfili && istifadeciProfili.ad) ? (istifadeciProfili.ad + ' ' + istifadeciProfili.soyad) : (cariGoogleIstifadeci.email || tr('ayarlar.hesablaBaglisan', 'Hesaba daxil olmusan.'));
    btnsEl.innerHTML = `<button onclick="cixisEt()">${tr('ayarlar.cixisEt', 'Çıxış et')}</button>`;
  } else {
    subEl.innerText = tr('ayarlar.daxilOlmamisan', 'Hesaba daxil olmamısan.');
    btnsEl.innerHTML = '';
  }

  const xosKutu = document.getElementById('ayarlarXosGeldinKutu');
  const xosAd = document.getElementById('ayarlarXosGeldinAd');
  if (xosKutu && xosAd) {
    if (cariGoogleIstifadeci && istifadeciProfili && istifadeciProfili.ad) {
      xosAd.innerText = istifadeciProfili.ad + ' ' + istifadeciProfili.soyad;
      xosKutu.style.display = 'block';
    } else {
      xosKutu.style.display = 'none';
    }
  }
}


// ==== Sənəd nömrəsi (rev) ilə çakışmasız sinxronizasiya ====
// ƏVVƏLKİ MƏNTİQ (cihaz saatı ilə "kim daha təzədir" müqayisəsi + hər ekran yenilənməsində yazma)
// iki cihaz arasında sonsuz yazma dövrünə və xərc itkisinə səbəb olurdu. İndi:
//  • Buluddakı sənəddə tam ədəd "rev" var; hər uğurlu yazma onu 1 artırır.
//  • Yazma Firestore TRANSACTION ilə gedir: bulud "rev"i bizim bildiyimizdən (bazaRev) fərqlidirsə,
//    başqa cihaz arada yazıb deməkdir — üstünə YAZMIRIQ, onun versiyasını yükləyib istifadəçiyə xəbər veririk.
//  • Uzaqdan gələn məlumat tətbiq olunanda buluda HEÇ NƏ yazılmır (əks-səda / ping-pong yoxdur).
//  • Yazma yalnız real istifadəçi dəyişikliyindən sonra baş verir (veriKaydet()).
let bazaRev = 0;          // buluddan son tətbiq etdiyimiz / yazdığımız sənədin nömrəsi
let yerliSurum = 0;       // hər real yerli dəyişiklikdə artır
let yazilmisSurum = 0;    // buluda çatmış son yerli sürüm
let yazmaGedir = false;
let yazmaTekrarGerek = false;
let yazmaTekrarTimer = null;

function yerliDeyisiklikVar() { return yerliSurum !== yazilmisSurum; }

// Ekranda görünən qısa bildiriş. (Sinxron xəbərdarlıqları əvvəl yalnız Ayarlar → System içində, bağlı bölmədə yazılırdı —
// istifadəçi dəyişikliyinin buluda getmədiyini heç görmürdü.) 'acar' verilsə eyni bildiriş 10 saniyədə bir dəfədən çox çıxmır.
const toastSonVaxt = {};
function toastGoster(mesaj, acar) {
  if (acar) {
    if (toastSonVaxt[acar] && Date.now() - toastSonVaxt[acar] < 10000) return;
    toastSonVaxt[acar] = Date.now();
  }
  const el = document.createElement('div');
  el.className = 'toast-msg';
  el.setAttribute('role', 'status');
  el.style.cssText = 'position:fixed; left:50%; transform:translateX(-50%); bottom:calc(88px + env(safe-area-inset-bottom, 0px)); ' +
    'max-width:90%; z-index:99999; padding:11px 16px; border-radius:12px; font-size:13px; font-weight:600; line-height:1.35; text-align:center; ' +
    'background:var(--brand); color:#fff; box-shadow:0 8px 24px var(--shadow); border:1px solid var(--accent);';
  el.innerText = mesaj;
  document.body.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; }, 6000);
  setTimeout(() => el.remove(), 6400);
}

// Buluddan gələn məlumat tətbiq edildikdən sonra ekranı yeniləyir (heç nə yazmır).
function buludVerisiTetbiqSonrasi() {
  modalKapat('islemFormModal'); // açıq redaktə forması köhnə sıra nömrəsinə baxa bilər — bağla
  ekraniGuncelle();
  const hesablarModalEl = document.getElementById('hesablarModal');
  if (hesablarModalEl && hesablarModalEl.classList.contains('active') && typeof hesablarGoster === 'function') {
    hesablarGoster();
  }
  driveSonSyncQeydEt();
}

function firebaseDinlemeyeBasla() {
  if (!firebaseHazir || !senkronKey || !firestoreDb) return;
  if (firebaseUnsubscribe) { firebaseUnsubscribe(); firebaseUnsubscribe = null; }
  firebaseUnsubscribe = firestoreDb.collection('syncs').doc(senkronKey).onSnapshot((snap) => {
    if (!snap.exists) return;
    if (snap.metadata.hasPendingWrites) return; // öz yazdığımızın əks-sədasıdır, gözlə
    const remote = snap.data();
    if (!remote || !remote.data) return;
    const remoteRev = Number(remote.rev) || 0;
    const ilkBaglanti = !veriMenbeGuvenli;
    // Bulud vəziyyəti hələ təsdiqlənməyibsə (yavaş bağlantı) — nömrədən asılı olmayaraq qəbul edirik.
    if (!ilkBaglanti && remoteRev <= bazaRev) return; // öz yazımızın əks-sədası və ya köhnə məlumat
    // Yazılmamış yerli dəyişiklik / gedən yazma varsa toxunmuruq: yazma anındakı transaction çakışmanı özü aşkarlayır.
    if (yazmaGedir || yerliDeyisiklikVar()) return;
    driveVerisiniTetbiqEt(remote.data);
    bazaRev = remoteRev;
    yazilmisSurum = yerliSurum;
    veriMenbeGuvenli = true;
    buludVerisiTetbiqSonrasi();
  }, (err) => {
    console.warn('Firestore dinləmə xətası:', err);
    firebasePanelGuncelle(tr('sinx.dinlemeKesildi', 'Canlı sinxronizasiya dayandı.'), true);
  });
}

// Real dəyişiklikdən ~600ms sonra (debounce) buluda yazır.
function firebaseYazPlanla() {
  if (!firebaseHazir || !senkronKey || !veriMenbeGuvenli) return;
  clearTimeout(firebaseYazTimer);
  firebaseYazTimer = setTimeout(firebaseYazEt, 600);
}

async function firebaseYazEt() {
  if (!firebaseHazir || !senkronKey || !firestoreDb) return;
  if (yazmaGedir) { yazmaTekrarGerek = true; return; }
  yazmaGedir = true;
  yazmaTekrarGerek = false;
  let konflikt = null, yeniRev = bazaRev, yazilanSurum = yerliSurum;
  try {
    const ref = firestoreDb.collection('syncs').doc(senkronKey);
    await firestoreDb.runTransaction(async (tx) => {
      konflikt = null; // transaction təkrarlana bilər
      const snap = await tx.get(ref);
      const bulud = snap.exists ? snap.data() : null;
      const budRev = bulud ? (Number(bulud.rev) || 0) : 0;
      if (bulud && bulud.data && budRev !== bazaRev) { konflikt = bulud; return; } // başqa cihaz arada yazıb
      yazilanSurum = yerliSurum;
      yeniRev = budRev + 1;
      tx.set(ref, {
        data: driveBackupVerisi(),
        cihazId,
        rev: yeniRev,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
    if (konflikt) {
      // Bizim yazmamız başqa cihazın daha yeni dəyişikliyinin üstünə düşərdi — onun versiyasını yükləyirik.
      driveVerisiniTetbiqEt(konflikt.data);
      bazaRev = Number(konflikt.rev) || 0;
      yazilmisSurum = yerliSurum;
      veriMenbeGuvenli = true;
      buludVerisiTetbiqSonrasi();
      firebasePanelGuncelle(tr('sinx.konflikt', 'Başqa cihazda daha yeni dəyişiklik var və o yükləndi. Son əməliyyatını yoxla, lazım olsa təkrarla.'), true);
      toastGoster(tr('sinx.konflikt', 'Başqa cihazda daha yeni dəyişiklik var və o yükləndi. Son əməliyyatını yoxla, lazım olsa təkrarla.'));
    } else {
      bazaRev = yeniRev;
      yazilmisSurum = yazilanSurum;
    }
  } catch (e) {
    console.warn('Firestore yazma xətası:', e);
    firebasePanelGuncelle(tr('sinx.gonderilmediPanel', 'Göndərmək alınmadı — yenidən cəhd edilir.'), true);
    toastGoster(tr('sinx.gonderilmediToast', 'Dəyişiklik buluda saxlanmadı. İnterneti yoxla — avtomatik yenidən cəhd edilir.'), 'yazma-xeta');
    yazmaGedir = false;
    clearTimeout(yazmaTekrarTimer);
    yazmaTekrarTimer = setTimeout(firebaseYazPlanla, 5000);
    return;
  }
  yazmaGedir = false;
  if (!konflikt && (yerliDeyisiklikVar() || yazmaTekrarGerek)) firebaseYazPlanla(); // yazma zamanı yeni dəyişiklik olub
}

// ==================== /Firebase ====================
