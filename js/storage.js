/* Safe Money — vəziyyət, yükləmə, yadda saxlama */
const APP_VERSION = '3.10'; // hər yeni göndərilən html versiyasında əl ilə +1 artırılır
let aktifDonem = 'gunluk';
let goruntulenenTarix = new Date(); goruntulenenTarix.setHours(0, 0, 0, 0);
let kategoriler = [];
let giderler = [];
// Qeydiyyatda yazılan ad/soyad — 'syncs/{uid}' sənədinin bir hissəsi kimi saxlanır.
let istifadeciProfili = { ad: '', soyad: '' };
let anaHesap = null; // borc (kredit kartı balansı, mənfi ədəd kimi saxlanılır)
let kreditLimit = null; // kredit kartının limiti
let krediBorcu = null; // taksitli kredit (ayrıca bölmə) — istifadəçi "Düzəlt" ilə özü təyin edir
let nagdBakiye = 0; // Cash Hesab
let debitBakiye = 0; // Debit bank Hesabım
let depozitBakiye = 0; // Bank Deposit Hesabım
let hesabTransferleri = []; // hesablar arası transfer tarixçəsi
let gunlukLimit = null; // gündəlik xərc limiti — istifadəçi "Ayarlar" bölməsindən özü təyin edir, invented default yoxdur
let hesabEklenib = { nagd: false, debit: false, depozit: false }; // hansı hesablar "+" ilə əlavə edilib
let veriYuklendi = false;
// TƏHLÜKƏSİZLİK QIFILI: true YALNIZ bulud vəziyyəti QƏTİ şəkildə təsdiqlənəndə olur —
// ya həqiqi data uğurla oxunub, ya da sənədin HƏQİQƏTƏN boş (yeni key) olduğu təsdiqlənib,
// ya da ümumiyyətlə heç bir Sync Key yoxdur (təklikdə iş rejimi). Bağlantı xətası/vaxt
// aşımı zamanı FALSE olaraq qalır ki, ekranda görünən (yalançı) boş vəziyyət səhvən
// Firestore-a yazılıb əsl buludda olan datanı silməsin. veriKaydet() bu bayrağı yoxlayır.
let veriMenbeGuvenli = false;
let aylikGunlukChart = null; // Chart.js: aylıq hesabat — günlük xərclər dairəsi
let aylikSabitChart = null; // Chart.js: aylıq hesabat — aylıq sabit xərclər dairəsi
let aylikTrendChart = null; // Chart.js: günlük xərc trendi (xətt)
let dashUmumiBorcChart = null; // Chart.js: dashboard — ümumi borc dairəvi diaqramı
let dashKrediKartChart = null; // Chart.js: dashboard — kredit kartı limiti dairəvi diaqramı
let dashKrediBorcuChart = null; // Chart.js: dashboard — kredit borcu (taksit) dairəvi diaqramı

function cssVar(ad) {
  return getComputedStyle(document.documentElement).getPropertyValue(ad).trim();
}
// 20 rəng: ilk 8-i köhnə palitradır (mövcud kateqoriyaların rəngi seçili qalsın deyə eyni saxlanılıb).
// Premium tema palitrası: doyğunluğu azaldılmış, bir-biri ilə uyğun 20 ton (qrafit + gümüşü fonda sakit görünür).
// Mövcud kateqoriyaların rəngi dəyişmir — bu siyahı yalnız yeni kateqoriya və rəng seçimi üçündür.
const renkPaleti = [
  '#8fa3b8','#b89a7a','#7fa08f','#a58aa8','#b88482','#7d93b0','#a3a77f','#b08d9b',
  '#6f9a9a','#c2a36b','#9c8fbf','#8aa6c9','#a9b4bf','#7c8a99','#c4a9a0','#94b0a0',
  '#b5b09a','#9aa0ad','#d0c3a4','#8c9c86'
];

// Kateqoriya "aylıq sabit xərc"dirsə true (tik aktivdir); tiksiz / tapılmayan kateqoriya = günlük xərc.
function kategoriAylikdirmi(ad) {
  const k = kategoriler.find(x => x.ad === ad);
  return !!(k && k.aylik);
}

