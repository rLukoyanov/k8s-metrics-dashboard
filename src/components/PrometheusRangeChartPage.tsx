import { useCallback, useEffect, useRef } from "react";
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
import {
  addChart,
  removeChart,
  setChartData,
  setChartLoading,
  setEndDate,
  setEndTime,
  setStartDate,
  setStartTime,
  setStep,
  updateChartQuery,
} from "../store/chartsSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";

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

interface SingleChartProps {
  id: string;
  promql: string;
  series: { label: string; values: [number, string][] }[];
  loading: boolean;
  isMock: boolean;
  startTs: number;
  endTs: number;
  step: number;
  onQueryChange: (q: string) => void;
  onRemove: () => void;
  onFetch: () => void;
}

const SingleChart = ({
  id,
  promql,
  series,
  loading,
  isMock,
  startTs,
  endTs,
  step,
  onQueryChange,
  onRemove,
  onFetch,
}: SingleChartProps) => {
  const chartRef = useRef<any>(null);

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

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <input
          type="text"
          value={promql}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onFetch()}
          placeholder="PromQL query"
          className="flex-1 rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white font-mono"
        />
        <button
          onClick={onFetch}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "..." : "Fetch"}
        </button>
        <button
          onClick={onRemove}
          className="rounded-lg bg-red-600/60 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500"
        >
          Remove
        </button>
        {isMock && <span className="text-xs text-amber-400">mock</span>}
      </div>
      <div className="h-[350px]">
        <Line ref={chartRef} data={chartData} options={chartOptions} />
      </div>
    </div>
  );
};

const PrometheusRangeChartPage = () => {
  const dispatch = useAppDispatch();
  const { timeRange, charts } = useAppSelector((s) => s.charts);

  const startTs = dateToTimestamp(timeRange.startDate, timeRange.startTime);
  const endTs = dateToTimestamp(timeRange.endDate, timeRange.endTime);

  const fetchOne = useCallback(
    async (id: string, promql: string) => {
      if (!promql.trim()) return;
      dispatch(setChartLoading({ id, loading: true }));
      try {
        const response = await fetchPrometheusRange(promql.trim(), startTs, endTs, timeRange.step);
        if (response.status !== "success" || !response.data?.result) {
          throw new Error(response.error || "Query failed");
        }
        const result = response.data.result
          .filter((r: any) => r.values?.length)
          .map((r: any) => {
            const label = Object.values(r.metric).filter(Boolean).join(" / ") || "unknown";
            return { label, values: r.values as [number, string][] };
          });
        dispatch(setChartData({ id, series: result }));
      } catch {
        dispatch(
          setChartData({
            id,
            series: generateMockSeries(startTs, endTs, timeRange.step),
            isMock: true,
          }),
        );
      }
    },
    [dispatch, startTs, endTs, timeRange.step],
  );

  const fetchAll = useCallback(() => {
    charts.forEach((c) => {
      if (c.promql.trim()) fetchOne(c.id, c.promql);
    });
  }, [charts, fetchOne]);

  useEffect(() => {
    if (charts.length > 0 && charts.every((c) => c.series.length === 0)) {
      fetchAll();
    }
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <h1 className="text-2xl font-bold text-white">Range Charts</h1>

        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Start Date</label>
            <input
              type="date"
              value={timeRange.startDate}
              onChange={(e) => dispatch(setStartDate(e.target.value))}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Start Time</label>
            <input
              type="time"
              value={timeRange.startTime}
              onChange={(e) => dispatch(setStartTime(e.target.value))}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">End Date</label>
            <input
              type="date"
              value={timeRange.endDate}
              onChange={(e) => dispatch(setEndDate(e.target.value))}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">End Time</label>
            <input
              type="time"
              value={timeRange.endTime}
              onChange={(e) => dispatch(setEndTime(e.target.value))}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-slate-400">Step (s)</label>
            <input
              type="number"
              value={timeRange.step}
              min={15}
              max={3600}
              onChange={(e) => dispatch(setStep(Math.max(15, Number(e.target.value))))}
              className="rounded-lg border border-white/10 bg-slate-800 px-3 py-1.5 text-sm text-white w-20"
            />
          </div>
          <button
            onClick={fetchAll}
            className="rounded-lg bg-blue-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Fetch All
          </button>
          <button
            onClick={() => dispatch(addChart())}
            className="rounded-lg bg-emerald-600 px-5 py-1.5 text-sm font-medium text-white hover:bg-emerald-500"
          >
            + Add Chart
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {charts.map((chart) => (
            <SingleChart
              key={chart.id}
              id={chart.id}
              promql={chart.promql}
              series={chart.series}
              loading={chart.loading}
              isMock={chart.isMock}
              startTs={startTs}
              endTs={endTs}
              step={timeRange.step}
              onQueryChange={(q) => dispatch(updateChartQuery({ id: chart.id, promql: q }))}
              onRemove={() => dispatch(removeChart(chart.id))}
              onFetch={() => fetchOne(chart.id, chart.promql)}
            />
          ))}
        </div>
      </div>
    </main>
  );
};

export default PrometheusRangeChartPage;
