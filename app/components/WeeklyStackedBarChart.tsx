"use client";

import { memo, useMemo } from "react";
import type { CSSProperties } from "react";

export interface StackedBarSegment {
  label: string;
  username?: string;
  value: number;
  color: string;
}

export interface StackedBarDatum {
  id?: string;
  label: string;
  total: number;
  segments: StackedBarSegment[];
}

interface WeeklyStackedBarChartProps {
  data: StackedBarDatum[];
  decimals?: number;
  valueLabel?: string;
  emptyMessage?: string;
}

const WeeklyStackedBarChartComponent = ({
  data,
  decimals = 1,
  valueLabel = "h",
  emptyMessage = "No data available.",
}: WeeklyStackedBarChartProps) => {
  const legendEntries = useMemo(() => {
    const unique = new Map<string, { label: string; color: string }>();
    for (const datum of data) {
      for (const segment of datum.segments) {
        const key = segment.username ?? segment.label;
        if (!unique.has(key)) {
          unique.set(key, {
            label: segment.label,
            color: segment.color,
          });
        }
      }
    }
    return Array.from(unique.values());
  }, [data]);

  const maxTotal = useMemo(() => {
    return Math.max(...data.map((datum) => datum.total), 0);
  }, [data]);

  const calculateBarWidth = (total: number) => {
    if (maxTotal === 0) return 100;
    const minWidth = 20; // Minimum width percentage
    const maxWidth = 100; // Maximum width percentage
    const ratio = total / maxTotal;
    return minWidth + (maxWidth - minWidth) * ratio;
  };

  if (!data.length) {
    return <p style={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.rows}>
        {data.map((datum, index) => {
          const barWidth = calculateBarWidth(datum.total);
          return (
            <div key={datum.id ?? `${datum.label}-${index}`} style={styles.row}>
              <div style={styles.itemLabel}>{datum.label}</div>
              <div
                style={{
                  ...styles.barTrack,
                  width: `${barWidth}%`,
                  minWidth: "60px", // Ensure readability even for small values
                }}
              >
                {datum.segments.map((segment) => {
                  const percent =
                    datum.total > 0 ? (segment.value / datum.total) * 100 : 0;
                  return (
                    <div
                      key={`${datum.label}-${segment.label}`}
                      style={{
                        ...styles.barSegment,
                        flexGrow: Math.max(segment.value, 0.15),
                        backgroundColor: segment.color,
                      }}
                      title={`${segment.label}: ${segment.value.toFixed(
                        decimals
                      )}${valueLabel}`}
                    >
                      {percent > 12 ? (
                        <span style={styles.segmentValue}>
                          {segment.value.toFixed(decimals)}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
              <div style={styles.total}>
                {datum.total.toFixed(decimals)}
                {valueLabel}
              </div>
            </div>
          );
        })}
      </div>
      {legendEntries.length ? (
        <div style={styles.legend}>
          {legendEntries.map((entry) => (
            <span key={entry.label} style={styles.legendItem}>
              <span
                style={{
                  ...styles.legendSwatch,
                  backgroundColor: entry.color,
                }}
              />
              <span>{entry.label}</span>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "grid",
    gap: "1.25rem",
  },
  rows: {
    display: "grid",
    gap: "0.85rem",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(140px, 1fr) minmax(0, 6fr) auto",
    gap: "0.75rem",
    alignItems: "center",
  },
  itemLabel: {
    fontWeight: 500,
    color: "rgba(226, 232, 240, 0.85)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  barTrack: {
    display: "flex",
    height: "1.2rem",
    borderRadius: "0.75rem",
    overflow: "hidden",
    background: "rgba(148, 163, 184, 0.18)",
  },
  barSegment: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.75rem",
    flexBasis: 0,
    color: "#0f172a",
    fontWeight: 600,
  },
  segmentValue: {
    padding: "0 0.4rem",
    textShadow: "0 1px 2px rgba(15, 23, 42, 0.35)",
  },
  total: {
    fontVariantNumeric: "tabular-nums",
    fontWeight: 600,
  },
  legend: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.6rem 1rem",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    fontSize: "0.85rem",
    color: "rgba(226, 232, 240, 0.9)",
  },
  legendSwatch: {
    width: "0.75rem",
    height: "0.75rem",
    borderRadius: "0.4rem",
  },
  empty: {
    fontStyle: "italic",
    color: "rgba(148, 163, 184, 0.9)",
  },
};

export const WeeklyStackedBarChart = memo(WeeklyStackedBarChartComponent);