const varsayilanKategoriler = [
  { ad: 'Bus', sabitTutar: null, renk: '#8fa3b8', ikon: '🚌' },
  { ad: 'Metro', sabitTutar: null, renk: '#7d93b0', ikon: '🚇' },
  { ad: 'Coffee', sabitTutar: null, renk: '#b89a7a', ikon: '☕️' },
  { ad: 'Sigaret', sabitTutar: null, renk: '#9aa0ad', ikon: '🚬' },
  { ad: 'Market', sabitTutar: null, renk: '#7fa08f', ikon: '🛒' },
  { ad: 'Breakfast', sabitTutar: null, renk: '#c2a36b', ikon: '🥐' },
  { ad: 'Dinner', sabitTutar: null, renk: '#b88482', ikon: '🍔' },
  { ad: 'Lunch', sabitTutar: null, renk: '#a58aa8', ikon: '🍽️' }
];

const varsayilanGiderler = [];

function idUret() {
  return 'ay_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

// Aylıq xərclər bölməsi ləğv olunub. Köhnə backuplarda kredit borcu bəzən həmin
// siyahının içində saxlanılırdı — mövcud krediBorcu yoxdursa, oradan çıxarırıq.
function krediBorcuKohnaBackupdanCixar(eskiAylikXerclar) {
  if (!Array.isArray(eskiAylikXerclar)) return null;
  const KREDI_BORCU_ID = 'kredi_borcu_2026_09';
  const eski = eskiAylikXerclar.find(x => x.id === KREDI_BORCU_ID);
  if (!eski) return null;
  return {
    id: KREDI_BORCU_ID, ad: 'Kredi Borcu', aylikMebleg: (typeof eski.tutar === 'number') ? eski.tutar : 0,
    baslangic: eski.baslangic || null, bitis: eski.bitis || null, taksitSayi: eski.taksitSayi || 0,
    odenmisTaksitSayi: eski.odenmisTaksitSayi || 0
  };
}

// Firebase-dən oxuna bilmədikdə (key yoxdursa, ya da bağlantı alınmadısa) tətbiq
// ARTIQ heç bir yerli keşə müraciət ETMİR — sadəcə boş/defolt vəziyyətlə açılır.
// Bu, "yalnız Firebase-dən qidalanma" tələbinin dəqiq icrasıdır: köhnə, sinxron
// olmamış yerli məlumat heç vaxt ekrana çıxıb çaşdırmayacaq.
function yerliVeriniYukle() {
  // Yeni hesab üçün defolt kateqoriyalar istifadəçinin seçdiyi dildə yaradılır (mövcud hesablara toxunulmur).
  kategoriler = varsayilanKategoriler.map(k => ({ ...k, ad: tr('defKat.' + k.ad.toLowerCase(), k.ad) }));
  giderler = varsayilanGiderler.map(g => ({ ...g }));
  anaHesap = null;
  kreditLimit = null;
  krediBorcu = null;
  nagdBakiye = 0;
  debitBakiye = 0;
  depozitBakiye = 0;
  hesabTransferleri = [];
  gunlukLimit = null;
  hesabEklenib = { nagd: false, debit: false, depozit: false };
  sonDeyisiklikVaxti = null;
}

// Vaxt aşımı ilə bir promise-i "yarışdırır" — Firebase həddindən artıq uzun
// çəkərsə (məs. şəbəkə problemi), tətbiq əbədi "Yüklənir..." ekranında qalmasın.
function vaxtAsimiIle(promise, ms) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(false), ms))
  ]);
}

