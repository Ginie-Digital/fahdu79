package com.fahdu

import android.content.Intent
import com.facebook.react.HeadlessJsTaskService
import com.facebook.react.bridge.Arguments
import com.facebook.react.jstasks.HeadlessJsTaskConfig

/**
 * Runs JS Accept/Reject handlers while the app is killed / backgrounded.
 */
class IncomingCallHeadlessService : HeadlessJsTaskService() {
    override fun getTaskConfig(intent: Intent?): HeadlessJsTaskConfig? {
        if (intent == null) return null
        val data = Arguments.createMap()
        data.putString("action", intent.getStringExtra("action") ?: "")
        data.putString(
            IncomingCallStyleModule.EXTRA_ROOM_ID,
            intent.getStringExtra(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: "",
        )
        data.putString(
            IncomingCallStyleModule.EXTRA_CALL_ID,
            intent.getStringExtra(IncomingCallStyleModule.EXTRA_CALL_ID) ?: "",
        )
        data.putString(
            IncomingCallStyleModule.EXTRA_CALL_TYPE,
            intent.getStringExtra(IncomingCallStyleModule.EXTRA_CALL_TYPE) ?: "audio",
        )
        data.putString(
            IncomingCallStyleModule.EXTRA_DISPLAY_NAME,
            intent.getStringExtra(IncomingCallStyleModule.EXTRA_DISPLAY_NAME) ?: "",
        )
        data.putString(
            IncomingCallStyleModule.EXTRA_SENDER_ID,
            intent.getStringExtra(IncomingCallStyleModule.EXTRA_SENDER_ID) ?: "",
        )
        data.putString(
            IncomingCallStyleModule.EXTRA_PROFILE_IMAGE,
            intent.getStringExtra(IncomingCallStyleModule.EXTRA_PROFILE_IMAGE) ?: "",
        )

        return HeadlessJsTaskConfig(
            "IncomingCallStyleTask",
            data,
            45000,
            true,
        )
    }
}
