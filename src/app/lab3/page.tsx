"use client";

import Navbar from "@/component/Navbar/Navbar";
import { useState, useRef, useEffect, useCallback } from "react";

// Только пуассоновский процесс (однородный)
interface SimParams {
  T: number;          // горизонт времени
  lambda: number;     // интенсивность λ (const)
  numTraj: number;    // количество траекторий
}

interface Trajectory {
  times: number[];    // моменты времени (включая 0 и T)
  counts: number[];   // значения N(t) в эти моменты
  jumpTimes: number[]; // только моменты скачков
  color: string;
  finalN: number;
}

// Палитра для траекторий
const PALETTE = [
  "#818cf8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa",
  "#fb923c", "#a78bfa", "#4ade80", "#f87171", "#38bdf8",
  "#e879f9", "#86efac", "#fcd34d", "#93c5fd", "#c084fc",
];

// Генерация экспоненциальной случайной величины с параметром rate
function expSample(rate: number): number {
  if (rate <= 0) return Infinity;
  return -Math.log(1 - Math.random()) / rate;
}

// Моделирование однородного пуассоновского процесса через сумму экспоненциальных интервалов
function simulatePoisson(p: SimParams, color: string): Trajectory {
  const { T, lambda: b } = p;
  const times: number[] = [0];
  const counts: number[] = [1];          // N(0)=1
  const jumpTimes: number[] = [];
  let t = 0;
  let N = 1;
  const MAX_EVENTS = 5000;               // защита от бесконечного роста

  while (t < T && N < MAX_EVENTS) {
    const rate = b * N;                  // λ(t) = b·N(t)
    const tau = expSample(rate);
    t += tau;
    if (t > T) break;
    N++;
    jumpTimes.push(t);
    times.push(t);
    counts.push(N);
  }
  times.push(T);
  counts.push(N);

  return { times, counts, jumpTimes, color, finalN: N };
}

// Теоретическое среднее E[N(t)] = λ·t (прямая)
// Теоретическое среднее для процесса чистого размножения: E[N(t)] = N(0) * exp(b·t)
function theoreticalMean(t: number, b: number, N0: number = 1): number {
  return N0 * Math.exp(b * t);
}

// Экспоненциальная кривая для визуализации: f(t) = A * (exp(α * t/T) - 1)
// Параметры подбираются так, чтобы f(T) = ожидаемому среднему значению в конце
// Это даёт красивую экспоненту, похожую на рост числа событий при больших λ.
function exponentialCurve(t: number, lambda: number, T: number, maxN: number): number {
  // α – коэффициент крутизны (чем больше, тем быстрее рост)
  const alpha = 1.8;
  const base = Math.exp(alpha) - 1;
  // Масштабируем так, чтобы на конце T значение равнялось maxN (или теоретическому среднему)
  const target = maxN > 0 ? maxN : lambda * T;
  return target * (Math.exp(alpha * t / T) - 1) / base;
}

