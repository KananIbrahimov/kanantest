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
        const cb = driveGeriCagirisFn; driveGeriCagirisFn = null;
        driveMenyuGuncelle();
        if (cb) cb();
      } else {
        driveSyncGedirmi = false; driveGeriCagirisFn = null; // düzəliş: pəncərə bağlananda "Əməliyyat gedir…" ilişib qalmasın
        driveMenyuGuncelle('Giriş alınmadı, yenidən sına.', true);
      }
    },
    error_callback: () => { driveSyncGedirmi = false; driveGeriCagirisFn = null; driveMenyuGuncelle('Giriş alınmadı, yenidən sına.', true); }
  });
}

function driveTokenGerekliyse(sessiz, sonra) {
  driveGisSkriptiniYukle().then(() => {
    driveTokenClientHazirla();
    if (!driveTokenClient) {
      driveSyncGedirmi = false; driveGeriCagirisFn = null;
      driveMenyuGuncelle('Google-a qoşulmaq alınmadı, internetini yoxla.', true);
      return;
    }
    if (driveAccessToken && Date.now() < driveTokenBitisZamani) { sonra(); return; }
    driveGeriCagirisFn = sonra;
    driveTokenClient.requestAccessToken({ prompt: sessiz ? '' : 'consent' });
  }).catch(() => {
    driveSyncGedirmi = false; driveGeriCagirisFn = null;
    driveMenyuGuncelle('Google-a qoşulmaq alınmadı, internetini yoxla.', true);
  });
}

function driveBaglan() {
  if (GOOGLE_DRIVE_CLIENT_ID.indexOf('BURAYA_OZ_CLIENT_ID') === 0) {
    alertAc(tr('ayarlar.clientIdTeyinEdilmeyibXeta', 'Əvvəlcə kodun içindəki GOOGLE_DRIVE_CLIENT_ID sətrinə öz Google Client ID-ni yazmalısan.'));
    return;
  }
  driveTokenGerekliyse(false, () => driveMenyuGuncelle());
}

