"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { BarChart } from "./BarChart";
import {
  formatDuration,
  secondsToHours,
  type ProjectTimeReport,
  type TimeSummaryGroup,
} from "../lib/gitlab";
import { GITLAB_CONFIG, PROJECT_PATH, COLORS } from "../config/tracker-config";
import { DonutChart } from "./DonutChart";
import TeamWorkTable from "./TeamWorkTable";
import { WeeklyStackedBarChart } from "./WeeklyStackedBarChart";
import { CommitActivityChart } from "./CommitActivityChart";
import { EstimateVsSpentChart } from "./EstimateVsSpentChart";

interface FormState {
  projectPath: string;
  token: string;
  apiUrl: string;
  from: string;
  to: string;
  commitMonth: string;
}

const today = new Date();

const formatDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Funktion um den letzten Dienstag zu finden
const getLastTuesday = (referenceDate: Date = new Date()) => {
  const date = new Date(referenceDate);
  const dayOfWeek = date.getDay(); // 0 = Sonntag, 1 = Montag, 2 = Dienstag, etc.

  // Wenn heute Dienstag ist (dayOfWeek === 2), dann ist heute der "letzte Dienstag"
  if (dayOfWeek === 2) {
    return new Date(date);
  }

  // Ansonsten gehe zurück zum letzten Dienstag
  const daysToSubtract =
    dayOfWeek === 0
      ? 5 // Sonntag: 5 Tage zurück
      : dayOfWeek === 1
      ? 6 // Montag: 6 Tage zurück
      : dayOfWeek - 2; // Andere Tage: entsprechende Tage zurück

  date.setDate(date.getDate() - daysToSubtract);
  return date;
};

// Funktion um den nächsten Dienstag zu finden
const getNextTuesday = (referenceDate: Date = new Date()) => {
  const date = new Date(referenceDate);
  const dayOfWeek = date.getDay();

  // Berechne Tage bis zum nächsten Dienstag
  const daysToAdd =
    dayOfWeek === 0
      ? 2 // Sonntag: 2 Tage vorwärts
      : dayOfWeek === 1
      ? 1 // Montag: 1 Tag vorwärts
      : dayOfWeek === 2
      ? 7 // Dienstag: 7 Tage vorwärts (nächste Woche)
      : 9 - dayOfWeek; // Andere Tage: entsprechende Tage vorwärts

  date.setDate(date.getDate() + daysToAdd);
  return date;
};

const defaultMonthValue = `${today.getFullYear()}-${String(
  today.getMonth() + 1
).padStart(2, "0")}`;
const defaultFromValue = formatDateInput(getLastTuesday(today));
const defaultToValue = formatDateInput(getNextTuesday(today));

const DEFAULT_FORM: FormState = {
  projectPath: PROJECT_PATH,
  token: GITLAB_CONFIG.TOKEN,
  apiUrl: GITLAB_CONFIG.API_URL,
  from: defaultFromValue,
  to: defaultToValue,
  commitMonth: defaultMonthValue,
};

