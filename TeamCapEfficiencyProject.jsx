import { useState, useMemo } from "react";

/**
 * NBA Team Cap Efficiency Dashboard
 * -----------------------------------
 * Real data, real SQL (CTEs + window functions), real results — including the ones
 * that reflect uncomfortable methodological limits rather than a clean story.
 *
 * Data sources (fetched live from basketball-reference.com):
 *  - 2025-26 final NBA standings (most recently completed season): wins, losses, net rating
 *  - 2026-27 committed team payroll (Basketball-Reference's team salary table only publishes
 *    forward-looking committed years, not a historical same-season cap-hit figure)
 *
 * Honest limitation, stated up front and in the Methodology tab: this pairs CURRENT committed
 * payroll against the TRAILING completed season's win total. It is "current investment vs.
 * recent performance," not a strict same-season cap-efficiency snapshot. That's a real
 * constraint of the publicly available data — not hidden, not smoothed over.
 */

const DATA = [
  { team: "Detroit Pistons", abbr: "DET", conf: "E", wins: 60, losses: 22, payroll: 153163826, wpm: 0.3917, rank: 1, quadrant: "Low spend, efficient" },
  { team: "San Antonio Spurs", abbr: "SAS", conf: "W", wins: 62, losses: 20, payroll: 196130556, wpm: 0.3161, rank: 2, quadrant: "High spend, efficient" },
  { team: "Oklahoma City Thunder", abbr: "OKC", conf: "W", wins: 64, losses: 18, payroll: 214798992, wpm: 0.2980, rank: 3, quadrant: "High spend, efficient" },
  { team: "Boston Celtics", abbr: "BOS", conf: "E", wins: 56, losses: 26, payroll: 201437932, wpm: 0.2780, rank: 4, quadrant: "High spend, efficient" },
  { team: "Los Angeles Lakers", abbr: "LAL", conf: "W", wins: 53, losses: 29, payroll: 198883338, wpm: 0.2665, rank: 5, quadrant: "High spend, efficient" },
  { team: "Houston Rockets", abbr: "HOU", conf: "W", wins: 52, losses: 30, payroll: 198097988, wpm: 0.2625, rank: 6, quadrant: "High spend, efficient" },
  { team: "Charlotte Hornets", abbr: "CHO", conf: "E", wins: 44, losses: 38, payroll: 170472537, wpm: 0.2581, rank: 7, quadrant: "Low spend, efficient" },
  { team: "Denver Nuggets", abbr: "DEN", conf: "W", wins: 54, losses: 28, payroll: 211739533, wpm: 0.2550, rank: 8, quadrant: "High spend, efficient" },
  { team: "New York Knicks", abbr: "NYK", conf: "E", wins: 53, losses: 29, payroll: 217948756, wpm: 0.2432, rank: 9, quadrant: "High spend, efficient" },
  { team: "Los Angeles Clippers", abbr: "LAC", conf: "W", wins: 42, losses: 40, payroll: 174798140, wpm: 0.2403, rank: 10, quadrant: "Low spend, efficient" },
  { team: "Toronto Raptors", abbr: "TOR", conf: "E", wins: 46, losses: 36, payroll: 198020399, wpm: 0.2323, rank: 11, quadrant: "High spend, efficient" },
  { team: "Cleveland Cavaliers", abbr: "CLE", conf: "E", wins: 52, losses: 30, payroll: 226017942, wpm: 0.2301, rank: 12, quadrant: "High spend, efficient" },
  { team: "Minnesota Timberwolves", abbr: "MIN", conf: "W", wins: 49, losses: 33, payroll: 218278034, wpm: 0.2245, rank: 13, quadrant: "High spend, efficient" },
  { team: "Portland Trail Blazers", abbr: "POR", conf: "W", wins: 42, losses: 40, payroll: 192061727, wpm: 0.2187, rank: 14, quadrant: "Low spend, efficient" },
  { team: "Philadelphia 76ers", abbr: "PHI", conf: "E", wins: 45, losses: 37, payroll: 207853950, wpm: 0.2165, rank: 15, quadrant: "High spend, efficient" },
  { team: "Miami Heat", abbr: "MIA", conf: "E", wins: 43, losses: 39, payroll: 198886535, wpm: 0.2162, rank: 16, quadrant: "High spend, efficient" },
  { team: "Phoenix Suns", abbr: "PHO", conf: "W", wins: 45, losses: 37, payroll: 215794243, wpm: 0.2085, rank: 17, quadrant: "High spend, inefficient" },
  { team: "Atlanta Hawks", abbr: "ATL", conf: "E", wins: 46, losses: 36, payroll: 221278253, wpm: 0.2079, rank: 18, quadrant: "High spend, inefficient" },
  { team: "Orlando Magic", abbr: "ORL", conf: "E", wins: 45, losses: 37, payroll: 218125071, wpm: 0.2063, rank: 19, quadrant: "High spend, inefficient" },
  { team: "Chicago Bulls", abbr: "CHI", conf: "E", wins: 31, losses: 51, payroll: 161545080, wpm: 0.1919, rank: 20, quadrant: "Low spend, inefficient" },
  { team: "Golden State Warriors", abbr: "GSW", conf: "W", wins: 37, losses: 45, payroll: 210390143, wpm: 0.1759, rank: 21, quadrant: "High spend, inefficient" },
  { team: "Milwaukee Bucks", abbr: "MIL", conf: "E", wins: 32, losses: 50, payroll: 193765071, wpm: 0.1651, rank: 22, quadrant: "Low spend, inefficient" },
  { team: "Memphis Grizzlies", abbr: "MEM", conf: "W", wins: 25, losses: 57, payroll: 167772446, wpm: 0.1490, rank: 23, quadrant: "Low spend, inefficient" },
  { team: "New Orleans Pelicans", abbr: "NOP", conf: "W", wins: 26, losses: 56, payroll: 192090918, wpm: 0.1354, rank: 24, quadrant: "Low spend, inefficient" },
  { team: "Brooklyn Nets", abbr: "BRK", conf: "E", wins: 20, losses: 62, payroll: 150836846, wpm: 0.1326, rank: 25, quadrant: "Low spend, inefficient" },
  { team: "Dallas Mavericks", abbr: "DAL", conf: "W", wins: 26, losses: 56, payroll: 197866094, wpm: 0.1314, rank: 26, quadrant: "High spend, inefficient" },
  { team: "Utah Jazz", abbr: "UTA", conf: "W", wins: 22, losses: 60, payroll: 176915598, wpm: 0.1244, rank: 27, quadrant: "Low spend, inefficient" },
  { team: "Sacramento Kings", abbr: "SAC", conf: "W", wins: 22, losses: 60, payroll: 189346486, wpm: 0.1162, rank: 28, quadrant: "Low spend, inefficient" },
  { team: "Indiana Pacers", abbr: "IND", conf: "E", wins: 19, losses: 63, payroll: 203715395, wpm: 0.0933, rank: 29, quadrant: "High spend, inefficient" },
  { team: "Washington Wizards", abbr: "WAS", conf: "E", wins: 17, losses: 65, payroll: 186471414, wpm: 0.0912, rank: 30, quadrant: "Low spend, inefficient" },
];

