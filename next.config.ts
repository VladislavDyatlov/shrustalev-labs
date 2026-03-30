/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  turbopack: {
    // Указываем абсолютный путь к корню проекта
    root: __dirname,
  },
};

module.exports = nextConfig;