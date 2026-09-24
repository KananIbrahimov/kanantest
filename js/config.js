/* Safe Money — Drive və ümumi sabitlər */
// TƏHLÜKƏSİZLİK: HTML içərisinə istifadəçi məlumatı yazmazdan əvvəl xüsusi simvolları
// təhlükəsiz formaya salır.
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
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

