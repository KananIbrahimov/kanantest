/* Safe Money — ekranlar, əməliyyatlar, başlanğıc */
function appIskeletiOlustur() {
  const appEl = document.getElementById('app');
  if (!appEl) return;
  appEl.innerHTML = `
    <div class="top" style="justify-content:center; align-items:center; gap:8px;">
      <img src="icon-192.png" alt="Safe Money" style="width:28px; height:28px; border-radius:7px;">
      <h1>Safe Money</h1>
    </div>
    <div class="date-nav">
      <button class="date-nav-arrow" id="tarixGeriBtn" onclick="tarixDeyis(-1)" aria-label="‹">${ikon('sol', 18)}</button>
      <div class="date-nav-label" id="tarixEtiketi">Bugün · 05.09.2026</div>
      <button class="date-nav-arrow" id="tarixIrəliBtn" onclick="tarixDeyis(1)" aria-label="›">${ikon('sag', 18)}</button>
    </div>
    <div class="summary-card">
      <div class="summary-label" id="donemBaslik">Bugünkü ümumi xərc</div>
      <div class="summary-amount" id="toplamTutar">—</div>
      <div class="summary-sub" id="donemAlt"></div>
      <div id="progressCubuk" class="progress-bar-container"></div>
      <div id="breakdown" class="breakdown"></div>
    </div>
    <div class="daily-limit-card" id="gunlukLimitKart">
      <div class="daily-limit-head">
        <span class="lbl" id="gunlukLimitLbl" data-i18n="ana.gunlukLimit">Gündəlik limit</span>
        <span class="pct" id="gunlukLimitYuzde">—</span>
      </div>
      <div class="daily-limit-bar-bg"><div class="daily-limit-bar-fill" id="gunlukLimitBar" style="width:0%"></div></div>
      <div class="daily-limit-foot">
        <span><span data-i18n="ana.xerclenib">Xərclənib:</span> <b id="gunlukLimitXerc">—</b></span>
        <span class="qalan" id="gunlukLimitQalan">—</span>
      </div>
    </div>
    <div class="insight-strip">
      <div class="insight-box">
        <div class="k" data-i18n="ana.gunlukOrtalama">Bu ay gündə orta</div>
        <div class="v" id="insightOrtalama">—</div>
      </div>
      <div class="insight-box">
        <div class="k" data-i18n="ana.enCoxXerc">Ən çox xərc</div>
        <div class="v" id="insightTopKategori">—</div>
      </div>
    </div>
    <div id="butonlarKonteyneri" class="grid-buttons"></div>
    <div class="history-head" style="margin-top:4px;"><span data-i18n="ana.gununXercleri">Günün xərcləri</span></div>
    <ul id="giderListesi" style="list-style:none; padding:0; margin:0 0 14px;"></ul>
    <button class="dashed-btn" id="kateqoriyaEkleBtn" onclick="catPanelYeniAc()" style="display:none;" data-i18n="ana.yeniKateqoriya">Yeni kateqoriya</button>
    <button class="dashed-btn" id="duzenlemeBtn" onclick="duzenlemeRejimiDeyis()" data-i18n="ana.ekraniDuzenle">Kateqoriyaları redaktə et</button>
    <!-- "Keçmiş tarixə xərc əlavə et" düyməsi Ayarlar → Son əməliyyatlar səhifəsinə köçürülüb -->
  `;
  dilTetbiqEt(appEl); // skelet JS ilə qurulur — data-i18n etiketləri burada tətbiq olunur
}

function donemeGoreFiltrele() {
  return giderler.filter(g => {
    if (g.aylikRef) return false; // aylıq xərclər / kredit borcu ödəmələri yalnız kredit kartına yansıyır
    const t = new Date(g.tamTarix);
    return t.toDateString() === goruntulenenTarix.toDateString();
  });
}

// YEREL (cihazın saat qurşağı ilə) YYYY-MM-DD. toISOString() UTC verir — Bakıda 00:00–04:00 arası dünəni göstərirdi.
function yerliTarixStr(d) {
  const p = (n) => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}
// Tətbiq gecə yarısını keçib açıq qalıbsa, "Bugün" avtomatik yenilənsin.
let sonBilinenGun = yerliTarixStr(new Date());
function gunDeyisdiYoxla() {
  const indiGun = yerliTarixStr(new Date());
  if (indiGun === sonBilinenGun) return;
  const bugunGoruntulenirdi = (yerliTarixStr(goruntulenenTarix) === sonBilinenGun);
  sonBilinenGun = indiGun;
  if (bugunGoruntulenirdi) { const b = new Date(); b.setHours(0, 0, 0, 0); goruntulenenTarix = b; }
  ekraniGuncelle();
}
setInterval(gunDeyisdiYoxla, 60000);

function ayGundeOrta(tarix) {
  const il = tarix.getFullYear(), ay = tarix.getMonth(), gunSay = tarix.getDate();
  const sonGun = new Date(il, ay, gunSay, 23, 59, 59, 999).getTime();
  let cem = 0;
  giderler.forEach(g => {
    if (g.aylikRef || !g.tamTarix || kategoriAylikdirmi(g.kategori)) return;
    const t = new Date(g.tamTarix);
    if (t.getFullYear() === il && t.getMonth() === ay && t.getTime() <= sonGun) cem += g.tutar;
  });
  return pulYuvarla(cem / gunSay);
}

function tarixBugunmu(tarix) {
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  return tarix.toDateString() === bugun.toDateString();
}

function tarixDunenmi(tarix) {
  const dunen = new Date(); dunen.setDate(dunen.getDate() - 1); dunen.setHours(0, 0, 0, 0);
  return tarix.toDateString() === dunen.toDateString();
}

function tarixFormatla(tarix) {
  return tarixYaz(tarix);
}

function tarixDeyis(delta) {
  const yeni = new Date(goruntulenenTarix);
  yeni.setDate(yeni.getDate() + delta);
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  if (yeni > bugun) return; // gələcəyə keçmək olmaz
  goruntulenenTarix = yeni;
  ekraniGuncelle();
}

function gunlukLimitGuncelle(bugunkuToplam) {
  const limitTeyinEdilib = (typeof gunlukLimit === 'number' && gunlukLimit > 0);
  const limit = limitTeyinEdilib ? gunlukLimit : 0;
  const yuzde = limitTeyinEdilib ? (bugunkuToplam / limit) * 100 : 0;
  const asilib = limitTeyinEdilib && bugunkuToplam > limit;
  const qalan = limit - bugunkuToplam;

  const lblEl = document.getElementById('gunlukLimitLbl');
  if (lblEl) {
    lblEl.innerText = limitTeyinEdilib
      ? tr('ana.gunlukLimitDeyer', 'Gündəlik limit: {limit} AZN', { limit: limit.toFixed(2) })
      : tr('ana.gunlukLimitTeyinEdilmeyib', 'Gündəlik limit təyin edilməyib');
    lblEl.classList.toggle('over', asilib);
  }

  const pctEl = document.getElementById('gunlukLimitYuzde');
  if (pctEl) {
    pctEl.innerText = limitTeyinEdilib ? (yuzde.toFixed(0) + '%') : '—';
    pctEl.classList.toggle('over', asilib);
  }

  const xercEl = document.getElementById('gunlukLimitXerc');
  if (xercEl) xercEl.innerText = bugunkuToplam.toFixed(2) + ' AZN';

  const barEl = document.getElementById('gunlukLimitBar');
  if (barEl) {
    barEl.style.width = (limitTeyinEdilib ? Math.min(yuzde, 100) : 0) + '%';
    barEl.classList.toggle('over', asilib);
  }

  const qalanEl = document.getElementById('gunlukLimitQalan');
  if (qalanEl) {
    qalanEl.classList.toggle('over', asilib);
    qalanEl.innerText = !limitTeyinEdilib
      ? '—'
      : (asilib
        ? tr('ana.limitAsildi', 'Limit {miqdar} AZN aşılıb', { miqdar: Math.abs(qalan).toFixed(2) })
        : tr('ana.qaliq', 'Qalıq: {miqdar} AZN', { miqdar: qalan.toFixed(2) }));
  }

  const kartEl = document.getElementById('gunlukLimitKart');
  if (kartEl) kartEl.classList.toggle('over', asilib);
}

// ---- "Ekranı düzənlə" rejimi (iPhone-dakı proqram sıralaması kimi) ----
let duzenlemeRejimi = false;
function duzenlemeRejimiDeyis() {
  duzenlemeRejimi = !duzenlemeRejimi;
  ekraniGuncelle();
}

// Bir xərc sətri (ana ekran və Son əməliyyatlar üçün ümumi).
// Tarix həmişə tamTarix-dən, cari dilin formatında göstərilir.
// redakteOlar=false → yalnız baxış: dəyiş / sil düymələri göstərilmir.
function xercSetirHtml(g, index, redakteOlar) {
  const tarixMetni = g.tamTarix ? tarixSaatYaz(new Date(g.tamTarix)) : (g.tarix || '');
  const duymeler = redakteOlar
    ? `<button class="sira-btn" onclick="islemFormModalAc(${index})" title="${escapeHtml(tr('umumi.duzelt', 'Dəyiş'))}" aria-label="${escapeHtml(tr('umumi.duzelt', 'Dəyiş'))}">${ikon('qelem', 17)}</button><button class="sira-btn sil" onclick="giderSilOnayla(${index})" title="${escapeHtml(tr('islemForm.sil', 'Sil'))}" aria-label="${escapeHtml(tr('islemForm.sil', 'Sil'))}">${ikon('sil', 17)}</button>`
    : '';
  return `<li class="list-item${redakteOlar ? '' : ' yalniz-baxis'}"><div><span class="cat">${escapeHtml(g.kategori)}${g.sebeb ? ' — ' + escapeHtml(g.sebeb) : ''}</span><span class="time">${escapeHtml(tarixMetni)}</span></div>
        <div class="right"><span class="amt">${g.tutar.toFixed(2)} AZN</span>${duymeler}</div></li>`;
}

