/* Safe Money — tema və dil (i18n) */
// ==================== Tema (Dark mode) ====================
function temaTetbiqEt(tema) {
  document.documentElement.setAttribute('data-theme', tema === 'dark' ? 'dark' : 'light');
  // Brauzer / status bar rəngi tema ilə uyğun olsun
  const metaTema = document.querySelector('meta[name="theme-color"]');
  if (metaTema) metaTema.setAttribute('content', tema === 'dark' ? '#0b0c0e' : '#f3f4f6');
  const lbl = document.getElementById('temaLabel');
  // Açar (switch) "qaranlıq rejim aktivdir" vəziyyətini göstərir — yazı da həmişə eyni: "🌙 Qaranlıq rejim".
  // (Əvvəl açar aktiv olanda yanında "İşıqlı rejim" yazılırdı və bu, çaşdırırdı.)
  if (lbl) lbl.innerHTML = '<span class="ayarlar-ikon">' + (typeof ikon === 'function' ? ikon('ay') : '') + '</span><span class="ayarlar-metin">' + escapeHtml(tr('ayarlar.qaranliqRejim', 'Qaranlıq rejim')) + '</span>';
}
function temaDeyis() {
  // DÜZƏLİŞ: seçim saxlanmayıbsa defolt 'dark'-dır (temaIlkYukleme ilə eyni) — əvvəl null 'light' sayılırdı
  // və ilk basış yenə 'dark' yazırdı, yəni düymə ilk dəfə heç nə etmirdi.
  const cari = (localStorage.getItem('tema') || 'dark') === 'dark' ? 'dark' : 'light';
  const yeni = cari === 'dark' ? 'light' : 'dark';
  localStorage.setItem('tema', yeni);
  temaTetbiqEt(yeni);
}
(function temaIlkYukleme() {
  const saxlanan = localStorage.getItem('tema');
  // Tema: Black & Merlot — seçim saxlanmayıbsa defolt qaranlıq (sistem rejiminə baxmır)
  const tema = saxlanan ? saxlanan : 'dark';
  temaTetbiqEt(tema);
})();
// ==================== /Tema ====================

// ==================== Dil (i18n) — FAZ 1: yalnız altyapı ====================
// Bu blok hələ heç bir mövcud mətni əvəz ETMİR — ekranlar tamamilə əvvəlki kimi görünəcək.
// Məqsəd: t(key) funksiyasını və dil faylı yükləmə məntiqini qurub sınaqdan keçirmək.
// Sonrakı fazalarda: mövcud sabit mətnlər tədricən t('...') çağırışları ilə əvəzlənəcək.
//
// Yeni dil necə əlavə olunacaq (gələcək fazalarda): lang/ qovluğuna eyni formatda
// (_meta + strings) yeni bir JSON fayl atmaq kifayət edəcək, məs. lang/en.json.
// Dil kodu yalnız təhlükəsiz formatda ola bilər (fayl adı kimi istifadə olunur: lang/<kod>.json).
// Diqqət: bu sabit dilKodu-dan ƏVVƏL elan olunmalıdır (const → təyinatdan əvvəl istifadə edilə bilmir).
const DIL_KOD_REGEX = /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})?$/;
let dilKodu = (function () {
  let k = null;
  try { k = localStorage.getItem('dil'); } catch (e) {}
  return (k && DIL_KOD_REGEX.test(k)) ? k : 'az';
})();
let dilSozlugu = {};
let dilHazirdir = false;

// Tək bir dil faylını çəkib "strings" hissəsini qaytarır. Fayl tapılmasa/pozulmuşsa xəta atır —
// xətanı yuxarı ötürürük ki, dilYukle() defolt (az) dilinə düzgün keçə bilsin.
async function dilFayliYukle(kod) {
  const cavab = await fetch(`lang/${kod}.json`, { cache: 'no-store' });
  if (!cavab.ok) {
    const x = new Error('Dil faylı tapılmadı: ' + kod);
    x.status = cavab.status;
    throw x;
  }
  const data = await cavab.json();
  return (data && data.strings) ? data.strings : {};
}

