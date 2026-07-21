package com.fahdu

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.HeadlessJsTaskService

/**
 * Handles CallStyle Decline (and content-tap no-op).
 *
 * BUG_07: ACTION_OPEN must NOT start MainActivity. OEMs redeliver CATEGORY_CALL
 * contentIntent on unlock/wake; launching an Activity there auto-opened IncomingCall.
 */
class IncomingCallActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return

        when (intent.action) {
            IncomingCallStyleModule.ACTION_OPEN -> {
                // Intentional no-op — body open is via Notifee only.
                Log.i(TAG, "ACTION_OPEN ignored (BUG_07 — no auto-launch on unlock/wake)")
                return
            }
            IncomingCallStyleModule.ACTION_DECLINE -> handleDecline(context, intent)
            // Accept is Activity PendingIntent → MainActivity. Keep broadcast as
            // safety fallback but do NOT stamp ENDED (that raced CallScreen).
            IncomingCallStyleModule.ACTION_ACCEPT -> handleAcceptFallback(context, intent)
            else -> return
        }
    }

    private fun handleDecline(context: Context, intent: Intent) {
        val extras = intent.extras ?: Bundle()
        val roomId = extras.getString(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: ""
        val callId = extras.getString(IncomingCallStyleModule.EXTRA_CALL_ID) ?: ""

        if (roomId.isNotEmpty()) {
            IncomingCallStyleModule.cancelFromContext(context, roomId, callId)
        } else {
            IncomingCallStyleModule.stopRingtone(context)
        }

        IncomingCallStyleModule.savePendingAction(context, "decline_call", extras)
        IncomingCallStyleModule.emitAction("decline_call", extras)
        startHeadless(context, "decline_call", extras)
    }

    private fun handleAcceptFallback(context: Context, intent: Intent) {
        val extras = intent.extras ?: Bundle()
        val roomId = extras.getString(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: ""
        val callId = extras.getString(IncomingCallStyleModule.EXTRA_CALL_ID) ?: ""

        // Match MainActivity Accept — silence only, do not mark call ended.
        if (roomId.isNotEmpty()) {
            IncomingCallStyleModule.stopAndSuppressRingtone(context, roomId, callId)
            IncomingCallStyleModule.dismissShadeOnly(context, roomId)
        } else {
            IncomingCallStyleModule.stopRingtone(context)
        }

        IncomingCallStyleModule.savePendingAction(context, "accept_call", extras)
        IncomingCallStyleModule.emitAction("accept_call", extras)

        // Bring app up so JS can open CallScreen (cold start from killed).
        try {
            val launch = Intent(context, MainActivity::class.java).apply {
                action = IncomingCallStyleModule.ACTION_ACCEPT
                putExtras(extras)
                putExtra(IncomingCallStyleModule.EXTRA_ACTION, "accept_call")
                addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP,
                )
            }
            context.startActivity(launch)
        } catch (e: Exception) {
            Log.w(TAG, "Accept fallback launch failed: ${e.message}")
            startHeadless(context, "accept_call", extras)
        }
    }

    private fun startHeadless(context: Context, action: String, extras: Bundle) {
        val serviceIntent = Intent(context, IncomingCallHeadlessService::class.java).apply {
            putExtra("action", action)
            putExtras(extras)
        }
        try {
            context.startService(serviceIntent)
            HeadlessJsTaskService.acquireWakeLockNow(context)
        } catch (_: Exception) {
            // Pending action still saved for cold-start consume.
        }
    }

    companion object {
        private const val TAG = "IncomingCallAction"
    }
}
