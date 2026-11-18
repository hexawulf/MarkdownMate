module.exports = {
  apps: [{
    name: 'markdownmate',
    // MM-09: run the built server directly instead of `npm start`, which spawns
    // extra sh + npm processes.
    script: 'dist/index.js',
    env_file: '.env',
    env: {
      PORT: 5004,
      NODE_ENV: 'production',
      // LOG_FILE defaults to /home/zk/logs/markdownmate.log in the logger, where
      // PiDeck reads it; set here explicitly so it is visible to operators.
      LOG_FILE: '/home/zk/logs/markdownmate.log'
    },
    watch: false,
    instances: 1,
    exec_mode: 'fork'
  }]
}
