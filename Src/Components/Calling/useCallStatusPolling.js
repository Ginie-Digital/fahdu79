import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { BASE_URL } from '../../Configs/ApiConfig';
import { addPollingLog, getPollingLogs, clearPollingLogs, subscribePollingLogs } from './PollingLogManager';

export const useCallStatusPolling = ({
  roomId,
  token,
  enabled,
  callAccepted,
  onCallAccepted,
  onCallEnded,
  onCallRejected,
  onCallUnavailable,
}) => {
  const [logs, setLogs] = useState(getPollingLogs());
  const savedCallbacks = useRef({
    onCallAccepted,
    onCallEnded,
    onCallRejected,
    onCallUnavailable,
  });

  // Keep callbacks fresh
  useEffect(() => {
    savedCallbacks.current = {
      onCallAccepted,
      onCallEnded,
      onCallRejected,
      onCallUnavailable,
    };
  }, [onCallAccepted, onCallEnded, onCallRejected, onCallUnavailable]);

  // Subscribe to global logs reactive stream
  useEffect(() => {
    return subscribePollingLogs((updatedLogs) => {
      setLogs(updatedLogs);
    });
  }, []);

  const addLog = (text) => {
    addPollingLog(text);
  };

  const clearLogs = () => {
    clearPollingLogs();
  };

  useEffect(() => {
    if (!enabled || !roomId || !token) {
      if (!roomId) addLog('Polling inactive: No roomId provided');
      if (!token) addLog('Polling inactive: No token provided');
      if (!enabled) addLog('Polling inactive: Disabled by parent');
      return;
    }

    let isStopped = false;
    let timeoutId = null;

    addLog(`Polling started (Interval: ${callAccepted ? '8s' : '5s'}, callAccepted=${callAccepted})`);

    const poll = async () => {
      if (isStopped) return;

      const startTime = Date.now();
      const url = `${BASE_URL}/api/stream/other/participant/status?roomId=${roomId}`;
      addLog(`Request: GET /stream/other/participant/status`);

      try {
        const response = await axios.get(url, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          timeout: 4000,
        });

        const status = response?.data?.data?.status;
        const duration = Date.now() - startTime;
        addLog(`Response: ${status} (${duration}ms)`);

        if (status) {
          if (status === 'ACCEPTED' && !callAccepted) {
            addLog('Action: Trigger onCallAccepted');
            savedCallbacks.current.onCallAccepted?.();
          } else if (status === 'REJECTED') {
            addLog('Action: Trigger onCallRejected');
            savedCallbacks.current.onCallRejected?.();
            isStopped = true;
            return;
          } else if (status === 'UNAVAILABLE') {
            addLog('Action: Trigger onCallUnavailable');
            savedCallbacks.current.onCallUnavailable?.();
            isStopped = true;
            return;
          } else if (status === 'DISCONNECTED' || status === 'FORCE_CLOSED') {
            addLog(`Action: Trigger onCallEnded (${status})`);
            savedCallbacks.current.onCallEnded?.(status);
            isStopped = true;
            return;
          }
        } else {
          addLog('Warning: status field missing in response');
        }
      } catch (error) {
        const duration = Date.now() - startTime;
        const msg = error?.response?.data?.message || error?.message || 'Network error';
        addLog(`Error: ${msg} (${duration}ms)`);
      }

      // Schedule next poll
      const interval = callAccepted ? 8000 : 5000;
      if (!isStopped) {
        timeoutId = setTimeout(poll, interval);
      }
    };

    const initialInterval = callAccepted ? 8000 : 5000;
    timeoutId = setTimeout(poll, initialInterval);

    return () => {
      isStopped = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      addLog('Polling stopped');
    };
  }, [roomId, token, enabled, callAccepted]);

  return { logs, clearLogs };
};
