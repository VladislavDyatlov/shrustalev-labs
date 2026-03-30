"use client";

import Navbar from "@/component/Navbar/Navbar";
import { useState, useRef, useEffect, useCallback } from "react";

type ProcessType = "poisson" | "linear" | "sinusoidal" | "hawkes";

interface SimParams {
  T: number;
  lambda: number;
  dt: number;
  numTraj: number;
  processType: ProcessType;
  hawkesAlpha: number;
  hawkesBeta: number;
}

interface Trajectory {
  times: number[];
  counts: number[];
  jumpTimes: number[];
  color: string;
  finalN: number;
}

const PALETTE = [
  "#818cf8",
  "#f472b6",
  "#34d399",
  "#fbbf24",
  "#60a5fa",
  "#fb923c",
  "#a78bfa",
  "#4ade80",
  "#f87171",
  "#38bdf8",
  "#e879f9",
  "#86efac",
  "#fcd34d",
  "#93c5fd",
  "#c084fc",
];

const PROCESS_INFO: Record<
  ProcessType,
  { short: string; long: string; formula: string; color: string }
> = {
  poisson: {
    short: "Пуассоновский",
    long: "Однородный пуассоновский",
    formula: "λ(t) = λ",
    color: "text-indigo-400",
  },
  linear: {
    short: "Линейный",
    long: "Линейная интенсивность",
    formula: "λ(t) = λ·(1 + t/T)",
    color: "text-amber-400",
  },
  sinusoidal: {
    short: "Синусоидальный",
    long: "Синусоидальная интенсивность",
    formula: "λ(t) = λ·(1 + sin(2πt/T))",
    color: "text-emerald-400",
  },
  hawkes: {
    short: "Хокса",
    long: "Самовозбуждающийся (Hawkes)",
    formula: "λ(t) = μ + Σ α·e^(−β(t−tᵢ))",
    color: "text-pink-400",
  },
};

function getIntensity(t: number, p: SimParams, jumpTimes: number[]): number {
  const { processType: type, lambda: λ, T, hawkesAlpha: α, hawkesBeta: β } = p;
  switch (type) {
    case "poisson":
      return λ;
    case "linear":
      return λ * (1 + t / T);
    case "sinusoidal":
      return Math.max(0, λ * (1 + Math.sin((2 * Math.PI * t) / T)));
    case "hawkes": {
      const selfExciting = jumpTimes.reduce(
        (sum, ti) => (ti < t ? sum + α * Math.exp(-β * (t - ti)) : sum),
        0
      );
      return Math.max(1e-6, λ + selfExciting);
    }
  }
}

function theoreticalMean(t: number, p: SimParams): number {
  const { lambda: λ, T, processType, hawkesAlpha: α, hawkesBeta: β } = p;
  switch (processType) {
    case "poisson":
      return λ * t;
    case "linear":
      return λ * t + (λ * t * t) / (2 * T);
    case "sinusoidal":
      return (
        λ * t +
        ((λ * T) / (2 * Math.PI)) * (1 - Math.cos((2 * Math.PI * t) / T))
      );
    case "hawkes":
      return (λ * t) / Math.max(1 - α / β, 0.01);
  }
}

function simulateTrajectory(p: SimParams, color: string): Trajectory {
  const n = Math.ceil(p.T / p.dt);
  const times: number[] = [0];
  const counts: number[] = [0];
  const jumpTimes: number[] = [];
  let N = 0;

  for (let i = 1; i <= n; i++) {
    const t = i * p.dt;
    const λt = getIntensity(t, p, jumpTimes);
    const prob = Math.min(λt * p.dt, 0.95);
    if (Math.random() < prob) {
      N++;
      jumpTimes.push(t);
    }
    times.push(t);
    counts.push(N);
  }

  return { times, counts, jumpTimes, color, finalN: N };
}