function ekraniGuncelle() {
  if (!veriYuklendi) return;
  const dashboardModalEl = document.getElementById('dashboardModal');
  if (dashboardModalEl && dashboardModalEl.classList.contains('active') && typeof dashboardDairaviDiaqramlariCiz === 'function') {
    dashboardDairaviDiaqramlariCiz();
  }
  const tarixBugun = tarixBugunmu(goruntulenenTarix);
  const tarixEtiketiEl = document.getElementById('tarixEtiketi');
  if (tarixEtiketiEl) {
    const gunEtiketi = tarixBugun ? tr('ana.bugun', 'Bu gün') : (tarixDunenmi(goruntulenenTarix) ? tr('ana.dunen', 'Dünən') : '');
    tarixEtiketiEl.innerText = gunEtiketi + (gunEtiketi ? ' · ' : '') + tarixFormatla(goruntulenenTarix);
  }
  const ireliBtn = document.getElementById('tarixIrəliBtn');
  if (ireliBtn) ireliBtn.disabled = tarixBugun;
  const donemBaslikEl = document.getElementById('donemBaslik');
  if (donemBaslikEl) {
    donemBaslikEl.innerText = tarixBugun
      ? tr('ana.bugunkuUmumiXerc', 'Bugünkü xərclər')
      : (tarixDunenmi(goruntulenenTarix)
        ? tr('ana.dunenkiUmumiXerc', 'Dünənki xərclər')
        : tr('ana.tarixliXerc', '{tarix} — xərclər', { tarix: tarixFormatla(goruntulenenTarix) }));
  }
  const butonlarKonteynerEl = document.getElementById('butonlarKonteyneri');
  if (butonlarKonteynerEl) butonlarKonteynerEl.style.display = tarixBugun ? '' : 'none';

  const filtrelenmis = donemeGoreFiltrele();
  let toplam = 0;
  const katToplam = {};
  kategoriler.forEach(k => katToplam[k.ad] = 0);
  filtrelenmis.forEach(g => {
    toplam += g.tutar;
    katToplam[g.kategori] = (katToplam[g.kategori] || 0) + g.tutar;
  });

  const toplamTutarEl = document.getElementById('toplamTutar');
  if (toplamTutarEl) toplamTutarEl.innerText = toplam.toFixed(2) + ' AZN';
  const donemAltEl = document.getElementById('donemAlt');
  if (donemAltEl) donemAltEl.innerText = tr('ana.emeliyyatSayi', '{say} əməliyyat', { say: filtrelenmis.length });

  const progressEl = document.getElementById('progressCubuk');
  const breakdownEl = document.getElementById('breakdown');
  if (progressEl) progressEl.innerHTML = '';
  if (breakdownEl) breakdownEl.innerHTML = '';

  let topKategoriAd = null, topKategoriTutar = 0;
  if (toplam > 0) {
    kategoriler.forEach(kat => {
      const tutar = katToplam[kat.ad] || 0;
      if (tutar > 0) {
        const yuzde = (tutar / toplam) * 100;
        const parca = document.createElement('div');
        parca.style.background = kat.renk; parca.style.height = '100%'; parca.style.width = yuzde + '%';
        if (progressEl) progressEl.appendChild(parca);
        const row = document.createElement('div');
        row.className = 'breakdown-row';
        row.innerHTML = `<span><span class="dot" style="background:${escapeHtml(kat.renk)}"></span>${escapeHtml(kat.ikon)} ${escapeHtml(kat.ad)}</span><span>${tutar.toFixed(2)} AZN · ${yuzde.toFixed(0)}%</span>`;
        if (breakdownEl) breakdownEl.appendChild(row);
        if (tutar > topKategoriTutar) { topKategoriTutar = tutar; topKategoriAd = kat.ad; }
      }
    });
    // Silinmiş kateqoriyaların xərcləri cəmə daxildir — bölgüdə "Digər" kimi göstər ki, faizlər cəmə uyğun gəlsin.
    const gosterilen = kategoriler.reduce((a, k) => a + (katToplam[k.ad] || 0), 0);
    const digerTutar = toplam - gosterilen;
    if (digerTutar > 0.004) {
      const yuzdeD = (digerTutar / toplam) * 100;
      const parcaD = document.createElement('div');
      parcaD.style.background = cssVar('--faint') || '#5f656d'; parcaD.style.height = '100%'; parcaD.style.width = yuzdeD + '%';
      if (progressEl) progressEl.appendChild(parcaD);
      const rowD = document.createElement('div');
      rowD.className = 'breakdown-row';
      rowD.innerHTML = `<span><span class="dot" style="background:var(--faint)"></span>${tr('ana.diger', 'Digər')}</span><span>${digerTutar.toFixed(2)} AZN · ${yuzdeD.toFixed(0)}%</span>`;
      if (breakdownEl) breakdownEl.appendChild(rowD);
    }
  } else {
    if (progressEl) progressEl.innerHTML = '<div style="width:100%; background:rgba(255,255,255,0.12); height:100%;"></div>';
    if (breakdownEl) breakdownEl.innerHTML = `<div class="breakdown-empty">${tr('ana.buDovrdeXercYoxdur', 'Bu dövrdə xərc yoxdur.')}</div>`;
  }

  const insightOrtEl = document.getElementById('insightOrtalama');
  // "Bu ay gündə orta": baxılan ayın gündəlik xərcləri (aylıq sabit xərclər və kredit ödənişləri xaric),
  // ayın 1-dən baxılan günə qədər olan günlərin sayına bölünür. (Əvvəl bu sahə sadəcə günün cəmini təkrarlayırdı.)
  if (insightOrtEl) insightOrtEl.innerText = ayGundeOrta(goruntulenenTarix).toFixed(2) + ' AZN';
  const insightTopEl = document.getElementById('insightTopKategori');
  if (insightTopEl) insightTopEl.innerText = topKategoriAd ? topKategoriAd : '—';

  const bugunkuToplam = giderler
    .filter(g => !g.aylikRef && !kategoriAylikdirmi(g.kategori) && new Date(g.tamTarix).toDateString() === goruntulenenTarix.toDateString()) // günlük limitə yalnız GÜNLÜK xərclər (tiksiz kateqoriyalar) daxildir
    .reduce((acc, g) => acc + g.tutar, 0);
  gunlukLimitGuncelle(bugunkuToplam);

  const butonlarEl = document.getElementById('butonlarKonteyneri');
  const duzenlemeBtnEl = document.getElementById('duzenlemeBtn');
  if (duzenlemeBtnEl) duzenlemeBtnEl.innerText = duzenlemeRejimi ? tr('ana.hazirdir', 'Hazırdır') : tr('ana.ekraniDuzenle', 'Kateqoriyaları redaktə et');
  const kateqoriyaEkleBtnEl = document.getElementById('kateqoriyaEkleBtn');
  if (kateqoriyaEkleBtnEl) kateqoriyaEkleBtnEl.style.display = duzenlemeRejimi ? 'flex' : 'none';
  if (butonlarEl) {
    butonlarEl.innerHTML = '';
    const kategoriDugmesiYarat = (kat, index) => {
      const btn = document.createElement('button');
      btn.className = 'cat-btn' + (duzenlemeRejimi ? ' duzenleme-jiggle' : '');
      btn.dataset.origIndex = index;
      btn.style.setProperty('--kat', kat.renk); // premium: rəng yalnız sol zolaq/nöqtə kimi, düymə özü neytraldır
      const altYazi = sabitTutarVar(kat) ? kat.sabitTutar.toFixed(2) + ' AZN' : tr('ana.tutarSorusulur', 'Məbləğ soruşulacaq');
      btn.innerHTML = `<span class="name">${escapeHtml(kat.ikon)} ${escapeHtml(kat.ad)}</span><span class="sub">${escapeHtml(altYazi)}</span>`;
      if (duzenlemeRejimi) {
        btn.style.animationDelay = (Math.random() * -0.3).toFixed(2) + 's'; // hamısı eyni anda "yellənməsin" deyə
        const badge = document.createElement('span');
        badge.className = 'cat-sil-badge';
        badge.innerText = '−';
        badge.addEventListener('pointerdown', (e) => e.stopPropagation());
        badge.addEventListener('click', (e) => { e.stopPropagation(); kategoriSilOnayla(index); });
        btn.appendChild(badge);
        const editBadge = document.createElement('span');
        editBadge.className = 'cat-edit-badge';
        editBadge.innerHTML = ikon('qelem', 12);
        editBadge.addEventListener('pointerdown', (e) => e.stopPropagation());
        editBadge.addEventListener('click', (e) => { e.stopPropagation(); catPanelDuzenleAc(index); });
        btn.appendChild(editBadge);
        kateqoriyaSuruklemeBağla(btn); // sərbəst sürükləmə: heç bir gözləmə yoxdur, artıq düzənləmə rejimindəyik
      } else {
        uzunBasmaBağla(btn, () => kategoriyeTikla(index), () => amountModalAc(index)); // qısa toxunma: sabit tutar; basılı saxla: bu DƏFƏLİK fərqli tutar
      }
      return btn;
    };
    // Yuxarıda günlük xərclər (tiksizlər), sonra xətt, sonra aylıq sabit xərclər (tiklilər)
    const gunlukIndeksler = [], aylikIndeksler = [];
    kategoriler.forEach((kat, index) => (kat.aylik ? aylikIndeksler : gunlukIndeksler).push(index));
    gunlukIndeksler.forEach(i => butonlarEl.appendChild(kategoriDugmesiYarat(kategoriler[i], i)));
    if (gunlukIndeksler.length && aylikIndeksler.length) {
      const ayirici = document.createElement('div');
      ayirici.className = 'grid-ayirici';
      ayirici.innerHTML = `<span>${tr('aylik.ayliqSabitXercler', 'Aylıq sabit xərclər')}</span>`;
      butonlarEl.appendChild(ayirici);
    }
    aylikIndeksler.forEach(i => butonlarEl.appendChild(kategoriDugmesiYarat(kategoriler[i], i)));
  }

  // Geriyə tarixli düzəlişlər/əlavələr sonra da xronoloji sıralı görünsün deyə,
  // hər ekran yeniləməsində əməliyyatları tarixə görə (yenidən köhnəyə) sırala.
  // tamTarix yoxdursa (köhnə backup), sıralamanı pozmasın deyə yoxla.
  giderler.sort((a, b) => {
    const ta = a.tamTarix ? new Date(a.tamTarix).getTime() : 0;
    const tb = b.tamTarix ? new Date(b.tamTarix).getTime() : 0;
    return tb - ta;
  });

  // Ana ekrandakı "Günün xərcləri": yalnız baxılan gün. Keçmiş gündə dəyişmək/silmək olmur (istək 1) —
  // keçmiş xərclərlə iş Ayarlar → Son əməliyyatlar səhifəsində aparılır.
  const gunAcari = goruntulenenTarix.toDateString();
  const gunRedakteOlar = tarixBugunmu(goruntulenenTarix);
  let gunHtml = '';
  giderler.forEach((g, index) => {
    if (g.aylikRef) return; // aylıq xərclər / kredit borcu ödəmələri yalnız kredit kartına yansıyır
    if (g.tamTarix && new Date(g.tamTarix).toDateString() === gunAcari) gunHtml += xercSetirHtml(g, index, gunRedakteOlar);
  });
  if (!gunHtml) gunHtml = '<li class="empty-note">' + escapeHtml(tr('ana.buGunXercYox', 'Bu gün üçün xərc yoxdur.')) + '</li>';
  const listeEl = document.getElementById('giderListesi');
  if (listeEl) listeEl.innerHTML = gunHtml;
  sonEmeliyyatlarCiz(); // səhifə açıqdırsa filtrlənmiş siyahı da yenilənsin
  // DİQQƏT: burada artıq veriKaydet() YOXDUR. Ekran yeniləmək buluda yazmamalıdır —
  // əks halda iki cihaz bir-birinin yazısını sonsuz təkrar yazırdı. Yazma yalnız real dəyişiklik edən yerlərdə çağırılır.
}

// DÜZƏLİŞ: köhnə/natamam datada sabitTutar ümumiyyətlə olmaya bilər (undefined). Əvvəl "!== null" yoxlaması
// bunu "sabit tutar var" sayırdı: ana ekran .toFixed xətası ilə çökürdü, toxunuş isə NaN AZN xərc yazırdı.
function sabitTutarVar(kat) {
  return !!kat && typeof kat.sabitTutar === 'number' && isFinite(kat.sabitTutar) && kat.sabitTutar > 0;
}

function kategoriSebebSorulsun(kat) {
  return !!(kat && kat.sebebSoruş);
}

// ---- Qısa toxunma / basılı saxlama (long-press) ayırdı ----
// Kateqoriya düymələrində: qısa toxunma → sabit tutar avtomatik yazılır.
// Basılı saxla (məs. 450ms) → həmin dəfəlik fərqli tutar yazmaq üçün ekran açılır,
// kateqoriyanın öz sabit tutarı DƏYİŞMİR. Həm toxunma ekranları, həm siçan üçün işləyir.
function uzunBasmaBağla(el, qisaFn, uzunFn, esikMs) {
  const ESIK = esikMs || 450;
  let timer = null;
  let uzunTetiklendi = false;
  const basla = () => {
    uzunTetiklendi = false;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      uzunTetiklendi = true;
      timer = null;
      if (navigator.vibrate) { try { navigator.vibrate(15); } catch (e) { /* sakit keç */ } }
      uzunFn();
    }, ESIK);
  };
  const bitir = () => { if (timer) { clearTimeout(timer); timer = null; } };
  el.addEventListener('pointerdown', basla);
  el.addEventListener('pointerup', bitir);
  el.addEventListener('pointerleave', bitir);
  el.addEventListener('pointercancel', bitir);
  el.addEventListener('contextmenu', (e) => e.preventDefault()); // uzun basmada mobil kontekst menyusu çıxmasın
  el.addEventListener('click', (e) => {
    if (uzunTetiklendi) { e.preventDefault(); e.stopPropagation(); uzunTetiklendi = false; return; }
    qisaFn();
  });
}

// ---- "Ekranı düzənlə" rejimində sərbəst sürükləmə (iPhone-dakı proqram sıralaması) ----
// Heç bir gözləmə yoxdur: artıq düzənləmə rejimindəyiksə, barmağı bir az tərpətmək
// kifayətdir. Kart "üzərinə" qalxır, ən yaxın qonşusunun yerinə keçir, buraxılan yerdə qalır.
let siralamaSurukleEl = null;
let siralamaKonteyner = null;
let siralamaGrabOffsetX = 0, siralamaGrabOffsetY = 0;

function kateqoriyaSuruklemeBağla(btn) {
  const HEREKET_ESIGI = 4; // px — bundan az tərpənmə adi tap sayılır
  btn.addEventListener('pointerdown', (ev) => {
    if (siralamaSurukleEl) return;
    if (ev.button !== undefined && ev.button !== 0) return;
    const basPointerId = ev.pointerId;
    const basX = ev.clientX, basY = ev.clientY;
    let basladi = false;
    const hereket = (mev) => {
      if (mev.pointerId !== basPointerId || basladi) return;
      if (Math.abs(mev.clientX - basX) > HEREKET_ESIGI || Math.abs(mev.clientY - basY) > HEREKET_ESIGI) {
        basladi = true;
        kateqoriyaSuruklemeBasla(btn, mev);
      }
    };
    const bitir = () => {
      document.removeEventListener('pointermove', hereket);
      document.removeEventListener('pointerup', bitir);
      document.removeEventListener('pointercancel', bitir);
    };
    document.addEventListener('pointermove', hereket);
    document.addEventListener('pointerup', bitir);
    document.addEventListener('pointercancel', bitir);
  });
  btn.addEventListener('contextmenu', (e) => e.preventDefault());
}

function kateqoriyaSuruklemeBasla(btn, ev) {
  if (navigator.vibrate) { try { navigator.vibrate(12); } catch (e) { /* sakit keç */ } }
  const rect = btn.getBoundingClientRect();
  siralamaGrabOffsetX = ev.clientX - rect.left;
  siralamaGrabOffsetY = ev.clientY - rect.top;
  btn.style.position = 'fixed';
  btn.style.left = rect.left + 'px';
  btn.style.top = rect.top + 'px';
  btn.style.width = rect.width + 'px';
  btn.style.height = rect.height + 'px';
  btn.style.margin = '0';
  btn.classList.remove('duzenleme-jiggle');
  btn.classList.add('siralanan-uçan');
  siralamaSurukleEl = btn;
  siralamaKonteyner = btn.parentElement;
  document.addEventListener('pointermove', kateqoriyaSuruklemeHereket);
  document.addEventListener('pointerup', kateqoriyaSuruklemeBitir, { once: true });
  document.addEventListener('pointercancel', kateqoriyaSuruklemeBitir, { once: true });
}

function kateqoriyaSuruklemeHereket(ev) {
  if (!siralamaSurukleEl) return;
  ev.preventDefault();
  const el = siralamaSurukleEl;
  el.style.left = (ev.clientX - siralamaGrabOffsetX) + 'px';
  el.style.top = (ev.clientY - siralamaGrabOffsetY) + 'px';
  const konteyner = siralamaKonteyner;
  if (!konteyner) return;
  const digerleri = [...konteyner.querySelectorAll('.cat-btn')].filter(b => b !== el);
  let hedef = null, enYaxin = Infinity;
  const px = ev.clientX, py = ev.clientY;
  digerleri.forEach(b => {
    const r = b.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const d = Math.hypot(px - cx, py - cy);
    if (d < enYaxin) { enYaxin = d; hedef = b; }
  });
  if (hedef && enYaxin < 90) {
    const hamisi = [...konteyner.children];
    const draggedIndex = hamisi.indexOf(el);
    const hedefIndex = hamisi.indexOf(hedef);
    if (draggedIndex < hedefIndex) konteyner.insertBefore(el, hedef.nextSibling);
    else konteyner.insertBefore(el, hedef);
  }
}

function kateqoriyaSuruklemeBitir() {
  document.removeEventListener('pointermove', kateqoriyaSuruklemeHereket);
  const el = siralamaSurukleEl;
  const konteyner = siralamaKonteyner;
  siralamaSurukleEl = null;
  siralamaKonteyner = null;
  if (!el) return;
  el.style.position = '';
  el.style.left = '';
  el.style.top = '';
  el.style.width = '';
  el.style.height = '';
  el.style.margin = '';
  el.classList.remove('siralanan-uçan');
  if (!konteyner) return;
  // DOM-dakı yeni sıraya görə kategoriler massivini yenidən qururuq.
  const yeniSira = [...konteyner.querySelectorAll('.cat-btn')]
    .map(b => Number(b.dataset.origIndex))
    .filter(i => !isNaN(i))
    .map(i => kategoriler[i])
    .filter(Boolean);
  if (yeniSira.length === kategoriler.length) {
    kategoriler = yeniSira;
    veriKaydet();
  }
  ekraniGuncelle();
}


function kategoriyeTikla(index) {
  const kat = kategoriler[index];
  if (!kat) return;
  if (sabitTutarVar(kat) && !kategoriSebebSorulsun(kat)) {
    giderEkle(kat.ad, kat.sabitTutar);
  } else {
    amountModalAc(index);
  }
}

function giderEkle(kategori, tutar, sebeb) {
  const simdi = new Date();
  const kayit = {
    kategori, tutar,
    tamTarix: simdi.toISOString(),
    tarix: tarixSaatYaz(simdi)
  };
  if (sebeb) kayit.sebeb = sebeb;
  giderler.unshift(kayit);
  if (typeof anaHesap === 'number') anaHesap = pulYuvarla(anaHesap - tutar);
  veriKaydet();
  ekraniGuncelle();
}

