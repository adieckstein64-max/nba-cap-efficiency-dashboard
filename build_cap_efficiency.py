"""
NBA Team Cap Efficiency Dashboard - data build script.
Real SQL (CTEs + window functions) over real Basketball-Reference data.

Data sources (both fetched live from basketball-reference.com):
  - team_records_2026.csv  : 2025-26 season final standings (most recently completed NBA season)
  - team_payroll_2027.csv  : 2026-27 committed team payroll (most current full cap sheet BBR publishes;
                              BBR's team payroll table only shows forward-looking committed years, so a
                              same-season historical cap figure isn't available without a different source)

Honest framing / limitation (documented, not hidden):
  This pairs CURRENT committed payroll (2026-27) against the TRAILING completed season's win total (2025-26).
  It is intentionally "current investment vs. recent performance," not a strict same-season cap-hit snapshot.
  That's a real limitation - front offices do plan this way (setting next year's spend based on last year's
  results/roster), but it's not the same as a same-season efficiency number. Framed as such throughout.
"""
import sqlite3, csv, json

conn = sqlite3.connect(":memory:")
cur = conn.cursor()

cur.execute("""
CREATE TABLE team_records (
    team TEXT, abbr TEXT PRIMARY KEY, conf TEXT, div TEXT,
    wins INTEGER, losses INTEGER, wl_pct REAL, nrtg REAL
)
""")
cur.execute("""
CREATE TABLE team_payroll (
    team TEXT, abbr TEXT PRIMARY KEY, payroll_2026_27 INTEGER
)
""")

with open("team_records_2026.csv") as f:
    r = csv.DictReader(f)
    rows = [(x["team"], x["abbr"], x["conf"], x["div"], int(x["wins"]), int(x["losses"]), float(x["wl_pct"]), float(x["nrtg"])) for x in r]
    cur.executemany("INSERT INTO team_records VALUES (?,?,?,?,?,?,?,?)", rows)

with open("team_payroll_2027.csv") as f:
    r = csv.DictReader(f)
    rows = [(x["team"], x["abbr"], int(x["payroll_2026_27"])) for x in r]
    cur.executemany("INSERT INTO team_payroll VALUES (?,?,?)", rows)

conn.commit()

# Real SQL: CTEs + window functions (percentile rank via NTILE / RANK, moving from Viziballr's style)
query = """
WITH joined AS (
    SELECT
        r.team, r.abbr, r.conf, r.div,
        r.wins, r.losses, r.wl_pct, r.nrtg,
        p.payroll_2026_27,
        -- wins purchased per $1M of committed payroll
        ROUND(r.wins * 1000000.0 / p.payroll_2026_27, 4) AS wins_per_million
    FROM team_records r
    JOIN team_payroll p ON r.abbr = p.abbr
),
ranked AS (
    SELECT
        *,
        RANK() OVER (ORDER BY wins_per_million DESC) AS efficiency_rank,
        RANK() OVER (ORDER BY payroll_2026_27 DESC) AS payroll_rank,
        RANK() OVER (ORDER BY wins DESC) AS wins_rank,
        ROUND(100.0 * PERCENT_RANK() OVER (ORDER BY wins_per_million), 1) AS efficiency_percentile,
        ROUND(AVG(wins_per_million) OVER (), 4) AS league_avg_wins_per_million,
        ROUND(AVG(payroll_2026_27) OVER (), 0) AS league_avg_payroll
    FROM joined
)
SELECT
    team, abbr, conf, div, wins, losses, wl_pct, nrtg, payroll_2026_27,
    wins_per_million, efficiency_rank, payroll_rank, wins_rank,
    efficiency_percentile,
    ROUND(wins_per_million - league_avg_wins_per_million, 4) AS efficiency_vs_league_avg,
    league_avg_wins_per_million, league_avg_payroll,
    -- quadrant label: value vs spend, high/low relative to league median-ish (using avg as cutoff, documented)
    CASE
        WHEN payroll_2026_27 >= league_avg_payroll AND wins_per_million >= league_avg_wins_per_million THEN 'High spend, efficient'
        WHEN payroll_2026_27 >= league_avg_payroll AND wins_per_million <  league_avg_wins_per_million THEN 'High spend, inefficient'
        WHEN payroll_2026_27 <  league_avg_payroll AND wins_per_million >= league_avg_wins_per_million THEN 'Low spend, efficient'
        ELSE 'Low spend, inefficient'
    END AS quadrant
FROM ranked
ORDER BY wins_per_million DESC
"""

cur.execute(query)
cols = [d[0] for d in cur.description]
results = [dict(zip(cols, row)) for row in cur.fetchall()]

with open("cap_efficiency_results.csv", "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(results)

with open("cap_efficiency_results.json", "w") as f:
    json.dump(results, f, indent=2)

# A second real query: conference-level summary using GROUP BY + window function combo
cur.execute("""
WITH joined AS (
    SELECT r.conf, r.wins, p.payroll_2026_27,
           r.wins * 1000000.0 / p.payroll_2026_27 AS wins_per_million
    FROM team_records r JOIN team_payroll p ON r.abbr = p.abbr
)
SELECT conf,
       COUNT(*) AS teams,
       SUM(wins) AS total_wins,
       ROUND(AVG(payroll_2026_27), 0) AS avg_payroll,
       ROUND(AVG(wins_per_million), 4) AS avg_wins_per_million
FROM joined
GROUP BY conf
""")
conf_cols = [d[0] for d in cur.description]
conf_summary = [dict(zip(conf_cols, row)) for row in cur.fetchall()]
with open("cap_efficiency_conf_summary.json", "w") as f:
    json.dump(conf_summary, f, indent=2)

print(f"Rows: {len(results)}")
print("Top 5 most efficient (wins per $1M committed payroll):")
for row in results[:5]:
    print(f"  {row['team']:28s} {row['wins']:2d}W  ${row['payroll_2026_27']:,}  {row['wins_per_million']:.4f} wins/$1M")
print("\nBottom 5 least efficient:")
for row in results[-5:]:
    print(f"  {row['team']:28s} {row['wins']:2d}W  ${row['payroll_2026_27']:,}  {row['wins_per_million']:.4f} wins/$1M")
print("\nConference summary:", conf_summary)
