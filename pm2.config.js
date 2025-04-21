module.exports = {
  apps: [{
    name: "restaurant-slot-machine",
    script: "server.js",
    instances: "max",
    exec_mode: "cluster",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    },
    env_development: {
      NODE_ENV: "development",
      PORT: 3000
    },
    log_date_format: "YYYY-MM-DD HH:mm Z",
    error_file: "logs/error.log",
    out_file: "logs/output.log",
    merge_logs: true
  }]
};
