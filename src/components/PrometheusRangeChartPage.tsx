import { useCallback, useEffect, useRef, useState } from "react";
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
import { fetchPrometheusRange } from "../api/api";

const generateMockSeries = (start: number, end: number, step: number) => {
  const count = Math.floor((end - start) / step) + 1;
  const timestamps = Array.from({ length: count }, (_, i) => start + i * step);

  const containers = ["app", "sidecar", "cache"];
  const configs = [
    { base: 0.35, amp: 0.25, noise: 0.08 },
    { base: 0.12, amp: 0.08, noise: 0.04 },
    { base: 0.05, amp: 0.15, noise: 0.02 },
  ];

  return containers.map((container, ci) => {
    const { base, amp, noise } = configs[ci];
    return {
      label: container,
      values: timestamps.map((ts, i) => {
        const trend = Math.sin((i / count) * Math.PI * 0.8);
        const cycle = Math.sin(i * 0.1 + ci * 2.5);
        const value = base + amp * trend * 0.5 + amp * cycle * 0.3 + (Math.random() - 0.5) * noise;
        return [ts, Math.max(0, value).toFixed(4)] as [number, string];
      }),
    };
  });
};

ChartJS.register(LinearScale, PointElement, LineElement, ChartTooltip, Legend, Filler);

const formatValue = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}G`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(2);
};

const formatTime = (ts: number) =>
  new Date(ts * 1000).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const DEFAULT_COLORS = ["#3b82f6", "#ef4444", "#22c55e", "#eab308", "#8b5cf6", "#ec4899"];

const dateToTimestamp = (dateStr: string, timeStr: string): number =>
  Math.floor(new Date(`${dateStr}T${timeStr}:00`).getTime() / 1000);

const formatDateInput = (d: Date): string => d.toISOString().slice(0, 10);

const todayStr = () => formatDateInput(new Date());

const PrometheusRangeChartPage = () => {
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [startTime, setStartTime] = useState("00:00");
  const [endTime, setEndTime] = useState("23:59");
  const [step, setStep] = useState(60);
  const [promql, setPromql] = useState('container_cpu_usage_seconds_total');
  const [series, setSeries] = useState<{ label: string; values: [number, string][] }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMock, setIsMock] = useState(false);
  const chartRef = useRef<any>(null);

  const startTs = dateToTimestamp(startDate, startTime);
  const endTs = dateToTimestamp(endDate, endTime);

  const fetchData = useCallback(async () => {
    if (!promql.trim()) return;

    setLoading(true);
    setError("");
    setIsMock(false);
    setSeries([]);

    try {
      const response = await fetchPrometheusRange(promql.trim(), startTs, endTs, step);
      if (response.status !== "success" || !response.data?.result) {
        throw new Error(response.error || "Query failed");
      }

      const result = response.data.result
        .filter((r: any) => r.values?.length)
        .map((r: any) => {
          const label = Object.values(r.metric).filter(Boolean).join(" / ") || "unknown";
          return { label, values: r.values as [number, string][] };
        });

      setSeries(result);
    } catch {
      setIsMock(true);
      setSeries(generateMockSeries(startTs, endTs, step));
    } finally {
      setLoading(false);
    }
  }, [promql, startTs, endTs, step]);

  const chartData: ChartData<"line"> = {
    datasets: series.length
      ? series.slice(0, 6).map((s, i) => {
          const valueMap = new Map(s.values.map(([ts, val]) => [ts, parseFloat(val)]));
          const allTs: number[] = [];
          for (let t = startTs; t <= endTs; t += step) {
            allTs.push(t);
          }
          return {
            label: s.label,
            data: allTs.map((ts) => ({ x: ts, y: valueMap.has(ts) ? valueMap.get(ts)! : null })),
            borderColor: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
            backgroundColor: DEFAULT_COLORS[i % DEFAULT_COLORS.length] + "1a",
            borderWidth: 2,
            tension: 0.1,
            pointRadius: 0,
            pointHoverRadius: 4,
            spanGaps: false,
            fill: false,
          };
        })
      : [
          {
            label: "",
            data: [
              { x: startTs, y: null },
              { x: endTs, y: null },
            ],
            borderWidth: 0,
            pointRadius: 0,
            fill: false,
          },
        ],
  };

  const chartOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 },
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        display: true,
        position: "top",
        labels: { color: "#cbd5e1", boxWidth: 12, padding: 16, font: { size: 12 } },
      },
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
            const raw = items[0]?.raw as { x: number } | undefined;
            return raw ? formatTime(raw.x) : "";
          },
          label(context: TooltipItem<"line">) {
            const val = context.parsed.y;
            if (val === null || val === undefined) return `${context.dataset.label}: no data`;
            return `${context.dataset.label}: ${formatValue(val)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: "linear",
        grid: { color: "rgba(148, 163, 184, 0.1)" },
        min: startTs,
        max: endTs,
        ticks: {
          color: "rgba(148, 163, 184, 0.7)",
          maxTicksLimit: 12,
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
          color: "rgba(148, 163, 184, 0.1)",
        },
        border: { display: false },
      },
    },
  };

  useEffect(() => { fetchData(); }, []); // initial fetch

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <h1 className="text-2xl font-bold text-white">Prometheus Range Chart</h1>

        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">End Time</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Step (s)</label>
            <input
              type="number"
              value={step}
              min={15}
              max={3600}
              onChange={(e) => setStep(Math.max(15, Number(e.target.value)))}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white w-20"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1 min-w-[200px]">
            <label className="text-xs text-slate-400">PromQL Query</label>
            <input
              type="text"
              value={promql}
              onChange={(e) => setPromql(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchData()}
              placeholder="e.g. container_cpu_usage_seconds_total"
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white w-full font-mono"
            />
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Fetch"}
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="h-[500px]">
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        </div>

        {!loading && series.length > 0 && (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            {isMock && <span className="text-amber-400">using mock data</span>}
            Showing {series.length} series from {formatTime(startTs)} to {formatTime(endTs)} (step: {step}s)
          </p>
        )}
      </div>
    </main>
  );
};

export default PrometheusRangeChartPage;
