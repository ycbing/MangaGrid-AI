module.exports = {
  apps: [
    {
      name: "manga-ai",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      // 批量生图 + PDF 拼版内存峰值较高，500M 会在导出中途被杀
      max_memory_restart: "1G",
      // 日志带时间戳，便于排查生图/导出耗时
      time: true,
      env: { NODE_ENV: "production" },
    },
  ],
};
