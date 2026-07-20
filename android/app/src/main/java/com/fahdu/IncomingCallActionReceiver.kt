package com.fahdu

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.app.NotificationManager
import android.os.Bundle
import com.facebook.react.HeadlessJsTaskService

/**
 * Handles CallStyle Decline (and optional Accept broadcast) without requiring
 * the full UI when the app is killed / backgrounded.
 */
class IncomingCallActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return
        val action = when (intent.action) {
            IncomingCallStyleModule.ACTION_DECLINE -> "decline_call"
            IncomingCallStyleModule.ACTION_ACCEPT -> "accept_call"
            else -> return
        }

        val extras = intent.extras ?: Bundle()
        val roomId = extras.getString(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: ""

        // Stop looping ringtone + dismiss CallStyle notification immediately.
        IncomingCallStyleModule.stopRingtone(context)
        if (roomId.isNotEmpty()) {
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(IncomingCallStyleModule.notificationIdFor(roomId))
        }

        // Persist for cold-start recovery + emit if JS is alive.
        IncomingCallStyleModule.savePendingAction(context, action, extras)
        IncomingCallStyleModule.emitAction(action, extras)

        // Headless JS so Reject works even when the app process has no UI.
        val serviceIntent = Intent(context, IncomingCallHeadlessService::class.java).apply {
            putExtra("action", action)
            putExtras(extras)
        }
        try {
            context.startService(serviceIntent)
            HeadlessJsTaskService.acquireWakeLockNow(context)
        } catch (_: Exception) {
            // If startService fails (rare OEM restrictions), pending action is still saved.
        }
    }
}