export function TimeTrackerDashboard() {
  const [form, setForm] = useState<FormState>(DEFAULT_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<ProjectTimeReport | null>(null);
  const [selectedEpics, setSelectedEpics] = useState<string[]>([]);

  const commitMonthLabel = useMemo(() => {
    if (!report?.commitRange?.from) {
      return null;
    }
    const base = new Date(report.commitRange.from);
    if (Number.isNaN(base.getTime())) {
      return null;
    }
    return base.toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
  }, [report?.commitRange?.from]);

  const epicOptions = report?.summary.byEpic ?? [];

  useEffect(() => {
    if (!epicOptions.length) {
      setSelectedEpics([]);
      return;
    }
    setSelectedEpics((prev) => {
      const available = new Set(epicOptions.map((group) => group.label));
      const filtered = prev.filter((epic) => available.has(epic));
      if (filtered.length) {
        return filtered;
      }
      return epicOptions
        .slice(0, Math.min(4, epicOptions.length))
        .map((group) => group.label);
    });
  }, [epicOptions]);

  const summaryCards = useMemo(() => {
    if (!report) {
      return [];
    }
    const totalHours = secondsToHours(report.summary.totalSeconds);
    const issueCount = report.issues.length;
    const timelogCount = report.issues.reduce(
      (total, issue) => total + issue.timelogs.length,
      0
    );
    const contributorCount = report.summary.byUser.length;
    const cards = [
      {
        title: "Tracked time",
        value: `${totalHours.toFixed(1)}h`,
        detail: formatDuration(report.summary.totalSeconds),
      },
      {
        title: "Tracked issues",
        value: String(issueCount),
        detail: "Includes all issues with timelogs.",
      },
      {
        title: "Timelog entries",
        value: String(timelogCount),
        detail: "Sum of individual time entries.",
      },
      {
        title: "Contributors",
        value: String(contributorCount),
        detail: "Distinct users who logged time.",
      },
    ];
    if (report.commitActivity?.length) {
      const commitCount = report.commitActivity.reduce(
        (total, day) => total + day.count,
        0
      );
      cards.push({
        title: "Commits",
        value: String(commitCount),
        detail: commitMonthLabel ?? "Selected month",
      });
    }
    return cards;
  }, [report, commitMonthLabel]);

  const userChart = useMemo(
    () => reduceSummary(report?.summary.byUser ?? []),
    [report?.summary.byUser]
  );

  const userColorMap = useMemo(() => {
    const palette = COLORS.TEAM;
    const map = new Map<string, string>();
    const groups = report?.summary.byUser ?? [];
    groups.forEach((group, index) => {
      const key = group.hints?.username ?? group.label;
      map.set(key, palette[index % palette.length]);
    });
    return map;
  }, [report?.summary.byUser]);

  const labelColorMap = useMemo(() => {
    const palette = [...COLORS.PRIMARY, ...COLORS.TEAM];
    const map = new Map<string, string>();
    (report?.summary.byLabel ?? []).forEach((group, index) => {
      map.set(group.label, palette[index % palette.length]);
    });
    return map;
  }, [report?.summary.byLabel]);

  const epicColorMap = useMemo(() => {
    const palette = [...COLORS.PRIMARY, ...COLORS.TEAM];
    const map = new Map<string, string>();
    (report?.summary.byEpic ?? []).forEach((group, index) => {
      map.set(group.label, palette[index % palette.length]);
    });
    return map;
  }, [report?.summary.byEpic]);

  const issueChart = useMemo(
    () => reduceSummary(report?.summary.byIssue ?? []),
    [report?.summary.byIssue]
  );

  const epicDonut = useMemo(() => {
    if (!report) {
      return [];
    }
    const groups = report.summary.byEpic ?? [];
    return groups.map((group, index) => ({
      label: group.label,
      value: secondsToHours(group.seconds),
      color: COLORS.PRIMARY[index % COLORS.PRIMARY.length],
      hint: group.hints?.epicUrl,
    }));
  }, [report]);

  const weeklyStacked = useMemo(() => {
    if (!report || !report.summary.weeklyByUser.length) {
      return [];
    }
    return report.summary.weeklyByUser.map((bucket) => {
      const segments = bucket.totals
        .filter((total) => total.seconds > 0)
        .map((total, index) => {
          const userKey = total.username || total.userId;
          const color =
            userColorMap.get(userKey) ??
            COLORS.TEAM[index % COLORS.TEAM.length];
          return {
            label: total.userName,
            username: total.username,
            value: secondsToHours(total.seconds),
            color,
          };
        });
      return {
        id: bucket.weekStart,
        label: bucket.label,
        total: secondsToHours(bucket.totalSeconds),
        segments,
      };
    });
  }, [report, userColorMap]);

  const commitChartData = useMemo(() => report?.commitActivity ?? [], [report]);

  const epicStacked = useMemo(() => {
    if (
      !report ||
      !report.summary.weeklyEpicBreakdown.length ||
      !selectedEpics.length
    ) {
      return [];
    }
    const fallbackPalette = [...COLORS.PRIMARY, ...COLORS.TEAM];
    return report.summary.weeklyEpicBreakdown
      .map((week) => {
        const segments = selectedEpics
          .map((epic, index) => {
            const entry = week.totals.find((item) => item.epic === epic);
            const hours = secondsToHours(entry?.seconds ?? 0);
            if (hours <= 0) {
              return null;
            }
            const color =
              epicColorMap.get(epic) ??
              fallbackPalette[index % fallbackPalette.length];
            return {
              label: epic,
              value: hours,
              color,
            };
          })
          .filter(
            (
              segment
            ): segment is { label: string; value: number; color: string } =>
              Boolean(segment)
          );

        const total = segments.reduce((sum, segment) => sum + segment.value, 0);
        if (!segments.length || total === 0) {
          return null;
        }
        return {
          id: week.weekStart,
          label: week.label,
          total,
          segments,
        };
      })
      .filter(
        (
          week
        ): week is {
          id: string;
          label: string;
          total: number;
          segments: { label: string; value: number; color: string }[];
        } => Boolean(week)
      );
  }, [report, selectedEpics, epicColorMap]);

  const stateDonut = useMemo(() => {
    if (!report || !report.summary.byState.length) {
      return [];
    }
    const palette = ["#38bdf8", "#fb7185", "#22d3ee", "#64748b"];
    return report.summary.byState.map((group, index) => ({
      label: group.label,
      value: secondsToHours(group.seconds),
      color: palette[index % palette.length],
    }));
  }, [report]);

  const estimateVsSpentData = useMemo(() => {
    if (!report) return [];

    // Filter issues that have either spent time or an estimate
    const relevantIssues = report.issues.filter(
      (issue) => (issue.timeEstimate ?? 0) > 0 || issue.timelogs.length > 0
    );

    // Sort by total activity (spent + estimate) to show most relevant first
    const sorted = relevantIssues.sort((a, b) => {
      const aSpent = a.timelogs.reduce((acc, log) => acc + log.seconds, 0);
      const bSpent = b.timelogs.reduce((acc, log) => acc + log.seconds, 0);
      const aTotal = (a.timeEstimate ?? 0) + aSpent;
      const bTotal = (b.timeEstimate ?? 0) + bSpent;
      return bTotal - aTotal;
    });

    return sorted.map((issue) => {
      const spentSeconds = issue.timelogs.reduce(
        (acc, log) => acc + log.seconds,
        0
      );
      return {
        label: `#${issue.iid} ${issue.title}`,
        estimated: secondsToHours(issue.timeEstimate ?? 0),
        spent: secondsToHours(spentSeconds),
        hint: issue.webUrl,
      };
    });
  }, [report]);

  const toggleEpic = (epic: string) => {
    setSelectedEpics((prev) => {
      if (prev.includes(epic)) {
        return prev.filter((item) => item !== epic);
      }
      return [...prev, epic];
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    setReport(null);

    try {
      const response = await fetch("/api/gitlab", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          projectPath: form.projectPath.trim(),
          token: form.token.trim(),
          apiUrl: form.apiUrl.trim(),
          from: form.from || undefined,
          to: form.to || undefined,
          commitMonth: form.commitMonth || undefined,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error ?? response.statusText);
      }

      const payload = (await response.json()) as ProjectTimeReport;
      setReport(payload);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch timelogs.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.page}>
      <section style={styles.intro}>
        <h1 style={styles.title}>GitLab Time Tracker</h1>
        <p style={styles.subtitle}>
          Authenticate with your personal access token to explore how your team
          spends time across GitLab issues and epics. All requests are proxied
          via this Next.js app—tokens never leave your browser.
        </p>
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Project settings</h2>
        <form style={styles.form} onSubmit={handleSubmit}>
          <label style={styles.field}>
            <span style={styles.label}>Project full path</span>
            <input
              style={styles.input}
              type="text"
              placeholder="group/sub-group/project"
              required
              value={form.projectPath}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  projectPath: event.target.value,
                }))
              }
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>Access token</span>
            <input
              style={styles.input}
              type="password"
              placeholder="GitLab PAT with read_api scope"
              required
              value={form.token}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, token: event.target.value }))
              }
            />
          </label>

          <label style={styles.field}>
            <span style={styles.label}>GraphQL endpoint</span>
            <input
              style={styles.input}
              type="url"
              value={form.apiUrl}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, apiUrl: event.target.value }))
              }
            />
          </label>

          <div style={styles.rangeRow}>
            <label style={{ ...styles.field, flex: 1 }}>
              <span style={styles.label}>From (inclusive)</span>
              <input
                style={styles.input}
                type="date"
                value={form.from}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, from: event.target.value }))
                }
              />
            </label>
            <label style={{ ...styles.field, flex: 1 }}>
              <span style={styles.label}>To (exclusive)</span>
              <input
                style={styles.input}
                type="date"
                value={form.to}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, to: event.target.value }))
                }
              />
            </label>
          </div>

          <label style={styles.field}>
            <span style={styles.label}>Commit activity month</span>
            <input
              style={styles.input}
              type="month"
              value={form.commitMonth}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  commitMonth: event.target.value,
                }))
              }
            />
          </label>

          <button type="submit" style={styles.submit} disabled={isSubmitting}>
            {isSubmitting ? "Loading…" : "Generate report"}
          </button>
        </form>
        {error ? <p style={styles.error}>{error}</p> : null}
      </section>

      {report ? (
        <section style={styles.panel}>
          <header style={styles.reportHeader}>
            <div>
              <h2 style={styles.panelTitle}>{report.project.name}</h2>
              <p style={styles.meta}>
                Generated{" "}
                {new Date(report.generatedAt).toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <div style={styles.meta}>
              Range:{" "}
              {report.range.from
                ? new Date(report.range.from).toLocaleDateString()
                : "start"}{" "}
              →{" "}
              {report.range.to
                ? new Date(report.range.to).toLocaleDateString()
                : "now"}
            </div>
          </header>

          <div style={styles.cards}>
            {summaryCards.map((card) => (
              <article key={card.title} style={styles.card}>
                <span style={styles.cardLabel}>{card.title}</span>
                <span style={styles.cardValue}>{card.value}</span>
                <span style={styles.cardDetail}>{card.detail}</span>
              </article>
            ))}
          </div>

          {report.warnings?.length ? (
            <div style={styles.warningBox}>
              <span style={styles.warningTitle}>Warnings</span>
              <ul style={styles.warningList}>
                {report.warnings.map((warning, index) => (
                  <li key={`${warning}-${index}`}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={styles.charts}>
            <div style={styles.columns}>
              <div style={styles.col}>
                <div style={styles.chartPanel}>
                  <h3 style={styles.chartTitle}>Time by contributor</h3>
                  <BarChart data={userChart} maxBars={6} />
                </div>
                <div style={{ ...styles.chartPanel, ...styles.chartPanelWide }}>
                  <h3 style={styles.chartTitle}>Weekly hours by contributor</h3>
                  <WeeklyStackedBarChart
                    data={weeklyStacked}
                    emptyMessage="Collect some timelogs to view weekly load."
                  />
                </div>
                <div style={{ ...styles.chartPanel, ...styles.chartPanelWide }}>
                  <h3 style={styles.chartTitle}>
                    Commits per day heatmap
                    {commitMonthLabel ? ` (${commitMonthLabel})` : ""}
                  </h3>
                  <CommitActivityChart
                    data={commitChartData}
                    monthLabel={commitMonthLabel ?? undefined}
                  />
                </div>
                <div
                  style={{ ...styles.chartPanel, ...styles.chartPanelCompact }}
                >
                  <h3 style={styles.chartTitle}>Issue workflow</h3>
                  <DonutChart data={stateDonut} />
                </div>
                <div style={{ ...styles.chartPanel, ...styles.chartPanelWide }}>
                  <h3 style={styles.chartTitle}>
                    Estimate vs Actual (Top Issues)
                  </h3>
                  <EstimateVsSpentChart
                    data={estimateVsSpentData}
                    maxBars={8}
                  />
                </div>
              </div>
              <div style={styles.col}>
                <div
                  style={{ ...styles.chartPanel, ...styles.chartPanelCompact }}
                >
                  <h3 style={styles.chartTitle}>Epic distribution</h3>
                  <DonutChart data={epicDonut} />
                </div>
                <div style={{ ...styles.chartPanel, ...styles.chartPanelWide }}>
                  <h3 style={styles.chartTitle}>Top issues</h3>
                  <BarChart data={issueChart} maxBars={8} />
                </div>
                <div style={styles.chartPanel}>
                  <h3 style={styles.chartTitle}>Focus by epic (per person)</h3>
                  {epicOptions.length ? (
                    <div style={styles.labelSelector}>
                      {epicOptions.map((option) => {
                        const active = selectedEpics.includes(option.label);
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => toggleEpic(option.label)}
                            style={{
                              ...styles.labelChip,
                              ...(active
                                ? styles.labelChipActive
                                : styles.labelChipInactive),
                            }}
                          >
                            <span>{option.label}</span>
                            <span style={styles.labelChipMetric}>
                              {secondsToHours(option.seconds).toFixed(1)}h
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                  <WeeklyStackedBarChart
                    data={epicStacked}
                    valueLabel="h"
                    emptyMessage="No epic activity captured."
                  />
                </div>
              </div>
            </div>
          </div>

          <TeamWorkTable summary={report.summary} />

          <div style={styles.issueTable}>
            <h3 style={styles.tableTitle}>Issue breakdown</h3>
            <div style={styles.tableHead}>
              <span style={{ flex: 2 }}>Issue</span>
              <span style={{ flex: 1 }}>Epic</span>
              <span style={{ flex: 1 }}>Entries</span>
              <span style={{ flex: 1 }}>Estimate</span>
              <span style={{ flex: 1 }}>Tracked</span>
            </div>
            {report.issues.map((issue) => {
              const totalSeconds = issue.timelogs.reduce(
                (acc, log) => acc + log.seconds,
                0
              );
              const estimateSeconds = issue.timeEstimate ?? 0;
              const epicLabel = issue.epic
                ? `${issue.epic.title} (${issue.epic.iid ?? ""})`
                : "No epic";
              const estimateDisplay =
                estimateSeconds > 0
                  ? `${secondsToHours(estimateSeconds).toFixed(
                      2
                    )}h (${formatDuration(estimateSeconds)})`
                  : "—";
              return (
                <div key={issue.id} style={styles.tableRow}>
                  <span style={{ flex: 2 }}>
                    <a
                      href={issue.webUrl}
                      style={styles.link}
                      target="_blank"
                      rel="noreferrer"
                    >
                      #{issue.iid} {issue.title}
                    </a>
                  </span>
                  <span style={{ flex: 1 }}>{epicLabel}</span>
                  <span style={{ flex: 1 }}>{issue.timelogs.length}</span>
                  <span style={{ flex: 1 }}>{estimateDisplay}</span>
                  <span style={{ flex: 1 }}>
                    {secondsToHours(totalSeconds).toFixed(2)}h (
                    {formatDuration(totalSeconds)})
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function reduceSummary(groups: TimeSummaryGroup[]): {
  label: string;
  value: number;
  hint?: string;
}[] {
  return groups.map((group) => ({
    label: group.label,
    value: secondsToHours(group.seconds),
    hint:
      group.hints?.issueUrl ?? group.hints?.epicUrl ?? group.hints?.username,
  }));
}

const styles: Record<string, CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    padding: "1.25rem 1rem 2rem",
    maxWidth: "1280px",
    margin: "0 auto",
    color: "#e2e8f0",
    width: "100%",
  },
  intro: {
    display: "grid",
    gap: "0.75rem",
  },
  title: {
    margin: 0,
    fontSize: "2.5rem",
  },
  subtitle: {
    margin: 0,
    color: "rgba(226, 232, 240, 0.85)",
    maxWidth: "65ch",
    lineHeight: 1.6,
  },
  panel: {
    background: "rgba(15, 23, 42, 0.7)",
    borderRadius: "0.75rem",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    backdropFilter: "blur(10px)",
  },
  panelTitle: {
    margin: 0,
    fontSize: "1.35rem",
  },
  form: {
    display: "grid",
    gap: "1rem",
  },
  field: {
    display: "grid",
    gap: "0.35rem",
  },
  label: {
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "rgba(148, 163, 184, 0.95)",
  },
  input: {
    padding: "0.75rem 0.9rem",
    borderRadius: "0.75rem",
    border: "1px solid rgba(148, 163, 184, 0.3)",
    background: "rgba(15, 23, 42, 0.6)",
    color: "#f8fafc",
    fontSize: "1rem",
  },
  rangeRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap",
  },
  submit: {
    padding: "0.85rem 1.2rem",
    borderRadius: "0.75rem",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "1rem",
    background:
      "linear-gradient(90deg, rgba(56, 189, 248, 0.9), rgba(251, 113, 133, 0.9))",
    color: "#0f172a",
  },
  error: {
    margin: 0,
    padding: "0.75rem 1rem",
    borderRadius: "0.75rem",
    background: "rgba(248, 113, 113, 0.15)",
    border: "1px solid rgba(248, 113, 113, 0.35)",
    color: "#fecaca",
  },
  reportHeader: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: "1rem",
  },
  cards: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
  },
  warningBox: {
    padding: "1rem",
    borderRadius: "0.75rem",
    border: "1px solid rgba(251, 191, 36, 0.35)",
    background: "rgba(251, 191, 36, 0.12)",
    color: "#facc15",
    display: "grid",
    gap: "0.5rem",
  },
  warningTitle: {
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    fontSize: "0.85rem",
  },
  warningList: {
    margin: 0,
    paddingLeft: "1.2rem",
    display: "grid",
    gap: "0.25rem",
    fontSize: "0.95rem",
  },
  card: {
    background: "rgba(15, 23, 42, 0.6)",
    borderRadius: "0.6rem",
    padding: "0.9rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    flex: "1 1 220px",
    minWidth: "200px",
  },
  cardLabel: {
    fontSize: "0.9rem",
    color: "rgba(148, 163, 184, 0.9)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  cardValue: {
    fontSize: "1.8rem",
    fontWeight: 700,
  },
  cardDetail: {
    fontSize: "0.9rem",
    color: "rgba(148, 163, 184, 0.9)",
  },
  charts: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  columns: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    gap: "1rem",
    width: "100%",
    flexWrap: "wrap",
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    flex: "1 1 0%",
    minWidth: 0,
  },
  chartRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "1rem",
    alignItems: "stretch",
  },
  chartPanel: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    background: "rgba(15, 23, 42, 0.55)",
    borderRadius: "0.75rem",
    border: "1px solid rgba(148, 163, 184, 0.18)",
    padding: "0.9rem",
    position: "relative",
    overflow: "hidden",
    flex: "0 1 auto",
    minWidth: "280px",
    width: "100%",
  },
  chartPanelCompact: {
    alignItems: "center",
  },
  chartPanelWide: {
    boxShadow: "0 12px 28px rgba(15, 23, 42, 0.28)",
    minHeight: "240px",
    marginBottom: "0.25rem",
  },
  chartTitle: {
    margin: 0,
    fontSize: "1rem",
  },
  labelSelector: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    marginBottom: "0.75rem",
  },
  labelChip: {
    display: "inline-flex",
    alignItems: "center",
    gap: "0.4rem",
    borderRadius: "999px",
    border: "1px solid transparent",
    padding: "0.35rem 0.8rem",
    fontSize: "0.85rem",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  labelChipActive: {
    background: "rgba(56, 189, 248, 0.18)",
    borderColor: "rgba(56, 189, 248, 0.5)",
    color: "#38bdf8",
  },
  labelChipInactive: {
    background: "rgba(15, 23, 42, 0.5)",
    borderColor: "rgba(148, 163, 184, 0.25)",
    color: "rgba(226, 232, 240, 0.85)",
  },
  labelChipMetric: {
    fontVariantNumeric: "tabular-nums",
    color: "rgba(148, 163, 184, 0.9)",
  },
  issueTable: {
    display: "grid",
    gap: "0.75rem",
    marginTop: "1.5rem",
  },
  tableTitle: {
    margin: 0,
    fontSize: "1.1rem",
  },
  tableHead: {
    display: "flex",
    gap: "1rem",
    padding: "0.5rem 0.75rem",
    borderRadius: "0.6rem",
    background: "rgba(148, 163, 184, 0.08)",
    fontSize: "0.85rem",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    color: "rgba(148, 163, 184, 0.9)",
  },
  tableRow: {
    display: "flex",
    gap: "1rem",
    padding: "0.85rem 0.75rem",
    borderRadius: "0.6rem",
    background: "rgba(15, 23, 42, 0.6)",
    border: "1px solid rgba(148, 163, 184, 0.15)",
  },
  link: {
    color: "#38bdf8",
    textDecoration: "none",
  },
  meta: {
    margin: 0,
    color: "rgba(148, 163, 184, 0.95)",
  },
};
