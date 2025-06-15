module.exports = {
  apps: [{
    name: 'markdownmate',
    script: 'npm',
    args: 'start',
    env_file: '.env',
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