// İstənilən dili yükləyir; alınmasa avtomatik olaraq az.json-a (defolt) düşür.
// az.json da yüklənə bilməsə (məs. file:// ilə açılıbsa), lüğət boş qalır və
// t() sadəcə açarın özünü qaytarır — tətbiq heç vaxt sınmır.
async function dilYukle(kod) {
  dilHazirdir = false;
  try {
    dilSozlugu = await dilFayliYukle(kod);
    dilKodu = kod;
  } catch (e) {
    console.warn('[i18n] "' + kod + '" dil faylı yüklənmədi, defolt (az) sınanılır:', e);
    if (kod !== 'az' && e && e.status === 404) {
      // Fayl həqiqətən yoxdur (silinib/səhv yazılıb) — hər açılışda 404 almamaq üçün seçimi sıfırla.
      try { localStorage.removeItem('dil'); } catch (e3) {}
    }
    if (kod !== 'az') {
      try {
        dilSozlugu = await dilFayliYukle('az');
        dilKodu = 'az';
      } catch (e2) {
        console.warn('[i18n] az.json da yüklənmədi — tərcümə deaktivdir, sabit mətnlər göstəriləcək.', e2);
        dilSozlugu = {};
      }
    } else {
      dilSozlugu = {};
    }
  }
  dilHazirdir = true;
  return dilSozlugu;
}

// Açar tapılmazsa açarın özü qaytarılır (hələ heç bir HTML/JS mətni bunu çağırmır —
// sonrakı fazalarda mövcud sabit mətnlər tədricən t('...') ilə əvəzlənəcək).
// Boş / yalnız boşluqdan ibarət dəyər "tərcümə edilməyib" sayılır (boş şablon faylı ekranı silməsin).
function dilVar(k) {
  return Object.prototype.hasOwnProperty.call(dilSozlugu, k) &&
    typeof dilSozlugu[k] === 'string' && dilSozlugu[k].trim() !== '';
}
function t(key) {
  return dilVar(key) ? dilSozlugu[key] : key;
}

// Mühərrikin işlədiyini yoxlamaq üçün səssiz sınaq — yalnız konsolda görünür, ekranda YOX.
// tr(açar, defolt): JS-dən qurulan mətnlər üçün. Açar tapılmazsa (və ya lüğət hələ yüklənməyibsə)
// verilən Azərbaycanca defolt qaytarılır — ekranda heç vaxt xam açar görünmür.
// try/catch: bu funksiya lüğət dəyişəni elan olunmazdan əvvəl də (tema ilkin yüklənməsi) çağırıla bilər.
//   Parametrlər: tr('a.b', 'Salam {ad}', { ad: 'Kanan' }) → {ad} yerinə dəyər yazılır (HTML-ə yazılan dəyərləri çağıran escape etməlidir).
function tr(key, defolt, params) {
  let s = defolt;
  try {
    if (dilVar(key)) s = dilSozlugu[key];
  } catch (e) {}
  if (params) s = String(s).replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
  return s;
}

// ---- Tarix/saat formatı (3 dil) ----
// Brauzerin lokal datasına güvənmirik (Android Chrome-da 'az-AZ' çox vaxt yoxdur): format əl ilə qurulur.
// az / ru: 26.09.2026 · en: 26/09/2026. Saat hər dildə 24 saatlıq: 14:05.
function iki(n) { return String(n).padStart(2, '0'); }
function tarixYaz(d) {
  const ayirici = dilKodu === 'en' ? '/' : '.';
  return iki(d.getDate()) + ayirici + iki(d.getMonth() + 1) + ayirici + d.getFullYear();
}
function saatYaz(d) { return iki(d.getHours()) + ':' + iki(d.getMinutes()); }
function tarixSaatYaz(d) { return saatYaz(d) + ' · ' + tarixYaz(d); }

