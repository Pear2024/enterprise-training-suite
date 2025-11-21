// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'lms',
      cwd: 'C:/Users/user/training-system',
      script: './node_modules/next/dist/bin/next',
      args: 'start --hostname 0.0.0.0 --port 3000',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
