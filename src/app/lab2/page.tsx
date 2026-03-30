"use client";

import Navbar from "@/component/Navbar/Navbar";
import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Винеровский процесс – явно по формуле W(t) = (1/√n) * Σ ξ_i
const generateWiener = (T: number, n: number, numTrajectories: number) => {
  const dt = 1 / n;
  const steps = Math.floor(T * n);
  const trajectories = [];

  for (let tIdx = 0; tIdx < numTrajectories; tIdx++) {
    // Генерируем все ξ_i ~ N(0,1)
    const xi = [];
    for (let i = 0; i < steps; i++) {
      const u = Math.random();
      const v = Math.random();
      const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      xi.push(z);
    }

    // Строим траекторию: на каждом шаге k значение = (1/√n) * (ξ₁ + ... + ξ_k)
    const points = [{ time: 0, value: 0 }];
    let sum = 0;
    for (let k = 0; k < steps; k++) {
      sum += xi[k];
      points.push({ time: (k + 1) * dt, value: sum / Math.sqrt(n) });
    }
    trajectories.push(points);
  }
  return trajectories;
};

// Пуассоновский процесс (способ 1) – явно по формуле N(t) = Σ ξ_i, ξ_i ~ Bernoulli(λ/n)
const generatePoisson1 = (
  T: number,
  n: number,
  lambda: number,
  numTrajectories: number
) => {
  const dt = 1 / n;
  const steps = Math.floor(T * n);
  const p = lambda * dt;
  const trajectories = [];

  for (let tIdx = 0; tIdx < numTrajectories; tIdx++) {
    // Генерируем все ξ_i ~ Bernoulli(p)
    const xi = [];
    for (let i = 0; i < steps; i++) {
      xi.push(Math.random() < p ? 1 : 0);
    }

    // Строим траекторию: на каждом шаге k значение = сумма ξ₁...ξ_k
    const points = [{ time: 0, value: 0 }];
    let sum = 0;
    for (let k = 0; k < steps; k++) {
      sum += xi[k];
      points.push({ time: (k + 1) * dt, value: sum });
    }
    trajectories.push(points);
  }
  return trajectories;
};

// Пуассоновский процесс (способ 2) – остаётся без изменений, так как он уже реализует N(t) = max{ n : Σ τ_i ≤ t }
const generatePoisson2 = (
  T: number,
  lambda: number,
  numTrajectories: number
) => {
  const trajectories = [];

  for (let tIdx = 0; tIdx < numTrajectories; tIdx++) {
    const points = [{ time: 0, value: 0 }];
    let time = 0;
    let value = 0;

    while (true) {
      const interval = -Math.log(1 - Math.random()) / lambda;
      time += interval;
      if (time > T) break;
      value += 1;
      points.push({ time, value: value - 1 });
      points.push({ time, value });
    }
    points.push({ time: T, value });
    points.sort((a, b) => a.time - b.time);
    trajectories.push(points);
  }
  return trajectories;
};

