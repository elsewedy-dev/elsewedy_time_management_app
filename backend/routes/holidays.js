/**
 * Ethiopian Public Holidays (Gregorian calendar equivalents for 2024–2027)
 * Fixed: Christmas, Epiphany, Adwa Victory, Easter (variable), Labour Day,
 *        Patriots' Victory, Eid al-Fitr (variable), Eid al-Adha (variable),
 *        Enkutatash (New Year), Meskel, Mawlid (variable), Prophet's Birthday
 *
 * Islamic holidays shift ~11 days earlier each Gregorian year.
 * Approximate dates are provided — adjust as needed.
 */
import express from 'express';
const router = express.Router();

// ── Static Ethiopian holidays (Gregorian dates) ──────────────────────────────
// Format: { date: "MM-DD", name: "...", type: "religious|national" }
// For variable holidays (Islamic/Easter), we list specific years.
const FIXED_HOLIDAYS = [
  // Ethiopian Christmas (Genna) — Jan 7
  { date: "01-07", name: "Ethiopian Christmas (Genna)", type: "religious" },
  // Ethiopian Epiphany (Timkat) — Jan 19
  { date: "01-19", name: "Timkat (Epiphany)", type: "religious" },
  // Adwa Victory Day — Mar 2
  { date: "03-02", name: "Adwa Victory Day", type: "national" },
  // Good Friday / Ethiopian Easter changes yearly — listed per year in VARIABLE
  // International Labour Day — May 1
  { date: "05-01", name: "Labour Day (May Day)", type: "national" },
  // Patriots' Victory Day — May 5
  { date: "05-05", name: "Patriots' Victory Day", type: "national" },
  // Derg Downfall Day — May 28
  { date: "05-28", name: "Derg Downfall Day", type: "national" },
  // Ethiopian New Year (Enkutatash) — Sep 11 (Sep 12 in leap years)
  { date: "09-11", name: "Ethiopian New Year (Enkutatash)", type: "religious" },
  // Meskel (Finding of the True Cross) — Sep 27
  { date: "09-27", name: "Meskel", type: "religious" },
];

// Variable holidays per year (ISO dates YYYY-MM-DD)
const VARIABLE_HOLIDAYS = {
  2024: [
    { date: "2024-04-14", name: "Good Friday (Ethiopian Orthodox)", type: "religious" },
    { date: "2024-04-16", name: "Ethiopian Easter (Fasika)", type: "religious" },
    { date: "2024-04-10", name: "Eid al-Fitr", type: "religious" },
    { date: "2024-06-17", name: "Eid al-Adha (Arafa)", type: "religious" },
    { date: "2024-09-16", name: "Mawlid al-Nabi", type: "religious" },
  ],
  2025: [
    { date: "2025-04-18", name: "Good Friday (Ethiopian Orthodox)", type: "religious" },
    { date: "2025-04-20", name: "Ethiopian Easter (Fasika)", type: "religious" },
    { date: "2025-03-30", name: "Eid al-Fitr", type: "religious" },
    { date: "2025-06-06", name: "Eid al-Adha (Arafa)", type: "religious" },
    { date: "2025-09-05", name: "Mawlid al-Nabi", type: "religious" },
  ],
  2026: [
    { date: "2026-04-10", name: "Good Friday (Ethiopian Orthodox)", type: "religious" },
    { date: "2026-04-12", name: "Ethiopian Easter (Fasika)", type: "religious" },
    { date: "2026-03-20", name: "Eid al-Fitr", type: "religious" },
    { date: "2026-05-27", name: "Eid al-Adha (Arafa)", type: "religious" },
    { date: "2026-08-25", name: "Mawlid al-Nabi", type: "religious" },
  ],
  2027: [
    { date: "2027-04-02", name: "Good Friday (Ethiopian Orthodox)", type: "religious" },
    { date: "2027-04-04", name: "Ethiopian Easter (Fasika)", type: "religious" },
    { date: "2027-03-09", name: "Eid al-Fitr", type: "religious" },
    { date: "2027-05-16", name: "Eid al-Adha (Arafa)", type: "religious" },
    { date: "2027-08-14", name: "Mawlid al-Nabi", type: "religious" },
  ],
};

/**
 * Build full holiday list for a given year.
 * Returns array of { date: "YYYY-MM-DD", name, type }
 */
function getHolidaysForYear(year) {
  // Fixed holidays for this year
  const fixed = FIXED_HOLIDAYS.map(h => {
    // Enkutatash is Sep 12 in leap years
    let mmdd = h.date;
    if (h.date === "09-11" && isLeapYear(year)) mmdd = "09-12";
    return { date: `${year}-${mmdd}`, name: h.name, type: h.type };
  });

  // Variable holidays for this year
  const variable = VARIABLE_HOLIDAYS[year] || [];

  return [...fixed, ...variable].sort((a, b) => a.date.localeCompare(b.date));
}

function isLeapYear(y) {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

// ── GET /api/holidays?year=2026 ───────────────────────────────────────────────
router.get('/', (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const holidays = getHolidaysForYear(year);
  res.json({ success: true, data: holidays });
});

// ── GET /api/holidays/range?start=YYYY-MM-DD&end=YYYY-MM-DD ──────────────────
router.get('/range', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ success: false, message: 'start and end query params required' });
  }
  const startYear = parseInt(start.split('-')[0]);
  const endYear   = parseInt(end.split('-')[0]);

  const all = [];
  for (let y = startYear; y <= endYear; y++) {
    all.push(...getHolidaysForYear(y));
  }
  const filtered = all.filter(h => h.date >= start && h.date <= end);
  res.json({ success: true, data: filtered });
});

// ── GET /api/holidays/check?date=YYYY-MM-DD ───────────────────────────────────
router.get('/check', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ success: false, message: 'date param required' });
  const year = parseInt(date.split('-')[0]);
  const holidays = getHolidaysForYear(year);
  const holiday = holidays.find(h => h.date === date);
  res.json({ success: true, isHoliday: !!holiday, holiday: holiday || null });
});

export default router;
export { getHolidaysForYear };