// ---- Xərci düzəlt / köhnə tarixli xərc əlavə et ----
// Yalnız adi (manual) xərclər üçündür — kredit taksiti / transfer kimi avtomatik
// qeydlərin tarixi bu formadan dəyişdirilmir.
let islemFormIndex = null; // null = yeni (köhnə tarixli) əlavə, ədəd = mövcud qeydin index-i

function islemKategoriSecenekleriDoldur(seciliAd) {
  const sel = document.getElementById('islemFormKategori');
  if (!sel) return;
  sel.innerHTML = kategoriler.map(k =>
    `<option value="${escapeHtml(k.ad)}" ${k.ad === seciliAd ? 'selected' : ''}>${escapeHtml(k.ikon)} ${escapeHtml(k.ad)}</option>`
  ).join('');
  if (seciliAd && !kategoriler.some(k => k.ad === seciliAd)) {
    sel.innerHTML += `<option value="${escapeHtml(seciliAd)}" selected>${escapeHtml(seciliAd)} (—)</option>`;
  }
}

// Seçilən tarixi (YYYY-MM-DD) saat.dəqiqə.saniyə-ni orijinal (və ya indiki) andan alaraq birləşdirir.
function tamTarixQur(tarixStr, saatMenbeIso) {
  const [yy, mm, dd] = tarixStr.split('-').map(Number);
  const saatMenbe = saatMenbeIso ? new Date(saatMenbeIso) : new Date();
  return new Date(yy, mm - 1, dd, saatMenbe.getHours(), saatMenbe.getMinutes(), saatMenbe.getSeconds());
}

function islemFormModalAc(index) {
  islemFormIndex = (typeof index === 'number') ? index : null;
  const duzeltMi = islemFormIndex !== null;
  const g = duzeltMi ? giderler[islemFormIndex] : null;

  const baslikEl = document.getElementById('islemFormBaslik');
  if (baslikEl) baslikEl.innerText = duzeltMi ? tr('islemForm.xerciDuzelt', 'Xərci dəyiş') : tr('islemForm.kohneTarixliBaslik', 'Keçmiş tarixə xərc');
  islemKategoriSecenekleriDoldur(duzeltMi && g ? g.kategori : (kategoriler[0] ? kategoriler[0].ad : ''));
  const tutarEl = document.getElementById('islemFormTutar');
  if (tutarEl) tutarEl.value = duzeltMi && g ? g.tutar : '';
  const sebebEl = document.getElementById('islemFormSebeb');
  if (sebebEl) sebebEl.value = duzeltMi && g ? (g.sebeb || '') : '';

  const tarixInput = document.getElementById('islemFormTarix');
  if (tarixInput) {
    const bugunStr = yerliTarixStr(new Date());
    tarixInput.max = bugunStr;
    tarixInput.value = (duzeltMi && g && g.tamTarix) ? yerliTarixStr(new Date(g.tamTarix)) : bugunStr;
  }

  const errEl = document.getElementById('islemFormError');
  if (errEl) errEl.innerText = '';
  const silBtn = document.getElementById('islemFormSilBtn');
  if (silBtn) silBtn.style.display = duzeltMi ? 'inline-block' : 'none';
  modalAc('islemFormModal');
}

function islemFormOnayla() {
  const errEl = document.getElementById('islemFormError');
  const kategori = document.getElementById('islemFormKategori').value;
  const tutarVal = document.getElementById('islemFormTutar').value;
  const tutar = pulYuvarla(parseFloat((tutarVal || '').replace(',', '.'))); // NaN → 0 → aşağıda xəta verir
  const sebeb = document.getElementById('islemFormSebeb').value.trim();
  const tarixVal = document.getElementById('islemFormTarix').value;
  const bugunStr = yerliTarixStr(new Date());

  if (!kategori) { if (errEl) errEl.innerText = tr('islemForm.kateqoriyaSecXeta', 'Kateqoriya seç.'); return; }
  if (isNaN(tutar) || tutar <= 0) { if (errEl) errEl.innerText = tr('umumi.duzgunBirMebleg', 'Düzgün məbləğ yaz.'); return; }
  if (!tarixVal) { if (errEl) errEl.innerText = tr('islemForm.tarixSecXeta', 'Tarix seç.'); return; }
  if (tarixVal > bugunStr) { if (errEl) errEl.innerText = tr('islemForm.gelecekTarixXeta', 'Gələcək tarixi seçmək olmaz.'); return; }

  if (islemFormIndex !== null) {
    const g = giderler[islemFormIndex];
    if (!g) { modalKapat('islemFormModal'); return; }
    if (typeof anaHesap === 'number') anaHesap = pulYuvarla(anaHesap + g.tutar); // köhnə məbləği geri qaytar
    const dt = tamTarixQur(tarixVal, g.tamTarix);
    g.kategori = kategori;
    g.tutar = tutar;
    if (sebeb) g.sebeb = sebeb; else delete g.sebeb;
    g.tamTarix = dt.toISOString();
    g.tarix = tarixSaatYaz(dt);
    if (typeof anaHesap === 'number') anaHesap = pulYuvarla(anaHesap - tutar);
  } else {
    const dt = tamTarixQur(tarixVal, null);
    const kayit = {
      kategori, tutar, tamTarix: dt.toISOString(),
      tarix: tarixSaatYaz(dt)
    };
    if (sebeb) kayit.sebeb = sebeb;
    giderler.unshift(kayit);
    if (typeof anaHesap === 'number') anaHesap = pulYuvarla(anaHesap - tutar);
  }
  modalKapat('islemFormModal');
  veriKaydet();
  ekraniGuncelle();
}

function islemFormSilOnayla() {
  if (islemFormIndex === null) return;
  const index = islemFormIndex;
  modalKapat('islemFormModal');
  giderSilOnayla(index);
}

// ---- Amount modal ----
// TƏHLÜKƏSİZLİK: kateqoriyanı INDEX yerinə ADI ilə izləyirik. Səbəb: modal açıq
// ikən istifadəçi kateqoriyaları sürüşdürə/silə bilər — o halda index köhnəlir və
// xərc səhv kateqoriyaya düşərdi. Ad ilə izlədikdə bu mümkün deyil.
let amountModalKategoriAdi = null;

function amountModalAc(index) {
  const kat = kategoriler[index];
  if (!kat) return;
  amountModalKategoriAdi = kat.ad;
  const sebebSorulsun = kategoriSebebSorulsun(kat);
  const titleEl = document.getElementById('amountModalTitle');
  if (titleEl) titleEl.innerText = tr('mebleg.basliqKat', '{ad}: məbləğ', { ad: kat.ad });
  const inputEl = document.getElementById('amountInput');
  if (inputEl) inputEl.value = sabitTutarVar(kat) ? kat.sabitTutar : '';
  const errEl = document.getElementById('amountError');
  if (errEl) errEl.innerText = '';
  const reasonWrap = document.getElementById('amountReasonWrap');
  const reasonInput = document.getElementById('amountReasonInput');
  if (reasonWrap) reasonWrap.style.display = sebebSorulsun ? 'block' : 'none';
  if (reasonInput) reasonInput.value = '';
  modalAc('amountModal');
  setTimeout(() => { if (inputEl) inputEl.focus(); }, 50);
}

function amountModalOnayla() {
  // Adı ilə tap — sıra nömrəsi dəyişsə də, düzgün kateqoriyanı tapır.
  const kat = kategoriler.find(k => k.ad === amountModalKategoriAdi);
  const errEl = document.getElementById('amountError');
  if (!kat) {
    if (errEl) errEl.innerText = tr('mebleg.kateqoriyaTapilmadi', 'Kateqoriya tapılmadı.');
    return;
  }
  const sebebSorulsun = kategoriSebebSorulsun(kat);
  const val = document.getElementById('amountInput').value;
  const tutar = pulYuvarla(parseFloat((val || '').replace(',', '.')));
  if (isNaN(tutar) || tutar <= 0) {
    if (errEl) errEl.innerText = tr('mebleg.duzgunMeblegDaxilEt', 'Düzgün məbləğ daxil et.');
    return;
  }
  let sebeb = '';
  if (sebebSorulsun) {
    sebeb = document.getElementById('amountReasonInput').value.trim();
    if (!sebeb) {
      if (errEl) errEl.innerText = tr('mebleg.sebebiYaz', 'Qısa qeyd yaz.');
      return;
    }
  }
  giderEkle(kat.ad, tutar, sebeb);
  modalKapat('amountModal');
  amountModalKategoriAdi = null;
}

// ---- Credit card modal (limit + faktiki qalıq) ----
function balanceModalAc() {
  document.getElementById('cardLimitInput').value = typeof kreditLimit === 'number' ? kreditLimit : '';
  document.getElementById('cardBalanceInput').value = typeof anaHesap === 'number' ? anaHesap : '';
  document.getElementById('balanceError').innerText = '';
  modalAc('balanceModal');
  setTimeout(() => document.getElementById('cardLimitInput').focus(), 50);
}
function balanceModalOnayla() {
  const limitVal = document.getElementById('cardLimitInput').value;
  const balansVal = document.getElementById('cardBalanceInput').value;
  const limit = parseFloat((limitVal || '').replace(',', '.'));
  const balans = parseFloat((balansVal || '').replace(',', '.'));
  if (limitVal.trim() !== '' && (isNaN(limit) || limit < 0)) {
    document.getElementById('balanceError').innerText = tr('hesabDuzelt.limitReqemXeta', 'Limit düzgün rəqəm olmalıdır.');
    return;
  }
  if (isNaN(balans)) {
    document.getElementById('balanceError').innerText = tr('hesabDuzelt.qaliqReqemXeta', 'Cari borc düzgün rəqəm olmalıdır.');
    return;
  }
  kreditLimit = limitVal.trim() !== '' ? limit : null;
  anaHesap = balans;
  modalKapat('balanceModal');
  veriKaydet();
  ekraniGuncelle();
  const hesablarAcik = document.getElementById('hesablarModal');
  if (hesablarAcik && hesablarAcik.classList.contains('active')) hesablarGoster(); // "+" ilə əlavə edilən kart dərhal görünsün
  if (document.getElementById('dashboardModal').classList.contains('active')) dashboardPaneliniAc();
}

// ---- New category modal ----
function yeniKategoriModalAc() {
  document.getElementById('newCatName').value = '';
  document.getElementById('newCatFixed').value = '';
  const aylikTikSifir = document.getElementById('newCatAylik'); if (aylikTikSifir) aylikTikSifir.checked = false;
  document.getElementById('newCatError').innerText = '';
  modalAc('newCatModal');
}
function yeniKategoriOnayla() {
  const ad = document.getElementById('newCatName').value.trim();
  if (!ad) {
    document.getElementById('newCatError').innerText = tr('kateqoriyalar.adBosXeta', 'Kateqoriyanın adı boş ola bilməz.');
    return;
  }
  if (kategoriler.some(k => k.ad.toLocaleLowerCase('az-AZ') === ad.toLocaleLowerCase('az-AZ'))) {
    document.getElementById('newCatError').innerText = tr('kateqoriyalar.adTekrarXeta', 'Bu adda kateqoriya artıq var.');
    return;
  }
  const fixedVal = document.getElementById('newCatFixed').value;
  let sabitTutar = null;
  if (fixedVal.trim() !== '') {
    const p = parseFloat(fixedVal.replace(',', '.'));
    if (!isNaN(p) && p > 0) sabitTutar = p;
  }
  // Yeni kateqoriyaya hələ heç bir kateqoriyanın istifadə etmədiyi ilk rəngi ver (20 rəngdən)
  const istifadeOlunanRenkler = new Set(kategoriler.map(k => k.renk));
  const bosRenk = renkPaleti.find(r => !istifadeOlunanRenkler.has(r)) || renkPaleti[kategoriler.length % renkPaleti.length];
  const aylikTikEl = document.getElementById('newCatAylik');
  kategoriler.push({ ad, sabitTutar, renk: bosRenk, ikon: '💰', aylik: !!(aylikTikEl && aylikTikEl.checked) });
  modalKapat('newCatModal');
  veriKaydet();
  ekraniGuncelle();
  if (document.getElementById('yonetimModal').classList.contains('active')) modalListesiniDoldur();
}

// ---- Kateqoriya paneli (✏️ ilə düzənləmə və ➕ ilə əlavə etmə eyni paneldən keçir) ----
let catPanelIndex = null; // null = yeni kateqoriya əlavə edilir, əks halda düzənlənən kateqoriyanın indeksidir
let catPanelSecilenRenk = null;

function catPanelRenkleriCiz() {
  const grid = document.getElementById('catPanelRenkGrid');
  if (!grid) return;
  grid.innerHTML = renkPaleti.map(r =>
    `<span class="swatch ${catPanelSecilenRenk === r ? 'selected' : ''}" style="background:${escapeHtml(r)}" onclick="catPanelRenkSec('${escapeHtml(r)}')"></span>`
  ).join('');
}
window.catPanelRenkSec = (renk) => { catPanelSecilenRenk = renk; catPanelRenkleriCiz(); };

// Kateqoriya kartındakı ✏️ nişanına basanda: mövcud kateqoriyanı bu paneldə düzənlə
function catPanelDuzenleAc(index) {
  const kat = kategoriler[index];
  if (!kat) return;
  catPanelIndex = index;
  document.getElementById('catPanelBaslik').innerText = tr('katDuzenle.kateqoriyaniDuzenle', 'Kateqoriyanı dəyiş');
  document.getElementById('catPanelIkon').value = kat.ikon;
  document.getElementById('catPanelAd').value = kat.ad;
  document.getElementById('catPanelAylik').checked = !!kat.aylik;
  document.getElementById('catPanelSabit').value = sabitTutarVar(kat) ? kat.sabitTutar : '';
  document.getElementById('catPanelSebeb').checked = !!kat.sebebSoruş;
  catPanelSecilenRenk = kat.renk;
  catPanelRenkleriCiz();
  const silBtn = document.getElementById('catPanelSilBtn'); if (silBtn) silBtn.style.display = '';
  document.getElementById('catPanelSaveBtn').innerText = tr('umumi.yaddaSaxla', 'Yadda saxla');
  document.getElementById('catPanelError').innerText = '';
  modalAc('catPanelModal');
}

// "➕ Yeni kateqoriya əlavə et" düyməsinə basanda: eyni panel boş vəziyyətdə açılır
function catPanelYeniAc() {
  catPanelIndex = null;
  document.getElementById('catPanelBaslik').innerText = tr('yeniKat.yeniKateqoriya', 'Yeni kateqoriya');
  document.getElementById('catPanelIkon').value = '💰';
  document.getElementById('catPanelAd').value = '';
  document.getElementById('catPanelAylik').checked = false;
  document.getElementById('catPanelSabit').value = '';
  document.getElementById('catPanelSebeb').checked = false;
  const istifadeOlunanRenkler = new Set(kategoriler.map(k => k.renk));
  catPanelSecilenRenk = renkPaleti.find(r => !istifadeOlunanRenkler.has(r)) || renkPaleti[kategoriler.length % renkPaleti.length];
  catPanelRenkleriCiz();
  const silBtn = document.getElementById('catPanelSilBtn'); if (silBtn) silBtn.style.display = 'none';
  document.getElementById('catPanelSaveBtn').innerText = tr('yeniKat.elaveEt', 'Əlavə et');
  document.getElementById('catPanelError').innerText = '';
  modalAc('catPanelModal');
}