// data-i18n etiketli statik elementlərə tərcümələri tətbiq edir. Açar lüğətdə YOXDURSA elementin
// mövcud (Azərbaycanca) mətninə toxunmur. Yalnız textContent/atribut yazılır — HTML deyil.
//   data-i18n="açar"              → elementin mətni
//   data-i18n-placeholder="açar"  → placeholder
//   data-i18n-title="açar"        → title
//   data-i18n-aria="açar"         → aria-label
function dilTetbiqEt(kok) {
  kok = kok || document;
  const var_ = dilVar;
  kok.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n'); if (var_(k)) el.textContent = dilSozlugu[k];
  });
  [['data-i18n-placeholder', 'placeholder'], ['data-i18n-title', 'title'], ['data-i18n-aria', 'aria-label']].forEach(([a, hedef]) => {
    kok.querySelectorAll('[' + a + ']').forEach(el => {
      const k = el.getAttribute(a); if (var_(k)) el.setAttribute(hedef, dilSozlugu[k]);
    });
  });
}

const dilHazirPromise = dilYukle(dilKodu).then(() => {
  console.log('[i18n] Motor hazırdır. dilKodu=' + dilKodu + ' | test açarı →', t('_i18n_test'));
  document.documentElement.lang = dilKodu;
  dilTetbiqEt();
  // JS ilə qurulan etiketləri yenidən çək (tema / kilid)
  try { temaTetbiqEt(localStorage.getItem('tema') || 'dark'); kilidAyarGoster(); } catch (e) { console.warn('[i18n]', e); }
  try {
    const dzBtn = document.getElementById('duzenlemeBtn');
    if (dzBtn) dzBtn.innerText = duzenlemeRejimi ? tr('ana.hazirdir', 'Hazırdır') : tr('ana.ekraniDuzenle', 'Kateqoriyaları redaktə et');
  } catch (e) {}
  // Təhlükəsizlik şəbəkəsi: lüğət ekran çəkildikdən SONRA gəlibsə, dinamik ekranları yenidən çək.
  // (ekraniGuncelle özü veriYuklendi=false olanda heç nə etmir — erkən çağırmaq təhlükəsizdir.)
  try {
    ekraniGuncelle();
    const hm = document.getElementById('hesablarModal');
    if (hm && hm.classList.contains('active') && typeof hesablarGoster === 'function') hesablarGoster();
  } catch (e) { console.warn('[i18n] yenidən çəkmə:', e); }
});

// ---- Dil seçimi ekranı ----
// Dil kodları lang/index.json-dan oxunur (GitHub API-yə avtomatik sorğu YOXDUR).
// Yeni dil: lang/tr.json yüklə + lang/index.json-a kodu yaz, məs. ["az","en","tr"].
const DIL_ETIBARLI_ILK = { kod: 'az', ad: 'Azərbaycan dili', bayraq: '🇦🇿' };

function dilKodSuz(arr) {
  return (Array.isArray(arr) ? arr : []).filter(k => typeof k === 'string' && DIL_KOD_REGEX.test(k));
}

