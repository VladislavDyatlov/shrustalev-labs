"use client";

import { useState } from "react";
import {
  uniformGenerator,
  exponentialGenerator,
  normalGenerator,
} from "../../lib/rng";
import * as XLSX from 'xlsx';

export default function Generator() {
  const [mean, setMean] = useState(4);
  const [stddev, setStddev] = useState(1);
  const [lambda, setLambda] = useState(0.2);
  const [sampleSize, setSampleSize] = useState(1000);
  const [seed, setSeed] = useState("123");

  const [uniformData, setUniformData] = useState<number[]>([]);
  const [expData, setExpData] = useState<number[]>([]);
  const [normData, setNormData] = useState<number[]>([]);
  const [chi2Result, setChi2Result] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const generate = () => {
    setIsGenerating(true);

    // Небольшая задержка для демонстрации анимации
    setTimeout(() => {
      const n = Math.max(1000, Number(sampleSize));
      const seedBigInt = BigInt(seed) || 123456789n;

      const uniGen = uniformGenerator(seedBigInt);
      const expGen = exponentialGenerator(lambda, seedBigInt);
      const normGen = normalGenerator(mean, stddev, seedBigInt);

      const uniform: number[] = [];
      const exponential: number[] = [];
      const normal: number[] = [];

      for (let i = 0; i < n; i++) {
        uniform.push(uniGen());
        exponential.push(expGen());
        normal.push(normGen());
      }

      setUniformData(uniform);
      setExpData(exponential);
      setNormData(normal);

      const k = 10;
      const expected = n / k;
      const observed = new Array(k).fill(0);
      uniform.forEach((u) => {
        const index = Math.min(Math.floor(u * k), k - 1);
        observed[index]++;
      });
      const chi2 = observed.reduce(
        (sum, o) => sum + (o - expected) ** 2 / expected,
        0
      );
      const critical = 21.666;
      const passed = chi2 < critical;
      setChi2Result(
        `χ² = ${chi2.toFixed(4)} (критическое = ${critical}) – ${
          passed
            ? "✅ гипотеза о равномерности не отвергается"
            : "❌ гипотеза отвергается"
        }`
      );

      setIsGenerating(false);
    }, 500);
  };

  const downloadExcel = (data: number[], filename: string) => {
    const ws = XLSX.utils.aoa_to_sheet(data.map(val => [val]));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Данные');
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : filename + '.xlsx');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 py-8 px-4">
      {/* Декоративные элементы */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-7xl mx-auto relative">
        {/* Заголовок */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 animate-gradient">
            Генератор ПСЧ
          </h1>
          <p className="text-gray-300 mt-4 text-lg">
            Вариант 5 · Линейно-конгруэнтный метод · Период 2⁴⁸
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <div className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <span className="text-purple-300">a = 4</span>
            </div>
            <div className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <span className="text-purple-300">σ² = 1</span>
            </div>
            <div className="px-4 py-2 bg-white/5 backdrop-blur-sm rounded-full border border-white/10">
              <span className="text-purple-300">λ = 0.2</span>
            </div>
          </div>
        </div>

        {/* Панель управления */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 mb-8 shadow-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                a (среднее)
              </label>
              <input
                type="number"
                value={mean}
                onChange={(e) => setMean(+e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                σ² (дисперсия)
              </label>
              <input
                type="number"
                value={stddev ** 2}
                onChange={(e) => setStddev(Math.sqrt(+e.target.value))}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                λ (экспоненциальное)
              </label>
              <input
                type="number"
                step="0.1"
                value={lambda}
                onChange={(e) => setLambda(+e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Объём выборки
              </label>
              <input
                type="number"
                min="1000"
                value={sampleSize}
                onChange={(e) => setSampleSize(+e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">
                Seed
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-center">
            <button
              onClick={generate}
              disabled={isGenerating}
              className="relative px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-lg overflow-hidden transition-all transform hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 group"
            >
              <span className="relative z-10">
                {isGenerating ? "Генерация..." : "Сгенерировать"}
              </span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </div>
        </div>

        {/* Результаты */}
        {uniformData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Равномерное */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:border-purple-500/50 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Равномерное [0,1]
                </h2>
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>

              <div className="space-y-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-sm text-gray-400 mb-2">
                    Первые 20 значений:
                  </p>
                  <p className="text-xs text-gray-300 font-mono break-all">
                    {uniformData
                      .slice(0, 20)
                      .map((v) => v.toFixed(4))
                      .join(", ")}
                  </p>
                </div>

                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-sm text-gray-400 mb-2">Критерий χ²:</p>
                  <p
                    className={`text-sm ${
                      chi2Result.includes("✅")
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {chi2Result}
                  </p>
                </div>

                <button
                  onClick={() => downloadExcel(uniformData, "uniform.csv")}
                  className="w-full px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 rounded-lg text-purple-300 font-medium transition-all flex items-center justify-center gap-2 group"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Скачать CSV
                </button>
              </div>
            </div>

            {/* Экспоненциальное */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:border-blue-500/50 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">
                  Экспоненциальное
                </h2>
                <div className="text-sm text-blue-300">λ = {lambda}</div>
              </div>

              <div className="space-y-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-sm text-gray-400 mb-2">
                    Первые 20 значений:
                  </p>
                  <p className="text-xs text-gray-300 font-mono break-all">
                    {expData
                      .slice(0, 20)
                      .map((v) => v.toFixed(4))
                      .join(", ")}
                  </p>
                </div>

                <button
                  onClick={() => downloadExcel(expData, "exponential.csv")}
                  className="w-full px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-300 font-medium transition-all flex items-center justify-center gap-2 group"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Скачать CSV
                </button>
              </div>
            </div>

            {/* Нормальное */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 hover:border-pink-500/50 transition-all group">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Нормальное</h2>
                <div className="text-sm text-pink-300">
                  N({mean}, {stddev ** 2})
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-sm text-gray-400 mb-2">
                    Первые 20 значений:
                  </p>
                  <p className="text-xs text-gray-300 font-mono break-all">
                    {normData
                      .slice(0, 20)
                      .map((v) => v.toFixed(4))
                      .join(", ")}
                  </p>
                </div>

                <button
                  onClick={() => downloadExcel(normData, "normal.csv")}
                  className="w-full px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 rounded-lg text-pink-300 font-medium transition-all flex items-center justify-center gap-2 group"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Скачать CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Информация о периоде */}
        <div className="mt-8 text-center text-sm text-gray-400">
          <p>
            Линейно-конгруэнтный генератор с периодом 2⁴⁸ · m = 2⁴⁸, a =
            25214903917, c = 11
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        @keyframes gradient {
          0%,
          100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
}
