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

function isJsPlaying() {
  return !!activePlayer;
}

/** Start / keep the ONE Android MediaPlayer (same IncomingCall.wav as BG). */
function startOrKeepNativeAndroidIncoming() {
  const mod = Native();
  if (!mod) return false;
  try {
    if (mod.isRingtonePlayingSync?.()) {
      setInAppIncomingUi(true);
      return true;
    }
    // Allow start, then mark in-app so FCM cannot spawn a second player.
    if (typeof mod.startRingtoneSync === 'function') {
      mod.startRingtoneSync();
    } else {
      mod.startRingtoneJs?.();
    }
    setInAppIncomingUi(true);
    return true;
  } catch (e) {
    console.warn('🔔 [RingtoneManager] native start failed:', e?.message || e);
    return false;
  }
}

const RingtoneManager = {
  /** Native MediaPlayer already ringing (BG CallStyle / handoff / FG). */
  isNativePlaying() {
    if (Platform.OS !== 'android') return false;
    try {
      return !!Native()?.isRingtonePlayingSync?.();
    } catch (_) {
      return false;
    }
  },

  /** Any incoming ringtone currently audible (native OR JS). */
  isIncomingPlaying() {
    return this.isNativePlaying() || isJsPlaying();
  },

  /**
   * Notification tap / IncomingCall open while native already rings:
   * keep the SAME MediaPlayer — never start a second/different tone.
   */
  adoptNativeIncoming() {
    if (Date.now() < incomingSuppressedUntil) return false;
    if (!this.isNativePlaying()) return false;
    killJsPlayer();
    setInAppIncomingUi(true);
    console.log('🔔 [RingtoneManager] adopt native ringtone (no restart)');
    return true;
  },

  /**
   * Ensure exactly ONE incoming ringtone.
   * Android: always the same native MediaPlayer + IncomingCall.wav.
   * iOS: JS IncomingCall.wav.
   */
  async ensureIncoming() {
    if (Date.now() < incomingSuppressedUntil) {
      console.log('🔔 [RingtoneManager] skip ensureIncoming — suppressed');
      return;
    }
    if (this.adoptNativeIncoming()) return;
    if (isJsPlaying()) {
      console.log('🔔 [RingtoneManager] ensureIncoming — JS already playing');
      return;
    }
    await this.playIncoming();
  },

  /**
   * Incoming ringtone — SAME sound in background notification AND IncomingCall screen.
   * Android: native MediaPlayer (assets_incomingcall.wav == Assets/IncomingCall.wav).
   * iOS: expo-audio IncomingCall.wav.
   */
  async playIncoming() {
    if (Date.now() < incomingSuppressedUntil) {
      console.log('🔔 [RingtoneManager] skip playIncoming — suppressed after Accept/Reject');
      return;
    }

    // Keep existing native tone continuous (BG → call screen).
    if (this.adoptNativeIncoming()) return;

    const gen = ++playGeneration;
    try {
      this.stopJsOnly();
      playGeneration = gen;

      // ─── Android: ONE MediaPlayer for BG + FG (same IncomingCall.wav) ───
      if (Platform.OS === 'android') {
        const canPlay =
          AppState.currentState === 'active' ||
          AppState.currentState === 'inactive' ||
          AppState.currentState === 'background';
        if (!canPlay) return;
        if (this.isNativePlaying()) {
          setInAppIncomingUi(true);
          return;
        }
        const ok = startOrKeepNativeAndroidIncoming();
        console.log(
          ok
            ? '🔔 [RingtoneManager] Android ringtone = native IncomingCall.wav (same as BG)'
            : '🔔 [RingtoneManager] Android native start failed',
        );
        return;
      }

      // ─── iOS: JS IncomingCall.wav ───
      stopNativeAndroidRingtone();
      setInAppIncomingUi(true);

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
      console.log('🔔 [RingtoneManager] iOS FG ringtone playing (IncomingCall.wav)');
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
   * Home / background: keep SAME native MediaPlayer (IncomingCall.wav).
   * If already playing — do not restart. Else start native once.
   */
  handOffToBackgroundRing(callDetails) {
    if (Date.now() < incomingSuppressedUntil) {
      console.log('🔔 [RingtoneManager] skip handoff — suppressed');
      return;
    }
    console.log('🔔 [RingtoneManager] Handoff → native BG ringtone (same tone)');
    this.stopJsOnly();
    const mod = Native();
    if (!mod) return;

    // Already on native MediaPlayer — keep continuous (same sound).
    if (this.isNativePlaying()) {
      setInAppIncomingUi(false);
      console.log('🔔 [RingtoneManager] handoff — native already playing (no restart)');
      return;
    }

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