// lang/index.json: ["az","en"]  və ya  { "languages": ["az","en"] }
async function dilKodlariIndexdenOxu() {
  try {
    const r = await fetch('lang/index.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    return dilKodSuz(Array.isArray(d) ? d : (d && d.languages));
  } catch (e) {
    console.warn('[i18n] lang/index.json oxunmadı:', e);
    return [];
  }
}

// index.json oxunmasa: əl ilə saxlanılan lang/languages.json (oflayn keş).
async function dilEhtiyatSiyahisiOxu() {
  try {
    const r = await fetch('lang/languages.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const arr = await r.json();
    if (!Array.isArray(arr)) return [];
    return arr.filter(x => x && typeof x.kod === 'string' && DIL_KOD_REGEX.test(x.kod))
      .map(x => ({ kod: x.kod, ad: String(x.ad || x.kod), bayraq: String(x.bayraq || '🏳️') }));
  } catch (e) {
    console.warn('[i18n] lang/languages.json (ehtiyat siyahı) oxunmadı:', e);
    return [DIL_ETIBARLI_ILK]; // fayl belə əlçatan deyilsə, ən azı 'az' həmişə işləsin
  }
}

async function dilSiyahisiYukle() {
  let kesh = [];
  try { kesh = JSON.parse(localStorage.getItem('dil_siyahi_kesh') || '[]'); } catch (e) { kesh = []; }
  if (!Array.isArray(kesh)) kesh = [];

  const idx = await dilKodlariIndexdenOxu();
  const keshKodlari = dilKodSuz(kesh.map(x => x && x.kod));

  let ehtiyat = [];
  if (!idx.length && !keshKodlari.length) {
    ehtiyat = await dilEhtiyatSiyahisiOxu();
  }
  const ehtiyatKodlari = dilKodSuz(ehtiyat.map(x => x.kod));
  let kodlar = Array.from(new Set(['az'].concat(idx, keshKodlari, ehtiyatKodlari)));

  const neticeler = await Promise.all(kodlar.map(async (kod) => {
    try {
      const r = await fetch('lang/' + kod + '.json', { cache: 'no-store' });
      if (r.status === 404) return null; // fayl yoxdur → siyahıya salma (keşdə qalsa belə)
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d = await r.json();
      if (!d || typeof d.strings !== 'object' || d.strings === null) return null; // pozulmuş dil faylı
      const meta = d._meta || {};
      return { kod: kod, ad: String(meta.name || kod), bayraq: String(meta.flag || '🏳️') };
    } catch (e) {
      // Şəbəkə xətası / oflayn: əvvəl uğurla oxunmuş bayraq+ad (keş) və ya ehtiyat siyahı,
      // heç biri yoxdursa (yalnız 'az' üçün) sabit dəyər istifadə olunur.
      const k = kesh.find(x => x && x.kod === kod) || ehtiyat.find(x => x && x.kod === kod);
      if (k) return k;
      return kod === 'az' ? DIL_ETIBARLI_ILK : null;
    }
  }));
  const siyahi = neticeler.filter(Boolean).sort((a, b) =>
    (a.kod === 'az' ? -1 : b.kod === 'az' ? 1 : a.ad.localeCompare(b.ad)));
  if (siyahi.length) { try { localStorage.setItem('dil_siyahi_kesh', JSON.stringify(siyahi)); } catch (e) {} }
  return siyahi;
}

async function dilPaneliniAc() {
  modalKapat('ayarlarModal');
  modalAc('dilModal');
  const kutu = document.getElementById('dilSiyahisi');
  const xeta = document.getElementById('dilXeta');
  xeta.innerText = '';
  kutu.innerHTML = '<div class="hint">' + escapeHtml(tr('umumi.yuklenir', 'Yüklənir...')) + '</div>';
  let siyahi = [];
  try { siyahi = await dilSiyahisiYukle(); } catch (e) { console.warn('[i18n]', e); }
  if (!siyahi.length) siyahi = [DIL_ETIBARLI_ILK];
  kutu.innerHTML = siyahi.map(d => {
    const aktiv = d.kod === dilKodu;
    return '<button class="ayarlar-kutu ayarlar-setir-ic" data-kod="' + escapeHtml(d.kod) + '"' +
      (aktiv ? ' style="border-color:var(--brand-ink);"' : '') + '>' +
      '<span style="display:flex; align-items:center;"><span class="ayarlar-ikon" style="font-size:20px;">' + escapeHtml(d.bayraq) +
      '</span><span class="ayarlar-metin">' + escapeHtml(d.ad) + '</span></span>' +
      '<span style="color:var(--brand-ink); display:flex;">' + (aktiv ? ikon('tesdiq', 18) : '') + '</span></button>';
  }).join('');
  kutu.querySelectorAll('button[data-kod]').forEach(b => b.addEventListener('click', () => dilSec(b.dataset.kod)));
}
function dilPaneliniKapat() {
  modalKapat('dilModal');
  ayarlarPaneliniAc();
}
// Seçimi yaz və səhifəni yenidən yüklə (4000 sətirlik dinamik ekranı canlı çəkməkdən daha təhlükəsizdir).
function dilSec(kod) {
  if (!DIL_KOD_REGEX.test(kod)) return;
  if (kod === dilKodu) { dilPaneliniKapat(); return; }
  try { localStorage.setItem('dil', kod); } catch (e) {
    document.getElementById('dilXeta').innerText = tr('dil.saxlanmadi', 'Seçimi yadda saxlamaq alınmadı.');
    return;
  }
  location.reload();
}
// ==================== /Dil (i18n) ====================

