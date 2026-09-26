/* Safe Money — tətbiq kilidi (Face ID / PIN) */
let kilidVar = localStorage.getItem('kilit_aktiv') === '1';
let kilidCredentialId = localStorage.getItem('kilit_webauthn_id') || null;
let kilidPin = localStorage.getItem('kilit_pin') || null;

function kilidYoxla() {
  if (!kilidVar) return;
  const ekran = document.getElementById('kilidEkrani');
  const faceBtn = document.getElementById('kilidFaceBtn');
  const pinWrap = document.getElementById('kilidPinWrap');
  const hint = document.getElementById('kilidHint');
  ekran.classList.add('active');
  if (kilidCredentialId && window.PublicKeyCredential) {
    faceBtn.style.display = 'block';
    pinWrap.style.display = 'none';
    hint.innerText = tr('kilid.faceIdHint', 'Davam etmək üçün Face ID / Touch ID ilə təsdiqlə.');
    setTimeout(kilidWebAuthnDogrula, 350); // avtomatik sına — bəzi brauzerlər düymə klikini gözləyəcək
  } else {
    faceBtn.style.display = 'none';
    pinWrap.style.display = 'block';
    hint.innerText = tr('kilid.pinHint', 'Davam etmək üçün PIN kodu daxil et.');
  }
}

function kilidAc() {
  document.getElementById('kilidEkrani').classList.remove('active');
  document.getElementById('kilidError').innerText = '';
}

async function kilidWebAuthnDogrula() {
  const errEl = document.getElementById('kilidError');
  errEl.innerText = '';
  if (!kilidCredentialId || !window.PublicKeyCredential) {
    document.getElementById('kilidPinWrap').style.display = 'block';
    return;
  }
  try {
    const idBytes = Uint8Array.from(atob(kilidCredentialId), c => c.charCodeAt(0));
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    await navigator.credentials.get({
      publicKey: { challenge, allowCredentials: [{ id: idBytes, type: 'public-key' }], userVerification: 'required', timeout: 60000 }
    });
    kilidAc();
  } catch (e) {
    errEl.innerText = tr('kilid.tesdiqlenmediXeta', 'Təsdiqlənmədi. Yenidən cəhd et və ya PIN koddan istifadə et.');
    if (kilidPin) document.getElementById('kilidPinWrap').style.display = 'block';
  }
}

function kilidPinIleAc() {
  const val = document.getElementById('kilidPinInput').value.trim();
  if (kilidPin && val === kilidPin) {
    document.getElementById('kilidPinInput').value = '';
    kilidAc();
  } else {
    document.getElementById('kilidError').innerText = tr('kilid.yanlisPin', 'PIN kod yanlışdır.');
  }
}

function kilidAyarGoster() {
  const sw = document.getElementById('kilidAyarSwitch');
  const lbl = document.getElementById('kilidAyarLabel');
  if (!sw || !lbl) return;
  sw.classList.toggle('on', kilidVar);
  lbl.innerHTML = kilidVar
    ? '<span class="ayarlar-ikon">' + ikon('kilid') + '</span><span class="ayarlar-metin">' + escapeHtml(tr('ayarlar.kilidAktiv', 'Tətbiq kilidi (aktiv)')) + '</span>'
    : '<span class="ayarlar-ikon">' + ikon('kilid') + '</span><span class="ayarlar-metin">' + escapeHtml(tr('ayarlar.kilidFaceIdPin', 'Tətbiq kilidi (Face ID / PIN)')) + '</span>';
  const errEl = document.getElementById('kilidAyarError');
  if (errEl) errEl.innerText = '';
}

function kilidToggle() {
  if (kilidVar) {
    confirmAc(tr('kilid.sondurBaslik', 'Kilidi söndür'), tr('kilid.sondurSual', 'Tətbiq kilidini söndürmək istəyirsən?'), () => {
      kilidVar = false; kilidCredentialId = null; kilidPin = null;
      localStorage.removeItem('kilit_aktiv');
      localStorage.removeItem('kilit_webauthn_id');
      localStorage.removeItem('kilit_pin');
      kilidAyarGoster();
    });
  } else {
    kilidKurulumBaslat();
  }
}

async function kilidKurulumBaslat() {
  const errEl = document.getElementById('kilidAyarError');
  errEl.innerText = '';
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    errEl.innerText = tr('kilid.httpsTelebOlunur', 'Face ID / Touch ID yalnız https:// ünvanında işləyir. Hələlik PIN təyin edək.');
    pinAyarlaModalAc();
    return;
  }
  if (window.PublicKeyCredential) {
    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userId = crypto.getRandomValues(new Uint8Array(16));
        const cred = await navigator.credentials.create({
          publicKey: {
            challenge,
            rp: { name: 'Safe Money' },
            user: { id: userId, name: 'istifadeci', displayName: 'Safe Money' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            // residentKey: 'discouraged' -> iOS bunu "passkey" kimi yox, adi bir WebAuthn açarı kimi
            // qeydə alır. Bu sayədə hər dəfə "Giriş Yap / Geçiş Anahtarını Kullan" marka ekranı
            // çıxmır, çağırış birbaşa Face ID/Touch ID istəyinə keçir.
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'discouraged' },
            timeout: 60000
          }
        });
        kilidCredentialId = btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
        localStorage.setItem('kilit_webauthn_id', kilidCredentialId);
        kilidVar = true;
        localStorage.setItem('kilit_aktiv', '1');
        kilidAyarGoster();
        return;
      }
    } catch (e) {
      console.warn('WebAuthn qurulmadı, PIN-ə keçilir:', e);
    }
  }
  pinAyarlaModalAc();
}

function pinAyarlaModalAc() {
  document.getElementById('pinAyarlaInput').value = '';
  document.getElementById('pinAyarlaError').innerText = '';
  modalAc('pinAyarlaModal');
}
function pinAyarlaOnayla() {
  const val = document.getElementById('pinAyarlaInput').value.trim();
  if (!/^\d{4}$/.test(val)) {
    document.getElementById('pinAyarlaError').innerText = tr('pin.dordReqemliXeta', '4 rəqəmli PIN kod yaz.');
    return;
  }
  kilidPin = val;
  localStorage.setItem('kilit_pin', val);
  kilidVar = true;
  localStorage.setItem('kilit_aktiv', '1');
  modalKapat('pinAyarlaModal');
  kilidAyarGoster();
}
// Tətbiq 30 saniyədən uzun arxa planda qalıbsa, geri qayıdanda kilid yenidən açılır.
// (Əvvəl kilid yalnız səhifə tam yüklənəndə çıxırdı — PWA arxa plandan qayıdanda çıxmırdı.)
let gizliBaslangic = null;
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') { gizliBaslangic = Date.now(); return; }
  if (kilidVar && gizliBaslangic && (Date.now() - gizliBaslangic) > 30000) kilidYoxla();
  gizliBaslangic = null;
  gunDeyisdiYoxla();
});
// ==================== /Tətbiq kilidi ====================
