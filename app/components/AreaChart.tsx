"use client";

import { memo, useMemo, useId } from "react";
import type { CSSProperties } from "react";

export interface CommitDatum {
  date: string;
  count: number;
  label: string; // Formatted date for display
}

interface AreaChartProps {
  data: CommitDatum[];
  height?: number;
  strokeColor?: string;
  fillColor?: string;
  showPoints?: boolean;
  emptyMessage?: string;
}

const DEFAULT_HEIGHT = 220;

const AreaChartComponent = ({
  data,
  height = DEFAULT_HEIGHT,
  strokeColor = "#10b981", // Green for commits
  fillColor = "rgba(16, 185, 129, 0.25)",
  showPoints = true,
  emptyMessage = "No commits to display yet."
}: AreaChartProps) => {
  const gradientId = useId();

  const prepared = useMemo(() => {
    if (!data.length) {
      return null;
    }
    
    const maxValue = Math.max(...data.map((item) => item.count), 1);
    const paddingTop = 10;
    const paddingBottom = 15;
    const usableHeight = 100 - paddingTop - paddingBottom;
    const step = data.length > 1 ? 100 / (data.length - 1) : 0;
    
    const points = data.map((item, index) => {
      const x = data.length === 1 ? 50 : index * step;
      const y = 100 - paddingBottom - (item.count / maxValue) * usableHeight;
      return { 
        x, 
        y, 
        label: item.label, 
        value: item.count,
        date: item.date,
        isZero: item.count === 0
      };
    });

    // Create smooth area path
    const areaPath = [
      `M 0 100`,
      `L 0 ${points[0].y}`,
      ...points.map((point) => `L ${point.x} ${point.y}`),
      `L 100 ${points[points.length - 1].y}`,
      `L 100 100`,
      "Z"
    ].join(" ");

    // Create smooth line path using curves for better visualization
    const linePath = points.length > 2 
      ? createSmoothCurvePath(points)
      : [
          `M ${points[0].x} ${points[0].y}`,
          ...points.slice(1).map((point) => `L ${point.x} ${point.y}`)
        ].join(" ");

    return { points, areaPath, linePath, maxValue };
  }, [data]);

  if (!prepared) {
    return <p style={styles.empty}>{emptyMessage}</p>;
  }

  return (
    <div style={{ ...styles.container, height }}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={styles.svg}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fillColor} stopOpacity={0.9} />
            <stop offset="50%" stopColor={fillColor} stopOpacity={0.4} />
            <stop offset="100%" stopColor={fillColor} stopOpacity={0.1} />
          </linearGradient>
        </defs>
        
        {/* Grid lines for better readability */}
        <defs>
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="0.5"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#grid)" />
        
        {/* Area fill */}
        <path
          d={prepared.areaPath}
          fill={`url(#${gradientId})`}
          stroke="none"
        />
        
        {/* Main line */}
        <path
          d={prepared.linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        
        {/* Data points */}
        {showPoints && prepared.points.map((point) => (
          <g key={`${point.date}-${point.value}`}>
            {/* Outer circle for better visibility */}
            <circle
              cx={point.x}
              cy={point.y}
              r={point.isZero ? 1 : 2.5}
              fill="rgba(255, 255, 255, 0.9)"
              stroke={strokeColor}
              strokeWidth={point.isZero ? 1 : 1.5}
            />
            {/* Inner circle */}
            <circle
              cx={point.x}
              cy={point.y}
              r={point.isZero ? 0.5 : 1.5}
              fill={strokeColor}
            />
            <title>
              {point.label}: {point.value} commit{point.value === 1 ? '' : 's'}
            </title>
          </g>
        ))}
        
        {/* Baseline */}
        <line
          x1={0}
          x2={100}
          y1={85}
          y2={85}
          stroke="rgba(148, 163, 184, 0.3)"
          strokeWidth={0.6}
        />
      </svg>
      
      {/* Labels with improved spacing and overflow handling */}
      <div style={styles.labels}>
        {prepared.points.map((point, index) => {
          // Show every nth label to prevent overcrowding
          const shouldShow = prepared.points.length <= 7 || index % Math.ceil(prepared.points.length / 7) === 0;
          return shouldShow ? (
            <span 
              key={`${point.date}-label`} 
              style={{
                ...styles.label,
                gridColumn: `${index + 1} / ${index + 2}`
              }}
            >
              {point.label}
            </span>
          ) : null;
        })}
      </div>
      
      {/* Summary stats */}
      <div style={styles.summary}>
        <span style={styles.summaryItem}>
          Total: {prepared.points.reduce((sum, p) => sum + p.value, 0)} commits
        </span>
        <span style={styles.summaryItem}>
          Peak: {prepared.maxValue} commits/day
        </span>
        <span style={styles.summaryItem}>
          Avg: {(prepared.points.reduce((sum, p) => sum + p.value, 0) / prepared.points.length).toFixed(1)} commits/day
        </span>
      </div>
    </div>
  );
};

// Helper function to create smooth curve path using quadratic Bézier curves
function createSmoothCurvePath(points: Array<{x: number, y: number}>): string {
  if (points.length < 2) return '';
  
  const path = [`M ${points[0].x} ${points[0].y}`];
  
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    
    if (i === 1) {
      // First curve, start from first point
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path.push(`Q ${prev.x} ${prev.y} ${midX} ${midY}`);
    } else {
      // Subsequent curves
      const midX = (prev.x + curr.x) / 2;
      const midY = (prev.y + curr.y) / 2;
      path.push(`Q ${prev.x} ${prev.y} ${midX} ${midY}`);
    }
  }
  
  // End at the last point
  const lastPoint = points[points.length - 1];
  const secondLastPoint = points[points.length - 2];
  if (points.length > 1) {
    path.push(`Q ${secondLastPoint.x} ${secondLastPoint.y} ${lastPoint.x} ${lastPoint.y}`);
  }
  
  return path.join(' ');
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: "100%",
    display: "grid",
    gridTemplateRows: "1fr auto auto",
    gap: "0.75rem",
    alignItems: "end"
  },
  svg: {
    width: "100%",
    height: "100%",
    overflow: "visible"
  },
  labels: {
    display: "grid",
    gridTemplateColumns: `repeat(7, minmax(0, 1fr))`,
    fontSize: "0.75rem",
    gap: "0.25rem",
    color: "rgba(148, 163, 184, 0.8)"
  },
  label: {
    textAlign: "center",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  summary: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem 1rem",
    fontSize: "0.75rem",
    color: "rgba(148, 163, 184, 0.9)",
    borderTop: "1px solid rgba(148, 163, 184, 0.2)",
    paddingTop: "0.5rem"
  },
  summaryItem: {
    fontVariantNumeric: "tabular-nums"
  },
  empty: {
    fontStyle: "italic",
    color: "rgba(148, 163, 184, 0.9)",
    textAlign: "center",
    padding: "2rem"
  }
};

export const AreaChart = memo(AreaChartComponent);
