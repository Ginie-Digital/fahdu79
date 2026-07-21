package com.fahdu

import android.content.Intent
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * Kill / background: show CallStyle (circular Decline/Answer) BEFORE JS boots.
 *
 * Never call [super.handleIntent] for call payloads — that posts the wrong
 * FCM system tray banner (text Reject/Accept), which is what users were seeing
 * instead of CallStyle.
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
                Log.i(TAG, "Call FCM → CallStyle only — skip FCM system tray")
                return
            }
            // Even if parse returned false, block super when payload looks like a call
            // so the blue text Reject/Accept FCM banner never appears.
            if (looksLikeIncomingCall(extras)) {
                Log.w(TAG, "Call-like FCM but parse missed — skip super to avoid wrong shade")
                IncomingCallNativeHandler.onIntentExtras(applicationContext, extras)
                return
            }
        } catch (e: Exception) {
            Log.w(TAG, "handleIntent call path failed: ${e.message}")
            if (looksLikeIncomingCall(intent.extras)) {
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
