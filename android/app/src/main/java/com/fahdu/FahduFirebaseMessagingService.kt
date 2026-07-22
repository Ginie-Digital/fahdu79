package com.fahdu

import android.content.Intent
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * BG/kill: show CallStyle (circular Decline/Answer) — skip FCM text tray.
 * FG (phone in use): skip CallStyle; deliver to JS so IncomingCall full screen opens.
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
                // BG/kill: CallStyle owns UI — never show FCM text Reject/Accept tray.
                Log.i(TAG, "Call FCM → CallStyle only — skip FCM system tray")
                return
            }
            // handleIfCall=false means either not a call, OR FG skip (MainActivity resumed).
            // FG MUST call super so JS onMessage opens IncomingCall + ringtone.
            // Previously looksLikeIncomingCall blocked super on FG too → no CallStyle,
            // no IncomingCall screen, only vibration — the "call ball screen missing" bug.
            if (looksLikeIncomingCall(extras)) {
                if (IncomingCallStyleModule.isMainActivityResumed()) {
                    Log.i(TAG, "FG call FCM — deliver to JS for IncomingCall screen")
                    super.handleIntent(intent)
                    return
                }
                Log.w(TAG, "Call-like FCM but parse missed — skip super to avoid wrong shade")
                IncomingCallNativeHandler.onIntentExtras(applicationContext, extras)
                return
            }
        } catch (e: Exception) {
            Log.w(TAG, "handleIntent call path failed: ${e.message}")
            if (looksLikeIncomingCall(intent.extras)) {
                // FG: still try to deliver to JS so IncomingCall can open.
                if (IncomingCallStyleModule.isMainActivityResumed()) {
                    Log.w(TAG, "Call-like FCM after error (FG) — deliver to JS")
                    try {
                        super.handleIntent(intent)
                    } catch (e2: Exception) {
                        Log.w(TAG, "super.handleIntent failed: ${e2.message}")
                    }
                    return
                }
                Log.w(TAG, "Call-like FCM after error — skip super")
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
