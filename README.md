# Project 2 — NBA Team Cap Efficiency Dashboard

SQL + data visualization project. Answers: which NBA teams get the most wins per dollar of committed payroll, and which don't.

## Data sources (live, scraped from Basketball-Reference)

- `team_records_2026.csv` — final 2025-26 NBA standings (wins, losses, net rating), 30 teams
- `team_payroll_2027.csv` — 2026-27 committed team payroll, 30 teams

## Method

`build_cap_efficiency.py` loads both CSVs into a local SQL database and runs real SQL: a CTE joins the two
tables on team abbreviation, computes `wins_per_million = wins / (payroll / 1e6)`, then uses
`RANK()` and `PERCENT_RANK()` window functions to rank and percentile every team. A second
query aggregates to conference level with `GROUP BY`.

Output: `cap_efficiency_results.csv`, `cap_efficiency_results.json`, `cap_efficiency_conf_summary.json`.

## Honest limitation

Basketball-Reference's team payroll table only publishes forward-looking committed salary
(2026-27 onward) — there is no same-season historical cap-hit figure on the site. So this
project pairs **current committed payroll (2026-27)** against the **most recently completed
season's win total (2025-26)**. That's "current investment vs. recent performance," not a
strict same-season efficiency snapshot. It's a real constraint of the publicly available data,
stated directly in the dashboard's Methodology tab — not smoothed over.

## Headline results

Most efficient (wins per $1M committed payroll): Detroit Pistons (0.392), San Antonio Spurs
(0.316), Oklahoma City Thunder (0.298), Boston Celtics (0.278), LA Lakers (0.267).

Least efficient: Washington Wizards (0.091), Indiana Pacers (0.093), Sacramento Kings (0.116),
Utah Jazz (0.124), Dallas Mavericks (0.131).

League average: 0.209 wins per $1M. East and West conferences are nearly identical on average
efficiency (0.210 vs 0.208) — no conference-wide spending advantage.

## Deliverable

`TeamCapEfficiencyProject.jsx` — standalone React component (Tailwind utility classes, no
external chart library, dependency-light for portability) with three tabs: Overview (scatter
plot, headline stats), Results (full sortable 30-team table), Methodology (data sources, SQL
approach, and the limitation above stated plainly).

## Tools

Python, SQL (CTEs, JOINs, window functions), hand-rolled SVG for the scatter chart.
