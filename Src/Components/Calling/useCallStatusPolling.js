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

    // Ringing: poll fast so Answer/Decline on the other phone updates this UI quickly.
    const ringingIntervalMs = 2000;
    const connectedIntervalMs = 8000;
    addLog(
      `Polling started (Interval: ${callAccepted ? connectedIntervalMs : ringingIntervalMs}ms, callAccepted=${callAccepted})`,
    );

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
          const upper = String(status).toUpperCase();
          if (upper === 'ACCEPTED' && !callAccepted) {
            addLog('Action: Trigger onCallAccepted');
            savedCallbacks.current.onCallAccepted?.();
          } else if (upper === 'REJECTED') {
            addLog('Action: Trigger onCallRejected');
            savedCallbacks.current.onCallRejected?.();
            isStopped = true;
            return;
          } else if (upper === 'UNAVAILABLE') {
            addLog('Action: Trigger onCallUnavailable');
            savedCallbacks.current.onCallUnavailable?.();
            isStopped = true;
            return;
          } else if (
            upper === 'DISCONNECTED' ||
            upper === 'FORCE_CLOSED' ||
            upper === 'LEAVE' ||
            upper === 'ENDED' ||
            upper === 'COMPLETED' ||
            upper === 'CANCELLED' ||
            upper === 'CANCELED' ||
            upper === 'MISSED'
          ) {
            // Creator cut / leave / completed — callee must hang up (not only DISCONNECTED).
            addLog(`Action: Trigger onCallEnded (${upper})`);
            savedCallbacks.current.onCallEnded?.(upper);
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

      const interval = callAccepted ? connectedIntervalMs : ringingIntervalMs;
      if (!isStopped) {
        timeoutId = setTimeout(poll, interval);
      }
    };

    // First poll immediately while ringing so Accept/Reject feels instant.
    timeoutId = setTimeout(poll, callAccepted ? connectedIntervalMs : 300);

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
