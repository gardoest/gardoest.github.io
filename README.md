# DLE - Daily Leaderboard

En moderne nettside for å tracke scores fra daglige konkurranser mellom venner.

## Features

✅ **Automatisk poengberegning** — basert på placeringer  
✅ **Live stillingstabell** — sortert etter totalt poeng  
✅ **Statistikk per spill** — all-time high for hver konkuranse  
✅ **Oppdater-knapp** — hent nyeste data fra Sheets  
✅ **Auto-refresh** — oppdateres automatisk hver 5. minutt  
✅ **Responsiv design** — fungerer på mobil, tablet og desktop  
✅ **Moderne sportlig look** — med gradient og glassmorphism  

## Setup

### 1. Google Sheets konfigur

Sjekk at Google Sheets-fanen "Resultater" har struktur:

```
Dato      | Konkuranse | Gard | Jone | Elias | Herman | Sindre
2026-05-31| Wordle     | 3    | 4    | 2     | 5      | 1
2026-05-31| Timeguessr | 8500 | 7200 | 9100  | 6800   | -
```

- Dato i første kolonne
- Konkuranse i andre kolonne
- Scores for hver deltaker i neste kolonner
- Tom celle = deltakeren deltok ikke

### 2. GitHub Pages (Hosting)

1. **Opprett repo** på GitHub: `<ditt-brukernavn>.github.io`

2. **Last opp filer**:
   - `index.html` → root av repo
   - `README.md` → root av repo

3. **Aktiver Pages**:
   - Gå til Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` (eller `master`)
   - Folder: `/ (root)`
   - Save

4. **Din side er live** på: `https://<ditt-brukernavn>.github.io`

### 3. Alternative hosting

- **Netlify**: Drag-and-drop filen, auto-deploy fra GitHub
- **Vercel**: Samme som Netlify, veldig lett
- **Lokal**: Åpne `index.html` i nettleseren din

## Scoring Rules

| Spill | Regel | Lavest/Høyest |
|-------|-------|----------------|
| **Wordle** | Antall gjetter | Lavest = vinner |
| **Timeguessr** | Poengsum | Høyest = vinner |
| **Loldle** | Antall gjetter | Lavest = vinner |
| **Maptap** | Poengsum | Høyest = vinner |

**Poengdeling per dag:**
- 1 deltaker deltok: `1 poeng`
- 2 deltakere deltok: `2-1 poeng`
- 3 deltakere deltok: `3-2-1 poeng`
- 4 deltakere deltok: `4-3-2-1 poeng`
- 5 deltakere deltok: `5-4-3-2-1 poeng`

Plassering 1 får høyest poeng, plassering 2 får nest høyest, osv.

## Troubleshooting

**Siden viser "ingen data"**
- Sjekk at Google Sheets-URLen er riktig
- Sjekk at fanen heter "Resultater"
- Åpne browser console (F12) for feilmeldinger

**CORS error**
- Hvis du kjører lokalt, kan noen nettlesere blokkere. Løsning:
  - Bruk Chrome/Firefox i stedet
  - Kjør en lokal server: `python -m http.server 8000`
  - Besøk `http://localhost:8000`

**Data oppdateres ikke**
- Siden auto-refresher hver 5. minutt
- Klikk på "Oppdater"-knappen manuelt
- Sjekk at Sheets URL er tilgjengelig for alle

## Customization

Åpne `index.html` i teksteditor for å endre:

- **Deltakere**: Endre `PARTICIPANTS` array
- **Konkurranser**: Endre `GAMES` array
- **Scoring rules**: Endre `GAME_RULES` objekt
- **Farger**: Søk etter `#00d4ff` (cyan) eller `#1a1a2e` (mørk) for å endre
- **Logo/Navn**: Endre `<h1>⚡ DLE</h1>` tekst

## Lisensi

Fritt å bruke og modifisere.
