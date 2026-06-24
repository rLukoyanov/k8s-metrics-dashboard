import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Chart as ChartJS,
  type ChartType,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  type ChartData,
  type ChartOptions,
  type ScriptableContext,
  type TooltipItem,
  type TooltipPositionerFunction,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  generatePromSeries,
  generateTimestamps,
  promConfigs,
  type PromConfig,
} from "../data/mockPrometheusData";
import { fetchPrometheusRange } from "../api/api";

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

ChartJS.register(
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  xAxisGrid,
  verticalHoverLine,
);

// ─── Custom tooltip positioner ──────────────────────────────────────────────

declare module "chart.js" {
  interface TooltipPositionerMap {
    fixedY: TooltipPositionerFunction<ChartType>;
  }
}

if (!Tooltip.positioners.fixedY) {
  Tooltip.positioners.fixedY = function fixedY(elements, eventPosition) {
    const activeElement = elements[0];
    const x = activeElement
      ? activeElement.element.tooltipPosition(false).x
      : eventPosition.x;
    return { x, y: this.chart.chartArea.top + 20 };
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const formatValue = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}G`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
};

const formatValueFull = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}G`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(2)}K`;
  return v.toFixed(4);
};

const formatChange = (change: number | null) => {
  if (change === null) return "Стартовая точка";
  if (change === 0) return "Без изменений";
  const prefix = change > 0 ? "+" : "";
  return `${prefix}${formatValueFull(change)}`;
};

const createGradient = (context: ScriptableContext<"line">) => {
  const { ctx, chartArea } = context.chart;
  if (!chartArea) return "rgba(34, 197, 94, 0.22)";

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, "rgba(239, 68, 68, 0.42)");
  gradient.addColorStop(0.55, "rgba(248, 113, 113, 0.18)");
  gradient.addColorStop(1, "rgba(34, 197, 94, 0.08)");
  return gradient;
};

const createLineGradient = (context: ScriptableContext<"line">) => {
  const { ctx, chartArea } = context.chart;
  if (!chartArea) return "#22c55e";

  const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
  gradient.addColorStop(0, "#ef4444");
  gradient.addColorStop(0.55, "#f97316");
  gradient.addColorStop(1, "#22c55e");
  return gradient;
};

const formatTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const STATIC_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308"];

const PERIODS = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "6h", minutes: 360 },
  { label: "12h", minutes: 720 },
  { label: "24h", minutes: 1440 },
] as const;

// ─── Tick helpers ──────────────────────────────────────────────────────────

const calcInterval = (timeRange: number) => (timeRange < 7200 ? 15 : 30);

const buildRoundTimes = (timestamps: number[], intervalSec: number) => {
  const first = Math.ceil(timestamps[0] / intervalSec) * intervalSec;
  const times: number[] = [];
  for (let t = first; t < timestamps[timestamps.length - 1]; t += intervalSec) {
    times.push(t);
  }
  return times;
};

// ─── PromQL ────────────────────────────────────────────────────────────────

const buildPromQL = (cfg: PromConfig) => {
  const isRate = cfg.metricName.includes("_total") || cfg.metricName.includes("_seconds");
  if (isRate) {
    return `sum(rate(${cfg.metricName}[2m])) by (container, pod, namespace)`;
  }
  return `sum(${cfg.metricName}) by (container, pod, namespace)`;
};

const transformPromToChart = (_cfg: PromConfig, chartIdx: number, result: any[]) => {
  const series = result
    .filter((r: any) => r.metric?.container)
    .slice(0, 4);

  if (!series.length) return null;

  const allTs = new Set<number>();
  series.forEach((s: any) => s.values?.forEach((v: [number, string]) => allTs.add(v[0])));
  const sorted = Array.from(allTs).sort((a, b) => a - b);

  const datasets = series.map((s: any, si: number) => {
    const valueMap = new Map(s.values.map(([ts, val]: [number, string]) => [ts, parseFloat(val)]));
    return {
      label: s.metric.container || s.metric.pod || s.metric.namespace || "unknown",
      data: sorted.map((ts) => ({ x: ts, y: valueMap.get(ts) ?? 0 })),
      borderColor: chartIdx === 0 ? STATIC_COLORS[si] : createLineGradient,
      backgroundColor: chartIdx === 0 ? STATIC_COLORS[si] + "1a" : createGradient,
      borderWidth: 4,
      tension: 0.38,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 18,
      fill: chartIdx === 0,
    };
  });

  return { timestamps: sorted, datasets };
};

const generateMock = (cfg: PromConfig, chartIdx: number, count: number) => {
  const timestamps = generateTimestamps(count);
  const series = cfg.containers.map((container, ci) =>
    generatePromSeries(cfg.metricName, container, timestamps, cfg.bases[ci], cfg.amps[ci], cfg.noises[ci], ci * 2.5),
  );

  const allTs = new Set<number>();
  series.forEach((s) => s.values.forEach(([ts]) => allTs.add(ts)));
  const sorted = Array.from(allTs).sort((a, b) => a - b);

  const datasets = series.map((s, si) => {
    const valueMap = new Map(s.values.map(([ts, val]) => [ts, parseFloat(val)]));
    return {
      label: s.metric.container,
      data: sorted.map((ts) => ({ x: ts, y: valueMap.get(ts) ?? 0 })),
      borderColor: chartIdx === 0 ? STATIC_COLORS[si] : createLineGradient,
      backgroundColor: chartIdx === 0 ? STATIC_COLORS[si] + "1a" : createGradient,
      borderWidth: 4,
      tension: 0.38,
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 18,
      fill: chartIdx === 0,
    };
  });

  return { timestamps: sorted, datasets };
};

// ─── Component ─────────────────────────────────────────────────────────────

const GradientLinePage = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [period, setPeriod] = useState(60);
  const [chartData, setChartData] = useState<ChartData<"line">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const chartRefs = useRef<Array<ChartJS<"line"> | null | undefined>>([]);
  const timestampsRef = useRef<number[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);

    const end = Math.floor(Date.now() / 1000);
    const start = end - period * 60;
    const step = Math.max(15, Math.floor((period * 60) / 120));

    try {
      const results = await Promise.allSettled(
        promConfigs.map((cfg) =>
          fetchPrometheusRange(buildPromQL(cfg), start, end, step).then((res) =>
            transformPromToChart(cfg, promConfigs.indexOf(cfg), res.data?.result ?? []),
          ),
        ),
      );

      const transformed = results.map((r) =>
        r.status === "fulfilled" && r.value ? r.value : null,
      );

      if (transformed.some((t) => t !== null)) {
        setChartData(transformed.map((t, i) => {
          const mock = generateMock(promConfigs[i], i, Math.max(10, (period * 60) / 30));
          return { datasets: t?.datasets ?? mock.datasets } as ChartData<"line">;
        }));
        const firstNonNull = transformed.find((t) => t !== null);
        if (firstNonNull) timestampsRef.current = firstNonNull.timestamps;
      } else {
        throw new Error("No data");
      }
    } catch {
      setError(true);
      const mockResults: ChartData<"line">[] = promConfigs.map((cfg, i) => {
        const count = Math.max(10, (period * 60) / 30);
        const { timestamps, datasets } = generateMock(cfg, i, count);
        if (i === 0) timestampsRef.current = timestamps;
        return { datasets } as ChartData<"line">;
      });
      setChartData(mockResults);
    }

    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    chartRefs.current.forEach((chart) => {
      if (!chart) return;

      if (hoveredIndex === null) {
        chart.setActiveElements([]);
        chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
        chart.update("none");
        return;
      }

      const point = chart.getDatasetMeta(0).data[hoveredIndex];
      if (!point) return;

      const position = point.tooltipPosition(false);
      chart.setActiveElements([{ datasetIndex: 0, index: hoveredIndex }]);
      chart.tooltip?.setActiveElements([{ datasetIndex: 0, index: hoveredIndex }], position);
      chart.update("none");
    });
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
          position: "fixedY",
          displayColors: false,
          backgroundColor: "rgba(15, 23, 42, 0.92)",
          titleColor: "#f8fafc",
          bodyColor: "#e2e8f0",
          borderColor: "rgba(148, 163, 184, 0.25)",
          borderWidth: 1,
          padding: 12,
          caretPadding: 10,
          cornerRadius: 12,
          callbacks: {
            title(items) {
              return items[0]?.label ?? "";
            },
            label(context: TooltipItem<"line">) {
              const raw = context.dataset.data as unknown as { x: number; y: number }[];
              const val = context.parsed.y ?? 0;
              const change = context.dataIndex > 0 ? val - (raw[context.dataIndex - 1]?.y ?? 0) : null;
              return [`${context.dataset.label}: ${formatValueFull(val)}`, formatChange(change)];
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
            color: "rgba(51, 65, 85, 0.72)",
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
            color: "rgba(51, 65, 85, 0.72)",
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

  if (loading && !chartData.length) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
        <div className="flex items-center justify-center h-96">
          <p className="text-slate-400 text-lg">Loading metrics...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">Period:</span>
          {PERIODS.map((p) => (
            <button
              key={p.minutes}
              onClick={() => setPeriod(p.minutes)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.minutes
                  ? "bg-white/20 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200"
              }`}
            >
              {p.label}
            </button>
          ))}
          {loading && <span className="text-xs text-slate-500 ml-2">loading...</span>}
          {error && <span className="text-xs text-amber-400 ml-2">using mock data</span>}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {promConfigs.map((series, index) => (
            <section
              key={series.id}
              className={`relative overflow-hidden rounded-4xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur-xl ${
                index === 0 ? "lg:col-span-2" : ""
              }`}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_52%)]" />

              <div className="relative z-10">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white">{series.title}</h2>
                  <p className="text-sm text-slate-300">{series.subtitle}</p>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-slate-900/55 p-4">
                  <div
                    className={`rounded-3xl bg-linear-to-b from-white/10 via-white/5 to-transparent p-4 ${
                      index === 0 ? "h-120" : "h-96"
                    }`}
                  >
                    <Line
                      ref={(chart) => {
                        chartRefs.current[index] = chart;
                      }}
                      data={chartData[index]}
                      options={options}
                    />
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
};

export default GradientLinePage;
