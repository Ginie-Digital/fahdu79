import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { NativeModules, Platform } from 'react-native';

let activePlayer = null;

function stopNativeAndroidRingtone() {
  if (Platform.OS !== 'android') return;
  try {
    NativeModules.IncomingCallStyle?.stopRingtoneJs?.();
  } catch (_) {}
}

const RingtoneManager = {
  /**
   * Play the incoming call ringtone (JS). Stops any native Android loop first.
   */
  async playIncoming() {
    try {
      this.stopAll();
      console.log('🔔 [RingtoneManager] Configuring audio mode for incoming call...');
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
      });

      console.log('🔔 [RingtoneManager] Loading incoming call ringtone...');
      const source = require('../../../Assets/IncomingCall.wav');
      activePlayer = createAudioPlayer(source);
      activePlayer.loop = true;
      activePlayer.play();
      console.log('🔔 [RingtoneManager] Playing incoming call ringtone');
    } catch (err) {
      console.log('❌ [RingtoneManager] Failed to play incoming call ringtone:', err?.message);
    }
  },

  /**
   * Play the outgoing call ringtone.
   */
  async playOutgoing() {
    try {
      this.stopAll();
      console.log('🔔 [RingtoneManager] Configuring audio mode for outgoing call...');
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
      });

      console.log('🔔 [RingtoneManager] Loading outgoing call ringtone...');
      const source = require('../../Assets/Audio/ringfahdu.wav');
      activePlayer = createAudioPlayer(source);
      activePlayer.loop = true;
      activePlayer.play();
      console.log('🔔 [RingtoneManager] Playing outgoing call ringtone');
    } catch (err) {
      console.log('❌ [RingtoneManager] Failed to play outgoing call ringtone:', err?.message);
    }
  },

  /**
   * Stop JS player + native Android CallStyle ringtone loop.
   */
  stopAll() {
    stopNativeAndroidRingtone();
    if (activePlayer) {
      try {
        console.log('🔇 [RingtoneManager] Stopping and releasing active player...');
        activePlayer.release();
        console.log('🔇 [RingtoneManager] Active player released successfully');
      } catch (err) {
        console.log('⚠️ [RingtoneManager] Error releasing player:', err?.message);
      } finally {
        activePlayer = null;
      }
    }
  },
};

export default RingtoneManager;
