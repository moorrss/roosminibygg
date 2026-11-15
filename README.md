# Minibygg Roos – webbplats

Statisk webbplats för Minibygg Roos, snickare i Oskarshamns kommun.
Publiceras med GitHub Pages: https://moorrss.github.io/roosminibygg/

## Filstruktur

```
index.html              Sidan (bara HTML – inga inline-skript eller inline-stilar)
assets/css/styles.css   Färdigbyggd CSS (genereras, redigera inte för hand)
assets/js/main.js       All JavaScript (meny, formulär, logotyp-reserv)
src/input.css           Källfil för Tailwind: färger, typsnitt, egna stilar
minibygg roos.png       Logotypen (läggs i roten bredvid index.html)
```

## Bygga om CSS:en

`styles.css` innehåller bara de Tailwind-klasser som används. Lägger du till
en ny klass i `index.html` eller `main.js` måste CSS:en byggas om, annars
får klassen ingen effekt. Kräver Node.js:

```bash
npx @tailwindcss/cli -i src/input.css -o assets/css/styles.css --minify
```

## Säkerhet

| Åtgärd | Varför |
|---|---|
| Content-Security-Policy (meta-tagg i `<head>`) | Bestämmer vilka källor sidan får ladda skript, stilar, typsnitt och bilder från. Injicerad kod körs inte. |
| `script-src 'self'` – inga inline-skript eller `onclick`/`onerror` | Stoppar de vanligaste XSS-attackerna, eftersom bara `assets/js/main.js` får köras. |
| Ingen Tailwind-CDN | Ett externt skript har full tillgång till sidan. CSS:en byggs nu i förväg och ligger i repot. |
| `form-action 'none'` | Formuläret kan aldrig skickas iväg någonstans, inte ens om JavaScript är avstängt. Det öppnar bara besökarens mejlprogram. |
| `base-uri 'none'`, `default-src 'none'` | Allt som inte uttryckligen tillåts är förbjudet. |
| Referrer-Policy `strict-origin-when-cross-origin` | Andra sajter får bara domännamnet, inte hela adressen. |
| Validering och rensning av formulärdata i `main.js` | Vitlista för projekttyp, maxlängder, borttagning av osynliga styrtecken, radbrytningar tas bort i enradsfält. |
| `encodeURIComponent` i mejllänken | Användaren kan inte lägga till egna fält som `bcc=` eller `cc=` i mejlet. |

**Begränsningar på GitHub Pages:** Pages kan inte skicka egna HTTP-headers.
`frame-ancestors` (skydd mot clickjacking), `X-Content-Type-Options` och
`Strict-Transport-Security` går därför inte att sätta härifrån. Sidan har
inga inloggningar eller känsliga knappar, så risken är låg. Kryssa i
**Enforce HTTPS** under Settings → Pages.

**Kvar att göra:** Google Fonts laddas från Googles servrar, vilket skickar
besökarens IP-adress till Google. Ladda gärna ner typsnitten (Inter och
Plus Jakarta Sans) som `.woff2`, lägg dem i `assets/fonts/` och uppdatera
CSP:n till `font-src 'self'` och `style-src 'self'`.