function catPanelSil() {
  if (catPanelIndex === null) return;
  if (kategoriler.length <= 1) { confirmAc(tr('umumi.mumkunDeyil', 'Mümkün deyil'), tr('kateqoriyalar.enAziBirQalmalidir', 'Ən azı bir kateqoriya qalmalıdır.'), () => {}); return; }
  const index = catPanelIndex;
  confirmAc(tr('kateqoriyalar.kateqoriyaniSil', 'Kateqoriyanı sil'), tr('kateqoriyalar.silmekEminsen', '"{ad}" kateqoriyasını silmək istədiyinə əminsən?', { ad: kategoriler[index].ad }), () => {
    kategoriler.splice(index, 1);
    veriKaydet();
    modalKapat('catPanelModal');
    ekraniGuncelle();
    if (document.getElementById('yonetimModal') && document.getElementById('yonetimModal').classList.contains('active')) modalListesiniDoldur();
  });
}

function catPanelSaxla() {
  const ad = document.getElementById('catPanelAd').value.trim();
  const ikon = document.getElementById('catPanelIkon').value.trim() || '💰';
  if (!ad) { document.getElementById('catPanelError').innerText = tr('kateqoriyalar.adBosXeta', 'Kateqoriyanın adı boş ola bilməz.'); return; }
  const kicik = (x) => x.toLocaleLowerCase('az-AZ');
  const tekrarVarmi = kategoriler.some((k, j) => j !== catPanelIndex && kicik(k.ad) === kicik(ad));
  if (tekrarVarmi) { document.getElementById('catPanelError').innerText = tr('kateqoriyalar.adTekrarXeta', 'Bu adda kateqoriya artıq var.'); return; }
  const sabitVal = document.getElementById('catPanelSabit').value;
  let sabitTutar = null;
  if (sabitVal.trim() !== '') {
    const p = parseFloat(sabitVal.replace(',', '.'));
    if (!isNaN(p) && p > 0) sabitTutar = pulYuvarla(p);
  }
  const aylik = document.getElementById('catPanelAylik').checked;
  const sebeb = document.getElementById('catPanelSebeb').checked;
  const renk = catPanelSecilenRenk || renkPaleti[0];

  if (catPanelIndex === null) {
    kategoriler.push({ ad, sabitTutar, renk, ikon, aylik, sebebSoruş: sebeb });
  } else {
    const kat = kategoriler[catPanelIndex];
    const kohneAd = kat.ad;
    if (kohneAd !== ad) {
      giderler.forEach(g => { if (g.kategori === kohneAd) g.kategori = ad; });
      if (amountModalKategoriAdi === kohneAd) amountModalKategoriAdi = ad;
    }
    kat.ad = ad; kat.ikon = ikon; kat.sabitTutar = sabitTutar; kat.renk = renk; kat.aylik = aylik; kat.sebebSoruş = sebeb;
  }
  veriKaydet();
  modalKapat('catPanelModal');
  ekraniGuncelle();
  if (document.getElementById('yonetimModal') && document.getElementById('yonetimModal').classList.contains('active')) modalListesiniDoldur();
}

// ---- Confirm modal ----
// okOnly = true olduqda "Ləğv et" kimi digər bütün düymələr gizlədilir — sadə xəbərdarlıq (alert) kimi görünür.
function confirmAc(title, text, onConfirm, okOnly) {
  document.getElementById('confirmTitle').innerText = title;
  document.getElementById('confirmText').innerText = text;
  const btn = document.getElementById('confirmActionBtn');
  const yeniBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(yeniBtn, btn);
  // DÜZƏLİŞ: əvvəlcə pəncərəni bağla, sonra əməliyyatı icra et. Əks halda onConfirm() içində
  // açılan yeni xəbərdarlıq (alertAc) dərhal bağlanırdı və istifadəçi onu heç görmürdü.
  yeniBtn.addEventListener('click', () => { modalKapat('confirmModal'); onConfirm(); });
  const modalEl = document.getElementById('confirmModal');
  if (modalEl) {
    modalEl.querySelectorAll('button').forEach(b => {
      if (b.id !== 'confirmActionBtn') b.style.display = okOnly ? 'none' : '';
    });
  }
  modalAc('confirmModal');
}

// Native alert() əvəzinə: yalnız "OK" düyməli confirm modalı — i18n-ə tam inteqrasiya olunur.
function alertAc(text, title, onOk) {
  confirmAc(title || tr('umumi.xeberdarliq', 'Diqqət'), text, onOk || (() => {}), true);
}
function giderSilOnayla(index) {
  const hedef = giderler[index]; // sıra nömrəsi yox, qeydin özünü izləyirik (arada sinxron olsa səhv qeyd silinməsin)
  confirmAc(tr('islemForm.xerciSil', 'Xərci sil'), tr('islemForm.buQeydiSilmekEminsen', 'Bu xərci silmək istədiyinə əminsən?'), () => {
    const idx = giderler.indexOf(hedef);
    if (!hedef || idx === -1) { alertAc(tr('umumi.siyahiYenilendiXeta', 'Siyahı bu arada yeniləndi. Yenidən cəhd et.')); ekraniGuncelle(); return; }
    if (typeof anaHesap === 'number' && typeof hedef.tutar === 'number') anaHesap = pulYuvarla(anaHesap + hedef.tutar);
    giderler.splice(idx, 1);
    veriKaydet();
    ekraniGuncelle();
  });
}
function listeyiTemizleOnayla() {
  confirmAc(tr('sonEmeliyyat.hamisiniSil', 'Bütün tarixçəni sil'), tr('sonEmeliyyat.hamisiniSilSual', 'Bütün xərc tarixçəsi silinsin? Bu əməliyyatı geri qaytarmaq olmur.'), () => {
    if (typeof anaHesap === 'number') {
      const geriQaytar = giderler.filter(g => !g.aylikRef).reduce((acc, g) => acc + (typeof g.tutar === 'number' ? g.tutar : 0), 0);
      anaHesap = pulYuvarla(anaHesap + geriQaytar);
    }
    giderler = giderler.filter(g => !!g.aylikRef);
    veriKaydet();
    ekraniGuncelle();
  });
}
function kategoriSilOnayla(index) {
  if (kategoriler.length <= 1) { confirmAc(tr('umumi.mumkunDeyil', 'Mümkün deyil'), tr('kateqoriyalar.enAziBirQalmalidir', 'Ən azı bir kateqoriya qalmalıdır.'), () => {}); return; }
  confirmAc(tr('kateqoriyalar.kateqoriyaniSil', 'Kateqoriyanı sil'), tr('kateqoriyalar.silmekEminsen', '"{ad}" kateqoriyasını silmək istədiyinə əminsən?', { ad: kategoriler[index].ad }), () => {
    kategoriler.splice(index, 1); veriKaydet(); modalListesiniDoldur(); ekraniGuncelle();
  });
}

// ---- Management modal ----
function yonetimPaneliniAc() { modalListesiniDoldur(); modalAc('yonetimModal'); }
function yonetimPaneliniKapat() { modalKapat('yonetimModal'); ekraniGuncelle(); ayarlarPaneliniAc(); }

function modalListesiniDoldur() {
  const konteyner = document.getElementById('kategoriDuzenlemeListesi');
  if (!konteyner) return;
  konteyner.innerHTML = '';
  kategoriler.forEach((kat, index) => {
    const item = document.createElement('div');
    item.className = 'modal-item';
    item.dataset.origIndex = index;
    const renkler = renkPaleti.map(r =>
      `<span class="swatch ${kat.renk === r ? 'selected' : ''}" style="background:${escapeHtml(r)}" onclick="kategoriRenkGuncelle(${index}, '${escapeHtml(r)}')"></span>`
    ).join('');
    item.innerHTML = `
      <div class="field-row">
        <input type="text" value="${escapeHtml(kat.ikon)}" onchange="kategoriIkonGuncelle(${index}, this.value)" style="width:52px; text-align:center;">
        <input type="text" value="${escapeHtml(kat.ad)}" onchange="kategoriAdGuncelle(${index}, this.value)" style="flex:1;">
        <button class="sira-btn sil" onclick="kategoriSilOnayla(${index})" aria-label="${escapeHtml(tr('kateqoriyalar.kateqoriyaniSil', 'Kateqoriyanı sil'))}">${ikon('zibil', 18)}</button>
      </div>
      <label class="field-row" style="gap:8px; font-size:13px; font-weight:600; color:var(--ink); border-top:1px solid var(--line); padding-top:8px; cursor:pointer;">
        <input type="checkbox" ${kat.aylik ? 'checked' : ''} onchange="kategoriAylikToggle(${index}, this.checked)" style="width:auto;">
        <span>${escapeHtml(tr('katDuzenle.aylikSabitXerc', 'Aylıq sabit xərc'))} <span style="font-weight:400; color:var(--muted);">${escapeHtml(tr('katDuzenle.tiksizGunluk', '(seçilməyibsə — gündəlik)'))}</span></span>
      </label>
      <div class="field-row" style="font-size:12px; color:var(--muted); gap:6px;">
        <span>${escapeHtml(tr('katDuzenle.sabitTutar', 'Sabit məbləğ:'))}</span>
        <input type="number" step="0.01" value="${sabitTutarVar(kat) ? kat.sabitTutar : ''}" placeholder="${escapeHtml(tr('katDuzenle.sorusPlaceholder', 'Soruş'))}" onchange="kategoriSabitTutarGuncelle(${index}, this.value)" style="width:78px;">
      </div>
      <div class="renk-grid">${renkler}</div>
      <label class="field-row" style="gap:6px; font-size:12px; color:var(--muted); padding-top:2px; cursor:pointer;">
        <input type="checkbox" ${kat.sebebSoruş ? 'checked' : ''} onchange="kategoriSebebToggle(${index}, this.checked)" style="width:auto;">
        <span>${escapeHtml(tr('katDuzenle.elaveEderkenSebebDe', 'Əlavə edəndə qeyd də soruşulsun'))}</span>
      </label>
    `;
    konteyner.appendChild(item);
  });
}

// Ad dəyişəndə köhnə xərclərin kateqoriya adı da yenilənir (əks halda tarixçə bölgüdən itirdi). Təkrar ad qadağandır.
window.kategoriAdGuncelle = (i, val) => {
  const kat = kategoriler[i];
  const yeniAd = (val || '').trim();
  if (!kat || !yeniAd || yeniAd === kat.ad) { modalListesiniDoldur(); return; }
  const kicik = (x) => x.toLocaleLowerCase('az-AZ');
  if (kategoriler.some((k, j) => j !== i && kicik(k.ad) === kicik(yeniAd))) {
    alertAc(tr('kateqoriyalar.adTekrarXeta', 'Bu adda kateqoriya artıq var.'));
    modalListesiniDoldur();
    return;
  }
  const kohneAd = kat.ad;
  giderler.forEach(g => { if (g.kategori === kohneAd) g.kategori = yeniAd; });
  if (amountModalKategoriAdi === kohneAd) amountModalKategoriAdi = yeniAd;
  kat.ad = yeniAd;
  veriKaydet();
};
window.kategoriIkonGuncelle = (i, val) => { if (val.trim() && kategoriler[i]) { kategoriler[i].ikon = val.trim(); veriKaydet(); } };
window.kategoriSabitTutarGuncelle = (i, val) => {
  if (!kategoriler[i]) return;
  if (val.trim() === '') kategoriler[i].sabitTutar = null;
  else { const p = parseFloat(val.replace(',', '.')); kategoriler[i].sabitTutar = (!isNaN(p) && p > 0) ? pulYuvarla(p) : null; }
  veriKaydet();
};
window.kategoriRenkGuncelle = (i, renk) => { if (kategoriler[i]) { kategoriler[i].renk = renk; veriKaydet(); } modalListesiniDoldur(); };
window.kategoriSebebToggle = (i, checked) => { if (kategoriler[i]) { kategoriler[i].sebebSoruş = checked; veriKaydet(); } };
window.kategoriAylikToggle = (i, checked) => { if (kategoriler[i]) { kategoriler[i].aylik = !!checked; veriKaydet(); } };

// QEYD: Sıralamayı dəyişmək (drag-to-reorder) Ayarlar → Kateqoriyalar siyahısından
// qaldırılıb — indi Xərclər ekranındakı "✏️ Ekranı düzənlə" düyməsi ilə edilir.

// ---- Dedicated installment loan (Kredit Borcu) ----
function tarixFormat(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return d + '.' + m + '.' + y;
}

