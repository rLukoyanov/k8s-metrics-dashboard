import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export interface ChartItem {
  id: string;
  promql: string;
  series: { label: string; values: [number, string][] }[];
  loading: boolean;
  error: string | null;
  isMock: boolean;
}

interface TimeRange {
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  step: number;
}

interface ChartsState {
  timeRange: TimeRange;
  charts: ChartItem[];
}

const todayStr = () => new Date().toISOString().slice(0, 10);

const initialState: ChartsState = {
  timeRange: {
    startDate: todayStr(),
    endDate: todayStr(),
    startTime: "00:00",
    endTime: "23:59",
    step: 60,
  },
  charts: [
    {
      id: "chart-1",
      promql: "container_cpu_usage_seconds_total",
      series: [],
      loading: false,
      error: null,
      isMock: false,
    },
  ],
};

const chartsSlice = createSlice({
  name: "charts",
  initialState,
  reducers: {
    setStartDate(state, action: PayloadAction<string>) {
      state.timeRange.startDate = action.payload;
    },
    setEndDate(state, action: PayloadAction<string>) {
      state.timeRange.endDate = action.payload;
    },
    setStartTime(state, action: PayloadAction<string>) {
      state.timeRange.startTime = action.payload;
    },
    setEndTime(state, action: PayloadAction<string>) {
      state.timeRange.endTime = action.payload;
    },
    setStep(state, action: PayloadAction<number>) {
      state.timeRange.step = action.payload;
    },
    addChart(state) {
      const count = state.charts.length + 1;
      state.charts.push({
        id: `chart-${count}-${Date.now()}`,
        promql: "",
        series: [],
        loading: false,
        error: null,
        isMock: false,
      });
    },
    removeChart(state, action: PayloadAction<string>) {
      state.charts = state.charts.filter((c) => c.id !== action.payload);
    },
    updateChartQuery(state, action: PayloadAction<{ id: string; promql: string }>) {
      const chart = state.charts.find((c) => c.id === action.payload.id);
      if (chart) chart.promql = action.payload.promql;
    },
    setChartLoading(state, action: PayloadAction<{ id: string; loading: boolean }>) {
      const chart = state.charts.find((c) => c.id === action.payload.id);
      if (chart) chart.loading = action.payload.loading;
    },
    setChartData(
      state,
      action: PayloadAction<{
        id: string;
        series: { label: string; values: [number, string][] }[];
        error?: string | null;
        isMock?: boolean;
      }>,
    ) {
      const chart = state.charts.find((c) => c.id === action.payload.id);
      if (chart) {
        chart.series = action.payload.series;
        chart.loading = false;
        chart.error = action.payload.error ?? null;
        chart.isMock = action.payload.isMock ?? false;
      }
    },
    setChartError(state, action: PayloadAction<{ id: string; error: string }>) {
      const chart = state.charts.find((c) => c.id === action.payload.id);
      if (chart) {
        chart.error = action.payload.error;
        chart.loading = false;
      }
    },
  },
});

export const {
  setStartDate,
  setEndDate,
  setStartTime,
  setEndTime,
  setStep,
  addChart,
  removeChart,
  updateChartQuery,
  setChartLoading,
  setChartData,
  setChartError,
} = chartsSlice.actions;

export default chartsSlice.reducer;
