"use client";

import { memo } from "react";
import type { CSSProperties } from "react";

export interface EstimateVsSpentDatum {
  label: string;
  estimated: number;
  spent: number;
  hint?: string;
}

interface EstimateVsSpentChartProps {
  data: EstimateVsSpentDatum[];
  maxBars?: number;
  valueLabel?: string;
  decimals?: number;
}

const Chart = ({
  data,
  maxBars = 8,
  valueLabel = "h",
  decimals = 1,
}: EstimateVsSpentChartProps) => {
  if (!data.length) {
    return <p style={styles.empty}>No data yet.</p>;
  }

  const trimmed = data.slice(0, maxBars);
  // Find the maximum value across both estimated and spent to scale the bars
  const maxValue = Math.max(
    ...trimmed.flatMap((item) => [item.estimated, item.spent]),
    0
  );

  return (
    <div style={styles.wrapper}>
      {trimmed.map((item) => {
        const estimatedFraction = maxValue > 0 ? item.estimated / maxValue : 0;
        const spentFraction = maxValue > 0 ? item.spent / maxValue : 0;
        
        return (
          <div key={item.label} style={styles.row}>
            <div style={styles.labelCell}>
              <span style={styles.labelText} title={item.hint ?? item.label}>
                {item.label}
              </span>
            </div>
            <div style={styles.barsContainer}>
              {/* Estimated Bar */}
              <div style={styles.barRow}>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${Math.max(estimatedFraction * 100, 2)}%`,
                      background: "rgba(148, 163, 184, 0.8)", // Gray for estimate
                    }}
                  />
                </div>
                <span style={styles.valueText}>
                  {item.estimated.toFixed(decimals)}{valueLabel} (Est)
                </span>
              </div>
              
              {/* Spent Bar */}
              <div style={styles.barRow}>
                <div style={styles.barTrack}>
                  <div
                    style={{
                      ...styles.barFill,
                      width: `${Math.max(spentFraction * 100, 2)}%`,
                      background: item.spent > item.estimated && item.estimated > 0 
                        ? "#fb7185" // Red if over budget
                        : "#38bdf8", // Blue if under budget
                    }}
                  />
                </div>
                <span style={styles.valueText}>
                  {item.spent.toFixed(decimals)}{valueLabel} (Act)
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, CSSProperties> = {
  wrapper: {
    display: "grid",
    gap: "1rem",
    width: "100%",
  },
  row: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 4fr)",
    alignItems: "center",
    gap: "1rem",
    padding: "0.75rem",
    borderRadius: "0.65rem",
    background: "rgba(15, 23, 42, 0.4)",
    border: "1px solid rgba(148, 163, 184, 0.08)",
  },
  labelCell: {
    minWidth: 0,
  },
  labelText: {
    display: "inline-block",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "normal",
    fontWeight: 500,
    lineHeight: 1.4,
    fontSize: "0.9rem",
  },
  barsContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  barRow: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  barTrack: {
    flex: 1,
    height: "0.5rem",
    borderRadius: "0.25rem",
    background: "rgba(148, 163, 184, 0.15)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "0.25rem",
    transition: "width 0.5s ease-out",
  },
  valueText: {
    fontSize: "0.75rem",
    color: "rgba(148, 163, 184, 0.9)",
    minWidth: "4.5rem",
    textAlign: "right",
    fontVariantNumeric: "tabular-nums",
  },
  empty: {
    color: "rgba(148, 163, 184, 0.7)",
    fontStyle: "italic",
  },
};

export const EstimateVsSpentChart = memo(Chart);
