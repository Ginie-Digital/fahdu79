package com.fahdu

import android.content.Context
import android.os.Bundle
import android.util.Log
import com.google.firebase.messaging.RemoteMessage
import org.json.JSONObject

/**
 * Parse FCM call payloads and show Accept/Reject CallStyle without JS.
 * Used when the app is killed / backgrounded (JS headless may not run in time).
 */
object IncomingCallNativeHandler {
    private const val TAG = "IncomingCallNative"

    data class CallInfo(
        val type: String,
        val roomId: String,
        val callId: String = "",
        val callType: String = "audio",
        val displayName: String = "Incoming Call",
        val senderId: String = "",
        val profileImage: String = "",
    )

    /**
     * @return true only when native actually showed/cancelled CallStyle UI.
     * Foreground skip returns false so [FahduFirebaseMessagingService] still
     * calls super and JS receives onMessage → IncomingCall + ringtone.
     */
    fun handleIfCall(context: Context, extras: Bundle?): Boolean {
        if (extras == null) return false
        val info = parseFromBundle(extras) ?: return false
        if (!isCallRelated(info.type)) return false
        return apply(context, info)
    }

    fun onRemoteMessage(context: Context, remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        if (data.isNullOrEmpty()) {
            Log.w(TAG, "FCM data empty (notification-only?) — cannot show call buttons")
            return
        }
        Log.i(TAG, "FCM data keys=${data.keys}")
        val info = parseFromDataMap(data) ?: return
        apply(context, info)
    }

    fun onIntentExtras(context: Context, extras: Bundle?) {
        if (extras == null) return
        Log.i(TAG, "C2DM extras keys=${extras.keySet()}")
        handleIfCall(context, extras)
    }

    private fun isCallRelated(type: String): Boolean {
        return type == "call" ||
            type == "incoming_call" ||
            type == "call_rejected" ||
            type == "call_unavailable" ||
            type == "call_cancelled" ||
            type == "call_canceled" ||
            type == "call_accepted" ||
            type == "call_ended" ||
            type == "call_completed" ||
            type == "call_disconnected" ||
            type == "missed_call"
    }

    /**
     * @return true if native owned the call UI (CallStyle shown or cancelled).
     * false when FG skip — JS must open IncomingCall + play ringtone.
     */
    private fun apply(context: Context, info: CallInfo): Boolean {
        val app = context.applicationContext
        when (info.type) {
            "call", "incoming_call" -> {
                if (info.roomId.isEmpty()) {
                    Log.w(TAG, "call missing roomId")
                    return false
                }
                // ONLY skip when MainActivity is actually visible.
                // Do NOT use isAppInForeground() — FCM wakes a killed process as
                // IMPORTANCE_FOREGROUND, which falsely skipped CallStyle and left
                // no Accept/Reject UI when the user had closed the app.
                if (IncomingCallStyleModule.isMainActivityResumed()) {
                    Log.i(TAG, "SKIP CallStyle — MainActivity resumed, defer to JS room=${info.roomId}")
                    return false
                }
                // BG / killed / Home — ALWAYS CallStyle. Never fall through to FCM
                // system tray (blue Reject/Accept text) — that was the wrong shade.
                IncomingCallStyleModule.setInAppIncomingUi(false)
                IncomingCallStyleModule.clearRingtoneSuppress()
                Log.i(TAG, "SHOW CallStyle Decline/Answer + RING room=${info.roomId} callId=${info.callId}")
                val ok = IncomingCallStyleModule.displayFromContext(
                    app,
                    roomId = info.roomId,
                    callId = info.callId,
                    callType = info.callType,
                    displayName = info.displayName,
                    senderId = info.senderId,
                    profileImage = info.profileImage,
                    force = true,
                    playRingtone = true,
                )
                Log.i(TAG, "displayFromContext result=$ok")
                // Return true even if notify failed — calling super shows the WRONG
                // FCM/Notifee-style banner (text Reject/Accept). Retry once.
                if (!ok) {
                    Log.w(TAG, "CallStyle failed — retry once")
                    IncomingCallStyleModule.displayFromContext(
                        app,
                        roomId = info.roomId,
                        callId = info.callId,
                        callType = info.callType,
                        displayName = info.displayName,
                        senderId = info.senderId,
                        profileImage = info.profileImage,
                        force = true,
                        playRingtone = true,
                    )
                }
                return true
            }

            "call_rejected",
            "call_unavailable",
            "call_cancelled",
            "call_canceled",
            "call_ended",
            "call_completed",
            "call_disconnected",
            "missed_call",
            -> {
                if (info.roomId.isNotEmpty()) {
                    Log.i(TAG, "CANCEL call UI room=${info.roomId} type=${info.type}")
                    IncomingCallStyleModule.cancelFromContext(app, info.roomId, info.callId)
                    return true
                }
                return false
            }

            // Callee already accepted — only stop ring/shade. Do NOT stamp ENDED
            // (that raced CallScreen navigation and made Accept look dead).
            "call_accepted" -> {
                if (info.roomId.isNotEmpty()) {
                    Log.i(TAG, "ACCEPT ack — dismiss shade only room=${info.roomId}")
                    IncomingCallStyleModule.stopRingtoneAndDismiss(app, info.roomId)
                    return true
                }
                return false
            }
        }
        return false
    }

