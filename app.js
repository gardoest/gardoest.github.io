// ============================================================================
// DLE SCORE TRACKER - APPLICATION LOGIC
// ============================================================================
// All game scoring, data management, and business logic
// This file is independent of design/HTML structure
// ============================================================================

// CONFIGURATION & CONSTANTS
// ============================================================================
const SHEET_ID = '13vdyTKv0vgLBnihxBFeriKzkNbvOt1A3n-c3h5ur8g4';
const VERCEL_API = 'https://gardoest-github-io.vercel.app/api/parse-results';

// Function to get CSV URL with cache-buster
function getCSVUrl() {
    return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=0&t=${Date.now()}`;
}

// Game participants
const PARTICIPANTS = ['Gard', 'Jone', 'Elias', 'Herman', 'Sindre'];

// Available games
const GAMES = ['Wordle', 'TimeGuessr', 'Loldle', 'Maptap'];

// Game scoring rules: 'lowest' = lower score wins, 'highest' = higher score wins
const GAME_RULES = {
    'Wordle': { type: 'lowest' },      // Lower attempts = better
    'TimeGuessr': { type: 'highest' }, // Higher score = better
    'Loldle': { type: 'lowest' },      // Lower attempts = better
    'Maptap': { type: 'highest' }      // Higher score = better
};

// ============================================================================
// GLOBAL STATE
// ============================================================================
let currentTab = 'daily';           // Which tab is active: daily/weekly/monthly/alltime
let currentFilter = 'all';          // Which game filter is active: all or specific game
let allData = null;                 // All parsed CSV data with player scores
let sortColumn = 'points';          // Which column to sort stats table by
let sortDir = 'desc';               // Sort direction: asc or desc

// ============================================================================
// DATA LOADING & PARSING
// ============================================================================

/**
 * Load CSV data from Google Sheets and parse it
 * Called on page load and every 5 minutes
 */
async function loadData() {
    try {
        const response = await fetch(getCSVUrl());
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const csv = await response.text();
        allData = parseCSV(csv);
        renderAll();
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

/**
 * Normalize game names to standard format
 * Handles variations like "time guessr" -> "TimeGuessr"
 */
function normalizeGameName(name) {
    const normalized = {
        'timeguessr': 'TimeGuessr',
        'time guessr': 'TimeGuessr',
        'wordle': 'Wordle',
        'loldle': 'Loldle',
        'maptap': 'Maptap',
        'map tap': 'Maptap'
    };
    return normalized[name.toLowerCase().trim()] || name;
}

/**
 * Parse CSV data from Google Sheets
 *
 * Process:
 * 1. First pass: Aggregate rows by date+game (combine multiple submissions)
 * 2. Second pass: Calculate points for each player based on rankings
 * 3. Handle ties by averaging points
 *
 * Returns object with:
 * - records: Array of {date, game, scores{player: score}}
 * - playerScores: Object of {player: totalPoints}
 */
function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return { records: [], playerScores: {} };

    // FIRST PASS: Aggregate rows by date+game
    // This combines multiple submissions for same game on same day
    const aggregated = {};

    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(c => c.trim());
        if (cells.length < 3) continue;

        const date = cells[0];
        const game = normalizeGameName(cells[1]);
        const key = `${date}_${game}`;

        if (!aggregated[key]) {
            aggregated[key] = {
                date: date,
                game: game,
                scores: {}
            };
            PARTICIPANTS.forEach(p => { aggregated[key].scores[p] = null; });
        }

        // Merge scores from this row into aggregated record
        for (let j = 0; j < PARTICIPANTS.length; j++) {
            const scoreStr = cells[2 + j] || '';
            const score = scoreStr === '' ? null : parseFloat(scoreStr);
            if (score !== null) {
                aggregated[key].scores[PARTICIPANTS[j]] = score;
            }
        }
    }

    // SECOND PASS: Calculate points based on rankings
    const records = [];
    const playerScores = {};
    PARTICIPANTS.forEach(p => { playerScores[p] = 0; });

    for (const key in aggregated) {
        const record = aggregated[key];
        records.push(record);

        const game = record.game.trim();
        const participants = PARTICIPANTS.filter(p => record.scores[p] !== null);

        if (participants.length > 0) {
            const rule = GAME_RULES[game];
            if (rule) {
                // Sort participants by game rule
                let sorted;
                if (rule.type === 'lowest') {
                    sorted = participants.sort((a, b) => record.scores[a] - record.scores[b]);
                } else {
                    sorted = participants.sort((a, b) => record.scores[b] - record.scores[a]);
                }

                const pointsPerPlace = participants.length;

                // Handle ties: group players with same score and split points
                let idx = 0;
                while (idx < sorted.length) {
                    const currentScore = record.scores[sorted[idx]];
                    const tiedPlayers = [sorted[idx]];

                    // Find all players tied with current score
                    let j = idx + 1;
                    while (j < sorted.length && record.scores[sorted[j]] === currentScore) {
                        tiedPlayers.push(sorted[j]);
                        j++;
                    }

                    // Calculate average points for tied players
                    const startPlace = idx;
                    const endPlace = idx + tiedPlayers.length - 1;
                    let totalPoints = 0;
                    for (let p = startPlace; p <= endPlace; p++) {
                        totalPoints += (pointsPerPlace - p);
                    }
                    const avgPoints = totalPoints / tiedPlayers.length;

                    // Assign average points to all tied players
                    tiedPlayers.forEach(player => {
                        playerScores[player] += avgPoints;
                    });

                    idx = j;
                }
            }
        }
    }

    return { records: records.reverse(), playerScores };
}

// ============================================================================
// DATE & FILTERING LOGIC
// ============================================================================

/**
 * Get the start date for the current tab's time period
 * - daily: today
 * - weekly: Monday of current week
 * - monthly: 1st of current month
 * - alltime: year 2000 (effectively all data)
 */
function getDateRange() {
    const today = new Date();
    let startDate = new Date(today);

    if (currentTab === 'daily') {
        startDate.setDate(today.getDate());
    } else if (currentTab === 'weekly') {
        const day = today.getDay();
        const daysBack = day === 0 ? 6 : day - 1;
        startDate.setDate(today.getDate() - daysBack);
    } else if (currentTab === 'monthly') {
        startDate.setDate(1);
    } else {
        startDate = new Date('2000-01-01');
    }

    startDate.setHours(0, 0, 0, 0);
    return startDate;
}

/**
 * Filter records based on current tab's date range
 * Returns only records within the time period
 */
function getFilteredRecords() {
    if (!allData) return [];
    const startDate = getDateRange();
    return allData.records.filter(record => {
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);
        return recordDate >= startDate;
    });
}

// ============================================================================
// RENDERING FUNCTIONS (DATA PROCESSING - NOT DOM)
// ============================================================================
// These functions process data and return structured objects
// They DON'T touch the DOM - that's handled by separate render methods
// This keeps logic completely separate from design

/**
 * Calculate high scores for current tab
 * Returns array of {player, rank, points}
 */
function calculateHighScores() {
    const filteredRecords = getFilteredRecords();
    const periodScores = {};
    PARTICIPANTS.forEach(p => { periodScores[p] = 0; });

    filteredRecords.forEach(record => {
        const game = normalizeGameName(record.game);
        const participants = PARTICIPANTS.filter(p => record.scores[p] !== null);

        if (participants.length === 0) return;

        const rule = GAME_RULES[game];
        if (!rule) return;

        let sorted;
        if (rule.type === 'lowest') {
            sorted = participants.sort((a, b) => record.scores[a] - record.scores[b]);
        } else {
            sorted = participants.sort((a, b) => record.scores[b] - record.scores[a]);
        }

        const pointsPerPlace = participants.length;

        // Handle ties
        let idx = 0;
        while (idx < sorted.length) {
            const currentScore = record.scores[sorted[idx]];
            const tiedPlayers = [sorted[idx]];

            let j = idx + 1;
            while (j < sorted.length && record.scores[sorted[j]] === currentScore) {
                tiedPlayers.push(sorted[j]);
                j++;
            }

            const startPlace = idx;
            const endPlace = idx + tiedPlayers.length - 1;
            let totalPoints = 0;
            for (let p = startPlace; p <= endPlace; p++) {
                totalPoints += (pointsPerPlace - p);
            }
            const avgPoints = totalPoints / tiedPlayers.length;

            tiedPlayers.forEach(player => {
                periodScores[player] += avgPoints;
            });

            idx = j;
        }
    });

    const sorted = PARTICIPANTS.sort((a, b) => periodScores[b] - periodScores[a]);
    const topN = currentTab === 'alltime' ? 10 : 3;

    return sorted.slice(0, topN).map((player, idx) => ({
        rank: idx + 1,
        player: player,
        points: periodScores[player]
    }));
}

/**
 * Calculate game highlights (best score in each game)
 * Returns object: {gameName: {score, player}}
 */
function calculateGameHighlights() {
    const filteredRecords = getFilteredRecords();
    const gameHighlights = {};
    GAMES.forEach(game => {
        gameHighlights[game] = { score: null, player: null };
    });

    filteredRecords.forEach(record => {
        const game = normalizeGameName(record.game);
        if (!GAMES.includes(game)) return;

        const rule = GAME_RULES[game];
        if (!rule) return;

        PARTICIPANTS.forEach(player => {
            if (record.scores[player] === null) return;
            const score = record.scores[player];

            if (gameHighlights[game].score === null) {
                gameHighlights[game] = { score, player };
            } else if (rule.type === 'lowest') {
                if (score < gameHighlights[game].score) {
                    gameHighlights[game] = { score, player };
                }
            } else {
                if (score > gameHighlights[game].score) {
                    gameHighlights[game] = { score, player };
                }
            }
        });
    });

    return gameHighlights;
}

/**
 * Calculate stats table data (all players with their stats)
 * Returns array of {name, points, average, games}
 */
function calculateStats() {
    const filteredRecords = getFilteredRecords();
    const periodScores = {};
    PARTICIPANTS.forEach(p => { periodScores[p] = 0; });

    filteredRecords.forEach(record => {
        const game = normalizeGameName(record.game);
        const participants = PARTICIPANTS.filter(p => record.scores[p] !== null);

        if (participants.length === 0) return;

        const rule = GAME_RULES[game];
        if (!rule) return;

        let sorted;
        if (rule.type === 'lowest') {
            sorted = participants.sort((a, b) => record.scores[a] - record.scores[b]);
        } else {
            sorted = participants.sort((a, b) => record.scores[b] - record.scores[a]);
        }

        const pointsPerPlace = participants.length;

        // Handle ties
        let idx = 0;
        while (idx < sorted.length) {
            const currentScore = record.scores[sorted[idx]];
            const tiedPlayers = [sorted[idx]];

            let j = idx + 1;
            while (j < sorted.length && record.scores[sorted[j]] === currentScore) {
                tiedPlayers.push(sorted[j]);
                j++;
            }

            const startPlace = idx;
            const endPlace = idx + tiedPlayers.length - 1;
            let totalPoints = 0;
            for (let p = startPlace; p <= endPlace; p++) {
                totalPoints += (pointsPerPlace - p);
            }
            const avgPoints = totalPoints / tiedPlayers.length;

            tiedPlayers.forEach(player => {
                periodScores[player] += avgPoints;
            });

            idx = j;
        }
    });

    const stats = PARTICIPANTS.map(p => ({
        name: p,
        points: periodScores[p],
        games: filteredRecords.filter(r => {
            const participants = PARTICIPANTS.filter(q => r.scores[q] !== null);
            return r.scores[p] !== null && participants.includes(p);
        }).length
    })).filter(p => p.games > 0);

    // Apply sorting
    stats.sort((a, b) => {
        let aVal = a[sortColumn];
        let bVal = b[sortColumn];
        if (sortColumn === 'name') {
            return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    // Add average
    stats.forEach(p => {
        p.average = p.games > 0 ? (p.points / p.games).toFixed(1) : '0';
    });

    return stats;
}

/**
 * Calculate game history (filtered and formatted)
 * Returns array of {date, game, scores{player: score}}
 */
function calculateHistory() {
    let filtered = getFilteredRecords();
    if (currentFilter !== 'all') {
        filtered = filtered.filter(r => r.game === currentFilter);
    }
    return filtered;
}

/**
 * Calculate all-time chart data
 * Returns {dates: [], playerData: {player: [cumulative scores]}}
 */
function calculateChartData() {
    if (!allData || !allData.records || allData.records.length === 0) {
        return null;
    }

    const dates = {};
    const cumulativeByPlayer = {};
    PARTICIPANTS.forEach(p => { cumulativeByPlayer[p] = []; });

    // Sort records by date
    const sortedRecords = [...allData.records].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Initialize cumulative scores
    const cumulativeScores = {};
    PARTICIPANTS.forEach(p => { cumulativeScores[p] = 0; });

    // Process each unique date
    sortedRecords.forEach(record => {
        if (!dates[record.date]) {
            dates[record.date] = true;
        }
    });

    const sortedDates = Object.keys(dates).sort();

    // Recalculate cumulative scores at each date
    sortedDates.forEach(date => {
        const dayRecords = sortedRecords.filter(r => r.date === date);

        dayRecords.forEach(record => {
            const game = record.game.trim();
            const participants = PARTICIPANTS.filter(p => record.scores[p] !== null);

            if (participants.length > 0) {
                const rule = GAME_RULES[game];
                if (rule) {
                    let sorted;
                    if (rule.type === 'lowest') {
                        sorted = participants.sort((a, b) => record.scores[a] - record.scores[b]);
                    } else {
                        sorted = participants.sort((a, b) => record.scores[b] - record.scores[a]);
                    }

                    const pointsPerPlace = participants.length;
                    let idx = 0;
                    while (idx < sorted.length) {
                        const currentScore = record.scores[sorted[idx]];
                        const tiedPlayers = [sorted[idx]];
                        let j = idx + 1;
                        while (j < sorted.length && record.scores[sorted[j]] === currentScore) {
                            tiedPlayers.push(sorted[j]);
                            j++;
                        }

                        const startPlace = idx;
                        const endPlace = idx + tiedPlayers.length - 1;
                        let totalPoints = 0;
                        for (let p = startPlace; p <= endPlace; p++) {
                            totalPoints += (pointsPerPlace - p);
                        }
                        const avgPoints = totalPoints / tiedPlayers.length;

                        tiedPlayers.forEach(player => {
                            cumulativeScores[player] += avgPoints;
                        });

                        idx = j;
                    }
                }
            }
        });

        PARTICIPANTS.forEach(p => {
            cumulativeByPlayer[p].push(cumulativeScores[p]);
        });
    });

    return {
        dates: sortedDates,
        playerData: cumulativeByPlayer
    };
}

// ============================================================================
// PUBLIC API - functions that external code should call
// ============================================================================

/**
 * Initialize the application
 * Call this once on page load
 */
function initApp() {
    attachEventListeners();
    loadData();
    setInterval(loadData, 5 * 60 * 1000); // Refresh every 5 minutes
}

/**
 * Attach all event listeners
 * Must be called for interactivity
 */
function attachEventListeners() {
    // Tabs
    const tabElements = document.querySelectorAll('.tab');
    if (tabElements.length > 0) {
        tabElements.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.tab').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentTab = e.target.dataset.tab;
                renderAll();
            });
        });
    }

    // Sorting
    const sortHeaders = document.querySelectorAll('[data-sort]');
    if (sortHeaders.length > 0) {
        sortHeaders.forEach(header => {
            header.addEventListener('click', () => {
                const newSort = header.dataset.sort;
                if (sortColumn === newSort) {
                    sortDir = sortDir === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = newSort;
                    sortDir = 'desc';
                }
                updateSortUI();
                renderStats(allData);
            });
        });
    }

    // Filters
    const filterBtns = document.querySelectorAll('[data-filter]');
    if (filterBtns.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                renderHistory(allData);
            });
        });
    }

    // Modal
    const addBtn = document.getElementById('add-score-btn');
    const modal = document.getElementById('score-modal');
    const modalClose = document.getElementById('modal-close');
    const formCancel = document.getElementById('form-cancel');
    const scoreForm = document.getElementById('score-form');

    if (addBtn) {
        addBtn.addEventListener('click', () => {
            if (modal) modal.classList.add('active');
        });
    }

    if (modalClose) {
        modalClose.addEventListener('click', closeModal);
    }

    if (formCancel) {
        formCancel.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    if (scoreForm) {
        scoreForm.addEventListener('submit', submitScore);
    }

    // Initialize webhook URL in localStorage
    const defaultWebhook = 'https://script.google.com/macros/s/AKfycbw9qSxex5sMeVSnQ0Y_IvK_5nAB9N54vUvv711IWBo9kQjXxrKwohKtAhY3aqKmcc-S/exec';
    if (!localStorage.getItem('webhookUrl')) {
        localStorage.setItem('webhookUrl', defaultWebhook);
    }
}

/**
 * Close the score modal and reset form
 */
function closeModal() {
    const modal = document.getElementById('score-modal');
    const form = document.getElementById('score-form');
    const msg = document.getElementById('form-message');

    if (modal) modal.classList.remove('active');
    if (form) form.reset();
    if (msg) msg.innerHTML = '';
}

/**
 * Render all sections based on current state
 * Call this after data changes or tab/filter changes
 */
function renderAll() {
    if (!allData) return;
    renderHighScores(allData);
    renderGameHighlights(allData);
    if (currentTab === 'alltime') {
        renderChart(allData);
    }
    renderStats(allData);
    renderHistory(allData);
}

/**
 * PLACEHOLDER RENDER FUNCTIONS
 * These will be implemented in your new HTML/design file
 * They receive processed data and update the DOM
 */

function renderHighScores(data) {
    // TODO: Implement in design file
    // const scores = calculateHighScores();
    // Update your HTML elements with scores
}

function renderGameHighlights(data) {
    // TODO: Implement in design file
    // const highlights = calculateGameHighlights();
    // Update your HTML elements with highlights
}

function renderStats(data) {
    // TODO: Implement in design file
    // const stats = calculateStats();
    // Update your HTML elements with stats
}

function renderHistory(data) {
    // TODO: Implement in design file
    // const history = calculateHistory();
    // Update your HTML elements with history
}

function renderChart(data) {
    // TODO: Implement in design file
    // const chartData = calculateChartData();
    // Create Chart.js visualization
}

function updateSortUI() {
    // TODO: Implement in design file
    // Update sort indicator UI
    const sortHeaders = document.querySelectorAll('[data-sort]');
    if (sortHeaders.length > 0) {
        sortHeaders.forEach(h => {
            h.classList.remove('sort-asc', 'sort-desc');
        });
        const active = document.querySelector(`[data-sort="${sortColumn}"]`);
        if (active) {
            active.classList.add(sortDir === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    }
}

/**
 * Submit a new score entry
 */
async function submitScore(e) {
    e.preventDefault();
    const playerEl = document.getElementById('form-player');
    const resultsEl = document.getElementById('form-results');
    const msgDiv = document.getElementById('form-message');

    if (!playerEl || !resultsEl) return;

    const player = playerEl.value;
    const results = resultsEl.value;
    const webhook = localStorage.getItem('webhookUrl');

    if (!player || !results.trim()) {
        if (msgDiv) msgDiv.innerHTML = '<div class="form-message error">Please fill in all fields</div>';
        return;
    }

    if (msgDiv) msgDiv.innerHTML = '<div class="form-message loading">Parsing...</div>';

    try {
        const response = await fetch(VERCEL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: results,
                player,
                date: new Date().toISOString().split('T')[0],
                webhookUrl: webhook
            })
        });

        if (!response.ok) throw new Error(`API error: ${response.statusText}`);
        const result = await response.json();

        if (result.success) {
            if (msgDiv) msgDiv.innerHTML = '<div class="form-message success">Saved!</div>';
            setTimeout(() => {
                closeModal();
                loadData();
            }, 5000);
        } else {
            throw new Error(result.error || 'Unknown error');
        }
    } catch (error) {
        if (msgDiv) msgDiv.innerHTML = `<div class="form-message error">Error: ${error.message}</div>`;
    }
}

// ============================================================================
// EXPORT / INITIALIZATION
// ============================================================================

// Start app when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