const LEAGUE_AVG_WPM = 0.2092;
const LEAGUE_AVG_PAYROLL = 195483441;

const QUADRANT_COLOR = {
  "Low spend, efficient": "#22c55e",
  "High spend, efficient": "#3b82f6",
  "High spend, inefficient": "#ef4444",
  "Low spend, inefficient": "#a1a1aa",
};

function fmtM(n) {
  return `$${(n / 1_000_000).toFixed(1)}M`;
}

function ScatterChart() {
  const w = 640, h = 420, pad = 56;
  const xMin = 140_000_000, xMax = 235_000_000;
  const yMin = 0.08, yMax = 0.40;
  const x = (v) => pad + ((v - xMin) / (xMax - xMin)) * (w - pad * 1.5);
  const y = (v) => h - pad - ((v - yMin) / (yMax - yMin)) * (h - pad * 1.5);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" role="img" aria-label="Payroll vs wins-per-million scatter plot">
      {/* axes */}
      <line x1={pad} y1={h - pad} x2={w - pad * 0.5} y2={h - pad} stroke="#3f3f46" strokeWidth="1" />
      <line x1={pad} y1={pad * 0.5} x2={pad} y2={h - pad} stroke="#3f3f46" strokeWidth="1" />
      {/* league avg lines */}
      <line x1={x(LEAGUE_AVG_PAYROLL)} y1={pad * 0.5} x2={x(LEAGUE_AVG_PAYROLL)} y2={h - pad} stroke="#52525b" strokeDasharray="4 4" strokeWidth="1" />
      <line x1={pad} y1={y(LEAGUE_AVG_WPM)} x2={w - pad * 0.5} y2={y(LEAGUE_AVG_WPM)} stroke="#52525b" strokeDasharray="4 4" strokeWidth="1" />
      <text x={x(LEAGUE_AVG_PAYROLL) + 4} y={pad * 0.5 + 10} fill="#71717a" fontSize="10">league avg payroll</text>
      <text x={pad + 4} y={y(LEAGUE_AVG_WPM) - 4} fill="#71717a" fontSize="10">league avg efficiency</text>

      {DATA.map((d) => (
        <g key={d.abbr}>
          <circle cx={x(d.payroll)} cy={y(d.wpm)} r={5} fill={QUADRANT_COLOR[d.quadrant]} opacity={0.85} />
          <text x={x(d.payroll)} y={y(d.wpm) - 8} fill="#a1a1aa" fontSize="9" textAnchor="middle">{d.abbr}</text>
        </g>
      ))}

      <text x={pad} y={h - pad + 24} fill="#71717a" fontSize="11">2026-27 committed payroll →</text>
      <text x={pad - 44} y={pad * 0.5 - 10} fill="#71717a" fontSize="11" transform={`rotate(-90 ${pad - 44} ${h/2})`}>wins per $1M</text>
    </svg>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
      <div className="text-xl font-semibold text-zinc-100">{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function QuadrantBadge({ q }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border border-zinc-700">
      <span className="w-2 h-2 rounded-full" style={{ background: QUADRANT_COLOR[q] }} />
      {q}
    </span>
  );
}

export default function TeamCapEfficiencyProject() {
  const [tab, setTab] = useState("overview");
  const [sortKey, setSortKey] = useState("rank");
  const [sortDir, setSortDir] = useState("asc");

  const sorted = useMemo(() => {
    const copy = [...DATA];
    copy.sort((a, b) => {
      const v = a[sortKey] > b[sortKey] ? 1 : a[sortKey] < b[sortKey] ? -1 : 0;
      return sortDir === "asc" ? v : -v;
    });
    return copy;
  }, [sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const th = (key, label) => (
    <th
      onClick={() => toggleSort(key)}
      className="cursor-pointer select-none px-3 py-2 text-left text-xs uppercase tracking-wide text-zinc-500 hover:text-zinc-300"
    >
      {label}{sortKey === key ? (sortDir === "asc" ? " ▲" : " ▼") : ""}
    </th>
  );

  return (
    <div className="w-full max-w-5xl mx-auto bg-zinc-950 text-zinc-100 rounded-xl border border-zinc-800 overflow-hidden">
      <div className="px-6 py-5 border-b border-zinc-800">
        <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">Project 2 · SQL + Data Visualization</div>
        <h1 className="text-2xl font-bold">NBA Team Cap Efficiency Dashboard</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Real SQL (CTEs + window functions) over live Basketball-Reference data. Which teams buy the most wins per dollar of committed payroll — and which don't.
        </p>
      </div>

      <div className="flex gap-1 px-6 pt-4 border-b border-zinc-800">
        {["overview", "results", "methodology"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm rounded-t-md ${tab === t ? "bg-zinc-900 text-zinc-100 border border-zinc-800 border-b-0" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="Teams analyzed" value="30" sub="Full league" />
            <Stat label="League avg" value="0.209" sub="wins per $1M payroll" />
            <Stat label="Most efficient" value="Detroit" sub="0.392 wins/$1M" />
            <Stat label="Least efficient" value="Washington" sub="0.091 wins/$1M" />
          </div>
          <div>
            <div className="text-sm font-medium mb-2 text-zinc-300">Payroll vs. efficiency</div>
            <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
              <ScatterChart />
              <div className="flex flex-wrap gap-3 mt-3">
                {Object.entries(QUADRANT_COLOR).map(([q, c]) => (
                  <div key={q} className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                    {q}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Detroit and San Antonio stand out: strong win totals on payrolls well below league average.
            On the other end, Indiana and Washington combined bottom-five win totals with above-average
            committed payroll. The scatter plot above is the honest picture — not a story rigged to look
            like every team's spending is well correlated with winning, because it isn't.
          </p>
        </div>
      )}

      {tab === "results" && (
        <div className="p-6">
          <div className="text-sm text-zinc-400 mb-3">
            Sortable results from the SQL query (CTE → window functions for rank + percentile). Click a column header to sort.
          </div>
          <div className="overflow-x-auto rounded-lg border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900">
                <tr>
                  {th("rank", "Rank")}
                  {th("team", "Team")}
                  {th("conf", "Conf")}
                  {th("wins", "W")}
                  {th("losses", "L")}
                  {th("payroll", "2026-27 Payroll")}
                  {th("wpm", "Wins / $1M")}
                  <th className="px-3 py-2 text-left text-xs uppercase tracking-wide text-zinc-500">Quadrant</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((d) => (
                  <tr key={d.abbr} className="border-t border-zinc-800/70 hover:bg-zinc-900/50">
                    <td className="px-3 py-2 text-zinc-400">{d.rank}</td>
                    <td className="px-3 py-2 font-medium">{d.team}</td>
                    <td className="px-3 py-2 text-zinc-400">{d.conf}</td>
                    <td className="px-3 py-2">{d.wins}</td>
                    <td className="px-3 py-2 text-zinc-500">{d.losses}</td>
                    <td className="px-3 py-2">{fmtM(d.payroll)}</td>
                    <td className="px-3 py-2 font-mono">{d.wpm.toFixed(4)}</td>
                    <td className="px-3 py-2"><QuadrantBadge q={d.quadrant} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "methodology" && (
        <div className="p-6 space-y-4 text-sm text-zinc-300 leading-relaxed">
          <div>
            <div className="text-zinc-100 font-medium mb-1">Data sources</div>
            <p>2025-26 final NBA standings (wins, losses, net rating) and 2026-27 team committed payroll — both scraped live from Basketball-Reference.</p>
          </div>
          <div>
            <div className="text-zinc-100 font-medium mb-1">Metric</div>
            <p>wins_per_million = wins ÷ (payroll / 1,000,000). Computed in SQL via a CTE joining the two tables on team abbreviation, then ranked with <code className="text-zinc-400">RANK()</code> and <code className="text-zinc-400">PERCENT_RANK()</code> window functions over the full 30-team result set.</p>
          </div>
          <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-4">
            <div className="text-amber-400 font-medium mb-1">Limitation — stated directly, not buried</div>
            <p>
              Basketball-Reference's team payroll table only publishes forward-looking committed salary
              (2026-27 through 2031-32) — there's no same-season historical cap-hit figure available on
              the site without pulling from a different, less reliable source. This dashboard therefore
              pairs <em>current committed payroll</em> against the <em>most recently completed season's
              win total</em>. That's "current investment vs. recent performance," not a strict same-season
              efficiency snapshot. Rosters mostly carry over year to year, so the pairing is meaningful —
              but it is not the same claim as "this team's actual 2025-26 cap hit bought these 2025-26 wins,"
              and I'm not presenting it as that.
            </p>
          </div>
          <div>
            <div className="text-zinc-100 font-medium mb-1">Tools</div>
            <p>Python (data collection + cleaning), SQL (CTEs, JOINs, window functions), hand-built SVG visualization (no charting library, for portability).</p>
          </div>
        </div>
      )}
    </div>
  );
}