    private fun parseFromDataMap(data: Map<String, String>): CallInfo? {
        // Primary: data.payload = JSON { type, content }
        data["payload"]?.let { raw ->
            parsePayloadJson(raw)?.let { return it }
        }

        // Some servers put JSON under "body" / "message" / "data"
        for (key in listOf("data", "body", "message", "content")) {
            val raw = data[key] ?: continue
            if (!raw.startsWith("{")) continue
            try {
                val obj = JSONObject(raw)
                val nested = obj.optString("payload", "")
                if (nested.isNotEmpty()) {
                    parsePayloadJson(nested)?.let { return it }
                }
                parseRootJson(obj)?.let { return it }
            } catch (_: Exception) {
            }
        }

        // Flat: type + content (content may be JSON string)
        val type = data["type"] ?: ""
        if (type.isNotEmpty()) {
            val contentRaw = data["content"]
            if (!contentRaw.isNullOrEmpty()) {
                try {
                    val content = JSONObject(contentRaw)
                    return callInfoFrom(type, content)
                } catch (_: Exception) {
                }
            }
            val roomId = data["roomId"] ?: data["room_id"] ?: ""
            if (roomId.isNotEmpty() && (type == "call" || type == "incoming_call")) {
                return CallInfo(
                    type = type,
                    roomId = roomId,
                    callId = data["callId"] ?: data["call_id"] ?: "",
                    callType = data["callType"] ?: data["call_type"] ?: "audio",
                    displayName = data["displayName"] ?: data["name"] ?: "Incoming Call",
                    senderId = data["senderId"] ?: data["callerId"] ?: "",
                    profileImage = data["profileImage"] ?: data["profileImageUrl"] ?: "",
                )
            }
            if (isCallRelated(type)) {
                return CallInfo(type = type, roomId = roomId)
            }
        }

        // Last resort: scan string values for JSON containing type=call
        for ((_, value) in data) {
            if (value.startsWith("{") && value.contains("\"type\"")) {
                parsePayloadJson(value)?.let { return it }
            }
        }
        return null
    }

    private fun parseFromBundle(extras: Bundle): CallInfo? {
        val map = HashMap<String, String>()
        for (key in extras.keySet()) {
            val value = extras.get(key) ?: continue
            when (value) {
                is String -> map[key] = value
                is ByteArray -> map[key] = String(value)
                else -> map[key] = value.toString()
            }
        }
        // FCM sometimes nests custom data; also check google.* stripped keys
        return parseFromDataMap(map)
    }

    private fun parsePayloadJson(raw: String): CallInfo? {
        return try {
            var text = raw.trim()
            // Double-encoded: "{\"type\":\"call\",...}"
            if (text.startsWith("\"") && text.endsWith("\"")) {
                text = JSONObject("{\"v\":$text}").getString("v")
            }
            parseRootJson(JSONObject(text))
        } catch (e: Exception) {
            Log.w(TAG, "payload JSON parse failed: ${e.message}")
            null
        }
    }

    private fun parseRootJson(root: JSONObject): CallInfo? {
        val type = root.optString("type", "")
        if (type.isEmpty()) return null
        if (!isCallRelated(type)) return null
        val content = root.optJSONObject("content") ?: root
        return callInfoFrom(type, content)
    }

    private fun callInfoFrom(type: String, content: JSONObject): CallInfo {
        return CallInfo(
            type = type,
            roomId = content.optString("roomId", content.optString("room_id", "")),
            callId = content.optString("callId", content.optString("call_id", "")),
            callType = content.optString("callType", content.optString("call_type", "audio")),
            displayName = content.optString(
                "displayName",
                content.optString("name", content.optString("callerName", "Incoming Call")),
            ),
            senderId = content.optString(
                "senderId",
                content.optString("callerId", content.optString("sender_id", "")),
            ),
            profileImage = content.optString(
                "profileImage",
                content.optString("profileImageUrl", content.optString("profile_image", "")),
            ),
        )
    }
}
