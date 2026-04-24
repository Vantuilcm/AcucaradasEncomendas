const fs = require('fs');
const path = require('path');

/**
 * 📊 Dashboard API - Unified View for CI/CD Pipeline
 * - Build Status per App
 * - Metrics & Release History
 */
function getGlobalDashboard() {
  const globalFile = path.resolve(__dirname, '../../build-logs/global_dashboard.json');
  const queueFile = path.resolve(__dirname, '../../build-logs/build_queue.json');
  
  const dashboard = {};
  
  if (fs.existsSync(globalFile)) {
    dashboard.apps = JSON.parse(fs.readFileSync(globalFile, 'utf-8'));
  }
  
  if (fs.existsSync(queueFile)) {
    dashboard.queue = JSON.parse(fs.readFileSync(queueFile, 'utf-8'))
      .filter((j) => j.status === 'pending' || j.status === 'running');
  }
  
  return dashboard;
}

function getAppHistory(appId) {
  const historyPath = path.resolve(__dirname, `../../build-logs/${appId}/metrics`);
  if (!fs.existsSync(historyPath)) return [];

  return fs.readdirSync(historyPath)
    .filter(f => f.endsWith('.json'))
    .map(f => JSON.parse(fs.readFileSync(path.join(historyPath, f), 'utf-8')))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function getAppDetails(appId) {
  const statusPath = path.resolve(__dirname, `../../build-logs/${appId}/pipeline_status.json`);
  const rolloutPath = path.resolve(__dirname, `../../build-logs/${appId}/rollout_state.json`);
  const decisionDir = path.resolve(__dirname, `../../build-logs/${appId}/ai_decisions`);
  
  const details = { appId };
  
  if (fs.existsSync(statusPath)) {
    const statusData = JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
    details.status = statusData;
    details.submission = statusData.submission || 'pending';
  }
  
  if (fs.existsSync(rolloutPath)) {
    details.rollout = JSON.parse(fs.readFileSync(rolloutPath, 'utf-8'));
  }

  if (fs.existsSync(decisionDir)) {
    const decisions = fs.readdirSync(decisionDir)
      .filter(f => f.endsWith('.json'))
      .map(f => JSON.parse(fs.readFileSync(path.join(decisionDir, f), 'utf-8')))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    details.latestDecision = decisions[0];
  }

  return details;
}

// Simple CLI Interface
const command = process.argv[2];
const appId = process.argv[3];

if (command === 'summary') {
  const dashboard = getGlobalDashboard();
  // Enrich summary with rollout and decision data
  if (dashboard.apps) {
    Object.keys(dashboard.apps).forEach(id => {
      dashboard.apps[id] = getAppDetails(id);
    });
  }
  console.log(JSON.stringify(dashboard, null, 2));
} else if (command === 'history' && appId) {
  console.log(JSON.stringify(getAppHistory(appId), null, 2));
} else {
  console.log('Usage: node DashboardAPI.js [summary|history <appId>]');
}