// Bir tarixə (iso) ay əlavə edib yeni iso tarix qaytarır
function tarixAyEkle(iso, ayFarki) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(Date.UTC(y, (m - 1) + ayFarki, d));
  const yyyy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(dt.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Kredit borcunu (aylıq məbləğ / taksit sayı / başlanğıc tarixi) istifadəçinin özünün düzəltməsi
function krediBorcuDuzeltModalAc() {
  const k = krediBorcu || {};
  document.getElementById('krediBorcuDuzeltMebleg').value = (typeof k.aylikMebleg === 'number') ? k.aylikMebleg : '';
  document.getElementById('krediBorcuDuzeltSayi').value = (typeof k.taksitSayi === 'number' && k.taksitSayi > 0) ? k.taksitSayi : '';
  document.getElementById('krediBorcuDuzeltBaslangic').value = k.baslangic || '';
  document.getElementById('krediBorcuDuzeltError').innerText = '';
  modalAc('krediBorcuDuzeltModal');
}

function krediBorcuDuzeltOnayla() {
  const meblegVal = document.getElementById('krediBorcuDuzeltMebleg').value;
  const sayiVal = document.getElementById('krediBorcuDuzeltSayi').value;
  const baslangicVal = document.getElementById('krediBorcuDuzeltBaslangic').value;
  const errEl = document.getElementById('krediBorcuDuzeltError');

  const mebleg = parseFloat((meblegVal || '').replace(',', '.'));
  const sayi = parseInt(sayiVal, 10);

  if (isNaN(mebleg) || mebleg <= 0) {
    errEl.innerText = tr('krediBorc.ayliqTaksitXeta', 'Aylıq taksitin məbləğini düzgün yaz.');
    return;
  }
  if (isNaN(sayi) || sayi <= 0) {
    errEl.innerText = tr('krediBorc.taksitSayiXeta', 'Taksit sayını düzgün yaz.');
    return;
  }
  if (!baslangicVal) {
    errEl.innerText = tr('krediBorc.baslangicTarixiXeta', 'Başlanğıc tarixini seç.');
    return;
  }

  if (!krediBorcu) {
    krediBorcu = {
      id: 'kredi_borcu_' + idUret(), ad: 'Kredi Borcu',
      odenmisTaksitSayi: 0, elaveOdenis: 0
    };
  }
  krediBorcu.aylikMebleg = mebleg;
  krediBorcu.taksitSayi = sayi;
  krediBorcu.baslangic = baslangicVal;
  krediBorcu.bitis = tarixAyEkle(baslangicVal, sayi - 1);
  if (krediBorcu.odenmisTaksitSayi > sayi) krediBorcu.odenmisTaksitSayi = sayi;

  veriKaydet();
  modalKapat('krediBorcuDuzeltModal');
  krediBorcuGoster();
  ekraniGuncelle();
}

// Kredit xəttinin (taksitli kredit) hazırkı qalıq borcu — hesablar arası birbaşa
// ödənişlər (elaveOdenis) buradan düşülür, amma mənfi olmur.
function krediBorcuQalanHesabla() {
  if (!krediBorcu) return 0;
  const xam = (krediBorcu.taksitSayi - krediBorcu.odenmisTaksitSayi) * krediBorcu.aylikMebleg;
  return Math.max(0, xam - (krediBorcu.elaveOdenis || 0));
}

// Kredit xətt kartı indi "Hesablarım" siyahısında (hesablarGoster() içində) göstərilir —
// krediBorcuGoster() sadəcə o siyahını yenidən çəkir.
function krediBorcuGoster() {
  hesablarGoster();
}

// ---- Bu ayın taksitini ödə: hansı hesabdan ödənəcəyini istifadəçi seçir ----
const TAKSIT_MENBE_SIRA = ['nagd', 'debit', 'depozit', 'kredit'];

// Bir hesab tipinin ödəniş üçün istifadə edilə bilən məbləği
function hesabMovcudMebleg(tip) {
  if (tip === 'kredit') {
    const limit = (typeof kreditLimit === 'number') ? kreditLimit : 0;
    const borc = (typeof anaHesap === 'number') ? anaHesap : 0;
    return limit + borc; // kredit kartında istifadə edilə bilən limit
  }
  return hesabBakiyesiOxu(tip);
}

function taksitMenbeVarMi(tip) {
  if (tip === 'kredit') return typeof kreditLimit === 'number';
  return !!hesabEklenib[tip];
}

function krediBorcuOdeModalAc() {
  if (!krediBorcu) return;
  if (krediBorcu.odenmisTaksitSayi >= krediBorcu.taksitSayi) return;
  const sel = document.getElementById('taksitOdeMenbe');
  const errEl = document.getElementById('taksitOdeError');
  errEl.innerText = '';
  sel.innerHTML = '';
  TAKSIT_MENBE_SIRA.filter(taksitMenbeVarMi).forEach((tip) => {
    const opt = document.createElement('option');
    opt.value = tip;
    const bilgi = (tip === 'kredit')
      ? tr('taksitOde.istifadeEdileBilen', 'istifadə edilə bilər: {mebleg} AZN', { mebleg: hesabMovcudMebleg(tip).toFixed(2) })
      : hesabMovcudMebleg(tip).toFixed(2) + ' AZN';
    opt.textContent = hesabAdi(tip) + ' — ' + bilgi;
    sel.appendChild(opt);
  });
  const nomre = krediBorcu.odenmisTaksitSayi + 1;
  document.getElementById('taksitOdeInfo').innerText =
    tr('taksitOde.info', 'Taksit {nomre}/{say} · {mebleg} AZN', { nomre, say: krediBorcu.taksitSayi, mebleg: krediBorcu.aylikMebleg.toFixed(2) });
  if (!sel.options.length) errEl.innerText = tr('taksitOde.hesabYoxdurXeta', 'Əvvəlcə ödəniş üçün ən azı bir hesab əlavə et (+).');
  modalAc('taksitOdeModal');
}

function krediBorcuOdeOnayla() {
  if (!krediBorcu) return;
  const errEl = document.getElementById('taksitOdeError');
  const menbeTip = document.getElementById('taksitOdeMenbe').value;
  const tutar = krediBorcu.aylikMebleg;

  if (!menbeTip) {
    errEl.innerText = tr('taksitOde.hesabSecXeta', 'Ödəniş üçün hesab seç.');
    return;
  }
  if (krediBorcu.odenmisTaksitSayi >= krediBorcu.taksitSayi) {
    errEl.innerText = tr('taksitOde.hamisiOdenibXeta', 'Bütün taksitlər artıq ödənilib.');
    return;
  }
  if (pulYuvarla(tutar) > pulYuvarla(hesabMovcudMebleg(menbeTip))) {
    errEl.innerText = (menbeTip === 'kredit')
      ? tr('transfer.limitYoxdur', 'Kredit kartında kifayət qədər limit yoxdur.')
      : tr('transfer.balansYoxdur', '{ad} hesabında kifayət qədər vəsait yoxdur.', { ad: hesabAdi(menbeTip) });
    return;
  }

  hesabBakiyesiDeyis(menbeTip, -tutar);
  krediBorcu.odenmisTaksitSayi += 1;

  // Ödəniş "Son transferlər" tarixçəsinə yazılır; oradakı ✕ ilə geri qaytarıla bilər.
  const simdi = new Date();
  hesabTransferleri.unshift({
    menbeTip, hedefTip: 'krediXett', tutar, taksit: true,
    tamTarix: simdi.toISOString(),
    tarix: tarixSaatYaz(simdi)
  });

  veriKaydet();
  modalKapat('taksitOdeModal');
  hesablarGoster();
  ekraniGuncelle();
}

function modalAc(id) { const el = document.getElementById(id); if (el) el.classList.add('active'); }
function modalKapat(id) { const el = document.getElementById(id); if (el) el.classList.remove('active'); }

// ---- Alt naviqasiya (bottom tab bar) ----
function menuAc() {} // köhnə hamburger menyusundan qalan çağırışlar üçün zərərsiz boş funksiya
function menuKapat() {} // eyni səbəbdən boş funksiya

function navAktifGuncelle(secilen) {
  const el1 = document.getElementById('navDashboard'); if (el1) el1.classList.toggle('active', secilen === 'dashboard');
  const el2 = document.getElementById('navAylikHesabat'); if (el2) el2.classList.toggle('active', secilen === 'aylikHesabat');
  const el3 = document.getElementById('navAna'); if (el3) el3.classList.toggle('active', secilen === 'ana');
  const el4 = document.getElementById('navHesablar'); if (el4) el4.classList.toggle('active', secilen === 'hesablar');
  const el5 = document.getElementById('navAyarlar'); if (el5) el5.classList.toggle('active', secilen === 'ayarlar');
}

// Alt paneldəki 5 ikondan biri seçiləndə çağırılır: əvvəlcə açıq olan bütün
// tam-ekran səhifələri bağlayır, sonra seçilən sekməni açır (ya da 'ana' üçün
// heç nə açmır — çünki o, #app konteynerinin özüdür).
function sekmeSec(sekme) {
  // Bütün tam-ekran səhifələri (əsas sekmələr VƏ Ayarlar altındakı alt-səhifələr —
  // Kateqoriyalar, Son əməliyyatlar) bağlayırıq ki, alt paneldən hansı sekməyə
  // keçid edilsə, əvvəlki (alt-)səhifə arxada açıq qalıb üst-üstə düşməsin.
  document.querySelectorAll('.page-screen').forEach((el) => el.classList.remove('active'));
  navAktifGuncelle(sekme);
  if (sekme === 'dashboard') dashboardPaneliniAc();
  else if (sekme === 'aylikHesabat') aylikHesabatPaneliniAc();
  else if (sekme === 'hesablar') hesablarPaneliniAc();
  else if (sekme === 'ayarlar') ayarlarPaneliniAc();
  else ekraniGuncelle();
}

function dashboardPaneliniAc() {
  dashboardDairaviDiaqramlariCiz();
  modalAc('dashboardModal');
}

// ---- Dashboard: 3 dairəvi (doughnut) diaqram — Chart.js ilə ----
function dairaviCiz(canvasId, mevcudChart, parcalar, legendId, vahid, emptyMesaj) {
  if (mevcudChart) mevcudChart.destroy();
  const canvasEl = document.getElementById(canvasId);
  const legendEl = document.getElementById(legendId);
  if (!canvasEl || !legendEl) return null;
  const dolu = parcalar.filter(p => p.tutar > 0);
  const pulVahididirmi = (vahid || '').indexOf('AZN') !== -1;
  const deyerYaz = (v) => pulVahididirmi ? v.toFixed(2) : Math.round(v).toString();
  legendEl.innerHTML = '';
  if (dolu.length === 0) {
    legendEl.innerHTML = `<div class="pie-empty">${escapeHtml(emptyMesaj || tr('dash.melumatYoxdur', 'Məlumat yoxdur.'))}</div>`;
    return new Chart(canvasEl.getContext('2d'), {
      type: 'doughnut',
      data: { labels: [''], datasets: [{ data: [1], backgroundColor: [cssVar('--line') || '#e3e7ee'], borderWidth: 0 }] },
      options: { cutout: '68%', animation: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
    });
  }
  dolu.forEach(p => {
    const row = document.createElement('div');
    row.className = 'pie-legend-row';
    row.innerHTML = `<span class="lbl"><span class="dot" style="background:${escapeHtml(p.renk)}"></span>${escapeHtml(p.ad)}</span><span class="amt">${deyerYaz(p.tutar)}${escapeHtml(vahid)}</span>`;
    legendEl.appendChild(row);
  });
  return new Chart(canvasEl.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: dolu.map(p => p.ad),
      datasets: [{ data: dolu.map(p => p.tutar), backgroundColor: dolu.map(p => p.renk), borderWidth: 2, borderColor: cssVar('--panel') || '#fff' }]
    },
    options: {
      cutout: '68%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${deyerYaz(ctx.parsed)}${vahid}`
          }
        }
      }
    }
  });
}

function dashboardDairaviDiaqramlariCiz() {
  if (typeof Chart === 'undefined') {
    // Chart.js CDN yüklənməyibsə (internet yoxdursa) istifadəçiyə xəbər ver.
    ['dashUmumiBorcLegend', 'dashKrediKartLegend', 'dashKrediBorcuLegend'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = `<div class="pie-empty">${tr('dash.qrafikInternetLazimdir', 'Qrafik üçün internet lazımdır.')}</div>`;
    });
    ['dashUmumiBorcMerkez', 'dashKrediKartMerkez', 'dashKrediBorcuMerkez'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerText = '—';
    });
    return;
  }

  // 1. Ümumi borc: Kredit kartı borcu + Deposit borcu + Kredit borcu (xətt)
  const kkBorcu = (typeof anaHesap === 'number' && anaHesap < 0) ? Math.abs(anaHesap) : 0;
  const depozitBorcu = (hesabEklenib.depozit && typeof depozitBakiye === 'number' && depozitBakiye < 0) ? Math.abs(depozitBakiye) : 0;
  const krediBorcuQalan = krediBorcuQalanHesabla();
  const umumiCemi = kkBorcu + depozitBorcu + krediBorcuQalan;
  document.getElementById('dashUmumiBorcMerkez').innerText = umumiCemi > 0 ? umumiCemi.toFixed(2) : '0.00';
  dashUmumiBorcChart = dairaviCiz('dashUmumiBorcCanvas', dashUmumiBorcChart, [
    { ad: tr('dash.kkBorcu', 'Kredit kartı'), tutar: kkBorcu, renk: cssVar('--chart-1') || '#c9ced6' },
    { ad: tr('dash.depozitBorcu', 'Depozit'), tutar: depozitBorcu, renk: cssVar('--chart-2') || '#8b929b' },
    { ad: tr('dash.krediXettBorcu', 'Kredit xətti'), tutar: krediBorcuQalan, renk: cssVar('--chart-3') || '#5b6168' }
  ], 'dashUmumiBorcLegend', ' AZN', tr('dash.borcYoxdur', 'Borc yoxdur.'));

  // 2. Kredit kartı: istifadə olunan / istifadə edilə bilən qalıq
  const limitDeger = (typeof kreditLimit === 'number') ? kreditLimit : 0;
  const hesapDeger = typeof anaHesap === 'number' ? anaHesap : 0;
  const istifade = hesapDeger < 0 ? Math.abs(hesapDeger) : 0;
  const qalanLimit = Math.max(0, limitDeger + hesapDeger);
  document.getElementById('dashKrediKartMerkez').innerText = (typeof kreditLimit === 'number') ? limitDeger.toFixed(2) : '—';
  dashKrediKartChart = dairaviCiz('dashKrediKartCanvas', dashKrediKartChart, (typeof kreditLimit === 'number') ? [
    { ad: tr('dash.istifadeOlunan', 'İstifadə olunub'), tutar: istifade, renk: cssVar('--danger') || '#d63a3a' },
    { ad: tr('dash.istifadeEdileBilen', 'İstifadə edilə bilər'), tutar: qalanLimit, renk: cssVar('--chart-1') || '#d4d8de' }
  ] : [], 'dashKrediKartLegend', ' AZN', tr('dash.kkYoxdur', 'Kredit kartı hələ əlavə edilməyib.'));

  // 3. Kredit borcu (taksitli kredit xətt): ödənilmiş / qalan taksit sayı
  document.getElementById('dashKrediBorcuMerkez').innerText = krediBorcu ? (krediBorcu.odenmisTaksitSayi + '/' + krediBorcu.taksitSayi) : '—';
  dashKrediBorcuChart = dairaviCiz('dashKrediBorcuCanvas', dashKrediBorcuChart, krediBorcu ? [
    { ad: tr('dash.odenilib', 'Ödənilib'), tutar: krediBorcu.odenmisTaksitSayi, renk: cssVar('--chart-1') || '#c9ced6' },
    { ad: tr('dash.qalib', 'Qalıb'), tutar: krediBorcu.taksitSayi - krediBorcu.odenmisTaksitSayi, renk: cssVar('--input-border') || '#d9c9cd' }
  ] : [], 'dashKrediBorcuLegend', ' ' + tr('dash.taksitVahid', 'taksit'), tr('dash.krediXettYoxdur', 'Kredit xətti hələ əlavə edilməyib.'));
}

