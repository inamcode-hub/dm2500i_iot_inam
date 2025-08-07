/**
 * Track health of background tasks
 */

const taskHealth = new Map();

function updateTaskHealth(taskName, status = 'running', error = null) {
  taskHealth.set(taskName, {
    lastRun: new Date().toISOString(),
    status,
    error: error ? error.message : null,
    consecutiveErrors: error 
      ? (taskHealth.get(taskName)?.consecutiveErrors || 0) + 1 
      : 0
  });
}

function getTaskHealth() {
  const health = {};
  for (const [task, info] of taskHealth.entries()) {
    health[task] = {
      ...info,
      timeSinceLastRun: Date.now() - new Date(info.lastRun).getTime()
    };
  }
  return health;
}

function isTaskHealthy(taskName, maxAge = 60000) {
  const task = taskHealth.get(taskName);
  if (!task) return false;
  
  const age = Date.now() - new Date(task.lastRun).getTime();
  return task.status === 'running' && age < maxAge && task.consecutiveErrors < 5;
}

module.exports = {
  updateTaskHealth,
  getTaskHealth,
  isTaskHealthy
};