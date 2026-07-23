package com.fahdu

import android.content.Intent
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * BG/kill: show CallStyle (circular Decline/Answer) — skip FCM text tray.
 * FG: still show CallStyle from native; also deliver to JS for IncomingCall screen.
 * Cancel/end: clear CallStyle natively, THEN still deliver to JS so callee UI cuts.
 * Never silent-drop a call-like FCM — always retry display or deliver to JS.
 */
class FahduFirebaseMessagingService : ReactNativeFirebaseMessagingService() {

    override fun handleIntent(intent: Intent?) {
        if (intent == null) {
            super.handleIntent(intent)
            return
        }
        try {
            val extras = intent.extras
            val handled = IncomingCallNativeHandler.handleIfCall(applicationContext, extras)
            if (handled) {
                // Creator cancel/end: native cleared shade — JS must still dismiss IncomingCall/CallScreen.
                if (IncomingCallNativeHandler.isCancelOrEndExtras(extras)) {
                    Log.i(TAG, "Call CANCEL/END FCM — CallStyle cleared, deliver to JS for UI hangup")
                    try {
                        super.handleIntent(intent)
                    } catch (e: Exception) {
                        Log.w(TAG, "super.handleIntent after cancel failed: ${e.message}")
                    }
                    return
                }
                // Incoming CallStyle posted — skip FCM text tray (wrong Accept/Reject UI).
                // ALWAYS deliver to JS when process can receive it (FG + BG/minimized).
                // JS must open IncomingCall and must NOT cancel CallStyle.
                Log.i(TAG, "CallStyle posted — deliver to JS for IncomingCall (skip FCM tray)")
                try {
                    super.handleIntent(intent)
                } catch (e: Exception) {
                    Log.w(TAG, "super.handleIntent after CallStyle failed: ${e.message}")
                }
                return
            }
            // Not handled: parse miss, display failed, or non-call.
            if (looksLikeIncomingCall(extras) || IncomingCallNativeHandler.isCancelOrEndExtras(extras)) {
                Log.w(TAG, "Call-like FCM not fully handled — retry native + deliver to JS")
                try {
                    IncomingCallNativeHandler.onIntentExtras(applicationContext, extras)
                } catch (e: Exception) {
                    Log.w(TAG, "retry onIntentExtras failed: ${e.message}")
                }
                try {
                    super.handleIntent(intent)
                } catch (e: Exception) {
                    Log.w(TAG, "super.handleIntent fallback failed: ${e.message}")
                }
                return
            }
        } catch (e: Exception) {
            Log.w(TAG, "handleIntent call path failed: ${e.message}")
            if (looksLikeIncomingCall(intent.extras)) {
                Log.w(TAG, "Call-like FCM after error — force deliver to JS (never drop)")
                try {
                    IncomingCallNativeHandler.onIntentExtras(applicationContext, intent.extras)
                } catch (_: Exception) {
                }
                try {
                    super.handleIntent(intent)
                } catch (e2: Exception) {
                    Log.w(TAG, "super.handleIntent failed: ${e2.message}")
                }
                return
            }
        }
        super.handleIntent(intent)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        try {
            Log.i(TAG, "onMessageReceived from=${remoteMessage.from} data=${remoteMessage.data.keys}")
            IncomingCallNativeHandler.onRemoteMessage(applicationContext, remoteMessage)
        } catch (e: Exception) {
            Log.w(TAG, "incoming call native handle failed: ${e.message}")
        }
        // Still deliver to JS for FG IncomingCall screen / socket sync.
        super.onMessageReceived(remoteMessage)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
    }

    private fun looksLikeIncomingCall(extras: android.os.Bundle?): Boolean {
        if (extras == null) return false
        val blob = StringBuilder()
        for (key in extras.keySet()) {
            val v = extras.get(key) ?: continue
            blob.append(key).append('=').append(v.toString()).append(';')
        }
        val s = blob.toString().lowercase()
        return s.contains("\"type\":\"call\"") ||
            s.contains("\"type\": \"call\"") ||
            s.contains("incoming_call") ||
            s.contains("incoming voice call") ||
            s.contains("incoming video call") ||
            (s.contains("roomid") && s.contains("call"))
    }

    companion object {
        private const val TAG = "FahduFCM"
    }
}