// ==== Məlumat mənbəyi: Firebase (Firestore) ====
// TƏHLÜKƏSİZLİK QAYDASI: tətbiq HEÇ VAXT özbaşına yeni Sync Key yaratmır və
// Firestore-a yazmır. Yalnız bu CİHAZDA daha əvvəl əl ilə yaradılmış/daxil
// edilmiş bir Sync Key varsa (localStorage-da saxlanılıb) həmin key ilə
// Firebase-dən oxumağa çalışır. Yəni linki başqası açsa, ona heç bir key
// verilmir və sənin datana avtomatik toxunulmur — sadəcə boş/yerli vəziyyət
// görünür. Sync yalnız "Yeni Sync Key yarat" və ya "Var olan Key-i gir"
// düymələrinə əl ilə basdıqda başlayır.
async function veriYukle() {
  let firebaseDenGeldi = false;
  let senedTesdiqlenmisBosdur = false; // Firebase-ə çatdıq VƏ sənəd HƏQİQƏTƏN boşdur
  try {
    const hazir = await vaxtAsimiIle(firebaseBaslat(), 15000);
    if (hazir && firestoreDb && senkronKey) {
      const snap = await firestoreDb.collection('syncs').doc(senkronKey).get();
      if (snap.exists && snap.data() && snap.data().data) {
        driveVerisiniTetbiqEt(snap.data().data);
        bazaRev = Number(snap.data().rev) || 0;
        firebaseDenGeldi = true;
      } else {
        senedTesdiqlenmisBosdur = true;
      }
    }
  } catch (e) {
    console.warn('Firebase-dən oxuma xətası:', e);
  }

  if (!firebaseDenGeldi) {
    yerliVeriniYukle();
    // TƏHLÜKƏSİZLİK: boş vəziyyəti buluda YALNIZ o halda yazırıq ki, Firebase-ə
    // çatıb sənədin HƏQİQƏTƏN boş (yeni key) olduğunu təsdiqləmiş olaq. Əks halda
    // (bağlantı xətası/vaxt aşımı) heç nə yazmırıq — real buludda olan datanı
    // təsadüfən boşla əvəz etməmək üçün.
    if (senedTesdiqlenmisBosdur) { bazaRev = 0; veriMenbeGuvenli = true; firebaseYazEt(); }
    else if (senkronKey) { firebasePanelGuncelle(tr('sinx.qosulmadi', 'Buluda qoşulmaq alınmadı — yenidən cəhd et.'), true); veriMenbeGuvenli = false; }
    else { veriMenbeGuvenli = true; } // Sync Key ümumiyyətlə yoxdur — təklikdə rejim qəsdən icazəlidir
  } else {
    veriMenbeGuvenli = true;
  }

  // Qeydiyyat zamanı email təsdiqindən əvvəl yerli saxlanmış ad/soyad
  // varsa, indi (təsdiqlənmiş, buluda yazmaq təhlükəsiz olan anda) tətbiq et.
  if (veriMenbeGuvenli && cariGoogleIstifadeci && cariGoogleIstifadeci.email && !istifadeciProfili.ad) {
    const gozleyen = gozleyenProfilOxu(cariGoogleIstifadeci.email);
    if (gozleyen) {
      istifadeciProfili = gozleyen;
      gozleyenProfilSil(cariGoogleIstifadeci.email);
      firebaseYazEt();
    }
  }

  yazilmisSurum = yerliSurum;
  veriYuklendi = true;
  appIskeletiOlustur();
  ekraniGuncelle();
  driveMenyuGuncelle();
  firebasePanelGuncelle();
  if (firebaseHazir && senkronKey) {
    firebaseDinlemeyeBasla();
  }
}

async function veriKaydet() {
  try {
    sonDeyisiklikVaxti = new Date().toISOString();
    // TƏHLÜKƏSİZLİK QIFILI: bulud vəziyyəti hələ təsdiqlənməyibsə (bağlantı
    // gözlənilir/uğursuzdur), Firestore-a HEÇ NƏ yazma — əks halda ekranda
    // görünən müvəqqəti boş vəziyyət əsl buludda olan datanın üzərinə yazılıb
    // onu silə bilər. İstifadəçiyə də xəbər ver ki, dəyişiklik itməsin.
    if (senkronKey && !veriMenbeGuvenli) {
      console.warn('Yadda saxlama bloklandı: bulud mənbəyi hələ təsdiqlənməyib (bağlantı gözlənilir).');
      firebasePanelGuncelle(tr('sinx.tesdiqlenmeyibPanel', 'Bulud hələ hazır deyil — dəyişiklik göndərilmədi. Bağlantını yoxla.'), true);
      toastGoster(tr('sinx.tesdiqlenmeyibToast', 'Bulud hələ hazır deyil — dəyişiklik göndərilmədi. İnterneti yoxla və səhifəni yenilə.'), 'blok');
      return;
    }
    // QƏSDƏN localStorage-a YAZILMIR — məlumatın YEGANƏ mənbəyi Firestore-dur.
    yerliSurum++;
    firebaseYazPlanla();
  } catch (e) {
    console.error('Yadda saxlama xətası:', e);
  }
}
