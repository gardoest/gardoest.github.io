# DLE Score Tracker - Prosjektoversikt

## Hva som er oppnådd

### Hovedfunksjonalitet
- ✅ **Score tracking system** for daglig konkurranse mellom 5 venner (Gard, Jone, Elias, Herman, Sindre)
- ✅ **4 spill-typer**: Wordle, TimeGuessr, Loldle, Maptap
- ✅ **Intelligent scoring** med tie-breaking (gjennomsnittpoeng ved likestilling)
- ✅ **Multi-view dashboard**: Daily, Weekly, Monthly, All Time
- ✅ **Real-time data sync** med Google Sheets
- ✅ **Claude API integration** for naturlig språkparsing av resultat
- ✅ **Responsive design** med gradient + depth visuell stil

---

## Arkitektur

### Filer opprettet/modifisert

#### `app.js` (Ny fil - ~700 linjer)
**100% business logic, 0% DOM manipulation**

**Konstanter & Konfiguration:**
- `PARTICIPANTS`: ['Gard', 'Jone', 'Elias', 'Herman', 'Sindre']
- `GAMES`: ['Wordle', 'TimeGuessr', 'Loldle', 'Maptap']
- `GAME_RULES`: Definisjoner av scoring type (lowest/highest)

**Core Funksjoner:**
- `loadData()` - Henter CSV fra Google Sheets (med cache-buster)
- `parseCSV(csv)` - Parserer og aggregerer data, kalkulerer poeng
- `getDateRange()` - Bestemmer tidsrom basert på tab
- `getFilteredRecords()` - Filtrer records etter tidsrom

**Data Calculation Funksjoner:**
- `calculateHighScores()` - Top 3 (eller 10 for alltime)
- `calculateGameHighlights()` - Best score per game
- `calculateStats()` - All spiller-statistikk
- `calculateHistory()` - Filtrert game-historie
- `calculateChartData()` - Kumulativ poengprogresjon

**Event Handling:**
- `initApp()` - Starter applikasjonen
- `attachEventListeners()` - Setter opp alle listeners
- `submitScore()` - Handler form innsending → Claude API → Webhook → Google Sheets

**Placeholder Render Functions:**
- `renderHighScores()`
- `renderStats()`
- `renderHistory()`
- `renderChart()`
- `renderGameHighlights()`

---

#### `index.html` (Refaktorert)
**Pure presentation + render implementation**

**Struktur:**
- Komplette HTML + CSS (samme design som før)
- Importer `app.js`
- Implementerer alle `render*()` funksjoner
- Bruker `calculate*()` funksjoner fra app.js for data

**Render Implementasjoner:**
```javascript
renderHighScores()    → bruker calculateHighScores()
renderStats()         → bruker calculateStats()
renderHistory()       → bruker calculateHistory()
renderChart()         → bruker calculateChartData()
renderGameHighlights()→ bruker calculateGameHighlights()
```

---

#### `api/parse-results.js` (Vercel Backend)
**Claude API integration for natural language parsing**

- Motta: `{text, player, date, webhookUrl}`
- Claude Opus 4.6 parserer game results
- Sent webhook til Google Sheets
- Returnerer parsed results

**Games som supporteres:**
- Wordle: "X/6" → extract X
- Loldle: "Classic: X" → extract X
- TimeGuessr: "X/50000" → extract X
- Maptap: "Final score: X" → extract X

---

## Key Features & Fixes

### Scoring System
- **Lowest wins**: Wordle, Loldle (færre forsøk = bedre)
- **Highest wins**: TimeGuessr, Maptap (høyere score = bedre)
- **Tie-breaking**: Likestilte spillere får gjennomsnittpoeng
  - F.eks: 2 spillere deler 1. + 2. plass → får (5+4)/2 = 4.5 poeng hver

### Data Aggregation
- Hvis samme spiller legger inn samme game samme dag → kombineres
- Frontend aggregerer rader etter date+game før poengberegning

### Cache Busting
- CSV URL har `&t=${Date.now()}` parameter
- Tvinger Google Sheets til å gi frisk data, ikke cache

### Page Reload
- Etter score submission → full page reload etter 1.5s
- Sikrer alle data er synkronisert fra Google Sheets

---

## Data Flow

```
1. Bruker legger inn resultat (form modal)
   ↓
2. submitScore() sender til Vercel API
   ↓
3. Vercel API (parse-results.js)
   - Claude API parser naturlig språk
   - Konverterer til structured JSON
   ↓
4. Webhook til Google Sheets
   - Skriver: [Date, Game, Gard, Jone, Elias, Herman, Sindre]
   ↓
5. Page reload etter 1.5s
   ↓
6. loadData() henter frisk CSV
   ↓
7. parseCSV() aggregerer + kalkulerer poeng
   ↓
8. renderAll() oppdaterer alle views
```

---

## Views

### Daily
- Top 3 scorers for i dag
- Game highlights
- Stats tabell
- Seneste games

### Weekly
- Top 3 scorers (mandag-søndag)
- Game highlights
- Stats tabell

### Monthly
- Top 3 scorers (måned)
- Game highlights
- Stats tabell

### All Time
- Top 10 scorers
- Game highlights
- **All-Time Points Progression Chart** (Chart.js)
  - Hver spiller har egen farge
  - Kumulativ progresjon over tid
- Stats tabell

---

## Teknologi Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Vercel + Node.js
- **AI**: Claude API (Opus 4.6) for parsing
- **Database**: Google Sheets + Apps Script
- **Visualization**: Chart.js
- **Deployment**: GitHub Pages (frontend) + Vercel (API)

---

## Filer i Prosjektet

```
dle score tracker/
├── index.html                 (Frontend, 800+ linjer)
├── app.js                     (Business logic, 700+ linjer)
├── api/
│   └── parse-results.js       (Vercel backend, 98 linjer)
├── banner.avif               (Title image)
├── .gitignore
├── package.json              (Vercel config)
└── PROJECT_SUMMARY.md        (Denne filen)
```

---

## Hva som kan forbedres fremover

- [ ] Redesign med nytt visuelt konsept (bruk app.js + ny index-v2.html)
- [ ] Mobile app version (React Native eller Flutter)
- [ ] Leaderboard animations
- [ ] Push notifications for nye scores
- [ ] Historical data export
- [ ] Custom scoring rules per game

---

## Commits gjort

- ✅ Initial setup + Google Sheets integration
- ✅ Claude API integration + Vercel deployment
- ✅ Tie-breaking implementation
- ✅ All-time chart visualization
- ✅ Cache-buster + full page reload fix
- ✅ Refactor: Extract logic to app.js
- ✅ Clean render implementations in index.html

---

**Status**: Production ready ✨

Logikken er solid, data flows korrekt, og designet ser bra ut. Klart for å starte på redesign med app.js som base!