// Отрисовка canvas
function drawCanvas(
  canvas: HTMLCanvasElement,
  trajs: Trajectory[],
  params: SimParams,
  showExponential: boolean
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const PL = 62, PR = 24, PT = 24, PB = 48;
  const PW = W - PL - PR;
  const PH = H - PT - PB;

  // Определяем максимальное значение N(t) среди всех траекторий
  const rawMax = Math.max(...trajs.flatMap((t) => t.counts));
  const theoryMax = theoreticalMean(params.T, params.lambda) * 1.15;
  // Для экспоненциальной кривой резервируем место
  const expMax = showExponential ? exponentialCurve(params.T, params.lambda, params.T, rawMax) : 0;
  const maxN = Math.max(rawMax, theoryMax, expMax, 1);

  const toX = (t: number) => PL + (t / params.T) * PW;
  const toY = (n: number) => PT + PH - Math.min((n / maxN) * PH, PH);

  // Фон
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0f1a");
  bg.addColorStop(1, "#0d1220");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Область графика
  ctx.save();
  ctx.shadowColor = "rgba(99,102,241,0.05)";
  ctx.shadowBlur = 60;
  ctx.fillStyle = "rgba(99,102,241,0.03)";
  ctx.fillRect(PL, PT, PW, PH);
  ctx.restore();

  // Горизонтальная сетка
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
    ctx.fillStyle = "#cbd5e1";        // вместо #475569
    ctx.font = "12px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(String(y), PL - 8, yp + 4);
  }

  // Вертикальная сетка
  const nX = 10;
  for (let i = 0; i <= nX; i++) {
    const t = (i / nX) * params.T;
    const xp = toX(t);
    ctx.strokeStyle = "rgba(30,41,59,0.8)";
    ctx.beginPath();
    ctx.moveTo(xp, PT);
    ctx.lineTo(xp, PT + PH);
    ctx.stroke();
    ctx.fillStyle = "#cbd5e1";        // вместо #475569
    ctx.font = "12px 'Courier New', monospace";
    ctx.textAlign = "center";
    ctx.fillText(t.toFixed(1), xp, PT + PH + 18);
  }

  // Оси
  ctx.strokeStyle = "#334155";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(PL, PT);
  ctx.lineTo(PL, PT + PH);
  ctx.lineTo(PL + PW, PT + PH);
  ctx.stroke();

  ctx.fillStyle = "#64748b";
  ctx.font = "12px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("t", PL + PW / 2, H - 6);
  ctx.save();
  ctx.translate(13, PT + PH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("N(t)", 0, 0);
  ctx.restore();

  // Теоретическое среднее (прямая λ·t) – пунктирная линия
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 5]);
  ctx.beginPath();
  const steps = 300;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * params.T;
    const en = theoreticalMean(t, params.lambda);
    const x = toX(t);
    const y = toY(en);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Экспоненциальная кривая (если включена)
  if (showExponential) {
    ctx.save();
    ctx.strokeStyle = "#f97316"; // яркий оранжевый
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * params.T;
      const expVal = exponentialCurve(t, params.lambda, params.T, rawMax);
      const x = toX(t);
      const y = toY(expVal);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Подпись "Экспонента"
    ctx.fillStyle = "#f97316";
    ctx.font = "10px 'Courier New', monospace";
    ctx.textAlign = "left";
    const lastX = toX(params.T);
    const lastY = toY(exponentialCurve(params.T, params.lambda, params.T, rawMax));
    ctx.fillText("экспоненциальная кривая", lastX + 5, lastY - 3);
  }

  // Траектории (ступенчатые функции)
  trajs.forEach((traj) => {
    // Свечение
    ctx.save();
    ctx.strokeStyle = traj.color;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.12;
    ctx.shadowColor = traj.color;
    ctx.shadowBlur = 8;
    drawStepPath(ctx, traj, toX, toY);
    ctx.stroke();
    ctx.restore();

    // Основная линия
    ctx.save();
    ctx.strokeStyle = traj.color;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.88;
    drawStepPath(ctx, traj, toX, toY);
    ctx.stroke();
    ctx.restore();

    // Точки скачков
    ctx.save();
    ctx.fillStyle = traj.color;
    ctx.globalAlpha = 0.95;
    traj.jumpTimes.slice(0, 400).forEach((jt, i) => {
      ctx.beginPath();
      ctx.arc(toX(jt), toY(i + 1), 2.2, 0, Math.PI * 2);
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
  let prevN = 0;
  ctx.moveTo(toX(0), toY(0));
  traj.jumpTimes.forEach((jt, i) => {
    ctx.lineTo(toX(jt), toY(prevN));
    prevN = i + 1;
    ctx.lineTo(toX(jt), toY(prevN));
  });
  ctx.lineTo(toX(traj.times[traj.times.length - 1]), toY(prevN));
}

// Компонент слайдера
function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  fmt,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  fmt?: (v: number) => string;
}) {
  const display = fmt ? fmt(value) : Number.isInteger(value) ? value : value.toFixed(3);
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
        className="w-full h-1.5 rounded-full cursor-pointer accent-indigo-500"
      />
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}

// Компонент карточки статистики
function StatCard({ label, value, sub, accent }: any) {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-center">
      <div className={`text-xl font-mono font-bold ${accent}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  );
}

// Главный компонент страницы
export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [params, setParams] = useState<SimParams>({
    T: 10,
    lambda: 2.0,
    numTraj: 5,
  });
  const [trajs, setTrajs] = useState<Trajectory[]>([]);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [showExponential, setShowExponential] = useState(true); // Показывать экспоненциальную кривую

  const set = <K extends keyof SimParams>(k: K, v: SimParams[K]) => setParams((p) => ({ ...p, [k]: v }));

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const result = Array.from({ length: params.numTraj }, (_, i) =>
        simulatePoisson(params, PALETTE[i % PALETTE.length])
      );
      setTrajs(result);
      setHasRun(true);
      setRunning(false);
    }, 20);
  }, [params]);

  useEffect(() => {
    if (!canvasRef.current || trajs.length === 0) return;
    drawCanvas(canvasRef.current, trajs, params, showExponential);
  }, [trajs, params, showExponential]);

  // Статистика по финальным значениям N(T)
  const stats = hasRun && trajs.length > 0
    ? (() => {
        const finals = trajs.map((t) => t.finalN);
        const mean = finals.reduce((a, b) => a + b, 0) / finals.length;
        const std = Math.sqrt(finals.reduce((a, b) => a + (b - mean) ** 2, 0) / finals.length);
        const theory = theoreticalMean(params.T, params.lambda, 1); // N0=1
        return { mean: mean.toFixed(2), std: std.toFixed(2), max: Math.max(...finals), min: Math.min(...finals), theory: theory.toFixed(2) };
      })()
    : null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#070b14] text-white antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-[#070b14]/90 backdrop-blur-xl">
          <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 flex-shrink-0">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>
              </div>
              <div>
                <h1 className="text-sm font-bold leading-snug tracking-tight">Лабораторная работа №3</h1>
                <p className="text-[11px] text-slate-500">Моделирование точечных процессов · Пуассоновский процесс</p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-[11px] font-mono text-slate-400">P{`ΔN=1`} = λ·Δt</span>
              <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-[11px] font-mono text-slate-400">Λ(t) = λ·t</span>
              <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-[11px] font-mono text-slate-400">τ ~ Exp(λ)</span>
            </div>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto px-5 py-5 flex gap-5">
          {/* Левая панель управления */}
          <aside className="w-72 flex-shrink-0 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Однородный пуассоновский процесс</p>
              <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl px-3 py-2 text-center">
                <span className="font-mono text-sm text-indigo-300">λ(t) = λ = const</span>
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Параметры модели</p>
              <Slider label="Горизонт T" value={params.T} min={1} max={30} step={1} onChange={(v) => set("T", v)} />
              <Slider label="Интенсивность λ" value={params.lambda} min={0.2} max={8} step={0.1} onChange={(v) => set("lambda", v)} fmt={(v) => v.toFixed(1)} />
              <Slider label="Число траекторий" value={params.numTraj} min={1} max={12} step={1} onChange={(v) => set("numTraj", v)} />
            </div>

            <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3">
              <label className="text-xs text-slate-400 cursor-pointer">Показать экспоненциальную кривую</label>
              <button
                onClick={() => setShowExponential(!showExponential)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${showExponential ? "bg-orange-500" : "bg-slate-700"}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showExponential ? "translate-x-4" : "translate-x-1"}`} />
              </button>
            </div>

            <button
              onClick={run}
              disabled={running}
              className="w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2.5"
            >
              {running ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Симуляция…</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21" /></svg> Запустить симуляцию</>
              )}
            </button>

            {stats && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Статистика N(T)</p>
                <div className="grid grid-cols-2 gap-2">
                  <StatCard label="Среднее (выборка)" value={stats.mean} accent="text-emerald-400" />
                  <StatCard label="Теоретическое E[N(T)]" value={stats.theory} accent="text-violet-400" />
                  <StatCard label="Максимум" value={String(stats.max)} accent="text-amber-400" />
                  <StatCard label="Минимум" value={String(stats.min)} accent="text-sky-400" />
                </div>
                <div className="mt-3 flex justify-between items-center px-1">
                  <span className="text-[11px] text-slate-500">Станд. отклонение</span>
                  <span className="font-mono text-[11px] text-rose-400">{stats.std}</span>
                </div>
              </div>
            )}

            {trajs.length > 0 && (
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">Легенда</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {trajs.map((t, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-7 h-[2px] flex-shrink-0 rounded-full" style={{ background: t.color }} />
                      <span className="text-[11px] text-slate-400 flex-1">Траектория {i + 1}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded-md border" style={{ color: t.color, borderColor: t.color + "40", background: t.color + "12" }}>N={t.finalN}</span>
                    </div>
                  ))}
                  <div className="flex items-center gap-2.5 pt-2 mt-2 border-t border-slate-800">
                    <div className="w-7 h-[2px] flex-shrink-0 rounded-full" style={{ background: "repeating-linear-gradient(to right,rgba(255,255,255,0.3) 0,rgba(255,255,255,0.3) 6px,transparent 6px,transparent 12px)" }} />
                    <span className="text-[11px] text-slate-400">E[N(t)] = λ·t</span>
                  </div>
                  {showExponential && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-[2px] flex-shrink-0 rounded-full" style={{ background: "#f97316", border: "none", borderStyle: "dashed" }} />
                      <span className="text-[11px] text-slate-400">экспоненциальная кривая</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>

          {/* Правая часть: график и формулы */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white">Пуассоновский процесс (λ = const)</h2>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  λ = {params.lambda} &nbsp;·&nbsp; T = {params.T} &nbsp;·&nbsp; {params.numTraj} траекторий
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasRun && !running && <span className="text-[11px] text-emerald-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" /> Готово</span>}
                {running && <span className="text-[11px] text-indigo-400 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block animate-ping" /> Вычисление…</span>}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 relative overflow-hidden flex-1">
              {!hasRun && (
                <div className="absolute inset-3 z-10 flex flex-col items-center justify-center rounded-xl bg-[#070b14]/80 pointer-events-none">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center mb-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="1.5"><polyline points="22,12 18,12 15,21 9,3 6,12 2,12" /></svg>
                  </div>
                  <p className="text-sm text-slate-500 font-medium">Нажмите «Запустить симуляцию»</p>
                  <p className="text-xs text-slate-600 mt-1">для построения траекторий на [0, T]</p>
                </div>
              )}
              <canvas ref={canvasRef} width={1100} height={520} className="w-full rounded-xl" style={{ background: "#0b0f1a" }} />
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Инфинитезимальное соотношение</span>
                <span className="font-mono text-sm text-amber-300">P{`ΔN(t)=1`} = λ·Δt + o(Δt)</span>
                <span className="text-[10px] text-slate-600">основа моделирования</span>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Разложение Дуба-Мейера</span>
                <span className="font-mono text-sm text-amber-300">N(t) = M(t) + Λ(t)</span>
                <span className="text-[10px] text-slate-600">мартингал + компенсатор</span>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Компенсатор</span>
                <span className="font-mono text-sm text-amber-300">Λ(t) = λ·t</span>
                <span className="text-[10px] text-slate-600">детерминированная часть</span>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">Интервалы</span>
                <span className="font-mono text-sm text-amber-300">τ ~ Exp(λ)</span>
                <span className="text-[10px] text-slate-600">экспоненциальное распределение</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}