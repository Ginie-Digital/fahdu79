import React, {useEffect, useState, useRef, memo} from 'react';
import {Text, StyleSheet} from 'react-native';
import {FONT_SIZES} from '../../../DesiginData/Utility';

const TimerText = ({ accepted, totalDuration, onTimerExpire, textStyle }) => {
  const [countup, setCountup] = useState('00:00');
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const hasExpiredRef = useRef(false);

  const formatDuration = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const onTimerExpireRef = useRef(onTimerExpire);

  // Update ref when prop changes
  useEffect(() => {
    onTimerExpireRef.current = onTimerExpire;
  }, [onTimerExpire]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Reset timer if call not accepted
    if (!accepted) {
      console.log('⏳ Timer stopped - waiting for call acceptance...');
      setCountup('00:00');
      startTimeRef.current = null;
      hasExpiredRef.current = false;
      return;
    }

    // Start timer when call is accepted - ONLY if it hasn't started yet
    if (!startTimeRef.current) {
      console.log('✅ Call accepted, starting timer...');
      startTimeRef.current = Date.now();
    }

    intervalRef.current = setInterval(() => {
      const elapsedMs = Date.now() - startTimeRef.current;
      
      // Update display
      setCountup(formatDuration(elapsedMs));

      // Check for expiry
      if (totalDuration && !hasExpiredRef.current) {
        const totalDurationMs = totalDuration * 60 * 1000;
        const earlyExpiryMs = totalDurationMs - 5000; // 5 seconds early
        
        if (elapsedMs >= earlyExpiryMs) {
          hasExpiredRef.current = true;
          
          // Stop the interval to freeze the timer display
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          if (onTimerExpireRef.current) {
            onTimerExpireRef.current();
          }
        }
      }
    }, 1000);

    // Cleanup on unmount or when accepted changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [accepted, totalDuration]);

  return (
    <Text style={[styles.coinTimerText, textStyle]}>
      {countup}{totalDuration ? ` / ${formatDuration(totalDuration * 60 * 1000)}` : ''}
    </Text>
  );
};

const styles = StyleSheet.create({
  coinTimerText: {
    fontFamily: 'Rubik-Medium',
    fontSize: 18,
    color: '#000000',
    marginTop: 12,
  },
});

// 🔥 Memoize to prevent unnecessary re-renders
export default memo(TimerText);
