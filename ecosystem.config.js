module.exports = {
  apps: [
    {
      name: "manga-ai",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3010",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      env: { NODE_ENV: "production" },
    },
  ],
};
