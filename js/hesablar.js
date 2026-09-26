/* Safe Money — hesablar (v3.14)
   Bir neçə hesab: ad, bank, kartın son 4 rəqəmi, növ, balans, limit (kredit kartı), mənfi balans icazəsi,
   ⭐ əsas hesab (bütün xərclər yalnız bundan çıxılır), "Hesabatda göstər" tiki.
   Kredit xətti: başlanğıc tarixi, taksit sayı, ödənilmiş taksit sayı, aylıq ödəniş, əlavə ödəniş.

   Data: buludda `hesablar` massivi (schema 2). Köhnə sahələr (anaHesap, kreditLimit, nagdBakiye, ... krediBorcu)
   hər yazmada GÜZGÜ kimi də yazılır ki, hələ yenilənməmiş köhnə cihaz datanı boş görüb üstünə yazmasın. */

let hesablar = [];
const HESAB_TIPLERI = ['nagd', 'debit', 'kredit', 'depozit', 'krediXett'];

function hesabIdUret() { return 'h_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
function hesabTap(id) { return hesablar.find(h => h.id === id) || null; }
function anaHesabTap() { return hesablar.find(h => h.ana && h.tip !== 'krediXett') || null; }
function hesabNovAdi(tip) {
  if (tip === 'nagd') return tr('hesabAd.nagd', 'Nağd pul');
  if (tip === 'debit') return tr('hesabAd.debit', 'Debet kartı');
  if (tip === 'depozit') return tr('hesabAd.depozit', 'Depozit');
  if (tip === 'kredit') return tr('hesabAd.kredit', 'Kredit kartı');
  if (tip === 'krediXett') return tr('hesabAd.krediXett', 'Kredit xətti');
  return tip;
}
function hesabGorunenAd(h) { return h ? (h.ad || hesabNovAdi(h.tip)) : tr('hesab.silinib', 'Silinmiş hesab'); }
function hesabAltYazi(h) {
  const parca = [];
  if (h.bank) parca.push(h.bank);
  if (h.kartSon4) parca.push('•••• ' + h.kartSon4);
  if (!parca.length) parca.push(hesabNovAdi(h.tip));
  return parca.join(' · ');
}

// Ay sonunu aşmayan ay əlavəsi: 31.01 + 1 ay = 28/29.02 (əvvəl 03.03 olurdu).
function tarixAyEkle(iso, ayFarki) {
  const [y, m, d] = iso.split('-').map(Number);
  const hedefAy = new Date(Date.UTC(y, (m - 1) + ayFarki, 1));
  const aySonGun = new Date(Date.UTC(hedefAy.getUTCFullYear(), hedefAy.getUTCMonth() + 1, 0)).getUTCDate();
  const gun = Math.min(d, aySonGun);
  return hedefAy.getUTCFullYear() + '-' + String(hedefAy.getUTCMonth() + 1).padStart(2, '0') + '-' + String(gun).padStart(2, '0');
}
function tarixFormat(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return dilKodu === 'en' ? (d + '/' + m + '/' + y) : (d + '.' + m + '.' + y);
}

function krediQalan(h) {
  if (!h || h.tip !== 'krediXett') return 0;
  const xam = (h.taksitSayi - h.odenmisTaksitSayi) * h.aylikMebleg;
  return Math.max(0, pulYuvarla(xam - (h.elaveOdenis || 0)));
}
function hesabBalansi(h) { return h.tip === 'krediXett' ? -krediQalan(h) : h.balans; }
// Bu hesabdan nə qədər çıxmaq olar (kredit kartı: limit + balans; mənfiyə icazə: limitsiz)
function hesabIstifadeEdileBiler(h) {
  if (h.tip === 'kredit') return (typeof h.limit === 'number' && h.limit > 0) ? pulYuvarla(h.limit + h.balans) : Infinity;
  if (h.tip === 'krediXett') return 0;
  if (h.menfiOlar) return Infinity;
  return h.balans;
}
function hesabdanCixmaOlar(h, tutar) {
  const ieb = hesabIstifadeEdileBiler(h);
  return ieb === Infinity || pulYuvarla(tutar) <= pulYuvarla(ieb);
}
function kifayetYoxdurMetni(h) {
  return h.tip === 'kredit'
    ? tr('transfer.limitYoxdur', 'Kredit kartında kifayət qədər limit yoxdur.')
    : tr('transfer.balansYoxdur', '{ad} hesabında kifayət qədər vəsait yoxdur.', { ad: hesabGorunenAd(h) });
}

// ---- Normallaşdırma və köhnə datadan köçürmə ----
function hesabNormallasdir(x) {
  const tip = HESAB_TIPLERI.indexOf(x && x.tip) !== -1 ? x.tip : 'nagd';
  const eded = (v, d) => (typeof v === 'number' && isFinite(v)) ? v : d;
  const h = {
    id: (x && typeof x.id === 'string' && x.id) ? x.id : hesabIdUret(),
    tip,
    ad: (x && typeof x.ad === 'string') ? x.ad.trim().slice(0, 40) : '',
    bank: (x && typeof x.bank === 'string') ? x.bank.trim().slice(0, 40) : '',
    kartSon4: (x && /^\d{4}$/.test(x.kartSon4 || '')) ? x.kartSon4 : '',
    balans: pulYuvarla(eded(x && x.balans, 0)),
    menfiOlar: tip === 'kredit' || tip === 'depozit' ? (x && typeof x.menfiOlar === 'boolean' ? x.menfiOlar : true) : !!(x && x.menfiOlar),
    ana: !!(x && x.ana) && tip !== 'krediXett',
    hesabatda: !(x && x.hesabatda === false)
  };
  if (tip === 'kredit') h.limit = eded(x && x.limit, null);
  if (tip === 'krediXett') {
    h.aylikMebleg = eded(x && x.aylikMebleg, 0);
    h.taksitSayi = Math.max(0, Math.round(eded(x && x.taksitSayi, 0)));
    h.odenmisTaksitSayi = Math.min(h.taksitSayi, Math.max(0, Math.round(eded(x && x.odenmisTaksitSayi, 0))));
    h.baslangic = (x && x.baslangic) || '';
    h.bitis = h.baslangic && h.taksitSayi ? tarixAyEkle(h.baslangic, h.taksitSayi - 1) : ((x && x.bitis) || '');
    h.elaveOdenis = pulYuvarla(eded(x && x.elaveOdenis, 0));
    h.balans = 0;
  }
  return h;
}

// parsed: buluddan gələn sənədin data hissəsi. Qaytarır: { hesablar, transferler, giderler }
function hesabDatasiniHazirla(parsed) {
  let list = [];
  const tipdenId = {};
  if (Array.isArray(parsed.hesablar)) {
    list = parsed.hesablar.map(hesabNormallasdir);
  } else {
    // Köhnə model (v3.13 və əvvəl): hər növdən bir hesab
    const yarat = (tip, sahe) => { const h = hesabNormallasdir(Object.assign({ tip, ad: '' }, sahe)); list.push(h); tipdenId[tip] = h.id; return h; };
    const he = parsed.hesabEklenib || {};
    if (he.nagd) yarat('nagd', { balans: parsed.nagdBakiye, menfiOlar: false });
    if (he.debit) yarat('debit', { balans: parsed.debitBakiye, menfiOlar: false });
    if (he.depozit) yarat('depozit', { balans: parsed.depozitBakiye, menfiOlar: true });
    const kartVar = typeof parsed.kreditLimit === 'number' || (typeof parsed.anaHesap === 'number' && parsed.anaHesap !== 0);
    if (kartVar) yarat('kredit', { balans: typeof parsed.anaHesap === 'number' ? parsed.anaHesap : 0, limit: parsed.kreditLimit, ana: true });
    const kb = parsed.krediBorcu || (typeof krediBorcuKohnaBackupdanCixar === 'function' ? krediBorcuKohnaBackupdanCixar(parsed.aylikXerclar) : null);
    if (kb) yarat('krediXett', Object.assign({}, kb, { ad: '' })); // köhnə daxili ad ('Kredi Borcu') göstərilməsin
  }
  // Ən çox bir ⭐
  let ulduzTapildi = false;
  list.forEach(h => { if (h.ana) { if (ulduzTapildi) h.ana = false; ulduzTapildi = true; } });

  const transferler = (Array.isArray(parsed.hesabTransferleri) ? parsed.hesabTransferleri : []).filter(t => t && typeof t.tutar === 'number').map(t => {
    let x = t;
    // köhnə köçürmələrdə yalnız mətn tarix var ("14:05 · 26.09.2026" və ya "14:05 · 26/09/2026") → tamTarix bərpa et
    if (!x.tamTarix && typeof x.tarix === 'string') {
      const m = x.tarix.match(/(\d{1,2}):(\d{2}).*?(\d{1,2})[./](\d{1,2})[./](\d{4})/);
      if (m) x = Object.assign({}, x, { tamTarix: new Date(+m[5], +m[4] - 1, +m[3], +m[1], +m[2]).toISOString() });
    }
    if (x.menbeId || x.hedefId) return x;
    // köhnə format: növ adları → id
    return Object.assign({}, x, { menbeId: tipdenId[x.menbeTip] || null, hedefId: tipdenId[x.hedefTip] || null });
  });

  let xercler = Array.isArray(parsed.giderler) ? parsed.giderler : [];
  if (!Array.isArray(parsed.hesablar) && tipdenId.kredit) {
    // köhnə modeldə xərclər kredit kartından çıxılırdı → silinəndə/dəyişəndə düzgün hesaba qayıtsın
    xercler = xercler.map(g => (g && !g.aylikRef && !g.hesabId) ? Object.assign({}, g, { hesabId: tipdenId.kredit }) : g);
  }
  return { hesablar: list, transferler, giderler: xercler };
}

// Köhnə cihazlar üçün güzgü sahələr (hər növün ilk hesabı)
function hesablarGuzgusu() {
  const ilk = (tip) => hesablar.find(h => h.tip === tip) || null;
  const n = ilk('nagd'), d = ilk('debit'), dp = ilk('depozit'), k = ilk('kredit'), kx = ilk('krediXett');
  return {
    anaHesap: k ? k.balans : null,
    kreditLimit: k && typeof k.limit === 'number' ? k.limit : null,
    nagdBakiye: n ? n.balans : 0,
    debitBakiye: d ? d.balans : 0,
    depozitBakiye: dp ? dp.balans : 0,
    hesabEklenib: { nagd: !!n, debit: !!d, depozit: !!dp },
    krediBorcu: kx ? { id: kx.id, ad: 'Kredi Borcu', aylikMebleg: kx.aylikMebleg, taksitSayi: kx.taksitSayi, odenmisTaksitSayi: kx.odenmisTaksitSayi, baslangic: kx.baslangic, bitis: kx.bitis, elaveOdenis: kx.elaveOdenis } : null
  };
}

// ---- Xərclər ⭐ əsas hesabdan çıxılır ----
// Qaytarır: '' (uğurlu) və ya xəta mətni. Əsas hesab yoxdursa xərc sadəcə yazılır.
function xercHesabdanCix(g, hesabId) {
  const h = hesabId ? (hesabTap(hesabId) || anaHesabTap()) : anaHesabTap();
  if (!h) { delete g.hesabId; return ''; }
  if (!hesabdanCixmaOlar(h, g.tutar)) return kifayetYoxdurMetni(h);
  h.balans = pulYuvarla(h.balans - g.tutar);
  g.hesabId = h.id;
  return '';
}
function xercHesabaQaytar(g) {
  const h = g && g.hesabId ? hesabTap(g.hesabId) : null;
  if (h && h.tip !== 'krediXett' && typeof g.tutar === 'number') h.balans = pulYuvarla(h.balans + g.tutar);
}

// ---- Borclar səhifəsi üçün cəmlər ----
function borcCemleri() {
  let kk = 0, diger = 0, kx = 0, limit = 0, istifade = 0, kartVar = false, odenmis = 0, cemTaksit = 0, xettVar = false;
  hesablar.forEach(h => {
    if (h.tip === 'kredit') {
      kartVar = true;
      if (h.balans < 0) { kk += -h.balans; istifade += -h.balans; }
      if (typeof h.limit === 'number') limit += h.limit;
    } else if (h.tip === 'krediXett') {
      xettVar = true; kx += krediQalan(h); odenmis += h.odenmisTaksitSayi; cemTaksit += h.taksitSayi;
    } else if (h.balans < 0) {
      diger += -h.balans;
    }
  });
  return { kk: pulYuvarla(kk), diger: pulYuvarla(diger), kx: pulYuvarla(kx), limit: pulYuvarla(limit), istifade: pulYuvarla(istifade), kartVar, xettVar, odenmis, cemTaksit };
}

// ==================== Hesablar sekməsi ====================
let hesabAyi = null;        // Date — baxılan ay (1-i)
let hesabFiltrId = '';      // '' = bütün hesablar

function hesablarPaneliniAc() {
  if (!hesabAyi) { const b = new Date(); hesabAyi = new Date(b.getFullYear(), b.getMonth(), 1); }
  hesablarGoster();
  modalAc('hesablarModal');
}
function hesablarPaneliniKapat() {
  modalKapat('hesablarModal');
  navAktifGuncelle('ana');
  ekraniGuncelle();
}

function hesabKartHtml(h, idareRejimi) {
  const bal = hesabBalansi(h);
  const renk = bal < 0 ? 'var(--danger)' : 'var(--ink)';
  let elave = '';
  if (h.tip === 'kredit' && typeof h.limit === 'number') {
    elave = `<div class="hk-alt">${escapeHtml(tr('hesablar.limitVeMuvcud', 'Limit: {limit} AZN · İstifadə edilə bilər: {muvcud} AZN', { limit: h.limit.toFixed(2), muvcud: Math.max(0, h.limit + h.balans).toFixed(2) }))}</div>`;
  } else if (h.tip === 'krediXett') {
    elave = `<div class="hk-alt">${escapeHtml(tr('hesablar.taksitOdenilib', '{odenmis}/{say} taksit ödənilib · Aylıq: {aylik} AZN', { odenmis: h.odenmisTaksitSayi, say: h.taksitSayi, aylik: h.aylikMebleg.toFixed(2) }))} · ${escapeHtml(tarixFormat(h.baslangic))}–${escapeHtml(tarixFormat(h.bitis))}${h.elaveOdenis > 0 ? ' · ' + escapeHtml(tr('hesablar.elaveOdenis', 'əlavə ödəniş: −{mebleg} AZN', { mebleg: h.elaveOdenis.toFixed(2) })) : ''}</div>`;
  }
  const ulduz = h.tip === 'krediXett' ? '' :
    `<button class="ulduz-btn${h.ana ? ' aktiv' : ''}" onclick="event.stopPropagation(); anaHesabSec('${h.id}')" aria-label="${escapeHtml(tr('hesab.anaSec', 'Əsas hesab et'))}" title="${escapeHtml(tr('hesab.anaSec', 'Əsas hesab et'))}">${ikon('ulduz', 20)}</button>`;
  const sag = idareRejimi ? `<span class="hk-ox">${ikon('sag', 18)}</span>` : ulduz;
  const tikla = idareRejimi ? ` onclick="hesabFormAc('${h.id}', 'idare')" role="button" tabindex="0"` : '';
  return `<div class="hesab-kart${idareRejimi ? ' tiklanir' : ''}"${tikla}>
    <div class="hk-bas"><span class="hesab-ikon">${ikon(h.tip)}</span><div class="hk-ad"><b>${escapeHtml(hesabGorunenAd(h))}</b><small>${escapeHtml(hesabAltYazi(h))}${h.ana ? ' · ' + escapeHtml(tr('hesab.anaQisa', 'Əsas')) : ''}</small></div>${sag}</div>
    <div class="hk-bal" style="color:${renk};">${bal.toFixed(2)} AZN</div>${elave}
  </div>`;
}

function hesablarGoster() {
  const kutu = document.getElementById('hesablarKartlari');
  if (!kutu) return;
  kutu.innerHTML = hesablar.length
    ? hesablar.map(h => hesabKartHtml(h, false)).join('')
    : `<p class="empty-note" style="padding:8px 0;">${escapeHtml(tr('hesablar.hecHesabYox', 'Hələ hesab yoxdur. Yuxarıdakı + düyməsi ilə əlavə et.'))}</p>`;
  const kxBtn = document.getElementById('krediOdeBtn');
  if (kxBtn) kxBtn.style.display = hesablar.some(h => h.tip === 'krediXett' && h.odenmisTaksitSayi < h.taksitSayi) ? '' : 'none';
  const trBtn = document.getElementById('transferBtn');
  if (trBtn) trBtn.style.display = hesablar.length >= 2 ? '' : 'none';
  hesabEmeliyyatlariCiz();
}

function anaHesabSec(id) {
  const h = hesabTap(id);
  if (!h || h.tip === 'krediXett') return;
  const yeni = !h.ana;
  hesablar.forEach(x => { x.ana = false; });
  h.ana = yeni; // eyni ulduza təkrar basmaq onu söndürür
  veriKaydet();
  hesablarGoster();
  if (document.getElementById('hesabIdareModal').classList.contains('active')) hesabIdareCiz();
}

// ---- Aylıq əməliyyatlar (köçürmələr + kredit ödənişləri) ----
function ayAdi(d) { return tr('ay.' + (d.getMonth() + 1), String(d.getMonth() + 1)) + ' ' + d.getFullYear(); }
function hesabAyDeyis(delta) {
  const y = new Date(hesabAyi.getFullYear(), hesabAyi.getMonth() + delta, 1);
  const b = new Date(); const buAy = new Date(b.getFullYear(), b.getMonth(), 1);
  if (y > buAy) return;
  hesabAyi = y;
  hesabEmeliyyatlariCiz();
}
function hesabFiltrDeyisdi() {
  const sel = document.getElementById('hesabFiltr');
  hesabFiltrId = sel ? sel.value : '';
  hesabEmeliyyatlariCiz();
}
function hesabEmeliyyatlariCiz() {
  if (!hesabAyi) { const b = new Date(); hesabAyi = new Date(b.getFullYear(), b.getMonth(), 1); }
  const sel = document.getElementById('hesabFiltr');
  if (sel) {
    if (hesabFiltrId && !hesabTap(hesabFiltrId)) hesabFiltrId = '';
    sel.innerHTML = `<option value="">${escapeHtml(tr('hesab.butunHesablar', 'Bütün hesablar'))}</option>` +
      hesablar.map(h => `<option value="${h.id}"${h.id === hesabFiltrId ? ' selected' : ''}>${escapeHtml(hesabGorunenAd(h))}</option>`).join('');
  }
  const ayEl = document.getElementById('hesabAyEtiket');
  if (ayEl) ayEl.innerText = ayAdi(hesabAyi);
  const ireli = document.getElementById('hesabAyIreli');
  if (ireli) { const b = new Date(); ireli.disabled = hesabAyi.getFullYear() === b.getFullYear() && hesabAyi.getMonth() === b.getMonth(); }
  const kutu = document.getElementById('hesabTransferTarixce');
  if (!kutu) return;
  let html = '', say = 0, cem = 0;
  hesabTransferleri.forEach((t, index) => {
    const tt = t.tamTarix ? new Date(t.tamTarix) : null;
    if (!tt || tt.getFullYear() !== hesabAyi.getFullYear() || tt.getMonth() !== hesabAyi.getMonth()) return;
    if (hesabFiltrId && t.menbeId !== hesabFiltrId && t.hedefId !== hesabFiltrId) return;
    say++; cem += t.tutar;
    const etiket = t.taksit ? ' · ' + tr('hesab.krediOdenisi', 'Kredit ödənişi') : '';
    html += `<div class="list-item"><div><span class="cat">${escapeHtml(hesabGorunenAd(hesabTap(t.menbeId)))} → ${escapeHtml(hesabGorunenAd(hesabTap(t.hedefId)))}</span><span class="time">${escapeHtml(tarixSaatYaz(tt))}${escapeHtml(etiket)}</span></div>
      <div class="right"><span class="amt">${t.tutar.toFixed(2)} AZN</span><button class="sira-btn sil" onclick="transferSilOnayla(${index})" aria-label="${escapeHtml(tr('transfer.legvBaslik', 'Köçürməni ləğv et'))}">${ikon('sil', 17)}</button></div></div>`;
  });
  kutu.innerHTML = html || `<p class="empty-note" style="padding:8px 0;">${escapeHtml(tr('hesab.buAyEmeliyyatYox', 'Bu ay əməliyyat yoxdur.'))}</p>`;
  const net = document.getElementById('hesabAyNetice');
  if (net) net.innerText = tr('sonEm.netice', '{say} əməliyyat · {cem} AZN', { say, cem: pulYuvarla(cem).toFixed(2) });
}

function transferSilOnayla(index) {
  const t = hesabTransferleri[index];
  if (!t) return;
  confirmAc(tr('transfer.legvBaslik', 'Köçürməni ləğv et'), tr('transfer.legvSual', '{menbe} → {hedef} ({tutar} AZN) köçürməsi geri qaytarılsın?', { menbe: hesabGorunenAd(hesabTap(t.menbeId)), hedef: hesabGorunenAd(hesabTap(t.hedefId)), tutar: t.tutar.toFixed(2) }), () => {
    const idx = hesabTransferleri.indexOf(t);
    if (idx === -1) { alertAc(tr('umumi.siyahiYenilendiXeta', 'Siyahı bu arada yeniləndi. Yenidən cəhd et.')); hesablarGoster(); return; }
    const m = hesabTap(t.menbeId), h = hesabTap(t.hedefId);
    if (m && m.tip !== 'krediXett') m.balans = pulYuvarla(m.balans + t.tutar);
    if (h) {
      if (h.tip === 'krediXett') {
        if (t.taksit) h.odenmisTaksitSayi = Math.max(0, h.odenmisTaksitSayi - 1);
        else h.elaveOdenis = Math.max(0, pulYuvarla((h.elaveOdenis || 0) - t.tutar));
      } else {
        h.balans = pulYuvarla(h.balans - t.tutar);
      }
    }
    hesabTransferleri.splice(idx, 1);
    veriKaydet();
    hesablarGoster();
    ekraniGuncelle();
  });
}

// ---- Köçürmə ----
function hesabSecimleri(selId, siyahi, secili) {
  const sel = document.getElementById(selId);
  sel.innerHTML = siyahi.map(h => `<option value="${h.id}"${h.id === secili ? ' selected' : ''}>${escapeHtml(hesabGorunenAd(h))} — ${escapeHtml(hesabBalansi(h).toFixed(2))} AZN</option>`).join('');
}
function transferModalAc() {
  const menbeler = hesablar.filter(h => h.tip !== 'krediXett');
  const hedefler = hesablar.filter(h => h.tip !== 'krediXett' || krediQalan(h) > 0);
  const ana = anaHesabTap();
  hesabSecimleri('transferMenbe', menbeler, ana ? ana.id : (menbeler[0] && menbeler[0].id));
  const menbeId = document.getElementById('transferMenbe').value;
  const ferqli = hedefler.filter(h => h.id !== menbeId);
  hesabSecimleri('transferHedef', hedefler, ferqli[0] && ferqli[0].id);
  document.getElementById('transferMebleg').value = '';
  document.getElementById('transferError').innerText = (menbeler.length && ferqli.length) ? '' : tr('transfer.ikiHesabLazim', 'Köçürmə üçün ən azı iki hesab lazımdır.');
  modalAc('transferModal');
}
function transferOnayla() {
  const errEl = document.getElementById('transferError');
  const m = hesabTap(document.getElementById('transferMenbe').value);
  const h = hesabTap(document.getElementById('transferHedef').value);
  const tutar = pulYuvarla(parseFloat((document.getElementById('transferMebleg').value || '').replace(',', '.')));
  if (!m || !h) { errEl.innerText = tr('transfer.hesabElaveEdilmeyib', 'Seçdiyin hesab tapılmadı.'); return; }
  if (m.id === h.id) { errEl.innerText = tr('transfer.eyniHesab', 'Göndərən və alan hesab eyni ola bilməz.'); return; }
  if (!(tutar > 0)) { errEl.innerText = tr('umumi.duzgunMebleg', 'Düzgün məbləğ yaz.'); return; }
  if (!hesabdanCixmaOlar(m, tutar)) { errEl.innerText = kifayetYoxdurMetni(m); return; }
  if (h.tip === 'krediXett' && tutar > krediQalan(h)) {
    errEl.innerText = tr('hesab.qalandanCox', 'Məbləğ qalan borcdan ({qalan} AZN) çox ola bilməz.', { qalan: krediQalan(h).toFixed(2) }); return;
  }
  m.balans = pulYuvarla(m.balans - tutar);
  if (h.tip === 'krediXett') h.elaveOdenis = pulYuvarla((h.elaveOdenis || 0) + tutar);
  else h.balans = pulYuvarla(h.balans + tutar);
  const simdi = new Date();
  hesabTransferleri.unshift({ menbeId: m.id, hedefId: h.id, menbeTip: m.tip, hedefTip: h.tip, tutar, tamTarix: simdi.toISOString(), tarix: tarixSaatYaz(simdi) });
  veriKaydet();
  modalKapat('transferModal');
  hesablarGoster();
  ekraniGuncelle();
}

// ---- Kredit xətti ödənişi (aylıq taksit) ----
function krediOdeModalAc() {
  const xettler = hesablar.filter(h => h.tip === 'krediXett' && h.odenmisTaksitSayi < h.taksitSayi);
  const menbeler = hesablar.filter(h => h.tip !== 'krediXett');
  if (!xettler.length) return;
  hesabSecimleri('krediOdeXett', xettler, xettler[0].id);
  const ana = anaHesabTap();
  hesabSecimleri('krediOdeMenbe', menbeler, ana ? ana.id : (menbeler[0] && menbeler[0].id));
  document.getElementById('krediOdeXettSatir').style.display = xettler.length > 1 ? '' : 'none';
  document.getElementById('krediOdeError').innerText = menbeler.length ? '' : tr('taksitOde.hesabYoxdurXeta', 'Əvvəlcə ödəniş üçün ən azı bir hesab əlavə et (+).');
  krediOdeInfoYaz();
  modalAc('krediOdeModal');
}
function krediOdeInfoYaz() {
  const x = hesabTap(document.getElementById('krediOdeXett').value);
  const el = document.getElementById('krediOdeInfo');
  if (x && el) el.innerText = tr('taksitOde.info', 'Taksit {nomre}/{say} · {mebleg} AZN', { nomre: x.odenmisTaksitSayi + 1, say: x.taksitSayi, mebleg: x.aylikMebleg.toFixed(2) });
}
function krediOdeOnayla() {
  const errEl = document.getElementById('krediOdeError');
  const x = hesabTap(document.getElementById('krediOdeXett').value);
  const m = hesabTap(document.getElementById('krediOdeMenbe').value);
  if (!x || !m) { errEl.innerText = tr('taksitOde.hesabSecXeta', 'Ödəniş üçün hesab seç.'); return; }
  if (x.odenmisTaksitSayi >= x.taksitSayi) { errEl.innerText = tr('taksitOde.hamisiOdenibXeta', 'Bütün taksitlər artıq ödənilib.'); return; }
  const tutar = x.aylikMebleg;
  if (!hesabdanCixmaOlar(m, tutar)) { errEl.innerText = kifayetYoxdurMetni(m); return; }
  m.balans = pulYuvarla(m.balans - tutar);
  x.odenmisTaksitSayi += 1;
  const simdi = new Date();
  hesabTransferleri.unshift({ menbeId: m.id, hedefId: x.id, menbeTip: m.tip, hedefTip: 'krediXett', tutar, taksit: true, tamTarix: simdi.toISOString(), tarix: tarixSaatYaz(simdi) });
  veriKaydet();
  modalKapat('krediOdeModal');
  hesablarGoster();
  ekraniGuncelle();
}

// ==================== Ayarlar → Hesablar (idarə) ====================
function hesabIdareAc() {
  modalKapat('ayarlarModal');
  hesabIdareCiz();
  modalAc('hesabIdareModal');
}
function hesabIdareKapat() { modalKapat('hesabIdareModal'); ayarlarPaneliniAc(); }
function hesabIdareCiz() {
  const kutu = document.getElementById('hesabIdareListe');
  if (!kutu) return;
  kutu.innerHTML = hesablar.length
    ? hesablar.map(h => hesabKartHtml(h, true)).join('')
    : `<p class="empty-note" style="padding:8px 0;">${escapeHtml(tr('hesab.idareBos', 'Hələ hesab yoxdur. "Yeni hesab" düyməsi ilə başla.'))}</p>`;
}

// ---- Hesab formu (tam ekran) ----
let hesabFormId = null;      // null = yeni hesab
let hesabFormQayit = 'idare'; // 'idare' | 'hesablar'
let hesabFormTip = 'debit';

function hesabFormAc(id, qayit) {
  hesabFormId = id || null;
  hesabFormQayit = qayit || 'idare';
  const h = id ? hesabTap(id) : null;
  hesabFormTip = h ? h.tip : 'debit';
  const v = (elId, val) => { const el = document.getElementById(elId); if (el) el.value = (val === null || val === undefined) ? '' : val; };
  document.getElementById('hesabFormBaslik').innerText = h ? tr('hesab.duzelt', 'Hesabı dəyiş') : tr('hesab.yeni', 'Yeni hesab');
  v('hfAd', h ? h.ad : '');
  v('hfBank', h ? h.bank : '');
  v('hfKart', h ? h.kartSon4 : '');
  v('hfBalans', h ? (h.tip === 'kredit' ? Math.abs(Math.min(0, h.balans)) : h.balans) : '');
  v('hfLimit', h && typeof h.limit === 'number' ? h.limit : '');
  v('hfAylik', h && h.tip === 'krediXett' ? h.aylikMebleg : '');
  v('hfSay', h && h.tip === 'krediXett' ? h.taksitSayi : '');
  v('hfOdenmis', h && h.tip === 'krediXett' ? h.odenmisTaksitSayi : '');
  v('hfBaslangic', h && h.tip === 'krediXett' ? h.baslangic : '');
  document.getElementById('hfMenfi').checked = h ? !!h.menfiOlar : false;
  document.getElementById('hfAna').checked = h ? !!h.ana : !anaHesabTap();
  document.getElementById('hfHesabat').checked = h ? h.hesabatda !== false : true;
  document.getElementById('hfSilBtn').style.display = h ? '' : 'none';
  document.getElementById('hesabFormError').innerText = '';
  // Mövcud hesabın növünü dəyişmək olmaz (balans mənası dəyişir) — yalnız yeni hesabda seçilir
  document.getElementById('hfNovSecim').style.display = h ? 'none' : '';
  hesabFormNovSec(hesabFormTip, true);
  if (hesabFormQayit === 'idare') modalKapat('hesabIdareModal'); else modalKapat('hesablarModal');
  modalAc('hesabFormModal');
}
function hesabFormKapat() {
  modalKapat('hesabFormModal');
  if (hesabFormQayit === 'idare') { hesabIdareCiz(); modalAc('hesabIdareModal'); }
  else { hesablarGoster(); modalAc('hesablarModal'); }
}
function hesabFormNovSec(tip, ilk) {
  hesabFormTip = tip;
  document.querySelectorAll('#hfNovSecim [data-tip]').forEach(b => b.classList.toggle('aktiv', b.dataset.tip === tip));
  const goster = (id, sert) => { const el = document.getElementById(id); if (el) el.style.display = sert ? '' : 'none'; };
  const xett = tip === 'krediXett';
  goster('hfBankSatir', tip !== 'nagd');
  goster('hfKartSatir', tip === 'debit' || tip === 'kredit');
  goster('hfBalansSatir', !xett);
  goster('hfLimitSatir', tip === 'kredit');
  goster('hfMenfiSatir', tip === 'nagd' || tip === 'debit' || tip === 'depozit');
  goster('hfAnaSatir', !xett);
  goster('hfXettBlok', xett);
  const lbl = document.getElementById('hfBalansLbl');
  if (lbl) lbl.innerText = tip === 'kredit' ? tr('hesab.cariBorc', 'Cari borc (AZN)') : tr('hesab.balans', 'Balans (AZN)');
  // yeni hesabda növə görə defolt mənfi balans icazəsi (depozit: bəli)
  if (!ilk && !hesabFormId) document.getElementById('hfMenfi').checked = tip === 'depozit';
  const adEl = document.getElementById('hfAd'); if (adEl) adEl.placeholder = hesabNovAdi(tip);
  hesabFormXettHesabla();
}
function hesabFormXettHesabla() {
  const el = document.getElementById('hfXettNetice');
  if (!el || hesabFormTip !== 'krediXett') return;
  const aylik = pulYuvarla(parseFloat((document.getElementById('hfAylik').value || '').replace(',', '.')));
  const say = parseInt(document.getElementById('hfSay').value, 10);
  const odenmis = parseInt(document.getElementById('hfOdenmis').value, 10) || 0;
  const bas = document.getElementById('hfBaslangic').value;
  const h = hesabFormId ? hesabTap(hesabFormId) : null;
  if (!(aylik > 0) || !(say > 0)) { el.innerText = ''; return; }
  const qalan = Math.max(0, pulYuvarla((say - Math.min(odenmis, say)) * aylik - (h && h.tip === 'krediXett' ? (h.elaveOdenis || 0) : 0)));
  el.innerText = tr('hesab.xettNetice', 'Qalan: {qalan} AZN · {qalanTaksit} taksit qalıb · Bitmə: {bitis}', {
    qalan: qalan.toFixed(2), qalanTaksit: Math.max(0, say - odenmis), bitis: bas ? tarixFormat(tarixAyEkle(bas, say - 1)) : '—'
  });
}
function hesabFormSaxla() {
  const err = (m) => { document.getElementById('hesabFormError').innerText = m; };
  const tip = hesabFormTip;
  const ad = document.getElementById('hfAd').value.trim();
  const bank = document.getElementById('hfBank').value.trim();
  const kart = document.getElementById('hfKart').value.trim();
  const eded = (id) => pulYuvarla(parseFloat((document.getElementById(id).value || '').replace(',', '.')));
  if (!ad) return err(tr('hesab.adLazim', 'Hesabın adını yaz.'));
  if (kart && !/^\d{4}$/.test(kart)) return err(tr('hesab.kartXeta', 'Kartın yalnız son 4 rəqəmini yaz.'));
  const h = hesabFormId ? hesabTap(hesabFormId) : hesabNormallasdir({ tip });
  const yeni = !hesabFormId;
  const qeyd = { ad, bank: tip === 'nagd' ? '' : bank, kartSon4: (tip === 'debit' || tip === 'kredit') ? kart : '' };
  if (tip === 'krediXett') {
    const aylik = eded('hfAylik'), say = parseInt(document.getElementById('hfSay').value, 10);
    const odenmis = parseInt(document.getElementById('hfOdenmis').value || '0', 10);
    const bas = document.getElementById('hfBaslangic').value;
    if (!(aylik > 0)) return err(tr('krediBorc.ayliqTaksitXeta', 'Aylıq taksitin məbləğini düzgün yaz.'));
    if (!(say > 0)) return err(tr('krediBorc.taksitSayiXeta', 'Taksit sayını düzgün yaz.'));
    if (isNaN(odenmis) || odenmis < 0 || odenmis > say) return err(tr('hesab.odenmisXeta', 'Ödənilmiş taksit sayı 0 ilə {say} arasında olmalıdır.', { say }));
    if (!bas) return err(tr('krediBorc.baslangicTarixiXeta', 'Başlanğıc tarixini seç.'));
    Object.assign(h, qeyd, { aylikMebleg: aylik, taksitSayi: say, odenmisTaksitSayi: odenmis, baslangic: bas, bitis: tarixAyEkle(bas, say - 1), ana: false });
  } else {
    const balVal = document.getElementById('hfBalans').value;
    let bal = balVal.trim() === '' ? 0 : eded('hfBalans');
    if (isNaN(bal)) return err(tr('umumi.duzgunReqem', 'Düzgün rəqəm yaz.'));
    const menfi = document.getElementById('hfMenfi').checked;
    if (tip === 'kredit') {
      const limVal = document.getElementById('hfLimit').value;
      const lim = limVal.trim() === '' ? null : eded('hfLimit');
      if (lim !== null && (isNaN(lim) || lim < 0)) return err(tr('hesabDuzelt.limitReqemXeta', 'Limit düzgün rəqəm olmalıdır.'));
      bal = -Math.abs(bal); // kredit kartı: borc mənfi saxlanılır
      Object.assign(h, qeyd, { balans: bal, limit: lim, menfiOlar: true });
    } else {
      if (bal < 0 && !menfi) return err(tr('hesab.menfiIcazeYox', 'Mənfi balans üçün "Mənfi balansa icazə ver" tikini aktiv et.'));
      Object.assign(h, qeyd, { balans: bal, menfiOlar: menfi });
    }
    const ana = document.getElementById('hfAna').checked;
    if (ana) hesablar.forEach(x => { x.ana = false; });
    h.ana = ana;
  }
  h.hesabatda = document.getElementById('hfHesabat').checked;
  if (yeni) hesablar.push(h);
  veriKaydet();
  hesabFormKapat();
  ekraniGuncelle();
}
function hesabFormSil() {
  const h = hesabFormId ? hesabTap(hesabFormId) : null;
  if (!h) return;
  confirmAc(tr('hesab.silBaslik', 'Hesabı sil'), tr('hesab.silSual', '"{ad}" hesabı silinsin? Keçmiş xərclər və köçürmələr tarixçədə qalacaq.', { ad: hesabGorunenAd(h) }), () => {
    hesablar = hesablar.filter(x => x.id !== h.id);
    veriKaydet();
    hesabFormKapat();
    ekraniGuncelle();
  });
}

// ==================== Hesabat səhifəsi: hesablar bölməsi ====================
function hesabatHesablarCiz() {
  const kutu = document.getElementById('aylikHesablar');
  const bas = document.getElementById('aylikHesablarBaslik');
  if (!kutu) return;
  const goster = hesablar.filter(h => h.hesabatda !== false);
  if (bas) bas.style.display = goster.length ? '' : 'none';
  const indi = new Date(), il = indi.getFullYear(), ay = indi.getMonth();
  const buAydadir = (iso) => { if (!iso) return false; const d = new Date(iso); return d.getFullYear() === il && d.getMonth() === ay; };
  kutu.innerHTML = goster.map(h => {
    const xerc = giderler.filter(g => !g.aylikRef && g.hesabId === h.id && buAydadir(g.tamTarix)).reduce((a, g) => a + g.tutar, 0);
    const girdi = hesabTransferleri.filter(t => t.hedefId === h.id && buAydadir(t.tamTarix)).reduce((a, t) => a + t.tutar, 0);
    const cixdi = hesabTransferleri.filter(t => t.menbeId === h.id && buAydadir(t.tamTarix)).reduce((a, t) => a + t.tutar, 0);
    const bal = hesabBalansi(h);
    return `<div class="hesabat-hesab"><div class="hh-bas"><span class="hesab-ikon">${ikon(h.tip, 18)}</span><b>${escapeHtml(hesabGorunenAd(h))}</b><span class="hh-bal" style="color:${bal < 0 ? 'var(--danger)' : 'var(--ink)'}">${bal.toFixed(2)} AZN</span></div>
      <div class="hh-set"><span>${escapeHtml(tr('hesab.hsXerc', 'Xərclər'))}<b>${pulYuvarla(xerc).toFixed(2)}</b></span><span>${escapeHtml(tr('hesab.hsGiris', 'Daxil olan'))}<b>+${pulYuvarla(girdi).toFixed(2)}</b></span><span>${escapeHtml(tr('hesab.hsCixis', 'Çıxan'))}<b>−${pulYuvarla(cixdi).toFixed(2)}</b></span></div></div>`;
  }).join('');
}
