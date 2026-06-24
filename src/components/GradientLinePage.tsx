import { useCallback, useEffect, useRef, useState } from "react";
import {
  generatePromSeries,
  generateTimestamps,
  promConfigs,
  type PromConfig,
} from "../data/mockPrometheusData";
import { fetchPrometheusRange } from "../api/api";
import PromLineChart, { type PromSeries } from "./charts/PromLineChart";

const PERIODS = [
  { label: "30m", minutes: 30 },
  { label: "1h", minutes: 60 },
  { label: "2h", minutes: 120 },
  { label: "6h", minutes: 360 },
  { label: "12h", minutes: 720 },
  { label: "24h", minutes: 1440 },
] as const;

const buildPromQL = (cfg: PromConfig) => {
  const isRate = cfg.metricName.includes("_total") || cfg.metricName.includes("_seconds");
  if (isRate) {
    return `sum(rate(${cfg.metricName}[2m])) by (container, pod, namespace)`;
  }
  return `sum(${cfg.metricName}) by (container, pod, namespace)`;
};

const generateMockSeries = (cfg: PromConfig, count: number): PromSeries[] => {
  const timestamps = generateTimestamps(count);
  return cfg.containers.map((container, ci) => {
    const s = generatePromSeries(cfg.metricName, container, timestamps, cfg.bases[ci], cfg.amps[ci], cfg.noises[ci], ci * 2.5);
    return { label: s.metric.container, values: s.values };
  });
};

const GradientLinePage = () => {
  const [period, setPeriod] = useState(60);
  const [charts, setCharts] = useState<{ series: PromSeries[]; start: number; end: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const fetchIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    const id = ++fetchIdRef.current;
    setLoading(true);
    setError(false);

    const end = Math.floor(Date.now() / 1000);
    const start = end - period * 60;
    const step = Math.max(15, Math.floor((period * 60) / 120));

    try {
      const results = await Promise.allSettled(
        promConfigs.map((cfg) =>
          fetchPrometheusRange(buildPromQL(cfg), start, end, step).then((res) => {
            const series: PromSeries[] = (res.data?.result ?? [])
              .filter((r: any) => r.metric?.container)
              .slice(0, 4)
              .map((r: any) => ({ label: r.metric.container, values: r.values }));
            return series;
          }),
        ),
      );

      if (id !== fetchIdRef.current) return;

      const hasRealData = results.some((r) => r.status === "fulfilled" && r.value?.length);

      if (hasRealData) {
        setCharts(
          results.map((r) => ({
            series: (r.status === "fulfilled" ? r.value : []) as PromSeries[],
            start,
            end,
          })),
        );
      } else {
        throw new Error("No data");
      }
    } catch {
      if (id !== fetchIdRef.current) return;
      setError(true);
      const count = Math.max(10, (period * 60) / 30);
      setCharts(
        promConfigs.map((cfg) => ({
          series: generateMockSeries(cfg, count),
          start,
          end,
        })),
      );
    }

    setLoading(false);
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          {promConfigs.map((cfg, index) => {
            const chart = charts[index];
            const colors = index === 0 ? ["#3b82f6", "#ef4444", "#22c55e", "#eab308"] : undefined;
            return (
              <section
                key={cfg.id}
                className={`relative overflow-hidden rounded-4xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur-xl ${
                  index === 0 ? "lg:col-span-2" : ""
                }`}
              >
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.2),transparent_52%)]" />
                <div className="relative z-10">
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-white">{cfg.title}</h2>
                    <p className="text-sm text-slate-300">{cfg.subtitle}</p>
                  </div>
                  <div className="rounded-[28px] border border-white/10 bg-slate-900/55 p-4">
                    <div className={`rounded-3xl bg-linear-to-b from-white/10 via-white/5 to-transparent p-4 ${index === 0 ? "h-120" : "h-96"}`}>
                      {chart && (
                        <PromLineChart
                          series={chart.series}
                          start={chart.start}
                          end={chart.end}
                          colors={colors}
                          loading={loading && !charts.length}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default GradientLinePage;
