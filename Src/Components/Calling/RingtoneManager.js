import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { AppState, NativeModules, Platform } from 'react-native';

let activePlayer = null;
let playGeneration = 0;
/** After Accept/Reject, block any late playIncoming until cleared. */
let incomingSuppressedUntil = 0;

const Native = () =>
  Platform.OS === 'android' ? NativeModules.IncomingCallStyle : null;

function setInAppIncomingUi(active) {
  const mod = Native();
  if (!mod) return;
  try {
    if (typeof mod.setInAppIncomingUiSync === 'function') {
      mod.setInAppIncomingUiSync(!!active);
    } else {
      mod.setInAppIncomingUi?.(!!active);
    }
  } catch (_) {}
}

function stopNativeAndroidRingtone() {
  const mod = Native();
  if (!mod) return;
  try {
    if (typeof mod.stopRingtoneSyncJs === 'function') {
      mod.stopRingtoneSyncJs();
    } else {
      mod.stopRingtoneJs?.();
    }
  } catch (_) {}
}

function stopAndSuppressNativeAndroidRingtone(roomId) {
  const mod = Native();
  if (!mod) return;
  try {
    if (typeof mod.stopAndSuppressRingtoneSync === 'function') {
      mod.stopAndSuppressRingtoneSync(String(roomId || ''));
      return;
    }
  } catch (_) {}
  stopNativeAndroidRingtone();
}

function killJsPlayer() {
  if (activePlayer) {
    try {
      activePlayer.pause?.();
      activePlayer.release();
    } catch (_) {
    } finally {
      activePlayer = null;
    }
  }
}

const RingtoneManager = {
  /** Foreground IncomingCall — JS only (never native). */
  async playIncoming() {
    if (Date.now() < incomingSuppressedUntil) {
      console.log('🔔 [RingtoneManager] skip playIncoming — suppressed after Accept/Reject');
      return;
    }

    const gen = ++playGeneration;
    try {
      this.stopJsOnly();
      stopNativeAndroidRingtone();
      setInAppIncomingUi(true);
      playGeneration = gen;

      // active + inactive (notification shade / brief transition) — both FG.
      // Only skip when truly backgrounded (native handoff owns that path).
      const canPlayJs =
        AppState.currentState === 'active' || AppState.currentState === 'inactive';
      if (!canPlayJs) {
        setInAppIncomingUi(false);
        console.log('🔔 [RingtoneManager] skip playIncoming — AppState=', AppState.currentState);
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldPlayInBackground: false,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
      });

      if (gen !== playGeneration || Date.now() < incomingSuppressedUntil) {
        return;
      }
      if (AppState.currentState === 'background') {
        setInAppIncomingUi(false);
        return;
      }

      const source = require('../../../Assets/IncomingCall.wav');
      const player = createAudioPlayer(source);
      player.loop = true;
      if (gen !== playGeneration || Date.now() < incomingSuppressedUntil) {
        try {
          player.release();
        } catch (_) {}
        return;
      }
      if (AppState.currentState === 'background') {
        try {
          player.release();
        } catch (_) {}
        setInAppIncomingUi(false);
        return;
      }
      activePlayer = player;
      activePlayer.play();
      console.log('🔔 [RingtoneManager] FG ringtone playing (single)');
    } catch (err) {
      console.log('❌ [RingtoneManager] playIncoming failed:', err?.message);
    }
  },

  async playOutgoing() {
    const gen = ++playGeneration;
    try {
      this.stopAll();
      playGeneration = gen;
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldPlayInBackground: true,
        interruptionMode: 'doNotMix',
        interruptionModeAndroid: 'doNotMix',
      });
      if (gen !== playGeneration) return;
      const source = require('../../Assets/Audio/ringfahdu.wav');
      const player = createAudioPlayer(source);
      player.loop = true;
      if (gen !== playGeneration) {
        try {
          player.release();
        } catch (_) {}
        return;
      }
      activePlayer = player;
      activePlayer.play();
    } catch (err) {
      console.log('❌ [RingtoneManager] playOutgoing failed:', err?.message);
    }
  },

  /** Stop JS player only — keeps native BG MediaPlayer running. */
  stopJsOnly() {
    playGeneration += 1;
    killJsPlayer();
  },

  /**
   * Soft stop (effect cleanup / screen change) — silence now, allow future ring.
   * Does NOT suppress — Accept/Reject must call stopAndSuppress.
   */
  stopAll(roomId) {
    playGeneration += 1;
    setInAppIncomingUi(false);
    killJsPlayer();
    stopNativeAndroidRingtone();
  },

  /**
   * Accept / Reject / hard end — silence immediately + block late FCM/JS re-ring.
   */
  stopAndSuppress(roomId) {
    playGeneration += 1;
    incomingSuppressedUntil = Date.now() + 5_000;
    setInAppIncomingUi(false);
    killJsPlayer();
    stopAndSuppressNativeAndroidRingtone(roomId);
    killJsPlayer();
    stopNativeAndroidRingtone();
    console.log('🔕 [RingtoneManager] stopAndSuppress — silenced');
  },

  /** New incoming invite — allow ringing again after a prior Accept/Reject. */
  clearIncomingSuppress() {
    incomingSuppressedUntil = 0;
  },

  /**
   * Home / background: stop JS, start ONE native MediaPlayer (sync).
   * Channel is silent — MediaPlayer is the only ring.
   */
  handOffToBackgroundRing(callDetails) {
    if (Date.now() < incomingSuppressedUntil) {
      console.log('🔔 [RingtoneManager] skip handoff — suppressed');
      return;
    }
    console.log('🔔 [RingtoneManager] Handoff → native BG ringtone (sync)');
    this.stopJsOnly();
    const mod = Native();
    if (!mod) return;

    try {
      if (callDetails?.roomId && typeof mod.handoffBackgroundRingSync === 'function') {
        const ok = mod.handoffBackgroundRingSync({
          roomId: String(callDetails.roomId || ''),
          callId: String(callDetails.callId || ''),
          callType: String(callDetails.callType || 'audio'),
          displayName: String(
            callDetails.displayName || callDetails.name || 'Incoming Call',
          ),
          senderId: String(callDetails.senderId || callDetails.callerId || ''),
          profileImage: String(
            callDetails.profileImage || callDetails.profileImageUrl || '',
          ),
        });
        console.log('🔔 [RingtoneManager] handoffBackgroundRingSync=', ok);
        return;
      }
    } catch (e) {
      console.warn('🔔 [RingtoneManager] sync handoff failed:', e?.message || e);
    }

    try {
      setInAppIncomingUi(false);
      mod.startRingtoneSync?.() || mod.startRingtoneJs?.();
    } catch (_) {}
  },
};

export default RingtoneManager;