function drawCanvas(
  canvas: HTMLCanvasElement,
  trajs: Trajectory[],
  params: SimParams
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const PL = 62,
    PR = 24,
    PT = 24,
    PB = 48;
  const PW = W - PL - PR;
  const PH = H - PT - PB;

  const rawMax = Math.max(...trajs.flatMap((t) => t.counts));
  const theoryMax = theoreticalMean(params.T, params) * 1.15;
  const maxN = Math.max(rawMax, theoryMax, 1);

  const toX = (t: number) => PL + (t / params.T) * PW;
  const toY = (n: number) => PT + PH - Math.min((n / maxN) * PH, PH);

  // ── Background gradient
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0f1a");
  bg.addColorStop(1, "#0d1220");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // ── Subtle plot area glow
  ctx.save();
  ctx.shadowColor = "rgba(99,102,241,0.05)";
  ctx.shadowBlur = 60;
  ctx.fillStyle = "rgba(99,102,241,0.03)";
  ctx.fillRect(PL, PT, PW, PH);
  ctx.restore();

  // ── Grid — horizontal
  const yStep = Math.max(1, Math.ceil(maxN / 8));
  for (let y = 0; y <= maxN; y += yStep) {
    const yp = toY(y);
    ctx.strokeStyle = "rgba(30,41,59,0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(PL, yp);
    ctx.lineTo(PL + PW, yp);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "11px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(y), PL - 8, yp + 4);
  }

  // ── Grid — vertical
  const nX = 10;
  for (let i = 0; i <= nX; i++) {
    const t = (i / nX) * params.T;
    const xp = toX(t);
    ctx.strokeStyle = "rgba(30,41,59,0.8)";
    ctx.lineWidth = 1;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(xp, PT);
    ctx.lineTo(xp, PT + PH);
    ctx.stroke();

    ctx.fillStyle = "#475569";
    ctx.font = "11px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(t.toFixed(1), xp, PT + PH + 18);
  }

  // ── Axes
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(PL, PT);
  ctx.lineTo(PL, PT + PH);
  ctx.lineTo(PL + PW, PT + PH);
  ctx.stroke();

  // ── Axis labels
  ctx.fillStyle = "#64748b";
  ctx.font = "12px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("t", PL + PW / 2, H - 6);
  ctx.save();
  ctx.translate(13, PT + PH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("N(t)", 0, 0);
  ctx.restore();

  // ── Theoretical E[N(t)] — dashed
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.22)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  const STEPS = 300;
  for (let i = 0; i <= STEPS; i++) {
    const t = (i / STEPS) * params.T;
    const en = theoreticalMean(t, params);
    const x = toX(t);
    const y = toY(en);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // ── Trajectories (step functions)
  trajs.forEach((traj) => {
    // Glow pass
    ctx.save();
    ctx.strokeStyle = traj.color;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.1;
    ctx.shadowColor = traj.color;
    ctx.shadowBlur = 8;
    drawStepPath(ctx, traj, toX, toY);
    ctx.stroke();
    ctx.restore();

    // Main line
    ctx.save();
    ctx.strokeStyle = traj.color;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.88;
    drawStepPath(ctx, traj, toX, toY);
    ctx.stroke();
    ctx.restore();

    // Jump dots
    ctx.save();
    ctx.fillStyle = traj.color;
    ctx.globalAlpha = 0.95;
    const maxDots = 300;
    traj.jumpTimes.slice(0, maxDots).forEach((jt) => {
      const idx = Math.min(Math.round(jt / params.dt), traj.counts.length - 1);
      ctx.beginPath();
      ctx.arc(toX(jt), toY(traj.counts[idx]), 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  });
}

function drawStepPath(
  ctx: CanvasRenderingContext2D,
  traj: Trajectory,
  toX: (t: number) => number,
  toY: (n: number) => number
) {
  ctx.beginPath();
  ctx.moveTo(toX(traj.times[0]), toY(traj.counts[0]));
  for (let i = 1; i < traj.times.length; i++) {
    const x = toX(traj.times[i]);
    const prevY = toY(traj.counts[i - 1]);
    const curY = toY(traj.counts[i]);
    ctx.lineTo(x, prevY); // horizontal
    ctx.lineTo(x, curY); // vertical jump
  }
}

// ═══════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
  accent = "indigo",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
  accent?: "indigo" | "violet" | "pink" | "amber";
}) {
  const display = fmt
    ? fmt(value)
    : Number.isInteger(value)
    ? value
    : value.toFixed(3);
  const accentCls = {
    indigo: "accent-indigo-500",
    violet: "accent-violet-500",
    pink: "accent-pink-500",
    amber: "accent-amber-500",
  }[accent];
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">{label}</span>
        <span className="text-xs font-mono bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-md">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className={`w-full h-1.5 rounded-full cursor-pointer ${accentCls}`}
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent: string;
}) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
      <div className={`text-xl font-mono font-bold ${accent}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

function FormulaCard({
  label,
  formula,
  desc,
}: {
  label: string;
  formula: string;
  desc: string;
}) {
  return (
    <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span className="font-mono text-sm text-amber-300">{formula}</span>
      <span className="text-[10px] text-slate-600">{desc}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  PAGE
// ═══════════════════════════════════════════════════════════════

export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [params, setParams] = useState<SimParams>({
    T: 10,
    lambda: 2,
    dt: 0.01,
    numTraj: 5,
    processType: "poisson",
    hawkesAlpha: 0.5,
    hawkesBeta: 1.5,
  });

  const [trajs, setTrajs] = useState<Trajectory[]>([]);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const set = <K extends keyof SimParams>(k: K, v: SimParams[K]) =>
    setParams((p) => ({ ...p, [k]: v }));

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const result = Array.from({ length: params.numTraj }, (_, i) =>
        simulateTrajectory(params, PALETTE[i % PALETTE.length])
      );
      setTrajs(result);
      setHasRun(true);
      setRunning(false);
    }, 20);
  }, [params]);

  useEffect(() => {
    if (!canvasRef.current || trajs.length === 0) return;
    drawCanvas(canvasRef.current, trajs, params);
  }, [trajs, params]);

  const stats =
    hasRun && trajs.length > 0
      ? (() => {
          const finals = trajs.map((t) => t.finalN);
          const mean = finals.reduce((a, b) => a + b, 0) / finals.length;
          const std = Math.sqrt(
            finals.reduce((a, b) => a + (b - mean) ** 2, 0) / finals.length
          );
          return {
            mean: mean.toFixed(2),
            std: std.toFixed(2),
            max: Math.max(...finals),
            min: Math.min(...finals),
            theory: theoreticalMean(params.T, params).toFixed(2),
          };
        })()
      : null;

  const hawkesUnstable =
    params.processType === "hawkes" &&
    params.hawkesAlpha / params.hawkesBeta >= 1;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#070b14] text-white antialiased">
        {/* ─────────────── HEADER ─────────────── */}
        <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-[#070b14]/90 backdrop-blur-xl">
          <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 flex-shrink-0">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="white"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold leading-snug tracking-tight">
                  Лабораторная работа №3
                </h1>
                <p className="text-[11px] text-slate-500">
                  Моделирование точечных процессов · Разложение Дуба-Мейера
                </p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {[
                "N(t) = M(t) + Λ(t)",
                "P(ΔN=1) ≈ λ(t)·Δt",
                "Λ(t) = ∫₀ᵗ λ(s)ds",
              ].map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-[11px] font-mono text-slate-400"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto px-5 py-5 flex gap-5">
          {/* ─────────────── LEFT SIDEBAR ─────────────── */}
          <aside className="w-72 flex-shrink-0 space-y-4">
            {/* Process type selector */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Тип процесса
              </p>
              <div className="space-y-1.5">
                {(Object.keys(PROCESS_INFO) as ProcessType[]).map((pt) => {
                  const info = PROCESS_INFO[pt];
                  const active = params.processType === pt;
                  return (
                    <button
                      key={pt}
                      onClick={() => set("processType", pt)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all duration-150 group
                      ${
                        active
                          ? "bg-indigo-600/20 border border-indigo-500/40 text-white"
                          : "bg-slate-800/40 border border-transparent text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{info.short}</span>
                        {active && (
                          <span className="text-indigo-400 text-[10px]">●</span>
                        )}
                      </div>
                      <div
                        className={`font-mono text-[10px] mt-0.5 transition-colors ${
                          active ? info.color : "text-slate-600"
                        }`}
                      >
                        {info.formula}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Parameters */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Параметры модели
              </p>
              <Slider
                label="Горизонт T"
                value={params.T}
                min={1}
                max={50}
                step={1}
                onChange={(v) => set("T", v)}
              />
              <Slider
                label="Интенсивность λ"
                value={params.lambda}
                min={0.1}
                max={10}
                step={0.1}
                onChange={(v) => set("lambda", v)}
                fmt={(v) => v.toFixed(1)}
              />
              <Slider
                label="Шаг Δt (малый!)"
                value={params.dt}
                min={0.001}
                max={0.05}
                step={0.001}
                accent="violet"
                onChange={(v) => set("dt", v)}
                fmt={(v) => v.toFixed(3)}
              />
              <Slider
                label="Число траекторий"
                value={params.numTraj}
                min={1}
                max={15}
                step={1}
                accent="amber"
                onChange={(v) => set("numTraj", v)}
              />
            </div>

            {/* Hawkes params */}
            {params.processType === "hawkes" && (
              <div className="bg-pink-950/30 border border-pink-900/50 rounded-2xl p-4 space-y-4">
                <p className="text-[10px] font-semibold text-pink-400/70 uppercase tracking-widest">
                  Параметры Хокса
                </p>
                <Slider
                  label="α — возбуждение"
                  value={params.hawkesAlpha}
                  min={0.01}
                  max={0.99}
                  step={0.01}
                  accent="pink"
                  onChange={(v) => set("hawkesAlpha", v)}
                  fmt={(v) => v.toFixed(2)}
                />
                <Slider
                  label="β — затухание"
                  value={params.hawkesBeta}
                  min={0.1}
                  max={5}
                  step={0.1}
                  accent="pink"
                  onChange={(v) => set("hawkesBeta", v)}
                  fmt={(v) => v.toFixed(1)}
                />
                {hawkesUnstable && (
                  <div className="text-[11px] text-red-400 bg-red-950/40 border border-red-800/50 rounded-lg px-3 py-2">
                    ⚠ α/β ≥ 1 — процесс нестационарен!
                  </div>
                )}
                {!hawkesUnstable && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    α/β = {(params.hawkesAlpha / params.hawkesBeta).toFixed(2)}{" "}
                    &lt; 1 ✓
                  </div>
                )}
              </div>
            )}

            {/* Run button */}
            <button
              onClick={run}
              disabled={running}
              className="w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-200
              bg-gradient-to-r from-indigo-600 to-violet-600
              hover:from-indigo-500 hover:to-violet-500
              disabled:opacity-50 disabled:cursor-not-allowed
              shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
              flex items-center justify-center gap-2.5"
            >
              {running ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Симуляция…
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <polygon points="5,3 19,12 5,21" />
                  </svg>
                  Запустить симуляцию
                </>
              )}
            </button>

            {/* Stats */}
            {stats && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  Статистика N(T)
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard
                    label="Среднее"
                    value={stats.mean}
                    accent="text-emerald-400"
                  />
                  <StatCard
                    label="E[N(T)] теория"
                    value={stats.theory}
                    accent="text-violet-400"
                  />
                  <StatCard
                    label="Максимум"
                    value={String(stats.max)}
                    accent="text-amber-400"
                  />
                  <StatCard
                    label="Минимум"
                    value={String(stats.min)}
                    accent="text-sky-400"
                  />
                </div>
                <div className="mt-3 flex justify-between items-center px-1">
                  <span className="text-[11px] text-slate-500">
                    Станд. отклонение
                  </span>
                  <span className="font-mono text-[11px] text-rose-400">
                    {stats.std}
                  </span>
                </div>
              </div>
            )}

            {/* Legend */}
            {trajs.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                  Легенда
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {trajs.map((t, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-[2px] flex-shrink-0 rounded-full"
                        style={{ background: t.color }}
                      />
                      <span className="text-[11px] text-slate-400 flex-1">
                        Траектория {i + 1}
                      </span>
                      <span
                        className="text-[11px] font-mono px-1.5 py-0.5 rounded-md border"
                        style={{
                          color: t.color,
                          borderColor: t.color + "40",
                          background: t.color + "12",
                        }}
                      >
                        N={t.finalN}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2.5 pt-2 mt-2 border-t border-slate-800">
                    <div
                      className="w-7 h-[2px] flex-shrink-0 rounded-full"
                      style={{
                        background:
                          "repeating-linear-gradient(to right,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 6px,transparent 6px,transparent 12px)",
                      }}
                    />
                    <span className="text-[11px] text-slate-400">
                      E[N(t)] — теория
                    </span>
                  </div>
                </div>
              </div>
            )}
          </aside>

          {/* ─────────────── MAIN CONTENT ─────────────── */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            {/* Info bar */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white">
                  {PROCESS_INFO[params.processType].long}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {PROCESS_INFO[params.processType].formula} &nbsp;·&nbsp; T=
                  {params.T} &nbsp;·&nbsp; λ={params.lambda} &nbsp;·&nbsp; Δt=
                  {params.dt} &nbsp;·&nbsp; {params.numTraj} траекторий
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasRun && !running && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                    Готово
                  </span>
                )}
                {running && (
                  <span className="text-[11px] text-indigo-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block animate-ping" />
                    Вычисление…
                  </span>
                )}
              </div>
            </div>

            {/* Canvas */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 relative overflow-hidden flex-1">
              {/* Empty state overlay */}
              {!hasRun && (
                <div className="absolute inset-3 z-10 flex flex-col items-center justify-center rounded-xl bg-[#070b14]/80 pointer-events-none">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
                    <svg
                      width="28"
                      height="28"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                    </svg>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">
                    Нажмите «Запустить симуляцию»
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    для построения траекторий на [0, T]
                  </p>
                </div>
              )}

              <canvas
                ref={canvasRef}
                width={1100}
                height={520}
                className="w-full rounded-xl"
                style={{ background: "#0b0f1a" }}
              />
            </div>

            {/* Formula cards */}
            <div className="grid grid-cols-4 gap-3">
              <FormulaCard
                label="Разложение Дуба-Мейера"
                formula="N(t) = M(t) + Λ(t)"
                desc="мартингал + компенсатор"
              />
              <FormulaCard
                label="Вероятность скачка"
                formula="P(ΔN = 1) ≈ λ(t)·Δt"
                desc="при Δt → 0"
              />
              <FormulaCard
                label="Компенсатор"
                formula="Λ(t) = ∫₀ᵗ λ(s) ds"
                desc="детерминированная часть"
              />
              <FormulaCard
                label="Пуассоновский случай"
                formula="λ(t) = λ = const"
                desc="E[N(T)] = λ·T"
              />
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
