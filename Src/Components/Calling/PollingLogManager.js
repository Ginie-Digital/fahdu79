let _logs = [];
const _subscribers = new Set();

const getTimestamp = () => {
  const d = new Date();
  const pad = (n, l = 2) => String(n).padStart(l, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
};

export const addPollingLog = (text) => {
  const logStr = `[${getTimestamp()}] ${text}`;
  console.log(`📡 [POLLING_LOG] ${logStr}`);
  _logs = [logStr, ..._logs].slice(0, 100);
  _subscribers.forEach(cb => cb(_logs));
};

export const getPollingLogs = () => _logs;

export const clearPollingLogs = () => {
  _logs = [];
  _subscribers.forEach(cb => cb(_logs));
};

export const subscribePollingLogs = (cb) => {
  _subscribers.add(cb);
  cb(_logs); // emit immediately on sub
  return () => {
    _subscribers.delete(cb);
  };
};