// Компонент для отображения графика с несколькими траекториями
const ProcessChart = ({
  data,
  title,
  colorScheme = "blue",
}: {
  data: Array<Array<{ time: number; value: number }>>;
  title: string;
  colorScheme?: string;
}) => {
  // Определяем цвета для траекторий
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#6b7280",
    "#14b8a6",
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, "dataMax"]}
            label={{ value: "t", position: "insideBottomRight", offset: -5 }}
          />
          <YAxis
            label={{ value: "Значение", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Legend />
          {data.map((traj, idx) => (
            <Line
              key={idx}
              data={traj}
              type="linear"
              dataKey="value"
              stroke={colors[idx % colors.length]}
              name={`Траектория ${idx + 1}`}
              dot={false}
              strokeWidth={1.5}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Специальный компонент для ступенчатых процессов (пуассоновские) с типом "step"
const StepProcessChart = ({
  data,
  title,
  colorScheme = "green",
}: {
  data: Array<Array<{ time: number; value: number }>>;
  title: string;
  colorScheme?: string;
}) => {
  const colors = [
    "#3b82f6",
    "#ef4444",
    "#10b981",
    "#f59e0b",
    "#8b5cf6",
    "#ec4899",
    "#06b6d4",
    "#f97316",
    "#6b7280",
    "#14b8a6",
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 mb-8">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">{title}</h2>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="time"
            type="number"
            domain={[0, "dataMax"]}
            label={{ value: "t", position: "insideBottomRight", offset: -5 }}
          />
          <YAxis
            label={{ value: "Значение", angle: -90, position: "insideLeft" }}
          />
          <Tooltip />
          <Legend />
          {data.map((traj, idx) => (
            <Line
              key={idx}
              data={traj}
              type="step"
              dataKey="value"
              stroke={colors[idx % colors.length]}
              name={`Траектория ${idx + 1}`}
              dot={false}
              strokeWidth={2}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const Lab2 = () => {
  // Состояния для полей ввода (меняются при каждом нажатии)
  const [inputT, setInputT] = useState(5);
  const [inputN, setInputN] = useState(50);
  const [inputLambda, setInputLambda] = useState(2);
  const [inputNumTrajectories, setInputNumTrajectories] = useState(3);

  // Состояния для «замороженных» параметров (используются для генерации)
  const [frozenT, setFrozenT] = useState(inputT);
  const [frozenN, setFrozenN] = useState(inputN);
  const [frozenLambda, setFrozenLambda] = useState(inputLambda);
  const [frozenNumTrajectories, setFrozenNumTrajectories] =
    useState(inputNumTrajectories);

  // Функция обновления графиков
  const applyParams = () => {
    setFrozenT(inputT);
    setFrozenN(inputN);
    setFrozenLambda(inputLambda);
    setFrozenNumTrajectories(inputNumTrajectories);
  };

  // Мемоизация генерации данных (зависит от frozen-параметров)
  const wienerData = useMemo(
    () => generateWiener(frozenT, frozenN, frozenNumTrajectories),
    [frozenT, frozenN, frozenNumTrajectories]
  );

  const poisson1Data = useMemo(
    () =>
      generatePoisson1(frozenT, frozenN, frozenLambda, frozenNumTrajectories),
    [frozenT, frozenN, frozenLambda, frozenNumTrajectories]
  );

  const poisson2Data = useMemo(
    () => generatePoisson2(frozenT, frozenLambda, frozenNumTrajectories),
    [frozenT, frozenLambda, frozenNumTrajectories]
  );

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-center text-gray-800 mb-8">
            Лабораторная работа №2: Модели случайных процессов
          </h1>

          {/* Панель управления */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Время T
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={inputT}
                  onChange={(e) => setInputT(parseFloat(e.target.value))}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Шагов в единицу времени n
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={inputN}
                  onChange={(e) => setInputN(parseInt(e.target.value))}
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Интенсивность λ (пуассон)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={inputLambda}
                  onChange={(e) => setInputLambda(parseFloat(e.target.value))}
                  className="w-full px-3 text-black py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Количество траекторий
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  step="1"
                  value={inputNumTrajectories}
                  onChange={(e) =>
                    setInputNumTrajectories(parseInt(e.target.value))
                  }
                  className="w-full text-black px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-center">
              <button
                onClick={applyParams}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Обновить графики
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              * Для каждого процесса генерируется {frozenNumTrajectories}{" "}
              траекторий.
            </p>
          </div>

          {/* Графики */}
          <ProcessChart data={wienerData} title="Винеровский процесс" />
          <StepProcessChart
            data={poisson1Data}
            title="Пуассоновский процесс (способ 1: дискретизация Бернулли)"
          />
          <StepProcessChart
            data={poisson2Data}
            title="Пуассоновский процесс (способ 2: экспоненциальные интервалы)"
          />

          {/* Пояснения */}
          <div className="bg-white rounded-xl shadow-lg p-6 text-gray-700">
            <h3 className="text-lg font-semibold mb-2">Описание</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Винеровский процесс</strong>: W(t) = Σ ξ_i / √n, ξ_i ~
                N(0,1).
              </li>
              <li>
                <strong>Пуассоновский процесс (способ 1)</strong>: N(t) = Σ ξ_i,
                где ξ_i ~ Bernoulli(λ/n) на каждом шаге Δt=1/n.
              </li>
              <li>
                <strong>Пуассоновский процесс (способ 2)</strong>: Интервалы
                между скачками распределены экспоненциально с параметром λ.
              </li>
            </ul>
          </div>
        </div>
      </main>
    </>
  );
};

export default Lab2;
