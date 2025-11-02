module.exports = {
  apps: [{
    name: 'markdownmate',
    script: 'npm',
    args: 'start',
    env_file: '.env',
    env: {
      PORT: 5004,
      NODE_ENV: 'production'
    },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