// ==== Ayarlar: Günlük limit + Kateqoriyalar + Son əməliyyatlar + İşıq rejimi ====
// Keşi (cache) və service worker-i təmizləyib son versiyanı yenidən yükləyir —
// istifadəçi hər dəfə ana ekrandan silib-yenidən əlavə etməsin deyə.
async function tetbiqiYenile() {
  try {
    if ('caches' in window) {
      const adlar = await caches.keys();
      await Promise.all(adlar.map((ad) => caches.delete(ad)));
    }
    if ('serviceWorker' in navigator) {
      const qeydler = await navigator.serviceWorker.getRegistrations();
      await Promise.all(qeydler.map((r) => r.unregister()));
    }
  } catch (e) {
    console.warn('Keş təmizləmə xətası:', e);
  }
  // location.reload(true) müasir brauzerlərdə artıq HTTP keşini bypass etmir.
  // Bunun əvəzinə unikal sorğu parametrli TAM YENİ URL-ə keçirik — brauzer
  // bunu fərqli resurs sayıb məcburi şəkildə şəbəkədən yükləyir.
  const bazaUrl = location.origin + location.pathname;
  location.replace(bazaUrl + '?yenile=' + Date.now());
}

function ayarlarPaneliniAc() {
  document.getElementById('gunlukLimitInput').value = (typeof gunlukLimit === 'number') ? gunlukLimit : '';
  document.getElementById('gunlukLimitError').innerText = '';
  kilidAyarGoster();
  driveMenyuGuncelle();
  firebasePanelGuncelle();
  const versEl = document.getElementById('tetbiqVersiyaGoster');
  if (versEl) versEl.innerText = APP_VERSION;
  modalAc('ayarlarModal');
}
function ayarlarPaneliniKapat() {
  modalKapat('ayarlarModal');
  navAktifGuncelle('ana');
  ekraniGuncelle();
}
function gunlukLimitYadSaxla() {
  const val = document.getElementById('gunlukLimitInput').value;
  const limit = parseFloat((val || '').replace(',', '.'));
  if (isNaN(limit) || limit < 0) {
    document.getElementById('gunlukLimitError').innerText = tr('umumi.duzgunBirMebleg', 'Düzgün məbləğ yaz.');
    return;
  }
  gunlukLimit = limit;
  veriKaydet();
  ekraniGuncelle();
  document.getElementById('gunlukLimitError').innerText = '';
}
function ayarlarKateqoriyalarAc() {
  modalKapat('ayarlarModal');
  yonetimPaneliniAc();
}
function ayarlarSonEmeliyyatlarAc() {
  modalKapat('ayarlarModal');
  sonEmeliyyatlarPaneliniAc();
}
// "System" bölməsi: Google Drive + Firebase + Yedək faylı bir başlığın altında,
// açılıb-bağlanan (collapsible) qrup kimi.
function sistemBolmesiToggle() {
  const kutu = document.getElementById('sistemBolmesi');
  const ox = document.getElementById('sistemBaslikOx');
  const acilir = kutu.style.display === 'none';
  kutu.style.display = acilir ? 'block' : 'none';
  ox.style.transform = acilir ? 'rotate(180deg)' : 'rotate(0deg)';
  const bas = document.getElementById('sistemBaslikBtn');
  if (bas) bas.setAttribute('aria-expanded', acilir ? 'true' : 'false');
  const qrup = document.getElementById('sistemQrup');
  if (qrup) qrup.classList.toggle('acik', acilir);
}

// ==== Aylıq xülasə: "Bu ay hara pul gedir?" ====
function aylikHesabatVerisi() {
  const indi = new Date();
  const buAy = indi.getMonth(), buIl = indi.getFullYear();
  let kecenAy = buAy - 1, kecenIl = buIl;
  if (kecenAy < 0) { kecenAy = 11; kecenIl -= 1; }
  const buAyToplam = {}, kecenAyToplam = {};
  let buAyCemi = 0;
  giderler.forEach(g => {
    if (g.aylikRef) return;
    const t = new Date(g.tamTarix);
    if (t.getFullYear() === buIl && t.getMonth() === buAy) {
      buAyToplam[g.kategori] = (buAyToplam[g.kategori] || 0) + g.tutar;
      buAyCemi += g.tutar;
    } else if (t.getFullYear() === kecenIl && t.getMonth() === kecenAy) {
      kecenAyToplam[g.kategori] = (kecenAyToplam[g.kategori] || 0) + g.tutar;
    }
  });
  return { buAyToplam, kecenAyToplam, buAyCemi };
}

// Rəqəmi qısa yaz: 300 → "300", 312.5 → "312.5", 312.456 → "312.46"
function qisaRaqem(n) { return String(+Number(n).toFixed(2)); }

