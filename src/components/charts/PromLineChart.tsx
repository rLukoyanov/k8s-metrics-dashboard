import { useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip as ChartTooltip,
  type ChartData,
  type ChartOptions,
  type TooltipItem,
} from "chart.js";
import { Line } from "react-chartjs-2";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PromSeries {
  label: string;
  values: Array<[number, string]>;
}

export interface PromLineChartProps {
  series: PromSeries[];
  start: number;
  end: number;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  colors?: string[];
}

// ─── Plugins ───────────────────────────────────────────────────────────────

const xAxisGrid = {
  id: "xAxisGrid",
  afterDraw(chart: ChartJS<"line">) {
    const xScale = chart.scales.x;
    if (!xScale) return;

    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.18)";
    ctx.lineWidth = 1;

    xScale.ticks.forEach((tick) => {
      const x = xScale.getPixelForValue(tick.value);
      if (x < chartArea.left || x > chartArea.right) return;

      ctx.beginPath();
      ctx.moveTo(x, chartArea.top);
      ctx.lineTo(x, chartArea.bottom);
      ctx.stroke();
    });

    ctx.restore();
  },
};

const verticalHoverLine = {
  id: "verticalHoverLine",
  afterDraw(chart: ChartJS<"line">) {
    const active = chart.getActiveElements();
    if (!active.length) return;

    const { ctx, chartArea } = chart;
    const x = active[0].element.x;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = "rgba(148, 163, 184, 0.45)";
    ctx.lineWidth = 1.5;
    ctx.moveTo(x, chartArea.top);
    ctx.lineTo(x, chartArea.bottom);
    ctx.stroke();
    ctx.restore();
  },
};

// ─── Register once ─────────────────────────────────────────────────────────

let registered = false;
const registerPlugins = () => {
  if (registered) return;
  ChartJS.register(LinearScale, PointElement, LineElement, ChartTooltip, Legend, Filler, xAxisGrid, verticalHoverLine);
  registered = true;
};

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatValue = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}G`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
};

const formatTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const calcInterval = (timeRange: number) => (timeRange < 7200 ? 15 : 30);

const buildRoundTimes = (timestamps: number[], intervalSec: number) => {
  const first = Math.ceil(timestamps[0] / intervalSec) * intervalSec;
  const times: number[] = [];
  for (let t = first; t < timestamps[timestamps.length - 1]; t += intervalSec) {
    times.push(t);
  }
  return times;
};

const DEFAULT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6", "#ec4899"];

// ─── Component ─────────────────────────────────────────────────────────────

const PromLineChart = ({ series, start, end, title, subtitle, loading, colors }: PromLineChartProps) => {
  registerPlugins();

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartRef = useRef<any>(null);
  const timestampsRef = useRef<number[]>([]);

  const palette = colors ?? DEFAULT_COLORS;

  const chartData = useMemo<ChartData<"line">>(() => {
    if (!series.length) {
      const mid = (start + end) / 2;
      timestampsRef.current = [start, mid, end];
      return {
        datasets: [{ label: "", data: [{ x: start, y: 0 }, { x: mid, y: 0 }, { x: end, y: 0 }], pointRadius: 0, borderWidth: 0, fill: false }],
      };
    }

    const allTs = new Set<number>();
    series.forEach((s) => s.values.forEach(([ts]) => allTs.add(ts)));
    const sorted = Array.from(allTs).sort((a, b) => a - b);
    timestampsRef.current = sorted.length ? sorted : [start, end];

    const datasets = series.slice(0, 6).map((s, i) => {
      const valueMap = new Map(s.values.map(([ts, val]) => [ts, parseFloat(val)]));
      return {
        label: s.label,
        data: sorted.map((ts) => ({ x: ts, y: valueMap.get(ts) ?? 0 })),
        borderColor: palette[i % palette.length],
        backgroundColor: palette[i % palette.length] + "1a",
        borderWidth: 2,
        tension: 0.3,
        pointRadius: 0,
        pointHoverRadius: 4,
        pointHitRadius: 12,
        fill: false,
      };
    });

    return { datasets };
  }, [series, start, end, palette]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    if (hoveredIndex !== null) {
      const point = chart.getDatasetMeta(0).data[hoveredIndex];
      if (point) {
        const position = point.tooltipPosition(false);
        chart.setActiveElements([{ datasetIndex: 0, index: hoveredIndex }]);
        chart.tooltip?.setActiveElements([{ datasetIndex: 0, index: hoveredIndex }], position);
        chart.update("none");
        return;
      }
    }

    chart.setActiveElements([]);
    chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
    chart.update("none");
  }, [hoveredIndex]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      onHover: (_, activeElements) => {
        setHoveredIndex(activeElements.length ? activeElements[0].index : null);
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          displayColors: true,
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#f8fafc",
          bodyColor: "#e2e8f0",
          borderColor: "rgba(148, 163, 184, 0.25)",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            title(items) {
              const raw = items[0]?.raw as { x: number; y: number } | undefined;
              return raw ? formatTime(raw.x) : "";
            },
            label(context: TooltipItem<"line">) {
              const val = context.parsed.y ?? 0;
              return `${context.dataset.label}: ${formatValue(val)}`;
            },
          },
        },
      },
      scales: {
        x: {
          type: "linear",
          grid: { display: false },
          afterBuildTicks(scale) {
            const ts = timestampsRef.current;
            if (!ts.length) return;
            const intervalSec = calcInterval(ts[ts.length - 1] - ts[0]) * 60;
            scale.ticks = buildRoundTimes(ts, intervalSec).map((v) => ({ value: v } as any));
          },
          ticks: {
            color: "rgba(148, 163, 184, 0.7)",
            maxTicksLimit: 8,
            callback(value: any) {
              const num = Number(value);
              return isNaN(num) ? value : formatTime(num);
            },
          },
          border: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "rgba(148, 163, 184, 0.7)",
            callback: (v: any) => formatValue(Number(v)),
          },
          grid: {
            drawOnChartArea: false,
            drawTicks: true,
            tickLength: 5,
            tickColor: "rgba(148, 163, 184, 0.5)",
          },
          border: { display: false },
        },
      },
    }),
    [],
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-slate-400 text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {title && (
        <div className="mb-2">
          {title && <h3 className="text-base font-semibold text-white">{title}</h3>}
          {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
        </div>
      )}

      <Line
        ref={(chart: any) => {
          chartRef.current = chart;
        }}
        data={chartData}
        options={options}
      />
    </div>
  );
};

export default PromLineChart;
