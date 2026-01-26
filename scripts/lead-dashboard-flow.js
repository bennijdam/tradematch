const { spawnSync } = require('child_process');
const path = require('path');

const backendDir = path.join(__dirname, '..', 'backend');
const result = spawnSync('node', ['scripts/lead-dashboard-flow.js'], {
  cwd: backendDir,
  stdio: 'inherit'
});

process.exit(result.status || 0);
