# Yeni dil necə əlavə olunur

Tətbiqdə kod dəyişikliyi lazım deyil — yalnız `lang/` qovluğuna bir JSON faylı əlavə olunur.

## Addımlar

1. `lang/template.json` faylını kopyala və adını dil koduna dəyiş: `lang/en.json`, `lang/tr.json`, `lang/ru.json` …
   - Kod 2–3 hərfli olmalıdır (`en`, `tr`, `ru`, `pt-BR` də olar). Fayl adı = dil kodu.
2. `_meta` hissəsini doldur:
   - `name` — dilin öz dilindəki adı (`English`, `Türkçe`) — Dil ekranında belə görünəcək.
   - `flag` — bayraq emojisi (`🇬🇧`, `🇹🇷`).
3. `strings` içində yalnız **sağ tərəfi** (dəyərləri) tərcümə et. **Açarları (sol tərəf) dəyişmə.**
4. Faylı GitHub-da `lang/` qovluğuna yüklə (commit et).
5. `lang/index.json` faylına kodu əlavə et: `["az", "en", "ru"]`
   (GitHub Pages-də fayl özü də avtomatik tapılır, amma tapılma gecikə bilər: siyahı 24 saatdan bir yenilənir.
   `index.json`-a yazmaq dərhal görünməsini təmin edir.)
6. İstəyə görə ehtiyat siyahı `lang/languages.json`-a da əlavə et:
   `{ "kod": "en", "ad": "English", "bayraq": "🇬🇧" }`
7. Tətbiqi aç → Ayarlar → 🌐 Dil → yeni dil görünməlidir. Seçəndən sonra bütün ekranları gəz və yoxla.

## Qaydalar

- **`{ad}`, `{mebleg}`, `{limit}` kimi `{...}` hissələrini olduğu kimi saxla** — proqram bunların yerinə dəyər yazır. Sözün yerini dəyişə bilərsən, yazılışını yox.
- Emoji və durğu işarələri (`✏️`, `📌`, `→`, `·`) mətnin bir hissəsidir — saxla.
- `\"` (mətn içindəki dırnaq) olduğu kimi qalmalıdır; JSON səhv olmasın deyə son vergül də qoyma.
- Tərcümə etmək istəmədiyin açarı **boş qoya** bilərsən (`""`) və ya tamamilə sil — həmin yerdə Azərbaycanca mətn göstərilir, tətbiq sınmaz.
- Mətn uzun olarsa düymələrə/ekrana sığmaya bilər — qısa yaz.
- `AZN` valyuta kodunu tərcümə etmə.

## Yoxlama

- Faylı https://jsonlint.com kimi bir yerdə və ya `python3 -m json.tool lang/en.json` ilə yoxla.
- Açarların sayı `az.json` ilə eyni olmalıdır (əlavə/çatışmayan açar olmasın).
- Brauzer konsolunda (`F12`) `[i18n]` xəbərdarlıqları çıxırsa, fayl oxunmayıb deməkdir.

## Yeni mətn əlavə edildikdə (tərtibatçı üçün)

Kodda yeni mətn yazılırsa: HTML-də `data-i18n="qrup.acar"`, JS-də `tr('qrup.acar', 'Azərbaycanca defolt')` istifadə et
və eyni açarı **həm `az.json`-a, həm `template.json`-a** əlavə et. Sonra `sw.js`-də `CACHE_ADI` versiyasını artır.
