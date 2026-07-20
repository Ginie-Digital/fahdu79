package com.fahdu

import android.content.Intent
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import io.invertase.firebase.messaging.ReactNativeFirebaseMessagingService

/**
 * Kill / background: show Accept/Reject CallStyle BEFORE JS boots.
 *
 * Critical: for notification+data FCM, Firebase's default path shows a
 * system tray banner (no Accept/Reject) and never calls onMessageReceived
 * when the app is killed. We intercept [handleIntent] first, post CallStyle,
 * and skip super so the button-less OS notification is not shown.
 */
class FahduFirebaseMessagingService : ReactNativeFirebaseMessagingService() {

    override fun handleIntent(intent: Intent?) {
        if (intent == null) {
            super.handleIntent(intent)
            return
        }
        try {
            val handled = IncomingCallNativeHandler.handleIfCall(applicationContext, intent.extras)
            if (handled) {
                Log.i(TAG, "Call FCM handled natively — skip FCM system tray notification")
                return
            }
        } catch (e: Exception) {
            Log.w(TAG, "handleIntent call path failed: ${e.message}")
        }
        super.handleIntent(intent)
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Data-only / foreground: also show CallStyle (handleIntent may not
        // treat some shapes as notification messages).
        try {
            Log.i(TAG, "onMessageReceived from=${remoteMessage.from} data=${remoteMessage.data.keys}")
            IncomingCallNativeHandler.onRemoteMessage(applicationContext, remoteMessage)
        } catch (e: Exception) {
            Log.w(TAG, "incoming call native handle failed: ${e.message}")
        }
        super.onMessageReceived(remoteMessage)
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
    }

    companion object {
        private const val TAG = "FahduFCM"
    }
}