function driveBaglantiKes() {
  confirmAc(tr('ayarlar.driveBaglantisiniKesBaslik', 'Drive bağlantısını kəs'), tr('ayarlar.driveBaglantisiniKesSual', 'Drive bağlantısı kəsilsin? Drive-dakı fayl silinmir.'), () => {
    driveBagli = false; driveAccessToken = null; driveTokenBitisZamani = 0;
    localStorage.setItem('drive_bagli', '0');
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
    statusEl.innerText = xetaMi ? ('⚠️ ' + mesaj) : '☁️ Google Drive-a bağlı deyil';
    subEl.innerText = tr('ayarlar.driveBaglanaBilersen', 'Bağlansan, "Göndər" və "Çək" düymələri ilə məlumatını özün idarə edə biləcəksən.');
    btnsEl.innerHTML = `<button onclick="driveBaglan()">${tr('ayarlar.baglan', 'Bağlan')}</button>`;
    return;
  }
  if (driveSyncGedirmi) {
    statusEl.className = 'drive-status';
    statusEl.innerText = tr('ayarlar.driveEmeliyyatGedir', '☁️ Əməliyyat gedir…');
  } else if (xetaMi) {
    statusEl.className = 'drive-status err';
    statusEl.innerText = '⚠️ ' + mesaj;
  } else {
    statusEl.className = 'drive-status ok';
    statusEl.innerText = tr('ayarlar.driveBagli', '✅ Drive-a bağlı');
  }
  subEl.innerText = driveSonSync ? ('Son əməliyyat: ' + driveSonSync) : 'Hələ göndərilməyib/çəkilməyib.';
  btnsEl.innerHTML = `<button onclick="driveManualGonder()">📤 ${tr('ayarlar.driveGonder', 'Drive-a göndər')}</button><button onclick="driveManualCek()">📥 ${tr('ayarlar.driveCek', 'Drive-dan çək')}</button><button onclick="driveBaglantiKes()">${tr('ayarlar.baglantiniKes', 'Bağlantını kəs')}</button>`;
}

function driveBackupVerisi() {
  return { kategoriler, giderler, anaHesap, kreditLimit, krediBorcu, nagdBakiye, debitBakiye, depozitBakiye, hesabTransferleri, gunlukLimit, hesabEklenib, profil: istifadeciProfili, backupTarixi: sonDeyisiklikVaxti || new Date().toISOString() };
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
  kategoriler = parsed.kategoriler || varsayilanKategoriler;
  giderler = parsed.giderler || [];
  anaHesap = (typeof parsed.anaHesap === 'number') ? parsed.anaHesap : null;
  kreditLimit = (typeof parsed.kreditLimit === 'number') ? parsed.kreditLimit : null;
  krediBorcu = parsed.krediBorcu || krediBorcuKohnaBackupdanCixar(parsed.aylikXerclar);
  nagdBakiye = (typeof parsed.nagdBakiye === 'number') ? parsed.nagdBakiye : 0;
  debitBakiye = (typeof parsed.debitBakiye === 'number') ? parsed.debitBakiye : 0;
  depozitBakiye = (typeof parsed.depozitBakiye === 'number') ? parsed.depozitBakiye : 0;
  hesabTransferleri = parsed.hesabTransferleri || [];
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
  driveSonSync = simdi.toLocaleTimeString(dilKodu === 'en' ? 'en-GB' : 'az-AZ', { hour: '2-digit', minute: '2-digit' }) + ' · ' + simdi.toLocaleDateString(dilKodu === 'en' ? 'en-GB' : 'az-AZ');
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
      driveSyncGedirmi = false;
      driveMenyuGuncelle();
    } catch (e) {
      driveSyncGedirmi = false;
      driveMenyuGuncelle('Göndərmə alınmadı: ' + (e && e.message ? e.message : e), true);
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
        driveMenyuGuncelle('Drive-da hələ heç bir backup tapılmadı.', true);
        return;
      }
      driveBackupSecimGoster(fayllar);
    } catch (e) {
      driveSyncGedirmi = false;
      driveMenyuGuncelle('Siyahı alınmadı: ' + (e && e.message ? e.message : e), true);
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
    item.innerHTML = `<div class="field-row between"><span>🗓️ ${escapeHtml(driveTarixSaatFormat(f.createdTime))}</span><span style="color:var(--brand-ink); font-size:12px; font-weight:600;">Seç →</span></div>`;
    item.onclick = () => driveBackupSecildi(f.id, f.createdTime);
    konteyner.appendChild(item);
  });
  modalAc('driveBackupSecModal');
}