// Aylıq hesabatdakı dairəvi (doughnut) qrafik + ortasındakı yazı.
// cfg: { canvasId, bosMesajId, merkezId, dilimler:[{ad,ikon,renk,tutar}], qalan, merkezHtml, bosYazi, evvelki }
// "qalan" > 0 olarsa, ayrılmış məbləğdən qalan hissə açıq boz dilim kimi çəkilir.
function aylikDonutCiz(cfg) {
  const canvas = document.getElementById(cfg.canvasId);
  if (!canvas) return null;
  const sarici = canvas.parentElement;
  const bosMesaj = document.getElementById(cfg.bosMesajId);
  const merkez = document.getElementById(cfg.merkezId);
  if (cfg.evvelki) { cfg.evvelki.destroy(); }

  const goster = (mesaj) => {
    sarici.style.display = 'none';
    if (bosMesaj) { bosMesaj.style.display = 'block'; bosMesaj.innerText = mesaj; }
  };
  if (typeof Chart === 'undefined') { goster(tr('dash.qrafikInternetLazimdir', 'Qrafik üçün internet lazımdır.')); return null; }

  const dilimler = cfg.dilimler.filter(d => d.tutar > 0);
  const qalan = cfg.qalan > 0 ? cfg.qalan : 0;
  if (!dilimler.length && !qalan) { goster(cfg.bosYazi); return null; }

  sarici.style.display = '';
  if (bosMesaj) bosMesaj.style.display = 'none';
  if (merkez) merkez.innerHTML = cfg.merkezHtml;

  const labels = dilimler.map(d => d.ikon + ' ' + d.ad);
  const data = dilimler.map(d => Number(d.tutar.toFixed(2)));
  const renkler = dilimler.map(d => d.renk);
  if (qalan) {
    labels.push(tr('aylik.qaliq', 'Qalıq'));
    data.push(Number(qalan.toFixed(2)));
    renkler.push(cssVar('--line') || '#e3e7ee');
  }
  return new Chart(canvas.getContext('2d'), {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: renkler, borderColor: cssVar('--panel') || '#ffffff', borderWidth: 2 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: {
        legend: { display: false }, // rəng izahı aşağıdakı siyahıdadır
        tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}: ${ctx.parsed.toFixed(2)} AZN` } }
      }
    }
  });
}

// Dairənin altındakı kateqoriya siyahısı (rəng zolağı ilə)
function aylikSiyahiDoldur(elId, siraliKat, cemi) {
  const listEl = document.getElementById(elId);
  if (!listEl) return;
  listEl.innerHTML = '';
  const maxTutar = siraliKat.reduce((m, k) => Math.max(m, k.tutar), 0);
  siraliKat.forEach(k => {
    const barYuzde = maxTutar > 0 ? (k.tutar / maxTutar) * 100 : 0;
    const cemYuzde = cemi > 0 ? (k.tutar / cemi) * 100 : 0;
    const row = document.createElement('div');
    row.className = 'hesabat-row';
    row.innerHTML = `<div class="hesabat-row-top"><span>${escapeHtml(k.ikon)} ${escapeHtml(k.ad)}</span><span>${k.tutar.toFixed(2)} AZN · ${cemYuzde.toFixed(0)}%</span></div>
      <div class="hesabat-bar-bg"><div class="hesabat-bar-fill" style="width:${barYuzde}%; background:${escapeHtml(k.renk)};"></div></div>`;
    listEl.appendChild(row);
  });
}

// Bu ayın gün-gün xərc trendini xətt qrafik kimi göstərir.
function aylikTrendChartGoster() {
  const canvas = document.getElementById('aylikTrendCanvas');
  if (!canvas) return;
  if (typeof Chart === 'undefined') return;
  if (aylikTrendChart) { aylikTrendChart.destroy(); aylikTrendChart = null; }

  const indi = new Date();
  const buIl = indi.getFullYear(), buAy = indi.getMonth();
  const buGunSayi = indi.getDate();
  const gunlukToplamlar = new Array(buGunSayi).fill(0);
  giderler.forEach(g => {
    if (g.aylikRef) return;
    if (kategoriAylikdirmi(g.kategori)) return; // günlük trend: aylıq sabit xərcləri (Azercell, bərbər...) qatmırıq
    const t = new Date(g.tamTarix);
    if (t.getFullYear() === buIl && t.getMonth() === buAy) {
      const gunIndex = t.getDate() - 1;
      if (gunIndex >= 0 && gunIndex < buGunSayi) gunlukToplamlar[gunIndex] += g.tutar;
    }
  });

  const navyRengi = cssVar('--accent') || '#40a9b0';
  const muted = cssVar('--muted') || '#7a6a6e';
  const lineRengi = cssVar('--line') || '#e3e7ee';

  aylikTrendChart = new Chart(canvas.getContext('2d'), {
    type: 'line',
    data: {
      labels: gunlukToplamlar.map((_, i) => String(i + 1)),
      datasets: [{
        label: tr('aylik.gunlukXerc', 'Gündəlik xərc'),
        data: gunlukToplamlar.map(v => Number(v.toFixed(2))),
        borderColor: navyRengi,
        backgroundColor: cssVar('--accent-track') || 'rgba(201,206,214,0.14)',
        fill: true,
        tension: 0.3,
        pointRadius: 2
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx) => `${ctx.parsed.y.toFixed(2)} AZN` } }
      },
      scales: {
        x: { ticks: { color: muted, font: { size: 10 } }, grid: { color: lineRengi } },
        y: { ticks: { color: muted, font: { size: 10 } }, grid: { color: lineRengi }, beginAtZero: true }
      }
    }
  });
}

function aylikHesabatPaneliniAc() { aylikHesabatGoster(); modalAc('aylikHesabatModal'); }
function aylikHesabatPaneliniKapat() { modalKapat('aylikHesabatModal'); navAktifGuncelle('ana'); }

function aylikHesabatGoster() {
  const { buAyToplam, kecenAyToplam, buAyCemi } = aylikHesabatVerisi();
  document.getElementById('aylikHesabatCemi').innerText = buAyCemi.toFixed(2) + ' AZN';

  // Kateqoriyaları günlük (tiksiz) və aylıq sabit (tikli) qruplara böl
  const butunKat = kategoriler
    .map(k => ({ ad: k.ad, ikon: k.ikon, renk: k.renk, aylik: !!k.aylik, tutar: buAyToplam[k.ad] || 0 }))
    .filter(k => k.tutar > 0)
    .sort((a, b) => b.tutar - a.tutar);
  const gunlukKat = butunKat.filter(k => !k.aylik);
  const sabitKat = butunKat.filter(k => k.aylik);

  // Yekunlar (silinmiş / adı dəyişmiş kateqoriyaların xərcləri də günlük sayılır)
  let gunlukCemi = 0, sabitCemi = 0;
  Object.keys(buAyToplam).forEach(ad => {
    if (kategoriAylikdirmi(ad)) sabitCemi += buAyToplam[ad]; else gunlukCemi += buAyToplam[ad];
  });
  const digerTutar = Math.round((gunlukCemi - gunlukKat.reduce((acc, k) => acc + k.tutar, 0)) * 100) / 100;
  if (digerTutar > 0) gunlukKat.push({ ad: tr('ana.diger', 'Digər'), ikon: '', renk: cssVar('--faint') || '#5f656d', tutar: digerTutar });

  const altEl = document.getElementById('aylikHesabatAlt');
  if (altEl) altEl.innerText = tr('aylik.gunlukVeSabitCemi', 'Gündəlik: {gunluk} AZN · Aylıq sabit: {sabit} AZN', { gunluk: gunlukCemi.toFixed(2), sabit: sabitCemi.toFixed(2) });

  // ---- 1-ci dairə: günlük xərclər (ay üzrə ayrılan məbləğə qarşı) ----
  const indi = new Date();
  const aydakiGunSayi = new Date(indi.getFullYear(), indi.getMonth() + 1, 0).getDate(); // 30 gün → 600, 31 gün → 620 (limit 20 olsa)
  const limitVar = (typeof gunlukLimit === 'number' && gunlukLimit > 0);
  const ayButcesi = limitVar ? gunlukLimit * aydakiGunSayi : 0;
  let gunlukMerkez;
  if (limitVar) {
    const yuzde = ayButcesi > 0 ? (gunlukCemi / ayButcesi) * 100 : 0;
    const asib = gunlukCemi > ayButcesi;
    const yaz = qisaRaqem(gunlukCemi) + ' / ' + qisaRaqem(ayButcesi);
    const yazOlcu = yaz.length <= 9 ? 20 : (yaz.length <= 12 ? 17 : 14);
    gunlukMerkez = `<div class="t">${escapeHtml(tr('aylik.merkezGunluk', 'Gündəlik · AZN'))}</div><div class="b ${asib ? 'over' : ''}" style="font-size:${yazOlcu}px;">${escapeHtml(yaz)}</div><div class="s ${asib ? 'over' : ''}">${escapeHtml(tr('aylik.faizIstifade', '{faiz}% istifadə olunub', { faiz: yuzde.toFixed(0) }))}</div>`;
  } else {
    gunlukMerkez = `<div class="t">${escapeHtml(tr('aylik.merkezGunluk', 'Gündəlik · AZN'))}</div><div class="b" style="font-size:20px;">${escapeHtml(qisaRaqem(gunlukCemi))}</div><div class="s">${escapeHtml(tr('aylik.limitYoxdur', 'Limit təyin edilməyib'))}</div>`;
  }
  aylikGunlukChart = aylikDonutCiz({
    canvasId: 'aylikGunlukCanvas', bosMesajId: 'aylikGunlukBosMesaj', merkezId: 'aylikGunlukMerkez',
    dilimler: gunlukKat, qalan: limitVar ? Math.max(0, ayButcesi - gunlukCemi) : 0,
    merkezHtml: gunlukMerkez, bosYazi: tr('aylik.gunlukXercYoxdur', 'Bu ay hələ gündəlik xərc yoxdur.'), evvelki: aylikGunlukChart
  });
  const gunlukCaptionEl = document.getElementById('aylikGunlukCaption');
  if (gunlukCaptionEl) {
    gunlukCaptionEl.innerText = limitVar
      ? tr('aylik.butceIzah', '{gun} gün × {limit} AZN = {cem} AZN aylıq büdcə', { gun: aydakiGunSayi, limit: qisaRaqem(gunlukLimit), cem: qisaRaqem(ayButcesi) })
      : tr('aylik.butceYoxIzah', 'Ayarlarda gündəlik limit təyin et — aylıq büdcə burada görünəcək.');
  }
  aylikSiyahiDoldur('aylikGunlukListesi', gunlukKat, gunlukCemi);

  // ---- 2-ci dairə: aylıq sabit xərclər ----
  const sabitMerkez = `<div class="t">${escapeHtml(tr('aylik.merkezSabit', 'Aylıq sabit · AZN'))}</div><div class="b" style="font-size:20px;">${escapeHtml(qisaRaqem(sabitCemi))}</div><div class="s">${escapeHtml(tr('aylik.kateqoriyaSayi', '{say} kateqoriya', { say: sabitKat.length }))}</div>`;
  const hecBiriAylikDeyil = !kategoriler.some(k => k.aylik);
  aylikSabitChart = aylikDonutCiz({
    canvasId: 'aylikSabitCanvas', bosMesajId: 'aylikSabitBosMesaj', merkezId: 'aylikSabitMerkez',
    dilimler: sabitKat, qalan: 0, merkezHtml: sabitMerkez,
    bosYazi: hecBiriAylikDeyil
      ? tr('aylik.sabitKatYoxdur', 'Heç bir kateqoriya aylıq sabit kimi seçilməyib. Ayarlar → Kateqoriyalar bölməsində işarəsini aktiv et.')
      : tr('aylik.sabitXercYoxdur', 'Bu ay aylıq sabit xərc yoxdur.'),
    evvelki: aylikSabitChart
  });
  aylikSiyahiDoldur('aylikSabitListesi', sabitKat, sabitCemi);

  aylikTrendChartGoster();

  const trendEl = document.getElementById('aylikHesabatTrend');
  if (trendEl) {
    trendEl.innerHTML = '';
    if (Object.keys(kecenAyToplam).length === 0) {
      trendEl.innerHTML = `<div class="breakdown-empty">${tr('aylik.muqayiseUcunMelumatYoxdur', 'Müqayisə üçün keçən aya aid məlumat yoxdur.')}</div>`;
    } else {
      const hamiKatAdlari = new Set([...Object.keys(buAyToplam), ...Object.keys(kecenAyToplam)]);
      const trendSiyahi = [];
      hamiKatAdlari.forEach(ad => {
        const kat = kategoriler.find(k => k.ad === ad);
        const bu = buAyToplam[ad] || 0;
        const kecen = kecenAyToplam[ad] || 0;
        if (bu === 0 && kecen === 0) return;
        let deyisim, yeni = false, bitib = false;
        if (kecen === 0) { yeni = true; deyisim = 100; }
        else if (bu === 0) { bitib = true; deyisim = -100; }
        else { deyisim = ((bu - kecen) / kecen) * 100; }
        trendSiyahi.push({ ad, ikon: kat ? kat.ikon : '', deyisim, yeni, bitib });
      });
      trendSiyahi.sort((a, b) => Math.abs(b.deyisim) - Math.abs(a.deyisim));
      trendSiyahi.forEach(t => {
        let etiket, sinif;
        if (t.yeni) { etiket = tr('aylik.trendYeni', 'Yeni'); sinif = 'trend-new'; }
        else if (t.bitib) { etiket = tr('aylik.trendKesildi', 'Bu ay yoxdur'); sinif = 'trend-down'; }
        else { etiket = (t.deyisim > 0 ? '↑ ' : '↓ ') + Math.abs(t.deyisim).toFixed(0) + '%'; sinif = t.deyisim > 0 ? 'trend-up' : 'trend-down'; }
        const div = document.createElement('div');
        div.className = 'trend-row';
        div.innerHTML = `<span>${escapeHtml(t.ikon)} ${escapeHtml(t.ad)}</span><span class="${sinif}">${escapeHtml(etiket)}</span>`;
        trendEl.appendChild(div);
      });
    }
  }
}

// ==== Son əməliyyatlar (tam tarixçə) ====
// ==== Son əməliyyatlar: filtr (kateqoriya + tarix aralığı), keçmiş xərcləri dəyiş/sil ====
// Açılanda defolt olaraq yalnız bu gün göstərilir. Filtr yalnız bu səhifənin vəziyyətidir, buluda yazılmır.
let sonFiltr = { kat: '', bas: '', son: '' };

function sonFiltrAraliq(nov) {
  const bugun = new Date(); bugun.setHours(0, 0, 0, 0);
  const b = yerliTarixStr(bugun);
  if (nov === 'bugun') return { bas: b, son: b };
  if (nov === '7gun') { const d = new Date(bugun); d.setDate(d.getDate() - 6); return { bas: yerliTarixStr(d), son: b }; }
  if (nov === 'buAy') { const d = new Date(bugun.getFullYear(), bugun.getMonth(), 1); return { bas: yerliTarixStr(d), son: b }; }
  return { bas: '', son: '' }; // hamısı
}

function sonEmeliyyatlarPaneliniAc() {
  const a = sonFiltrAraliq('bugun');
  sonFiltr = { kat: '', bas: a.bas, son: a.son };
  sonFiltrFormuDoldur();
  modalAc('sonEmeliyyatlarModal');
  sonEmeliyyatlarCiz();
}

function sonFiltrFormuDoldur() {
  const sel = document.getElementById('sonFiltrKat');
  if (sel) {
    // Mövcud kateqoriyalar + tarixçədə qalan (silinmiş) kateqoriya adları
    const adlar = kategoriler.map(k => k.ad);
    giderler.forEach(g => { if (!g.aylikRef && g.kategori && adlar.indexOf(g.kategori) === -1) adlar.push(g.kategori); });
    sel.innerHTML = `<option value="">${escapeHtml(tr('sonEm.hamisiKat', 'Bütün kateqoriyalar'))}</option>` +
      adlar.map(ad => `<option value="${escapeHtml(ad)}"${ad === sonFiltr.kat ? ' selected' : ''}>${escapeHtml(ad)}</option>`).join('');
  }
  const bugunStr = yerliTarixStr(new Date());
  const basEl = document.getElementById('sonFiltrBas'), sonEl = document.getElementById('sonFiltrSon');
  if (basEl) { basEl.value = sonFiltr.bas; basEl.max = bugunStr; }
  if (sonEl) { sonEl.value = sonFiltr.son; sonEl.max = bugunStr; }
}

// Formdan filtri oxu (kateqoriya / tarix dəyişəndə çağırılır)
function sonFiltrDeyisdi() {
  const sel = document.getElementById('sonFiltrKat');
  let bas = document.getElementById('sonFiltrBas').value || '';
  let son = document.getElementById('sonFiltrSon').value || '';
  if (bas && son && bas > son) { const x = bas; bas = son; son = x; } // tərs seçilibsə yerini dəyiş
  sonFiltr = { kat: sel ? sel.value : '', bas, son };
  sonFiltrFormuDoldur();
  sonEmeliyyatlarCiz();
}

// Sürətli seçim düymələri: Bu gün / 7 gün / Bu ay / Hamısı
function sonFiltrSec(nov) {
  const a = sonFiltrAraliq(nov);
  sonFiltr.bas = a.bas; sonFiltr.son = a.son;
  sonFiltrFormuDoldur();
  sonEmeliyyatlarCiz();
}

function sonEmeliyyatlarCiz() {
  const listEl = document.getElementById('sonEmeliyyatlarListesi');
  if (!listEl) return;
  const bas = sonFiltr.bas, son = sonFiltr.son;
  let html = '', say = 0, cem = 0;
  giderler.forEach((g, index) => {
    if (g.aylikRef) return;
    if (sonFiltr.kat && g.kategori !== sonFiltr.kat) return;
    const gun = g.tamTarix ? yerliTarixStr(new Date(g.tamTarix)) : '';
    if (bas && (!gun || gun < bas)) return;
    if (son && (!gun || gun > son)) return;
    html += xercSetirHtml(g, index, true); // burada keçmiş xərcləri də dəyişmək / silmək olar
    say++; cem += g.tutar;
  });
  listEl.innerHTML = html || '<li class="empty-note">' + escapeHtml(tr('sonEm.tapilmadi', 'Seçdiyin filtrə uyğun xərc yoxdur.')) + '</li>';
  const netEl = document.getElementById('sonFiltrNetice');
  if (netEl) netEl.innerText = tr('sonEm.netice', '{say} əməliyyat · {cem} AZN', { say, cem: pulYuvarla(cem).toFixed(2) });
  // Aktiv sürətli seçim düyməsini işarələ
  const aktiv = ['bugun', '7gun', 'buAy', 'hamisi'].find(n => { const a = sonFiltrAraliq(n); return a.bas === bas && a.son === son; });
  document.querySelectorAll('#sonFiltrCips [data-nov]').forEach(b => b.classList.toggle('aktiv', b.dataset.nov === aktiv));
}
function sonEmeliyyatlarPaneliniKapat() { modalKapat('sonEmeliyyatlarModal'); ayarlarPaneliniAc(); }

// ==== Hesablar: Cash / Kredi kartı / Debit bank + transfer ====
function hesabAdi(tip) {
  if (tip === 'nagd') return tr('hesabAd.nagd', 'Nağd pul');
  if (tip === 'debit') return tr('hesabAd.debit', 'Debet kartı');
  if (tip === 'depozit') return tr('hesabAd.depozit', 'Depozit');
  if (tip === 'kredit') return tr('hesabAd.kredit', 'Kredit kartı');
  if (tip === 'krediXett') return tr('hesabAd.krediXett', 'Kredit xətti');
  return tip;
}
function hesabIkonu(tip) {
  // Emoji əvəzinə xətti SVG (HTML qaytarır — escapeHtml ilə İŞLƏDİLMƏMƏLİDİR). <option> mətnlərində istifadə olunmur.
  return ikon(['nagd', 'debit', 'depozit', 'kredit', 'krediXett'].indexOf(tip) !== -1 ? tip : 'hesablar');
}

// ---- "+" ilə hesab əlavə etmə: 5 seçim ----
function hesabSecSiyahi() {
  return [
    { tip: 'nagd', ad: tr('hesabAd.nagd', 'Nağd pul'), izah: tr('hesabSec.izahYalnizPlus', 'Yalnız müsbət balans') },
    { tip: 'debit', ad: tr('hesabSec.adDebit', 'Debet kartı'), izah: tr('hesabSec.izahYalnizPlus', 'Yalnız müsbət balans') },
    { tip: 'depozit', ad: tr('hesabSec.adDepozit', 'Depozit'), izah: tr('hesabSec.izahPlusMinus', 'Balans müsbət və ya mənfi ola bilər') },
    { tip: 'kredit', ad: tr('hesabSec.adKredit', 'Kredit kartı'), izah: tr('hesabSec.izahKredit', 'Limit və cari borc') },
    { tip: 'krediXett', ad: tr('hesabAd.krediXett', 'Kredit xətti'), izah: tr('hesabSec.izahKrediXett', 'Taksit sayı, başlanğıc tarixi və aylıq ödəniş') }
  ];
}

function hesabSecModalAc() {
  const konteyner = document.getElementById('hesabSecListesi');
  if (!konteyner) return;
  konteyner.innerHTML = '';
  hesabSecSiyahi().forEach(h => {
    const eklenib = (h.tip === 'kredit') ? (typeof kreditLimit === 'number')
      : (h.tip === 'krediXett') ? !!krediBorcu
      : !!hesabEklenib[h.tip];
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hesab-sec-item';
    btn.onclick = () => hesabSecEt(h.tip);
    btn.innerHTML = `<span class="ic">${ikon(h.tip, 22)}</span><span style="flex:1;">${escapeHtml(h.ad)}<small>${eklenib ? escapeHtml(tr('hesabSec.artiqElave', 'Artıq əlavə olunub — dəyişmək üçün toxun')) : escapeHtml(h.izah)}</small></span>`;
    konteyner.appendChild(btn);
  });
  modalAc('hesabSecModal');
}

function hesabSecEt(tip) {
  modalKapat('hesabSecModal');
  if (tip === 'nagd' || tip === 'debit' || tip === 'depozit') {
    hesabDuzeltModalAc(tip);
  } else if (tip === 'kredit') {
    balanceModalAc();
  } else if (tip === 'krediXett') {
    krediBorcuDuzeltModalAc();
  }
}

function hesablarPaneliniAc() {
  hesablarGoster();
  krediBorcuGoster();
  modalAc('hesablarModal');
}
function hesablarPaneliniKapat() {
  modalKapat('hesablarModal');
  navAktifGuncelle('ana');
  ekraniGuncelle();
}

function hesablarGoster() {
  const konteyner = document.getElementById('hesablarKartlari');
  if (!konteyner) return;
  const limit = (typeof kreditLimit === 'number') ? kreditLimit : 0;
  const borc = (typeof anaHesap === 'number') ? anaHesap : 0;
  const muvcud = limit + borc; // istifadə edilə bilən limit

  let html = '';
  if (hesabEklenib.nagd) {
    html += `
    <div class="modal-item">
      <div class="field-row between">
        <div class="field-row"><span class="hesab-ikon">${ikon('nagd')}</span><b>${escapeHtml(hesabAdi('nagd'))}</b></div>
        <button class="btn btn-ghost" onclick="hesabDuzeltModalAc('nagd')" style="padding:5px 10px;">${escapeHtml(tr('umumi.duzelt', 'Dəyiş'))}</button>
      </div>
      <div style="font-size:19px; font-weight:700; color:var(--brand-ink);">${nagdBakiye.toFixed(2)} AZN</div>
    </div>`;
  }
  if (hesabEklenib.debit) {
    html += `
    <div class="modal-item">
      <div class="field-row between">
        <div class="field-row"><span class="hesab-ikon">${ikon('debit')}</span><b>${escapeHtml(hesabAdi('debit'))}</b></div>
        <button class="btn btn-ghost" onclick="hesabDuzeltModalAc('debit')" style="padding:5px 10px;">${escapeHtml(tr('umumi.duzelt', 'Dəyiş'))}</button>
      </div>
      <div style="font-size:19px; font-weight:700; color:var(--brand-ink);">${debitBakiye.toFixed(2)} AZN</div>
    </div>`;
  }
  if (hesabEklenib.depozit) {
    html += `
    <div class="modal-item">
      <div class="field-row between">
        <div class="field-row"><span class="hesab-ikon">${ikon('depozit')}</span><b>${escapeHtml(hesabAdi('depozit'))}</b></div>
        <button class="btn btn-ghost" onclick="hesabDuzeltModalAc('depozit')" style="padding:5px 10px;">${escapeHtml(tr('umumi.duzelt', 'Dəyiş'))}</button>
      </div>
      <div style="font-size:19px; font-weight:700; color:${depozitBakiye < 0 ? 'var(--danger)' : 'var(--brand-ink)'};">${depozitBakiye.toFixed(2)} AZN</div>
    </div>`;
  }
  if (typeof kreditLimit === 'number') {
    html += `
    <div class="modal-item">
      <div class="field-row between">
        <div class="field-row"><span class="hesab-ikon">${ikon('kredit')}</span><b>${escapeHtml(hesabAdi('kredit'))}</b></div>
        <button class="btn btn-ghost" onclick="hesablarPaneliniKapat(); balanceModalAc();" style="padding:5px 10px;">${escapeHtml(tr('umumi.duzelt', 'Dəyiş'))}</button>
      </div>
      <div style="font-size:19px; font-weight:700; color:${borc < 0 ? 'var(--danger)' : 'var(--brand-ink)'};">${borc.toFixed(2)} AZN</div>
      <div style="font-size:12px; color:var(--muted);">${escapeHtml(tr('hesablar.limitVeMuvcud', 'Limit: {limit} AZN · İstifadə edilə bilər: {muvcud} AZN', { limit: limit.toFixed(2), muvcud: muvcud.toFixed(2) }))}</div>
    </div>`;
  }
  if (krediBorcu) {
    const qalan = krediBorcuQalanHesabla();
    const bitib = krediBorcu.odenmisTaksitSayi >= krediBorcu.taksitSayi;
    let btnText = tr('hesablar.buAyTaksitOde', 'Bu ayın taksitini ödə');
    let btnDisabled = false;
    if (bitib) { btnText = tr('hesablar.kreditBaglanib', 'Kredit tam ödənilib'); btnDisabled = true; }
    const elaveText = (krediBorcu.elaveOdenis > 0) ? ' · ' + tr('hesablar.elaveOdenis', 'əlavə ödəniş: −{mebleg} AZN', { mebleg: krediBorcu.elaveOdenis.toFixed(2) }) : '';
    html += `
    <div class="modal-item">
      <div class="field-row between">
        <div class="field-row"><span class="hesab-ikon">${ikon('krediXett')}</span><b>${escapeHtml(hesabAdi('krediXett'))}</b></div>
        <button class="btn btn-ghost" onclick="krediBorcuDuzeltModalAc()" style="padding:5px 10px;">${escapeHtml(tr('umumi.duzelt', 'Dəyiş'))}</button>
      </div>
      <div style="font-size:19px; font-weight:700; color:${qalan > 0 ? 'var(--danger)' : 'var(--brand-ink)'};">${qalan > 0 ? '-' : ''}${qalan.toFixed(2)} AZN</div>
      <div style="font-size:12px; color:var(--muted); margin-bottom:8px;">${escapeHtml(tr('hesablar.taksitOdenilib', '{odenmis}/{say} taksit ödənilib · Aylıq: {aylik} AZN', { odenmis: krediBorcu.odenmisTaksitSayi, say: krediBorcu.taksitSayi, aylik: krediBorcu.aylikMebleg.toFixed(2) }))} · ${escapeHtml(tarixFormat(krediBorcu.baslangic))}–${escapeHtml(tarixFormat(krediBorcu.bitis))}${escapeHtml(elaveText)}</div>
      <button class="btn btn-primary" ${btnDisabled ? 'disabled' : ''} onclick="krediBorcuOdeModalAc()" style="width:100%;">${escapeHtml(btnText)}</button>
    </div>`;
  }
  if (!html) {
    html = '<p class="empty-note" style="padding:8px 0;">' + escapeHtml(tr('hesablar.hecHesabYox', 'Hələ heç bir hesab yoxdur. Yuxarıdakı + düyməsi ilə başla.')) + '</p>';
  }
  konteyner.innerHTML = html;
  hesabTransferTarixceGoster();
}

function hesabTransferTarixceGoster() {
  const konteyner = document.getElementById('hesabTransferTarixce');
  if (!konteyner) return;
  if (hesabTransferleri.length === 0) {
    konteyner.innerHTML = '<p class="empty-note" style="padding:8px 0;">' + escapeHtml(tr('hesablar.hecTransferYox', 'Hələ köçürmə olmayıb.')) + '</p>';
    return;
  }
  konteyner.innerHTML = '';
  hesabTransferleri.forEach((t, index) => {
    const row = document.createElement('div');
    row.className = 'list-item';
    row.innerHTML = `
      <div>
        <span class="cat">${escapeHtml(hesabAdi(t.menbeTip))} → ${escapeHtml(hesabAdi(t.hedefTip))}${t.taksit ? ' ' + escapeHtml(tr('hesablar.taksitSuffix', '(taksit)')) : ''}</span>
        <span class="time">${escapeHtml(t.tamTarix ? tarixSaatYaz(new Date(t.tamTarix)) : t.tarix)}</span>
      </div>
      <div class="right">
        <span class="amt">${t.tutar.toFixed(2)} AZN</span>
        <button class="sira-btn sil" onclick="transferSilOnayla(${index})" aria-label="${escapeHtml(tr('transfer.legvBaslik', 'Köçürməni ləğv et'))}">${ikon('sil', 17)}</button>
      </div>
    `;
    konteyner.appendChild(row);
  });
}

let hesabDuzeltTipi = null;
function hesabDuzeltModalAc(tip) {
  hesabDuzeltTipi = tip;
  document.getElementById('hesabDuzeltBaslik').innerText = tr('hesabDuzelt.baslikTip', '{ad} — balans', { ad: hesabAdi(tip) });
  document.getElementById('hesabDuzeltInput').value = hesabBakiyesiOxu(tip);
  document.getElementById('hesabDuzeltError').innerText = '';
  modalAc('hesabDuzeltModal');
}
function hesabDuzeltOnayla() {
  const val = document.getElementById('hesabDuzeltInput').value;
  const p = parseFloat((val || '').replace(',', '.'));
  const errEl = document.getElementById('hesabDuzeltError');
  if (isNaN(p)) {
    errEl.innerText = tr('umumi.duzgunReqem', 'Düzgün rəqəm yaz.');
    return;
  }
  if ((hesabDuzeltTipi === 'nagd' || hesabDuzeltTipi === 'debit') && p < 0) {
    errEl.innerText = tr('hesabDuzelt.yalnizMusbet', '{ad} üçün məbləğ yalnız müsbət ola bilər.', { ad: hesabAdi(hesabDuzeltTipi) });
    return;
  }
  if (hesabDuzeltTipi === 'nagd') { nagdBakiye = p; hesabEklenib.nagd = true; }
  else if (hesabDuzeltTipi === 'debit') { debitBakiye = p; hesabEklenib.debit = true; }
  else if (hesabDuzeltTipi === 'depozit') { depozitBakiye = p; hesabEklenib.depozit = true; }
  veriKaydet();
  modalKapat('hesabDuzeltModal');
  hesablarGoster();
}

function hesabBakiyesiOxu(tip) {
  if (tip === 'nagd') return nagdBakiye;
  if (tip === 'debit') return debitBakiye;
  if (tip === 'depozit') return depozitBakiye;
  if (tip === 'kredit') return (typeof anaHesap === 'number') ? anaHesap : 0;
  return 0;
}
function hesabBakiyesiDeyis(tip, deltaMenbe) {
  // deltaMenbe: mənfi işarəli dəyişiklik menbə üçün, müsbət hədəf üçün eyni funksiyada tutar veriləcək
  // Nəticə qəpiyə yuvarlaqlaşdırılır (üzən nöqtə xətası yığılmasın).
  if (tip === 'nagd') nagdBakiye = pulYuvarla(nagdBakiye + deltaMenbe);
  else if (tip === 'debit') debitBakiye = pulYuvarla(debitBakiye + deltaMenbe);
  else if (tip === 'depozit') depozitBakiye = pulYuvarla(depozitBakiye + deltaMenbe);
  else if (tip === 'kredit') anaHesap = pulYuvarla(((typeof anaHesap === 'number') ? anaHesap : 0) + deltaMenbe);
}

// Yalnız "+" ilə əlavə edilmiş hesablar seçilə bilər (əks halda pul görünməyən hesaba düşürdü).
function transferHesabVarMi(tip) {
  if (tip === 'kredit') return typeof kreditLimit === 'number';
  if (tip === 'krediXett') return !!krediBorcu;
  return !!hesabEklenib[tip];
}

function transferModalAc() {
  const menbeler = ['nagd', 'debit', 'depozit', 'kredit'].filter(transferHesabVarMi);
  const hedefler = ['nagd', 'debit', 'depozit', 'kredit', 'krediXett'].filter(transferHesabVarMi);
  const doldur = (id, siyahi) => {
    const sel = document.getElementById(id);
    sel.innerHTML = '';
    siyahi.forEach((tip) => {
      const opt = document.createElement('option');
      opt.value = tip;
      opt.textContent = hesabAdi(tip) + (tip === 'krediXett' ? ' ' + tr('transfer.odenisSuffix', '(ödəniş)') : '');
      sel.appendChild(opt);
    });
  };
  doldur('transferMenbe', menbeler);
  doldur('transferHedef', hedefler);
  const menbeSel = document.getElementById('transferMenbe');
  const hedefSel = document.getElementById('transferHedef');
  if (menbeler.indexOf('nagd') !== -1) menbeSel.value = 'nagd';
  const ferqli = hedefler.filter((t) => t !== menbeSel.value);
  if (ferqli.length) hedefSel.value = (ferqli.indexOf('kredit') !== -1) ? 'kredit' : ferqli[0];
  document.getElementById('transferMebleg').value = '';
  document.getElementById('transferError').innerText = (menbeler.length && ferqli.length)
    ? '' : tr('transfer.ikiHesabLazim', 'Köçürmə üçün ən azı iki hesab əlavə et (Hesablarım → +).');
  modalAc('transferModal');
}

function transferOnayla() {
  const menbeTip = document.getElementById('transferMenbe').value;
  const hedefTip = document.getElementById('transferHedef').value;
  const errEl = document.getElementById('transferError');
  const tutarVal = document.getElementById('transferMebleg').value;
  const tutar = pulYuvarla(parseFloat((tutarVal || '').replace(',', '.'))); // NaN → 0 → aşağıda xəta verir

  if (!menbeTip || !hedefTip || !transferHesabVarMi(menbeTip) || !transferHesabVarMi(hedefTip)) {
    errEl.innerText = tr('transfer.hesabElaveEdilmeyib', 'Seçdiyin hesab hələ əlavə edilməyib.');
    return;
  }
  if (menbeTip === hedefTip) {
    errEl.innerText = tr('transfer.eyniHesab', 'Göndərən və alan hesab eyni ola bilməz.');
    return;
  }
  if (isNaN(tutar) || tutar <= 0) {
    errEl.innerText = tr('umumi.duzgunMebleg', 'Düzgün məbləğ yaz.');
    return;
  }
  if (hedefTip === 'krediXett' && !krediBorcu) {
    errEl.innerText = tr('transfer.evvelKrediXett', 'Əvvəlcə + ilə "Kredit xətti" əlavə et.');
    return;
  }
  if (menbeTip !== 'kredit') {
    const mevcud = hesabBakiyesiOxu(menbeTip);
    if (pulYuvarla(tutar) > pulYuvarla(mevcud)) {
      errEl.innerText = tr('transfer.balansYoxdur', '{ad} hesabında kifayət qədər vəsait yoxdur.', { ad: hesabAdi(menbeTip) });
      return;
    }
  } else {
    const limit = (typeof kreditLimit === 'number') ? kreditLimit : 0;
    const borc = (typeof anaHesap === 'number') ? anaHesap : 0;
    const muvcudLimit = limit + borc; // kredit kartında istifadə edilə bilən limit
    if (pulYuvarla(tutar) > pulYuvarla(muvcudLimit)) {
      errEl.innerText = tr('transfer.limitYoxdur', 'Kredit kartında kifayət qədər limit yoxdur.');
      return;
    }
  }

  hesabBakiyesiDeyis(menbeTip, -tutar);
  if (hedefTip === 'krediXett') {
    // Kredit xəttinə birbaşa ödəniş: mənbədən məbləğ çıxılır, xəttin qalıq borcundan
    // eyni məbləğ düşülür (əlavə ödəniş kimi izlənilir — taksit sayı dəyişmir, qalıq stabil görünür).
    krediBorcu.elaveOdenis = pulYuvarla((krediBorcu.elaveOdenis || 0) + tutar);
  } else {
    hesabBakiyesiDeyis(hedefTip, tutar);
  }

  const simdi = new Date();
  hesabTransferleri.unshift({
    menbeTip, hedefTip, tutar,
    tamTarix: simdi.toISOString(),
    tarix: tarixSaatYaz(simdi)
  });

  veriKaydet();
  modalKapat('transferModal');
  hesablarGoster();
  krediBorcuGoster();
  ekraniGuncelle();
}

function transferSilOnayla(index) {
  const t = hesabTransferleri[index]; // sıra nömrəsi yox, qeydin özünü izləyirik (arada sinxron olsa səhv transfer ləğv edilməsin)
  if (!t) return;
  confirmAc(tr('transfer.legvBaslik', 'Köçürməni ləğv et'), tr('transfer.legvSual', '{menbe} → {hedef} ({tutar} AZN) köçürməsi geri qaytarılsın?', { menbe: hesabAdi(t.menbeTip), hedef: hesabAdi(t.hedefTip), tutar: t.tutar.toFixed(2) }), () => {
    const idx = hesabTransferleri.indexOf(t);
    if (idx === -1) { alertAc(tr('umumi.siyahiYenilendiXeta', 'Siyahı bu arada yeniləndi. Yenidən cəhd et.')); hesablarGoster(); return; }
    hesabBakiyesiDeyis(t.menbeTip, t.tutar);
    if (t.taksit) {
      // Taksit ödənişi geri qaytarılır: ödənilmiş taksit sayı 1 azalır
      if (krediBorcu && krediBorcu.odenmisTaksitSayi > 0) krediBorcu.odenmisTaksitSayi -= 1;
    } else if (t.hedefTip === 'krediXett') {
      if (krediBorcu) krediBorcu.elaveOdenis = Math.max(0, pulYuvarla((krediBorcu.elaveOdenis || 0) - t.tutar));
    } else {
      hesabBakiyesiDeyis(t.hedefTip, -t.tutar);
    }
    hesabTransferleri.splice(idx, 1);
    veriKaydet();
    hesablarGoster();
    krediBorcuGoster();
    ekraniGuncelle();
  });
}

// Tətbiq email/şifrə girişi ilə açılır: uygulamaGirisBaslat() auth vəziyyətini
// izləyir və yalnız giriş edildikdə veriYukle()-i özü çağırır.
uygulamaGirisBaslat();
kilidYoxla();

// ==== PWA: Service Worker qeydiyyatı ====
// Yalnız http(s):// üzərində işləyir; file:// ilə açsan səssizcə keçilir.
if ('serviceWorker' in navigator && (location.protocol === 'http:' || location.protocol === 'https:')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch((e) => console.warn('SW qeydiyyatı alınmadı:', e));
  });
}

// "Yenilə" düyməsindən sonra URL-də qalan ?yenile=... parametrini təmizlə.
// Yoxsa PWA scope xaricində sayılıb normal browser tab-da açıla bilər.
window.addEventListener('load', () => {
  if (location.search && location.search.indexOf('yenile=') !== -1) {
    history.replaceState({}, '', location.pathname);
  }
});
