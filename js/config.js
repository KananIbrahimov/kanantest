/* Safe Money — Drive və ümumi sabitlər */
// TƏHLÜKƏSİZLİK: HTML içərisinə istifadəçi məlumatı yazmazdan əvvəl xüsusi simvolları
// təhlükəsiz formaya salır.
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
// Pul məbləğini qəpiyə (2 onluq) yuvarlaqlaşdırır. JavaScript-də 0.3 - 0.1 = 0.19999999999999998 olur;
// bu yuvarlaqlaşdırma olmadan "bütün qalığı köçür" kimi əməliyyatlar "balans yoxdur" xətası verirdi.
function pulYuvarla(x) {
  const n = Number(x);
  return isFinite(n) ? Math.round(n * 100) / 100 : 0;
}
// ==================== İkonlar (xətti SVG, rəngi mətndən götürür) ====================
// Emoji əvəzinə vahid üslublu nazik xətli ikonlar: hər cihazda eyni görünür, temaya uyğun rənglənir.
const IKON_YOLLARI = {
  icmal: '<path d="M21 12a9 9 0 1 1-9-9v9z"/><path d="M15 3.5A9 9 0 0 1 20.5 9H15z"/>',
  ayliq: '<rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/><path d="M8 14h3M8 17.5h6"/>',
  xercler: '<path d="M6 2.5h12a1 1 0 0 1 1 1V21l-3-2-2.5 2-2.5-2-2.5 2L6 19l-1 .7V3.5a1 1 0 0 1 1-1z"/><path d="M9 8h6M9 12h6"/>',
  hesablar: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19v4"/><rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M16 13.5h2.5"/>',
  ayarlar: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  qelem: '<path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  sil: '<path d="M6 6l12 12M18 6L6 18"/>',
  zibil: '<path d="M4 7h16M9.5 7V4.5h5V7M6.5 7l.8 12.5a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>',
  artir: '<path d="M12 5v14M5 12h14"/>',
  sol: '<path d="M15 5l-7 7 7 7"/>',
  sag: '<path d="M9 5l7 7-7 7"/>',
  geri: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  yenile: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20.5V16h-4.5"/>',
  ay: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  kilid: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  bulud: '<path d="M7 18.5a4.5 4.5 0 0 1-.6-9 6 6 0 0 1 11.5 1.6A3.8 3.8 0 0 1 17.5 18.5z"/>',
  cixis: '<path d="M14 4.5h4a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-4"/><path d="M10 16.5L5.5 12 10 7.5M5.5 12H15"/>',
  kateqoriya: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  dil: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  tarixce: '<path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1L3.5 8.5"/><path d="M3.5 3.5v5h5"/><path d="M12 7.5V12l3 2"/>',
  sistem: '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/>',
  asagi: '<path d="M6 9l6 6 6-6"/>',
  kocurme: '<path d="M4 8h14M14 4l4 4-4 4"/><path d="M20 16H6M10 12l-4 4 4 4"/>',
  nagd: '<rect x="2.5" y="6" width="19" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/>',
  debit: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 10h19M6.5 15h4"/>',
  depozit: '<path d="M3 9.5L12 4l9 5.5"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20.5h18"/>',
  kredit: '<rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6.5 14.5h2.5M12 14.5h2"/>',
  krediXett: '<path d="M7 2.5h7l5 5V20a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 6 20V4a1.5 1.5 0 0 1 1-1.5z"/><path d="M14 2.5V7.5h5"/><path d="M9.5 13h5M9.5 16.5h5"/>',
  tesdiq: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  ulduz: '<path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"/>',
  istifadeci: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'
};
function ikon(ad, olcu) {
  const y = IKON_YOLLARI[ad]; if (!y) return '';
  const s = olcu || 20;
  return '<svg class="ic ic-' + ad + '" width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + y + '</svg>';
}
// HTML-də <i data-ikon="ad"></i> yazılan yerlərə ikonu yerləşdirir.
function ikonlariYerlesdir(kok) {
  (kok || document).querySelectorAll('[data-ikon]').forEach(el => {
    if (el.dataset.ikonHazir) return;
    el.innerHTML = ikon(el.dataset.ikon, Number(el.dataset.olcu) || undefined);
    el.dataset.ikonHazir = '1';
  });
}
document.addEventListener('DOMContentLoaded', () => ikonlariYerlesdir());

// ==================== Google Drive avtomatik backup ====================
// 1) Google Cloud Console-da OAuth Client ID yarat (Web application tipi) və aşağıya yapışdır.
// 2) Bu faylı http(s):// üzərindən aç (file:// işləmir) — o ünvanı Client ID-nin
//    "Authorized JavaScript origins" siyahısına əlavə etməlisən.
const GOOGLE_DRIVE_CLIENT_ID = '444366545812-nhf3dk5dc68hi0ok6e6v0npvvu0t8veq.apps.googleusercontent.com';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILE_PREFIX = 'gider-takibi-backup';

let driveTokenClient = null;
let driveAccessToken = null;
let driveTokenBitisZamani = 0; // ms epoch
let driveBagli = localStorage.getItem('drive_bagli') === '1';
let driveSonSync = localStorage.getItem('drive_son_sync') || null;
let driveSyncGedirmi = false;
let driveGeriCagirisFn = null;
let sonDeyisiklikVaxti = null; // yerli son dəyişiklik vaxtı (ISO) - Drive ilə müqayisə üçün

