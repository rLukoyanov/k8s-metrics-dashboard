import { useEffect, useMemo, useRef, useState } from "react";
import {
  CategoryScale,
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
} from "../data/mockPrometheusData";

const xAxisGrid = {
  id: 'xAxisGrid',
  afterDraw(chart: ChartJS<'line'>) {
    const xScale = chart.scales.x;
    if (!xScale) return;

    const { ctx, chartArea } = chart;
    ctx.save();
    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
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

declare module "chart.js" {
  interface TooltipPositionerMap {
    fixedY: TooltipPositionerFunction<ChartType>;
  }
}

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
  xAxisGrid,
  verticalHoverLine,
);

if (!Tooltip.positioners.fixedY) {
  Tooltip.positioners.fixedY = function fixedY(elements, eventPosition) {
    const activeElement = elements[0];
    const fallbackX = eventPosition.x;
    const x = activeElement
      ? activeElement.element.tooltipPosition(false).x
      : fallbackX;
    const y = this.chart.chartArea.top + 20;

    return { x, y };
  };
}

const formatChange = (change: number | null) => {
  if (change === null) return "Стартовая точка";
  if (change === 0) return "Без изменений";
  const formatted =
    change >= 1_000_000_000
      ? `${(change / 1_000_000_000).toFixed(2)}G`
      : change >= 1_000_000
        ? `${(change / 1_000_000).toFixed(2)}M`
        : change >= 1_000
          ? `${(change / 1_000).toFixed(2)}K`
          : change.toFixed(4);
  return `${change > 0 ? "+" : ""}${formatted}`;
};

const getChange = (values: readonly number[], index: number) => {
  const previousValue = index > 0 ? values[index - 1] : null;
  return previousValue === null ? null : values[index] - previousValue;
};

const createGradient = (context: ScriptableContext<"line">) => {
  const { chart } = context;
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return "rgba(34, 197, 94, 0.22)";
  }

  const gradient = ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom,
  );
  gradient.addColorStop(0, "rgba(239, 68, 68, 0.42)");
  gradient.addColorStop(0.55, "rgba(248, 113, 113, 0.18)");
  gradient.addColorStop(1, "rgba(34, 197, 94, 0.08)");

  return gradient;
};

const createLineGradient = (context: ScriptableContext<"line">) => {
  const { chart } = context;
  const { ctx, chartArea } = chart;

  if (!chartArea) {
    return "#22c55e";
  }

  const gradient = ctx.createLinearGradient(
    0,
    chartArea.top,
    0,
    chartArea.bottom,
  );
  gradient.addColorStop(0, "#ef4444");
  gradient.addColorStop(0.55, "#f97316");
  gradient.addColorStop(1, "#22c55e");

  return gradient;
};

