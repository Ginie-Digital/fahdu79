package com.fahdu

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.util.Log
import com.facebook.react.HeadlessJsTaskService

/**
 * Handles CallStyle Decline (and Accept broadcast fallback).
 *
 * Decline MUST hit the reject API from native — Android 12+ often blocks
 * headless JS from a background BroadcastReceiver, which left callers ringing.
 */
class IncomingCallActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent == null) return

        when (intent.action) {
            IncomingCallStyleModule.ACTION_OPEN -> {
                Log.i(TAG, "ACTION_OPEN ignored (BUG_07 — no auto-launch on unlock/wake)")
                return
            }
            IncomingCallStyleModule.ACTION_DECLINE -> handleDecline(context, intent)
            IncomingCallStyleModule.ACTION_ACCEPT -> handleAcceptFallback(context, intent)
            else -> return
        }
    }

    private fun handleDecline(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val extras = intent.extras ?: Bundle()
        val roomId = extras.getString(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: ""
        val callId = extras.getString(IncomingCallStyleModule.EXTRA_CALL_ID) ?: ""
        val callType = extras.getString(IncomingCallStyleModule.EXTRA_CALL_TYPE) ?: "audio"
        val authToken = extras.getString(IncomingCallStyleModule.EXTRA_AUTH_TOKEN)

        Log.i(TAG, "DECLINE pressed room=$roomId callId=$callId hasToken=${!authToken.isNullOrBlank()}")

        if (roomId.isNotEmpty()) {
            IncomingCallStyleModule.cancelFromContext(context, roomId, callId)
        } else {
            IncomingCallStyleModule.stopRingtone(context)
        }

        IncomingCallStyleModule.savePendingAction(context, "decline_call", extras)
        IncomingCallStyleModule.emitAction("decline_call", extras)

        Thread {
            try {
                if (roomId.isNotEmpty()) {
                    val ok =
                        IncomingCallApi.postStatusWithRetry(
                            context,
                            roomId,
                            callType,
                            "REJECTED",
                            authToken,
                        )
                    Log.i(TAG, "DECLINE native API ok=$ok room=$roomId")
                }
                startHeadless(context, "decline_call", extras)
            } finally {
                try {
                    pendingResult.finish()
                } catch (_: Exception) {
                }
            }
        }.start()
    }

    private fun handleAcceptFallback(context: Context, intent: Intent) {
        val pendingResult = goAsync()
        val extras = intent.extras ?: Bundle()
        val roomId = extras.getString(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: ""
        val callId = extras.getString(IncomingCallStyleModule.EXTRA_CALL_ID) ?: ""
        val callType = extras.getString(IncomingCallStyleModule.EXTRA_CALL_TYPE) ?: "audio"
        val authToken = extras.getString(IncomingCallStyleModule.EXTRA_AUTH_TOKEN)

        Log.i(TAG, "ACCEPT broadcast fallback room=$roomId callId=$callId")

        if (roomId.isNotEmpty()) {
            IncomingCallStyleModule.stopAndSuppressRingtone(context, roomId, callId)
            IncomingCallStyleModule.dismissShadeOnly(context, roomId)
        } else {
            IncomingCallStyleModule.stopRingtone(context)
        }

        IncomingCallStyleModule.savePendingAction(context, "accept_call", extras)
        IncomingCallStyleModule.emitAction("accept_call", extras)

        Thread {
            try {
                // ACCEPTED API BEFORE launching UI so caller leaves "Notifying..."
                if (roomId.isNotEmpty()) {
                    val ok =
                        IncomingCallApi.postStatusWithRetry(
                            context,
                            roomId,
                            callType,
                            "ACCEPTED",
                            authToken,
                        )
                    Log.i(TAG, "ACCEPT native API ok=$ok room=$roomId")
                }
                try {
                    val launch =
                        Intent(context, MainActivity::class.java).apply {
                            action = IncomingCallStyleModule.ACTION_ACCEPT
                            putExtras(extras)
                            putExtra(IncomingCallStyleModule.EXTRA_ACTION, "accept_call")
                            putExtra("action", "accept_call")
                            addFlags(
                                Intent.FLAG_ACTIVITY_NEW_TASK or
                                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
                            )
                        }
                    context.startActivity(launch)
                } catch (e: Exception) {
                    Log.w(TAG, "Accept fallback launch failed: ${e.message}")
                    startHeadless(context, "accept_call", extras)
                }
            } finally {
                try {
                    pendingResult.finish()
                } catch (_: Exception) {
                }
            }
        }.start()
    }

    private fun startHeadless(context: Context, action: String, extras: Bundle) {
        val serviceIntent =
            Intent(context, IncomingCallHeadlessService::class.java).apply {
                putExtra("action", action)
                putExtras(extras)
            }
        try {
            context.startService(serviceIntent)
            HeadlessJsTaskService.acquireWakeLockNow(context)
        } catch (e: Exception) {
            Log.w(TAG, "Headless start failed (native API still ran): ${e.message}")
        }
    }

    companion object {
        private const val TAG = "IncomingCallAction"
    }
}
