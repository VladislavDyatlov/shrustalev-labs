"use client";

import Navbar from "@/component/Navbar/Navbar";
import { useState, useRef, useEffect, useCallback } from "react";

// Типы процессов
type ProcessType = "ou" | "exp";

interface SimParams {
  T: number;          // горизонт времени
  dt: number;         // шаг дискретизации
  a: number;          // параметр возврата к среднему (для OU) / сноса (для экспоненты)
  sigma: number;      // волатильность
  numTraj: number;    // количество траекторий
}

interface Trajectory {
  times: number[];    // массив моментов времени
  values: number[];   // значения процесса
  color: string;
}

// Палитра для траекторий
const PALETTE = [
  "#818cf8", "#f472b6", "#34d399", "#fbbf24", "#60a5fa",
  "#fb923c", "#a78bfa", "#4ade80", "#f87171", "#38bdf8",
  "#e879f9", "#86efac", "#fcd34d", "#93c5fd", "#c084fc",
];

// Генератор нормально распределённой случайной величины (метод Бокса-Мюллера)
function normalSample(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Моделирование процесса Орнштейна-Уленбека
function simulateOU(params: SimParams, color: string): Trajectory {
  const { T, dt, a, sigma } = params;
  const times: number[] = [0];
  const values: number[] = [0]; // X0 = 0

  let t = 0;
  let x = 0;

  while (t < T) {
    const dW = Math.sqrt(dt) * normalSample();
    x = x - a * x * dt + sigma * dW;
    t += dt;
    times.push(t);
    values.push(x);
  }

  return { times, values, color };
}

// Моделирование стохастической экспоненты (геометрическое броуновское движение)
function simulateExp(params: SimParams, color: string): Trajectory {
  const { T, dt, a: b, sigma } = params; // здесь параметр 'a' переименован в снос b
  const times: number[] = [0];
  const values: number[] = [1]; // X0 = 1

  let t = 0;
  let x = 1;

  while (t < T) {
    const dW = Math.sqrt(dt) * normalSample();
    x = x + b * x * dt + sigma * x * dW;
    t += dt;
    times.push(t);
    values.push(x);
  }

  return { times, values, color };
}

// Отрисовка canvas
function drawCanvas(
  canvas: HTMLCanvasElement,
  trajs: Trajectory[],
  params: SimParams,
  processType: ProcessType
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;
  const PL = 62, PR = 24, PT = 24, PB = 48;
  const PW = W - PL - PR;
  const PH = H - PT - PB;

  // Определяем диапазон значений для оси Y
  const allValues = trajs.flatMap((t) => t.values);
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  // Немного расширяем диапазон для красоты
  const range = maxVal - minVal;
  const yMin = minVal - range * 0.05;
  const yMax = maxVal + range * 0.05;

  const toX = (t: number) => PL + (t / params.T) * PW;
  const toY = (v: number) => PT + PH - ((v - yMin) / (yMax - yMin)) * PH;

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

  // Горизонтальная сетка (8 линий)
  const yStep = (yMax - yMin) / 8;
  for (let i = 0; i <= 8; i++) {
    const val = yMin + i * yStep;
    const yp = toY(val);
    ctx.strokeStyle = "rgba(30,41,59,0.8)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PL, yp);
    ctx.lineTo(PL + PW, yp);
    ctx.stroke();
    ctx.fillStyle = "#cbd5e1"; // Яркий серый
    ctx.font = "12px 'Courier New', monospace";
    ctx.textAlign = "right";
    ctx.fillText(val.toFixed(2), PL - 8, yp + 4);
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
    ctx.fillStyle = "#cbd5e1";
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

  ctx.fillStyle = "#94a3b8";
  ctx.font = "13px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText("t", PL + PW / 2, H - 6);
  ctx.save();
  ctx.translate(13, PT + PH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("X(t)", 0, 0);
  ctx.restore();

  // Траектории
  trajs.forEach((traj) => {
    // Свечение
    ctx.save();
    ctx.strokeStyle = traj.color;
    ctx.lineWidth = 5;
    ctx.globalAlpha = 0.12;
    ctx.shadowColor = traj.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    traj.times.forEach((t, i) => {
      const x = toX(t);
      const y = toY(traj.values[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();

    // Основная линия
    ctx.save();
    ctx.strokeStyle = traj.color;
    ctx.lineWidth = 1.8;
    ctx.globalAlpha = 0.88;
    ctx.beginPath();
    traj.times.forEach((t, i) => {
      const x = toX(t);
      const y = toY(traj.values[i]);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
  });
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

// Главный компонент страницы
export default function Page() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processType, setProcessType] = useState<ProcessType>("ou");
  const [params, setParams] = useState<SimParams>({
    T: 10,
    dt: 0.01,
    a: 1.5,
    sigma: 0.8,
    numTraj: 5,
  });
  const [trajs, setTrajs] = useState<Trajectory[]>([]);
  const [running, setRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const set = <K extends keyof SimParams>(k: K, v: SimParams[K]) => setParams((p) => ({ ...p, [k]: v }));

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const simulate = processType === "ou" ? simulateOU : simulateExp;
      const result = Array.from({ length: params.numTraj }, (_, i) =>
        simulate(params, PALETTE[i % PALETTE.length])
      );
      setTrajs(result);
      setHasRun(true);
      setRunning(false);
    }, 20);
  }, [params, processType]);

  useEffect(() => {
    if (!canvasRef.current || trajs.length === 0) return;
    drawCanvas(canvasRef.current, trajs, params, processType);
  }, [trajs, params, processType]);

  // Подписи для параметров в зависимости от типа процесса
  const paramLabel = processType === "ou" ? "Возврат a" : "Снос b";

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-[#070b14] text-white antialiased">
        <header className="sticky top-0 z-20 border-b border-slate-800/60 bg-[#070b14]/90 backdrop-blur-xl">
          <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/40 flex-shrink-0">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
                </svg>
              </div>
              <div>
                <h1 className="text-sm font-bold leading-snug tracking-tight">Лабораторная работа №4</h1>
                <p className="text-[11px] text-slate-500">
                  Моделирование диффузионных процессов · Орнштейн–Уленбек / Стохастическая экспонента
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-[11px] font-mono text-slate-400">
                dX = -aX dt + σ dW
              </span>
              <span className="px-2.5 py-1 bg-slate-800/80 border border-slate-700/60 rounded-lg text-[11px] font-mono text-slate-400">
                dX = bX dt + σX dW
              </span>
            </div>
          </div>
        </header>

        <main className="max-w-[1440px] mx-auto px-5 py-5 flex gap-5">
          {/* Левая панель управления */}
          <aside className="w-72 flex-shrink-0 space-y-4">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-3">
                Тип процесса
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setProcessType("ou")}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    processType === "ou"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700"
                  }`}
                >
                  OU
                </button>
                <button
                  onClick={() => setProcessType("exp")}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium transition-colors ${
                    processType === "exp"
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                      : "bg-slate-800/50 text-slate-400 border border-slate-700"
                  }`}
                >
                  Экспонента
                </button>
              </div>
              <div className="mt-2 text-center text-[11px] text-slate-500">
                {processType === "ou"
                  ? "dX = -a·X·dt + σ·dW,  X₀=0"
                  : "dX = b·X·dt + σ·X·dW,  X₀=1"}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 space-y-4">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                Параметры модели
              </p>
              <Slider
                label="Горизонт T"
                value={params.T}
                min={1}
                max={30}
                step={1}
                onChange={(v) => set("T", v)}
              />
              <Slider
                label="Шаг dt"
                value={params.dt}
                min={0.001}
                max={0.1}
                step={0.001}
                onChange={(v) => set("dt", v)}
                fmt={(v) => v.toFixed(3)}
              />
              <Slider
                label={paramLabel}
                value={params.a}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(v) => set("a", v)}
                fmt={(v) => v.toFixed(1)}
              />
              <Slider
                label="Волатильность σ"
                value={params.sigma}
                min={0.1}
                max={3}
                step={0.1}
                onChange={(v) => set("sigma", v)}
                fmt={(v) => v.toFixed(1)}
              />
              <Slider
                label="Число траекторий"
                value={params.numTraj}
                min={1}
                max={12}
                step={1}
                onChange={(v) => set("numTraj", v)}
              />
            </div>

            <button
              onClick={run}
              disabled={running}
              className="w-full py-3 rounded-2xl font-semibold text-sm transition-all duration-200 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2.5"
            >
              {running ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                  Симуляция…
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5,3 19,12 5,21" />
                  </svg>{" "}
                  Запустить симуляцию
                </>
              )}
            </button>

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
                        X(T)={t.values[t.values.length - 1].toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>

          {/* Правая часть: график и формулы */}
          <div className="flex-1 flex flex-col gap-4 min-w-0">
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl px-5 py-3.5 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-white">
                  {processType === "ou"
                    ? "Процесс Орнштейна–Уленбека"
                    : "Стохастическая экспонента"}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5 font-mono">
                  {processType === "ou"
                    ? `a = ${params.a}  ·  σ = ${params.sigma}`
                    : `b = ${params.a}  ·  σ = ${params.sigma}`}
                  {"  ·  "} T = {params.T}  ·  dt = {params.dt}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {hasRun && !running && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />{" "}
                    Готово
                  </span>
                )}
                {running && (
                  <span className="text-[11px] text-indigo-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 inline-block animate-ping" />{" "}
                    Вычисление…
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 relative overflow-hidden flex-1">
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

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Схема Эйлера–Маруямы
                </span>
                <span className="font-mono text-sm text-amber-300">
                  X_{"{t+Δt}"} = X_t + drift·Δt + diffusion·√Δt·N(0,1)
                </span>
                <span className="text-[10px] text-slate-600">
                  дискретизация СДУ
                </span>
              </div>
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex flex-col gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  Винеровский шум
                </span>
                <span className="font-mono text-sm text-amber-300">
                  dW ≈ √Δt · N(0,1)
                </span>
                <span className="text-[10px] text-slate-600">
                  приращение броуновского движения
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}