function driveBackupSecildi(fileId, createdTime) {
  modalKapat('driveBackupSecModal');
  confirmAc('Bu backup tətbiq edilsin?', driveTarixSaatFormat(createdTime) + ' tarixli backup cari məlumatının üstünə yazılsın? Bu geri qaytarıla bilməz.', () => {
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
      } catch (e) {
        driveSyncGedirmi = false;
        driveMenyuGuncelle('Tətbiq alınmadı: ' + (e && e.message ? e.message : e), true);
      }
    });
  });
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
  const { email, sifre } = emailSifreOxu();
  xetaEl.innerText = '';
  document.getElementById('tesdiqYenidenBtn').style.display = 'none';
  if (!email || !sifre) { xetaEl.innerText = tr('giris.epoctVeSifreYaz', 'E-poçt və şifrəni yaz.'); return; }
  firebaseBaslat().then((hazir) => {
    if (!hazir) { xetaEl.innerText = tr('giris.baglantiAlinmadi', 'Bağlantı alınmadı, internetini yoxla və yenidən cəhd et.'); return; }
    firebase.auth().signInWithEmailAndPassword(email, sifre).then((deyisim) => {
      const istifadeci = deyisim.user;
      if (istifadeci && !istifadeci.emailVerified) {
        tesdiqGozleyenIstifadeci = istifadeci;
        xetaEl.innerText = tr('giris.epoctTesdiqlenmeyibUzun', 'E-poçtun hələ təsdiqlənməyib. Poçt qutunu (spam qovluğu da daxil) yoxla və linkə klikləyəndən sonra yenidən daxil ol.');
        document.getElementById('tesdiqYenidenBtn').style.display = 'block';
        firebase.auth().signOut();
      }
    }).catch((e) => {
      console.warn('Email giriş xətası:', e);
      if (e && e.code === 'auth/user-not-found') xetaEl.innerText = tr('giris.hesabTapilmadi', 'Bu e-poçtla hesab tapılmadı — əvvəlcə "Hesab yarat" ilə qeydiyyatdan keç.');
      else if (e && (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential')) xetaEl.innerText = tr('giris.sifreSehvdir', 'Şifrə səhvdir.');
      else xetaEl.innerText = tr('giris.girisAlinmadi', 'Giriş alınmadı: {xeta}', { xeta: (e && e.code ? e.code : (e && e.message ? e.message : 'naməlum xəta')) });
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

  if (!ad || !soyad) { xetaEl.innerText = tr('qeyd.adSoyadYaz', 'Ad və soyadını yaz.'); return; }
  if (!email) { xetaEl.innerText = tr('qeyd.epoctunuYaz', 'E-poçtunu yaz.'); return; }
  if (!/^[^\s@]+@gmail\.com$/i.test(email)) { xetaEl.innerText = tr('qeyd.yalnizGmailXeta', 'Yalnız Gmail (@gmail.com) ünvanı ilə qeydiyyatdan keçmək olar.'); return; }
  if (!sifre1 || !sifre2) { xetaEl.innerText = tr('qeyd.sifreni2DefeYaz', 'Şifrəni 2 dəfə yaz.'); return; }
  if (sifre1 !== sifre2) { xetaEl.innerText = tr('qeyd.sifrelerUstUsteDusmur', 'Yazdığın 2 şifrə üst-üstə düşmür.'); return; }
  if (!sifreGuclumu(sifre1)) { xetaEl.innerText = tr('qeyd.sifreQaydasiXeta', 'Şifrə ən az 6 simvol olmalı və ən az 1 böyük hərf, 1 kiçik hərf, 1 simvol daxil etməlidir (məs: Aa12345@).'); return; }

  firebaseBaslat().then((hazir) => {
    if (!hazir) { xetaEl.innerText = tr('giris.baglantiAlinmadi', 'Bağlantı alınmadı, internetini yoxla və yenidən cəhd et.'); return; }
    firebase.auth().createUserWithEmailAndPassword(email, sifre1).then((deyisim) => {
      const istifadeci = deyisim.user;
      gozleyenProfilYaz(email, { ad, soyad });
      return istifadeci.updateProfile({ displayName: ad + ' ' + soyad }).catch(() => {}).then(() => istifadeci.sendEmailVerification()).then(() => {
        tesdiqGozleyenIstifadeci = istifadeci;
        modalKapat('qeydiyyatModal');
        const girisXetaEl = document.getElementById('googleGirisXeta');
        document.getElementById('emailGirisEmail').value = email;
        girisXetaEl.innerText = tr('qeyd.hesabYaradildiMesaj', 'Hesab yaradıldı! Sənə təsdiq linki göndərdik — poçtunu (spam qovluğu da daxil) yoxla, linkə klikləyəndən sonra "Daxil ol" ilə giriş et.');
        document.getElementById('tesdiqYenidenBtn').style.display = 'block';
        return firebase.auth().signOut();
      });
    }).catch((e) => {
      console.warn('Email qeydiyyat xətası:', e);
      if (e && e.code === 'auth/email-already-in-use') xetaEl.innerText = tr('qeyd.hesabArtiqVarXeta', 'Bu e-poçtla artıq hesab var — "Ləğv et" edib "Daxil ol" düyməsini istifadə et.');
      else if (e && e.code === 'auth/invalid-email') xetaEl.innerText = tr('qeyd.epoctDuzgunDeyil', 'E-poçt düzgün deyil.');
      else if (e && e.code === 'auth/weak-password') xetaEl.innerText = tr('qeyd.sifreCoxZeifdir', 'Şifrə çox zəifdir.');
      else xetaEl.innerText = tr('qeyd.qeydiyyatAlinmadi', 'Qeydiyyat alınmadı: {xeta}', { xeta: (e && e.code ? e.code : (e && e.message ? e.message : 'naməlum xəta')) });
    });
  });
}

function tesdiqEmailiYenidenGonder() {
  const xetaEl = document.getElementById('googleGirisXeta');
  if (!tesdiqGozleyenIstifadeci) { xetaEl.innerText = tr('giris.evvelceDaxilOlVeyaHesabYarat', 'Əvvəlcə "Daxil ol" və ya "Hesab yarat" ilə cəhd et.'); return; }
  tesdiqGozleyenIstifadeci.sendEmailVerification().then(() => {
    xetaEl.innerText = tr('giris.tesdiqEpoctuYenidenGonderildi', 'Təsdiq e-poçtu yenidən göndərildi.');
  }).catch((e) => {
    xetaEl.innerText = tr('giris.gonderilmedi', 'Göndərilmədi: {xeta} — bir az sonra yenidən cəhd et.', { xeta: (e && e.code ? e.code : 'naməlum xəta') });
  });
}

function cixisEt() {
  confirmAc(tr('ayarlar.cixisEt', 'Çıxış et'), tr('ayarlar.cixisSual', 'Hesabdan çıxmaq istəyirsən? Bu cihazda tətbiq yenidən giriş ekranını göstərəcək.'), () => {
    if (firebaseUnsubscribe) { firebaseUnsubscribe(); firebaseUnsubscribe = null; }
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
    document.getElementById('googleGirisXeta').innerText = tr('giris.baglantiAlinmadiSehifeniYenile', 'Bağlantı alınmadı, internetini yoxla və səhifəni yenilə.');
    return;
  }
  firebase.auth().onAuthStateChanged((istifadeci) => {
    if (istifadeci && !istifadeci.emailVerified) {
      // Köhnə sessiyadan qalan, hələ təsdiqlənməmiş istifadəçi — buraxma.
      tesdiqGozleyenIstifadeci = istifadeci;
      document.getElementById('googleGirisXeta').innerText = tr('giris.epoctTesdiqlenmeyibQisa', 'E-poçtun hələ təsdiqlənməyib. Poçtunu yoxla və linkə klikləyəndən sonra yenidən daxil ol.');
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

  if (xetaMi) {
    statusEl.innerText = '⚠️ ' + (mesaj || 'Xəta baş verdi.');
  } else if (cariGoogleIstifadeci) {
    statusEl.innerText = tr('ayarlar.anlikSinxronizasiyaAktiv', '⚡ Anlıq sinxronizasiya aktiv');
  } else {
    statusEl.innerText = tr('ayarlar.baglanmayib', '⚡ Bağlanmayıb');
  }

  if (cariGoogleIstifadeci) {
    subEl.innerText = (istifadeciProfili && istifadeciProfili.ad) ? (istifadeciProfili.ad + ' ' + istifadeciProfili.soyad) : (cariGoogleIstifadeci.email || 'Hesabla bağlısan.');
    btnsEl.innerHTML = `<button onclick="cixisEt()">${tr('ayarlar.cixisEt', 'Çıxış et')}</button>`;
  } else {
    subEl.innerText = tr('ayarlar.daxilOlmamisan', 'Daxil olmamısan.');
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
    firebasePanelGuncelle('Dinləmə kəsildi.', true);
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
      firebasePanelGuncelle('Başqa cihazda daha yeni dəyişiklik var — o yükləndi. Son əməliyyatını yoxla, lazımsa təkrarla.', true);
      toastGoster('⚠️ Başqa cihazda daha yeni dəyişiklik var — o yükləndi. Son əməliyyatını yoxla, lazımsa təkrarla.');
    } else {
      bazaRev = yeniRev;
      yazilmisSurum = yazilanSurum;
    }
  } catch (e) {
    console.warn('Firestore yazma xətası:', e);
    firebasePanelGuncelle('Göndərmə alınmadı — yenidən cəhd olunur.', true);
    toastGoster('⚠️ Dəyişiklik buluda göndərilmədi — internetini yoxla, avtomatik yenidən cəhd olunur.', 'yazma-xeta');
    yazmaGedir = false;
    clearTimeout(yazmaTekrarTimer);
    yazmaTekrarTimer = setTimeout(firebaseYazPlanla, 5000);
    return;
  }
  yazmaGedir = false;
  if (!konflikt && (yerliDeyisiklikVar() || yazmaTekrarGerek)) firebaseYazPlanla(); // yazma zamanı yeni dəyişiklik olub
}

// ==================== /Firebase ====================
