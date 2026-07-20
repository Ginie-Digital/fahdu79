package com.fahdu

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import androidx.core.app.Person
import androidx.core.graphics.drawable.IconCompat
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.concurrent.Executors

/**
 * WhatsApp-style Android CallStyle incoming-call notification
 * (circular Accept / Reject) for kill / background / foreground.
 *
 * Ringtone: looping MediaPlayer (USAGE_NOTIFICATION_RINGTONE).
 * Display can run from FCM BroadcastReceiver without waiting for JS.
 */
class IncomingCallStyleModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "IncomingCallStyle"
        /** Bump when channel sound/attrs change — Android never updates existing channels. */
        const val CHANNEL_ID = "fahdu_incoming_calls_v3"
        const val NOTIFICATION_ID_BASE = 71001
        const val ACTION_ACCEPT = "com.fahdu.ACTION_CALL_ACCEPT"
        const val ACTION_DECLINE = "com.fahdu.ACTION_CALL_DECLINE"
        const val ACTION_OPEN = "com.fahdu.ACTION_CALL_OPEN"
        const val EXTRA_ROOM_ID = "roomId"
        const val EXTRA_CALL_ID = "callId"
        const val EXTRA_CALL_TYPE = "callType"
        const val EXTRA_DISPLAY_NAME = "displayName"
        const val EXTRA_SENDER_ID = "senderId"
        const val EXTRA_PROFILE_IMAGE = "profileImage"
        const val EXTRA_ACTION = "callAction"
        const val PREFS = "fahdu_incoming_call_style"
        const val PREF_PENDING_ACTION = "pending_call_action_json"
        private const val ENDED_TTL_CALL_MS = 5 * 60 * 1000L
        /** Short room TTL — longer values blocked the next call to the same chat. */
        private const val ENDED_TTL_ROOM_MS = 5 * 1000L

        private val ringtoneExecutor = Executors.newSingleThreadExecutor()
        private val mainHandler = Handler(Looper.getMainLooper())

        @Volatile
        private var reactAppContext: ReactApplicationContext? = null

        @Volatile
        private var ringtonePlayer: MediaPlayer? = null

        @Volatile
        private var audioFocusRequest: AudioFocusRequest? = null

        @Volatile
        private var ringtoneWakeLock: PowerManager.WakeLock? = null

        @Volatile
        private var activeRoomId: String? = null

        @Volatile
        private var obsoleteChannelsCleaned = false

        private fun ringtoneAudioAttributes(): AudioAttributes =
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

        private fun acquireRingtoneWakeLock(context: Context) {
            try {
                ringtoneWakeLock?.let { if (it.isHeld) it.release() }
            } catch (_: Exception) {
            }
            ringtoneWakeLock = null
            try {
                val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
                val wl = pm.newWakeLock(
                    PowerManager.PARTIAL_WAKE_LOCK,
                    "fahdu:incoming_call_ringtone",
                )
                wl.setReferenceCounted(false)
                wl.acquire(90_000L)
                ringtoneWakeLock = wl
            } catch (e: Exception) {
                android.util.Log.w(NAME, "wakeLock failed: ${e.message}")
            }
        }

        private fun releaseRingtoneWakeLock() {
            try {
                ringtoneWakeLock?.let { if (it.isHeld) it.release() }
            } catch (_: Exception) {
            }
            ringtoneWakeLock = null
        }

        fun startRingtone(context: Context) {
            val appContext = context.applicationContext
            // Never block notification display / FCM receiver on MediaPlayer.prepare().
            ringtoneExecutor.execute {
                stopRingtoneSync(appContext)
                try {
                    acquireRingtoneWakeLock(appContext)

                    val am = appContext.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT)
                            .setAudioAttributes(ringtoneAudioAttributes())
                            .setOnAudioFocusChangeListener { }
                            .build()
                        audioFocusRequest = req
                        am.requestAudioFocus(req)
                    } else {
                        @Suppress("DEPRECATION")
                        am.requestAudioFocus(
                            null,
                            AudioManager.STREAM_RING,
                            AudioManager.AUDIOFOCUS_GAIN_TRANSIENT,
                        )
                    }

                    val player = MediaPlayer()
                    player.setAudioAttributes(ringtoneAudioAttributes())
                    player.setWakeMode(appContext, PowerManager.PARTIAL_WAKE_LOCK)
                    player.setDataSource(
                        appContext,
                        Uri.parse("android.resource://${appContext.packageName}/${R.raw.call}"),
                    )
                    player.isLooping = true
                    player.prepare()
                    player.start()
                    ringtonePlayer = player
                } catch (e: Exception) {
                    android.util.Log.w(NAME, "startRingtone failed: ${e.message}")
                    stopRingtoneSync(appContext)
                }
            }
        }

        fun stopRingtone(context: Context? = null) {
            val appContext = context?.applicationContext ?: reactAppContext
            ringtoneExecutor.execute {
                stopRingtoneSync(appContext)
            }
        }

        private fun stopRingtoneSync(context: Context?) {
            try {
                ringtonePlayer?.let { player ->
                    try {
                        if (player.isPlaying) player.stop()
                    } catch (_: Exception) {
                    }
                    try {
                        player.release()
                    } catch (_: Exception) {
                    }
                }
            } catch (_: Exception) {
            } finally {
                ringtonePlayer = null
            }

            if (context != null) {
                try {
                    val am = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                        audioFocusRequest?.let { am.abandonAudioFocusRequest(it) }
                    } else {
                        @Suppress("DEPRECATION")
                        am.abandonAudioFocus(null)
                    }
                } catch (_: Exception) {
                }
            }
            audioFocusRequest = null
            releaseRingtoneWakeLock()
        }

        fun emitAction(action: String, extras: Bundle?) {
            val ctx = reactAppContext ?: return
            if (!ctx.hasActiveReactInstance()) return
            try {
                val map = Arguments.createMap()
                map.putString("action", action)
                extras?.keySet()?.forEach { key ->
                    val value = extras.get(key)
                    if (value is String) map.putString(key, value)
                }
                ctx
                    .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("IncomingCallStyleAction", map)
            } catch (_: Exception) {
            }
        }

        fun savePendingAction(context: Context, action: String, extras: Bundle?) {
            val json = org.json.JSONObject()
            json.put("action", action)
            extras?.keySet()?.forEach { key ->
                val value = extras.get(key)
                if (value is String) json.put(key, value)
            }
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(PREF_PENDING_ACTION, json.toString())
                .apply()
        }

        fun notificationIdFor(roomId: String): Int {
            return NOTIFICATION_ID_BASE + (roomId.hashCode() and 0x0FFF)
        }

        /** Native ended stamp so late duplicate FCM cannot re-ring after cancel (JS may not have booted). */
        fun markCallEnded(context: Context, roomId: String, callId: String = "") {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            val edit = prefs.edit().remove(PREF_PENDING_ACTION)
            if (callId.isNotEmpty()) {
                edit.putLong("ended_call_$callId", now)
            }
            if (roomId.isNotEmpty()) {
                edit.putLong("ended_room_$roomId", now)
            }
            edit.apply()
            if (activeRoomId == roomId) activeRoomId = null
        }

        fun wasCallEndedRecently(context: Context, roomId: String, callId: String = ""): Boolean {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            // Prefer callId: room stamps must not block a new invite to the same room.
            if (callId.isNotEmpty()) {
                val t = prefs.getLong("ended_call_$callId", 0L)
                return t > 0 && now - t < ENDED_TTL_CALL_MS
            }
            if (roomId.isNotEmpty()) {
                val t = prefs.getLong("ended_room_$roomId", 0L)
                if (t > 0 && now - t < ENDED_TTL_ROOM_MS) return true
            }
            return false
        }

        private fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (!obsoleteChannelsCleaned) {
                obsoleteChannelsCleaned = true
                try {
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v2")
                    nm.deleteNotificationChannel("incoming_calls")
                } catch (_: Exception) {
                }
            }

            if (nm.getNotificationChannel(CHANNEL_ID) != null) return

            val channel = NotificationChannel(
                CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Incoming voice and video calls"
                enableVibration(true)
                vibrationPattern = longArrayOf(0, 300, 200, 300, 200, 300)
                setBypassDnd(true)
                enableLights(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                val soundUri = Uri.parse("android.resource://${context.packageName}/${R.raw.call}")
                setSound(soundUri, ringtoneAudioAttributes())
            }
            nm.createNotificationChannel(channel)
        }

        /**
         * Show CallStyle notification from any Context (FCM receiver or RN module).
         * Returns true if posted.
         */
        @JvmStatic
        fun displayFromContext(
            context: Context,
            roomId: String,
            callId: String = "",
            callType: String = "audio",
            displayName: String = "Incoming Call",
            senderId: String = "",
            profileImage: String = "",
        ): Boolean {
            if (roomId.isEmpty()) return false
            val appContext = context.applicationContext

            try {
                // New callId → clear room-ended stamp BEFORE the skip check,
                // otherwise a prior cancel blocks the next call for ENDED_TTL_ROOM_MS.
                if (callId.isNotEmpty()) {
                    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit()
                        .remove("ended_room_$roomId")
                        .apply()
                }

                // Only skip the exact same ended callId — never block a new ring when killed.
                if (callId.isNotEmpty() && wasCallEndedRecently(appContext, roomId, callId)) {
                    android.util.Log.i(NAME, "Skip display — same callId recently ended callId=$callId")
                    return false
                }

                // Same call already ringing — refresh notification only, don't restart audio.
                val alreadyRinging =
                    activeRoomId == roomId &&
                        ringtonePlayer?.isPlaying == true

                // Do NOT wipe pending Accept/Decline when refreshing an already-showing call.
                if (!alreadyRinging) {
                    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit()
                        .remove(PREF_PENDING_ACTION)
                        .apply()
                }

                // Persist ringing call so cold-start JS can recover after kill-mode Accept.
                try {
                    val ringing = org.json.JSONObject()
                        .put("roomId", roomId)
                        .put("callId", callId)
                        .put("callType", callType)
                        .put("displayName", displayName)
                        .put("senderId", senderId)
                        .put("profileImage", profileImage)
                        .put("status", "PENDING")
                        .put("savedAt", System.currentTimeMillis())
                    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit()
                        .putString("ringing_call_json", ringing.toString())
                        .apply()
                } catch (_: Exception) {
                }

                ensureChannel(appContext)

                val extras = Bundle().apply {
                    putString(EXTRA_ROOM_ID, roomId)
                    putString(EXTRA_CALL_ID, callId)
                    putString(EXTRA_CALL_TYPE, callType)
                    putString(EXTRA_DISPLAY_NAME, displayName)
                    putString(EXTRA_SENDER_ID, senderId)
                    putString(EXTRA_PROFILE_IMAGE, profileImage)
                }

                val declinePi = PendingIntent.getBroadcast(
                    appContext,
                    roomId.hashCode() + 1,
                    Intent(appContext, IncomingCallActionReceiver::class.java).apply {
                        action = ACTION_DECLINE
                        putExtras(extras)
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val acceptPi = PendingIntent.getActivity(
                    appContext,
                    roomId.hashCode() + 2,
                    Intent(appContext, MainActivity::class.java).apply {
                        action = ACTION_ACCEPT
                        putExtras(extras)
                        putExtra(EXTRA_ACTION, "accept_call")
                        addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP,
                        )
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val openPi = PendingIntent.getActivity(
                    appContext,
                    roomId.hashCode() + 3,
                    Intent(appContext, MainActivity::class.java).apply {
                        action = ACTION_OPEN
                        putExtras(extras)
                        putExtra(EXTRA_ACTION, "default")
                        addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP,
                        )
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val caller = Person.Builder()
                    .setName(displayName)
                    .setImportant(true)
                    .build()

                val callTypeLabel =
                    if (callType == "video") "Incoming video call" else "Incoming voice call"
                val notifId = notificationIdFor(roomId)

                val builder = NotificationCompat.Builder(appContext, CHANNEL_ID)
                    .setSmallIcon(R.drawable.icon_notification)
                    .setContentTitle(displayName)
                    .setContentText(callTypeLabel)
                    .setCategory(NotificationCompat.CATEGORY_CALL)
                    .setPriority(NotificationCompat.PRIORITY_MAX)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setOngoing(true)
                    .setAutoCancel(false)
                    .setContentIntent(openPi)
                    .setColor(0xFF10B981.toInt())
                    .addPerson(caller)
                    .setSound(
                        Uri.parse("android.resource://${appContext.packageName}/${R.raw.call}"),
                    )
                    // Post immediately — do not wait for large icon download / JS.
                    .setOnlyAlertOnce(alreadyRinging)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // WhatsApp-like CallStyle (circular). Some OEMs demote CallStyle
                    // without Telecom — always add classic actions as a fallback too.
                    builder.setStyle(
                        NotificationCompat.CallStyle.forIncomingCall(caller, declinePi, acceptPi),
                    )
                }
                // Always attach Accept/Reject actions so buttons remain visible even
                // when CallStyle is demoted to a plain heads-up notification.
                builder
                    .addAction(
                        NotificationCompat.Action.Builder(
                            IconCompat.createWithResource(appContext, R.drawable.ic_call_reject),
                            "Reject",
                            declinePi,
                        ).build(),
                    )
                    .addAction(
                        NotificationCompat.Action.Builder(
                            IconCompat.createWithResource(appContext, R.drawable.ic_call_accept),
                            "Accept",
                            acceptPi,
                        ).build(),
                    )

                // MUST notify on the current thread. mainHandler.post + FCM
                // goAsync().finish() races and drops Accept/Reject when killed.
                val nm =
                    appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                nm.notify(notifId, builder.build())
                activeRoomId = roomId
                if (!alreadyRinging) {
                    startRingtone(appContext)
                }
                android.util.Log.i(NAME, "Posted CallStyle Accept/Reject id=$notifId room=$roomId")
                return true
            } catch (e: Exception) {
                android.util.Log.e(NAME, "displayFromContext failed: ${e.message}", e)
                return false
            }
        }

        @JvmStatic
        fun cancelFromContext(context: Context, roomId: String, callId: String = "") {
            val appContext = context.applicationContext
            stopRingtone(appContext)
            markCallEnded(appContext, roomId, callId)
            dismissShadeOnly(appContext, roomId)
        }

        /** Remove CallStyle shade only — keep ringtone / do not stamp ended. */
        @JvmStatic
        fun dismissShadeOnly(context: Context, roomId: String) {
            if (roomId.isEmpty()) return
            val appContext = context.applicationContext
            val nm =
                appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.cancel(notificationIdFor(roomId))
            if (activeRoomId == roomId) activeRoomId = null
        }
    }

    init {
        reactAppContext = reactContext
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun addListener(eventName: String) {
        // NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // NativeEventEmitter
    }

    @ReactMethod
    fun isCallStyleSupported(promise: Promise) {
        promise.resolve(Build.VERSION.SDK_INT >= Build.VERSION_CODES.S)
    }

    @ReactMethod
    fun displayIncomingCall(details: ReadableMap, promise: Promise) {
        try {
            val roomId = details.getString("roomId") ?: ""
            if (roomId.isEmpty()) {
                promise.reject("NO_ROOM", "roomId required")
                return
            }

            val ok = displayFromContext(
                reactContext,
                roomId = roomId,
                callId = details.getString("callId") ?: "",
                callType = details.getString("callType") ?: "audio",
                displayName = details.getString("displayName")
                    ?: details.getString("name")
                    ?: "Incoming Call",
                senderId = details.getString("senderId")
                    ?: details.getString("callerId")
                    ?: "",
                profileImage = details.getString("profileImage")
                    ?: details.getString("profileImageUrl")
                    ?: "",
            )
            if (ok) promise.resolve(true) else promise.reject("DISPLAY_FAILED", "notify failed")
        } catch (e: Exception) {
            promise.reject("DISPLAY_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun cancelIncomingCall(roomId: String, promise: Promise) {
        try {
            cancelFromContext(reactContext, roomId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun dismissShadeOnlyJs(roomId: String, promise: Promise) {
        try {
            Companion.dismissShadeOnly(reactContext, roomId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("DISMISS_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun stopRingtoneJs(promise: Promise) {
        try {
            stopRingtone(reactContext)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_RING_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun consumePendingAction(promise: Promise) {
        try {
            val prefs = reactContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val raw = prefs.getString(PREF_PENDING_ACTION, null)
            prefs.edit().remove(PREF_PENDING_ACTION).apply()
            if (raw.isNullOrEmpty()) {
                promise.resolve(null)
                return
            }
            val json = org.json.JSONObject(raw)
            val map: WritableMap = Arguments.createMap()
            json.keys().forEach { key ->
                map.putString(key, json.optString(key))
            }
            promise.resolve(map)
        } catch (e: Exception) {
            promise.reject("CONSUME_FAILED", e.message, e)
        }
    }
}