const GradientLinePage = () => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const chartRefs = useRef<Array<ChartJS<"line"> | null | undefined>>([]);
  const timestampsRef = useRef<number[]>([]);

  const chartData = useMemo<Array<ChartData<"line">>>(
    () =>
      promConfigs.map((cfg, chartIdx) => {
        const timestamps = generateTimestamps(120);
        if (chartIdx === 0) timestampsRef.current = timestamps;
        const series = cfg.containers.map((container, ci) =>
          generatePromSeries(
            cfg.metricName,
            container,
            timestamps,
            cfg.bases[ci],
            cfg.amps[ci],
            cfg.noises[ci],
            ci * 2.5,
          ),
        );
        const allTimestamps = new Set<number>();
        series.forEach((s) =>
          s.values.forEach(([ts]) => allTimestamps.add(ts)),
        );
        const sorted = Array.from(allTimestamps).sort((a, b) => a - b);
        const labels = sorted.map((ts) =>
          new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        );
        const staticColors = ["#3b82f6", "#ef4444", "#22c55e", "#eab308"];
        const datasets = series.map((s, si) => {
          const valueMap = new Map(
            s.values.map(([ts, val]) => [ts, parseFloat(val)]),
          );
          const data = sorted.map((ts) => valueMap.get(ts) ?? 0);
          const isStatic = chartIdx === 0;
          return {
            label: s.metric.container,
            data,
            borderColor: isStatic ? staticColors[si] : createLineGradient,
            backgroundColor: isStatic ? staticColors[si] + "1a" : createGradient,
            borderWidth: 4,
            tension: 0.38,
            pointRadius: 0,
            pointHoverRadius: 0,
            pointHitRadius: 18,
            fill: chartIdx === 0 ? true : false,
          };
        });
        return { labels, datasets };
      }),
    [],
  );

  useEffect(() => {
    chartRefs.current.forEach((chart) => {
      if (!chart) {
        return;
      }

      if (hoveredIndex === null) {
        chart.setActiveElements([]);
        chart.tooltip?.setActiveElements([], { x: 0, y: 0 });
        chart.update("none");
        return;
      }

      const point = chart.getDatasetMeta(0).data[hoveredIndex];
      if (!point) {
        return;
      }

      const position = point.tooltipPosition(false);
      chart.setActiveElements([{ datasetIndex: 0, index: hoveredIndex }]);
      chart.tooltip?.setActiveElements(
        [{ datasetIndex: 0, index: hoveredIndex }],
        position,
      );
      chart.update("none");
    });
  }, [hoveredIndex]);

  const options = useMemo<ChartOptions<"line">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      onHover: (_, activeElements) => {
        if (!activeElements.length) {
          setHoveredIndex(null);
          return;
        }

        setHoveredIndex(activeElements[0].index);
      },
      interaction: {
        mode: "index",
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
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
              const val = Number(context.parsed.y);
              const raw = context.dataset.data as number[];
              const change = getChange(raw, context.dataIndex);
              const formatted =
                val >= 1_000_000_000
                  ? `${(val / 1_000_000_000).toFixed(2)}G`
                  : val >= 1_000_000
                    ? `${(val / 1_000_000).toFixed(2)}M`
                    : val >= 1_000
                      ? `${(val / 1_000).toFixed(2)}K`
                      : val.toFixed(4);
              return [
                `${context.dataset.label}: ${formatted}`,
                formatChange(change),
              ];
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          afterBuildTicks(scale) {
            const ts = timestampsRef.current;
            if (!ts.length) return;

            const timeRange = ts[ts.length - 1] - ts[0];
            const intervalMin = timeRange < 7200 ? 15 : 30;
            const intervalSec = intervalMin * 60;

            const firstBoundary = Math.ceil(ts[0] / intervalSec) * intervalSec;
            const roundTimes: number[] = [];
            for (let t = firstBoundary; t < ts[ts.length - 1]; t += intervalSec) {
              roundTimes.push(t);
            }

            const indices = new Set(
              roundTimes.map((rt) => {
                let best = 0;
                let bestDiff = Infinity;
                ts.forEach((t, i) => {
                  const d = Math.abs(t - rt);
                  if (d < bestDiff) { bestDiff = d; best = i; }
                });
                return best;
              }),
            );

            scale.ticks = scale.ticks.filter((_, i) => indices.has(i));
          },
          ticks: {
            color: "rgba(51, 65, 85, 0.72)",
          },
          border: {
            display: false,
          },
        },
        y: {
          beginAtZero: true,
          ticks: {
            color: "rgba(51, 65, 85, 0.72)",
            callback: (tickValue) => {
              const v = Number(tickValue);
              if (v >= 1_000_000_000)
                return `${(v / 1_000_000_000).toFixed(1)}G`;
              if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
              if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
              return v.toFixed(2);
            },
          },
          grid: {
            color: "rgba(148, 163, 184, 0.18)",
            drawTicks: false,
          },
          border: {
            display: false,
          },
        },
      },
    }),
    [],
  );

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
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
                  <h2 className="text-xl font-semibold text-white">
                    {series.title}
                  </h2>
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
