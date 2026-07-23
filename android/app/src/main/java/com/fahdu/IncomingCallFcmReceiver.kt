package com.fahdu

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.PowerManager
import android.util.Log

/**
 * High-priority C2DM receiver — runs even when app process was killed.
 * Posts Accept/Reject synchronously before [goAsync] finishes so the process
 * is not torn down before NotificationManager.notify runs.
 */
class IncomingCallFcmReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent?) {
        Log.i(TAG, "C2DM RECEIVE action=${intent?.action}")
        val pending = goAsync()
        var wakeLock: PowerManager.WakeLock? = null
        try {
            val app = context.applicationContext
            val pm = app.getSystemService(Context.POWER_SERVICE) as PowerManager
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "fahdu:incoming_call_fcm")
            wakeLock.acquire(15_000L)
            // Synchronous — do NOT hop to another thread or mainHandler.post.
            IncomingCallNativeHandler.onIntentExtras(app, intent?.extras)
        } catch (e: Exception) {
            Log.w(TAG, "Fast-path FCM handle failed: ${e.message}")
        } finally {
            try {
                if (wakeLock?.isHeld == true) wakeLock.release()
            } catch (_: Exception) {
            }
            pending.finish()
        }
    }

    companion object {
        private const val TAG = "IncomingCallFcm"
    }
}
