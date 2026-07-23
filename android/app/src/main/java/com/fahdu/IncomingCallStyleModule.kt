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
import java.util.concurrent.atomic.AtomicInteger

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
        // v13 = channel sound + MediaPlayer = double/echo ringtone (bad).
        // v14 = SILENT channel + ONE MediaPlayer loop (same IncomingCall.wav as call screen).
        const val CHANNEL_ID = "fahdu_incoming_calls_v14"
        const val NOTIFICATION_ID_BASE = 71014
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
        /** Embedded JWT so Decline/Answer work when JS/storage is unavailable. */
        const val EXTRA_AUTH_TOKEN = "authToken"
        const val PREFS = "fahdu_incoming_call_style"
        const val PREF_PENDING_ACTION = "pending_call_action_json"
        private const val ENDED_TTL_CALL_MS = 5 * 60 * 1000L
        /**
         * Room-level stamp is only for tiny duplicate-FCM window.
         * Never block the next invite to the same chat (same roomId, new callId).
         */
        private const val ENDED_TTL_ROOM_MS = 3_000L
        /** Hard cap — looping MediaPlayer must not ring forever in background. */
        private const val RINGTONE_MAX_MS = 45_000L

        private val ringtoneExecutor = Executors.newSingleThreadExecutor()
        private val mainHandler = Handler(Looper.getMainLooper())
        /** Invalidates in-flight prepare() so Accept cannot lose to a late start. */
        private val ringtoneGeneration = AtomicInteger(0)
        private val ringtoneLock = Any()
        private var ringtoneAutoStop: Runnable? = null

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

        /** True while JS IncomingCall screen owns UX — never start MediaPlayer. */
        @Volatile
        private var inAppIncomingUi = false

        /** After Accept/Reject — block any late FCM/handoff from re-starting ring. */
        @Volatile
        private var ringtoneSuppressedUntilMs: Long = 0L
        /** Call that Accept/Reject silenced — only this callId is blocked. */
        private var suppressedCallId: String = ""
        private var suppressedRoomId: String = ""

        /** Rooms currently starting/playing — prevents FCM+JS double start. */
        private val ringingRoomIds = java.util.Collections.synchronizedSet(mutableSetOf<String>())

        /**
         * Mark that IncomingCall screen owns UX (block NEW native starts).
         * By default does NOT stop an already-playing MediaPlayer — notification
         * body tap must keep the same ringtone continuous.
         * Pass stopNativeRing=true only when intentionally switching to JS audio
         * or silencing (Accept/Reject use stopAndSuppress instead).
         */
        @JvmStatic
        @JvmOverloads
        fun setInAppIncomingUi(active: Boolean, stopNativeRing: Boolean = false) {
            inAppIncomingUi = active
            if (active && stopNativeRing) {
                stopRingtone(reactAppContext)
            }
        }

        /** True while looping MediaPlayer is audibly ringing. */
        @JvmStatic
        fun isRingtonePlaying(): Boolean {
            return try {
                ringtonePlayer?.isPlaying == true
            } catch (_: Exception) {
                false
            }
        }

        @JvmStatic
        fun suppressRingtone(ms: Long = 5_000L, roomId: String = "", callId: String = "") {
            // Short window only — long suppress blocked the NEXT call's CallStyle.
            ringtoneSuppressedUntilMs = System.currentTimeMillis() + ms
            if (roomId.isNotEmpty()) suppressedRoomId = roomId
            if (callId.isNotEmpty()) suppressedCallId = callId
            android.util.Log.i(NAME, "Ringtone suppressed for ${ms}ms room=$roomId callId=$callId")
        }

        @JvmStatic
        fun clearRingtoneSuppress() {
            ringtoneSuppressedUntilMs = 0L
            suppressedCallId = ""
            suppressedRoomId = ""
            android.util.Log.i(NAME, "Ringtone suppress cleared")
        }

        private fun isRingtoneSuppressed(): Boolean =
            System.currentTimeMillis() < ringtoneSuppressedUntilMs

        /** True when THIS invite was Accepted/Rejected — never re-ring the same callId. */
        private fun isSuppressedForCall(roomId: String, callId: String): Boolean {
            if (!isRingtoneSuppressed()) return false
            // Only the exact same callId is blocked. Same room + new call → always allow.
            if (callId.isNotEmpty() && suppressedCallId.isNotEmpty()) {
                return callId == suppressedCallId
            }
            return false
        }

        private fun ringtoneAudioAttributes(): AudioAttributes =
            // RINGTONE usage → plays on ringer stream in BG/kill (CallStyle shade).
            AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .build()

        /** Same asset as JS `Assets/IncomingCall.wav` — one tone for BG + call screen. */
        private fun ringtoneUri(context: Context): Uri {
            val pkg = context.packageName
            val wavId = context.resources.getIdentifier("assets_incomingcall", "raw", pkg)
            if (wavId != 0) {
                return Uri.parse("android.resource://$pkg/$wavId")
            }
            val callId = context.resources.getIdentifier("call", "raw", pkg)
            if (callId != 0) {
                return Uri.parse("android.resource://$pkg/$callId")
            }
            return Uri.parse("android.resource://$pkg/${R.raw.assets_incomingcall}")
        }

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
                wl.acquire(RINGTONE_MAX_MS + 5_000L)
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

        private fun cancelRingtoneAutoStop() {
            ringtoneAutoStop?.let { mainHandler.removeCallbacks(it) }
            ringtoneAutoStop = null
        }

        private fun scheduleRingtoneAutoStop(context: Context, gen: Int) {
            cancelRingtoneAutoStop()
            val appContext = context.applicationContext
            val stop = Runnable {
                if (ringtoneGeneration.get() != gen) return@Runnable
                android.util.Log.i(NAME, "Auto-stopping ringtone after ${RINGTONE_MAX_MS}ms")
                stopRingtone(appContext)
            }
            ringtoneAutoStop = stop
            mainHandler.postDelayed(stop, RINGTONE_MAX_MS)
        }

        fun startRingtone(context: Context, ignoreInAppUi: Boolean = false) {
            // In-app IncomingCall owns FG audio — unless BG handoff forces native ring.
            if (inAppIncomingUi && !ignoreInAppUi) {
                android.util.Log.i(NAME, "startRingtone skipped — in-app IncomingCall UI active")
                return
            }
            if (isRingtoneSuppressed()) {
                android.util.Log.i(NAME, "startRingtone skipped — suppressed after Accept/Reject")
                return
            }
            // Already audible — never restart (notif refresh / duplicate FCM must not re-seek).
            if (isRingtonePlaying()) {
                android.util.Log.i(NAME, "startRingtone skipped — already playing")
                return
            }
            if (ignoreInAppUi) {
                inAppIncomingUi = false
            }
            val appContext = context.applicationContext
            val gen = ringtoneGeneration.incrementAndGet()
            cancelRingtoneAutoStop()

            val runStart = Runnable {
                // Re-check inside executor — another start may have won the race.
                if (isRingtonePlaying()) {
                    android.util.Log.i(NAME, "startRingtone aborted — already playing before prepare")
                    return@Runnable
                }
                synchronized(ringtoneLock) {
                    stopRingtoneSync(appContext)
                }
                if (ringtoneGeneration.get() != gen) {
                    android.util.Log.i(NAME, "startRingtone aborted — generation stale before prepare")
                    return@Runnable
                }
                var player: MediaPlayer? = null
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

                    val uri = ringtoneUri(appContext)
                    android.util.Log.i(NAME, "startRingtone prepare uri=$uri gen=$gen sync=$ignoreInAppUi")
                    player = MediaPlayer()
                    player.setAudioAttributes(ringtoneAudioAttributes())
                    player.setWakeMode(appContext, PowerManager.PARTIAL_WAKE_LOCK)
                    player.setDataSource(appContext, uri)
                    player.isLooping = true
                    player.setVolume(1f, 1f)
                    player.prepare()

                    synchronized(ringtoneLock) {
                        if (ringtoneGeneration.get() != gen) {
                            android.util.Log.i(NAME, "startRingtone aborted — stopped during prepare")
                            try {
                                player.release()
                            } catch (_: Exception) {
                            }
                            releaseRingtoneWakeLock()
                            return@Runnable
                        }
                        player.start()
                        if (ringtoneGeneration.get() != gen) {
                            android.util.Log.i(NAME, "startRingtone aborted — stopped right after start")
                            try {
                                if (player.isPlaying) player.stop()
                            } catch (_: Exception) {
                            }
                            try {
                                player.release()
                            } catch (_: Exception) {
                            }
                            releaseRingtoneWakeLock()
                            return@Runnable
                        }
                        ringtonePlayer = player
                        android.util.Log.i(NAME, "startRingtone PLAYING gen=$gen")
                    }
                    scheduleRingtoneAutoStop(appContext, gen)
                } catch (e: Exception) {
                    android.util.Log.e(NAME, "startRingtone failed: ${e.message}", e)
                    try {
                        player?.release()
                    } catch (_: Exception) {
                    }
                    synchronized(ringtoneLock) {
                        stopRingtoneSync(appContext)
                    }
                }
            }

            // BG/kill/Home: start INLINE so audio begins before FCM/JS returns.
            // Async executor was losing the race — process restricted before prepare().
            if (ignoreInAppUi) {
                runStart.run()
            } else {
                ringtoneExecutor.execute(runStart)
            }
        }

        fun stopRingtone(context: Context? = null) {
            // Invalidate any in-flight prepare/start so it cannot resume after Accept.
            ringtoneGeneration.incrementAndGet()
            cancelRingtoneAutoStop()
            ringingRoomIds.clear()
            val appContext = context?.applicationContext ?: reactAppContext
            // IMMEDIATE sync kill — do not wait for executor (Accept must silence NOW).
            synchronized(ringtoneLock) {
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
            val emitOnce = {
                val ctx = reactAppContext
                if (ctx == null || !ctx.hasActiveReactInstance()) {
                    false
                } else {
                    try {
                        val map = Arguments.createMap()
                        map.putString("action", action)
                        extras?.keySet()?.forEach { key ->
                            val value = extras.get(key)
                            when (value) {
                                is String -> map.putString(key, value)
                                is Int -> map.putString(key, value.toString())
                                is Long -> map.putString(key, value.toString())
                                is Boolean -> map.putString(key, value.toString())
                                else -> if (value != null) map.putString(key, value.toString())
                            }
                        }
                        ctx
                            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                            .emit("IncomingCallStyleAction", map)
                        android.util.Log.i(NAME, "emitAction ok action=$action room=${extras?.getString(EXTRA_ROOM_ID)}")
                        true
                    } catch (e: Exception) {
                        android.util.Log.e(NAME, "emitAction failed: ${e.message}", e)
                        false
                    }
                }
            }

            if (emitOnce()) return

            // React not ready yet (BG→FG tap) — retry a few times; pending JSON is also saved.
            android.util.Log.w(NAME, "emitAction deferred — React not ready, will retry")
            var tries = 0
            val retry = object : Runnable {
                override fun run() {
                    tries += 1
                    if (emitOnce() || tries >= 20) return
                    mainHandler.postDelayed(this, 250)
                }
            }
            mainHandler.postDelayed(retry, 250)
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
            // Stamp callId only — room stamp blocked the NEXT call to same chat.
            if (callId.isNotEmpty()) {
                edit.putLong("ended_call_$callId", now)
            }
            edit.apply()
            if (activeRoomId == roomId) activeRoomId = null
        }

        fun wasCallEndedRecently(context: Context, roomId: String, callId: String = ""): Boolean {
            val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            val now = System.currentTimeMillis()
            // Only callId blocks — room stamps must never hide the next CallStyle invite.
            if (callId.isNotEmpty()) {
                val t = prefs.getLong("ended_call_$callId", 0L)
                return t > 0 && now - t < ENDED_TTL_CALL_MS
            }
            return false
        }

        private fun ensureChannel(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            if (!obsoleteChannelsCleaned) {
                obsoleteChannelsCleaned = true
                try {
                    // v13 had channel sound overlapping MediaPlayer → echo/double ring.
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v13")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v12")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v11")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v10")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v9")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v8")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v7")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v6")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v5")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v4")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v3")
                    nm.deleteNotificationChannel("fahdu_incoming_calls_v2")
                    nm.deleteNotificationChannel("incoming_calls")
                } catch (_: Exception) {
                }
            }

            if (nm.getNotificationChannel(CHANNEL_ID) != null) return

            // SILENT channel — MediaPlayer is the ONLY ringtone (no channel+MP echo).
            // IMPORTANCE_HIGH + CallStyle still heads-up without channel audio.
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Incoming Calls",
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Incoming voice and video calls"
                enableVibration(false)
                vibrationPattern = null
                setBypassDnd(true)
                enableLights(true)
                lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
                setSound(null, null)
            }
            nm.createNotificationChannel(channel)
        }

        /** True while MainActivity is resumed (user visibly using the app). */
        @Volatile
        private var mainActivityResumed = false

        @JvmStatic
        fun setMainActivityResumed(resumed: Boolean) {
            mainActivityResumed = resumed
            android.util.Log.i(NAME, "mainActivityResumed=$resumed")
            // Do NOT set inAppIncomingUi=true on resume — that blocked native ring
            // whenever the app was open (vibrate-only bug). JS IncomingCall /
            // RingtoneManager owns that flag.
            if (!resumed) {
                // User left the app — allow native CallStyle + ringtone for BG invites.
                inAppIncomingUi = false
            }
        }

        @JvmStatic
        fun isMainActivityResumed(): Boolean = mainActivityResumed

        /** JS sync — AppState is wrong after FCM wake; use Activity resume instead. */
        @JvmStatic
        fun isMainActivityResumedForJs(): Boolean = mainActivityResumed

        /**
         * True only when MainActivity is resumed (user can see the app).
         * Never use process importance — FCM / BroadcastReceiver wake a killed
         * process as IMPORTANCE_FOREGROUND even with no Activity on screen.
         */
        @JvmStatic
        fun isAppInForeground(context: Context): Boolean {
            return mainActivityResumed
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
            force: Boolean = false,
            /** Default TRUE for kill/BG FCM — MediaPlayer is the BG ringtone. */
            playRingtone: Boolean = true,
        ): Boolean {
            if (roomId.isEmpty()) return false
            val appContext = context.applicationContext

            try {
                // BG/kill incoming (force=true): ALWAYS show CallStyle for every ring.
                // Never skip on inAppIncomingUi — that blocked kill/BG Accept/Reject.
                // JS hides the shade only when IncomingCall is truly foreground-visible.
                if (force) {
                    clearRingtoneSuppress()
                    inAppIncomingUi = false
                    ringingRoomIds.clear()
                    if (roomId.isNotEmpty()) {
                        appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                            .edit()
                            .remove("ended_room_$roomId")
                            .apply()
                    }
                    // New ring from caller — clear ended stamp for this callId too so
                    // a reused callId still shows Decline/Answer again.
                    if (callId.isNotEmpty()) {
                        appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                            .edit()
                            .remove("ended_call_$callId")
                            .apply()
                    }
                    // Duplicate FCM only (same callId within 2s while already ringing).
                    val playingSame =
                        activeRoomId == roomId &&
                            isRingtonePlaying() &&
                            callId.isNotEmpty()
                    if (playingSame) {
                        android.util.Log.i(NAME, "CallStyle refresh (already ringing) room=$roomId")
                    }
                } else {
                    if (callId.isEmpty() || suppressedCallId.isEmpty() || callId != suppressedCallId) {
                        clearRingtoneSuppress()
                    }
                    if (isSuppressedForCall(roomId, callId)) {
                        android.util.Log.i(NAME, "Skip CallStyle — same callId suppressed callId=$callId")
                        return false
                    }
                    // Soft path only: if IncomingCall already owns true FG UX, skip shade.
                    if (inAppIncomingUi && isMainActivityResumed()) {
                        android.util.Log.i(NAME, "Skip CallStyle — in-app IncomingCall UI active")
                        return true
                    }
                    if (callId.isNotEmpty() && wasCallEndedRecently(appContext, roomId, callId)) {
                        android.util.Log.i(NAME, "Skip display — same callId recently ended callId=$callId")
                        return false
                    }
                }

                if (roomId.isNotEmpty()) {
                    appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit()
                        .remove("ended_room_$roomId")
                        .apply()
                }

                // Same call already ringing — refresh notification only, don't restart audio.
                val alreadyRinging =
                    activeRoomId == roomId && isRingtonePlaying()

                // Keep pending Accept / body-tap / foreground_open for THIS room.
                // Only drop pending when a different room's invite arrives.
                if (!alreadyRinging) {
                    try {
                        val prefs = appContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        val raw = prefs.getString(PREF_PENDING_ACTION, null)
                        if (raw != null) {
                            val pendingRoom =
                                org.json.JSONObject(raw).optString(EXTRA_ROOM_ID, "")
                            if (pendingRoom.isNotEmpty() && pendingRoom != roomId) {
                                prefs.edit().remove(PREF_PENDING_ACTION).apply()
                            }
                        }
                    } catch (_: Exception) {
                    }
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

                val nm =
                    appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && !nm.areNotificationsEnabled()) {
                    android.util.Log.e(
                        NAME,
                        "Notifications DISABLED at app level — CallStyle may be invisible room=$roomId",
                    )
                }

                // Bake auth into PendingIntent — Decline/Answer must hit API without JS.
                val authForExtras = IncomingCallApi.readAuthToken(appContext)
                val extras = Bundle().apply {
                    putString(EXTRA_ROOM_ID, roomId)
                    putString(EXTRA_CALL_ID, callId)
                    putString(EXTRA_CALL_TYPE, callType)
                    putString(EXTRA_DISPLAY_NAME, displayName)
                    putString(EXTRA_SENDER_ID, senderId)
                    putString(EXTRA_PROFILE_IMAGE, profileImage)
                    if (!authForExtras.isNullOrBlank()) {
                        putString(EXTRA_AUTH_TOKEN, authForExtras)
                    }
                }

                // Unique request codes per callId so each invite gets fresh Accept/Decline intents.
                val reqSeed =
                    if (callId.isNotEmpty()) callId.hashCode() else roomId.hashCode()

                val declinePi = PendingIntent.getBroadcast(
                    appContext,
                    reqSeed + 1,
                    Intent(appContext, IncomingCallActionReceiver::class.java).apply {
                        action = ACTION_DECLINE
                        putExtras(extras)
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val acceptPi = PendingIntent.getActivity(
                    appContext,
                    reqSeed + 2,
                    Intent(appContext, MainActivity::class.java).apply {
                        action = ACTION_ACCEPT
                        addCategory(Intent.CATEGORY_DEFAULT)
                        putExtras(extras)
                        putExtra(EXTRA_ACTION, "accept_call")
                        // Duplicate on Intent.action path for OEM extras drops.
                        putExtra("action", "accept_call")
                        addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
                        )
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val openPi = PendingIntent.getActivity(
                    appContext,
                    reqSeed + 3,
                    Intent(appContext, MainActivity::class.java).apply {
                        action = ACTION_OPEN
                        addCategory(Intent.CATEGORY_DEFAULT)
                        putExtras(extras)
                        putExtra(EXTRA_ACTION, "open_incoming_call")
                        putExtra("action", "open_incoming_call")
                        addFlags(
                            Intent.FLAG_ACTIVITY_NEW_TASK or
                                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                                Intent.FLAG_ACTIVITY_REORDER_TO_FRONT,
                        )
                    },
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
                )

                val caller = Person.Builder()
                    .setName(displayName)
                    .setImportant(true)
                    .build()

                val isVideo = callType.equals("video", ignoreCase = true)
                val callTypeLabel =
                    if (isVideo) "Incoming video call" else "Incoming voice call"
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
                    // Locked / killed: full-screen IncomingCall (same Accept/Reject flow).
                    .setFullScreenIntent(openPi, true)
                    .setColor(0xFF10B981.toInt())
                    .addPerson(caller)
                    .setVibrate(longArrayOf(0L))
                    // ONE audio source: MediaPlayer. Channel has no sound.
                    // setSilent(false) → CallStyle heads-up; setOnlyAlertOnce → no re-alert echo.
                    .setSilent(!playRingtone)
                    .setOnlyAlertOnce(true)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // WhatsApp-like: ONLY circular Decline + Answer.
                    // Never addAction() here — that adds the extra "Reject" text chip.
                    val style = NotificationCompat.CallStyle
                        .forIncomingCall(caller, declinePi, acceptPi)
                        .setIsVideo(isVideo)
                    builder.setStyle(style)
                } else {
                    // Pre-12: exactly two actions (no CallStyle API).
                    builder
                        .addAction(
                            NotificationCompat.Action.Builder(
                                IconCompat.createWithResource(appContext, R.drawable.ic_call_reject),
                                "Decline",
                                declinePi,
                            ).build(),
                        )
                        .addAction(
                            NotificationCompat.Action.Builder(
                                IconCompat.createWithResource(appContext, R.drawable.ic_call_accept),
                                "Answer",
                                acceptPi,
                            ).build(),
                        )
                }

                // Never cancel+re-post the same id on first show — OEMs drop heads-up.
                // Only clear legacy 3-button ids; refresh uses notify() + setOnlyAlertOnce.
                try {
                    nm.cancel(71001 + (roomId.hashCode() and 0x0FFF))
                    nm.cancel(71011 + (roomId.hashCode() and 0x0FFF))
                } catch (_: Exception) {
                }
                nm.notify(notifId, builder.build())
                activeRoomId = roomId

                // BG/kill MUST ring: ONE looping MediaPlayer only (channel is silent).
                if (playRingtone) {
                    inAppIncomingUi = false
                    clearRingtoneSuppress()
                    if (!isRingtonePlaying()) {
                        ringingRoomIds.add(roomId)
                        startRingtone(appContext, ignoreInAppUi = true)
                        android.util.Log.i(
                            NAME,
                            "BG ringtone STARTED (MediaPlayer only) room=$roomId video=$isVideo",
                        )
                    } else {
                        android.util.Log.i(NAME, "BG ringtone already playing room=$roomId")
                    }
                } else {
                    android.util.Log.i(NAME, "CallStyle shade only playRingtone=false")
                }
                android.util.Log.i(
                    NAME,
                    "Posted CallStyle id=$notifId room=$roomId video=$isVideo playRingtone=$playRingtone",
                )
                return true
            } catch (e: Exception) {
                android.util.Log.e(NAME, "displayFromContext failed: ${e.message}", e)
                return false
            }
        }

        @JvmStatic
        fun cancelFromContext(context: Context, roomId: String, callId: String = "") {
            val appContext = context.applicationContext
            inAppIncomingUi = false
            suppressRingtone(5_000L, roomId, callId)
            stopRingtone(appContext)
            markCallEnded(appContext, roomId, callId)
            dismissShadeOnly(appContext, roomId)
            stopRingtone(appContext)
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

        /** Stop ringtone + dismiss shade without stamping ENDED (next ring can still show). */
        @JvmStatic
        fun stopRingtoneAndDismiss(context: Context, roomId: String) {
            // Do NOT suppress here — FG IncomingCall uses this then may hand off to BG ring.
            stopRingtone(context)
            dismissShadeOnly(context, roomId)
        }

        /** Accept/Reject — stop forever for this invite (block late FCM re-ring). */
        @JvmStatic
        fun stopAndSuppressRingtone(context: Context, roomId: String = "", callId: String = "") {
            suppressRingtone(5_000L, roomId, callId)
            stopRingtone(context)
            // Stamp callId only — never room stamp (that blocked the next invite for 60s).
            if (callId.isNotEmpty()) {
                try {
                    context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                        .edit()
                        .putLong("ended_call_$callId", System.currentTimeMillis())
                        .apply()
                } catch (_: Exception) {
                }
            }
            if (roomId.isNotEmpty()) {
                dismissShadeOnly(context, roomId)
            }
            stopRingtone(context)
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

    /** Cache JWT so CallStyle Decline/Answer can hit accept/manual without JS. */
    @ReactMethod
    fun cacheAuthToken(token: String?, promise: Promise) {
        try {
            IncomingCallApi.cacheAuthToken(reactContext, token)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CACHE_TOKEN_FAILED", e.message, e)
        }
    }

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun cacheAuthTokenSync(token: String?): Boolean {
        return try {
            IncomingCallApi.cacheAuthToken(reactContext, token)
            true
        } catch (_: Exception) {
            false
        }
    }

    @ReactMethod
    fun setInAppIncomingUi(active: Boolean, promise: Promise) {
        try {
            // Keep existing MediaPlayer — notif tap must not restart a new tone.
            Companion.setInAppIncomingUi(active, stopNativeRing = false)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_INAPP_FAILED", e.message, e)
        }
    }

    /** Sync — safe while Activity is pausing on Home (async bridge can drop). */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun setInAppIncomingUiSync(active: Boolean): Boolean {
        return try {
            Companion.setInAppIncomingUi(active, stopNativeRing = false)
            true
        } catch (_: Exception) {
            false
        }
    }

    /** Sync — JS can adopt an already-playing native ring instead of starting a new one. */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isRingtonePlayingSync(): Boolean {
        return try {
            Companion.isRingtonePlaying()
        } catch (_: Exception) {
            false
        }
    }

    /** Sync — true only when MainActivity is visibly resumed (not FCM wake). */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun isMainActivityResumedSync(): Boolean {
        return try {
            Companion.isMainActivityResumed()
        } catch (_: Exception) {
            false
        }
    }

    @ReactMethod
    fun displayIncomingCall(details: ReadableMap, promise: Promise) {
        try {
            val roomId = details.getString("roomId") ?: ""
            if (roomId.isEmpty()) {
                promise.reject("NO_ROOM", "roomId required")
                return
            }

            // Prefer JS-supplied token so Decline/Answer always have auth in the PI.
            val tokenFromJs = details.getString("authToken")
            if (!tokenFromJs.isNullOrBlank()) {
                IncomingCallApi.cacheAuthToken(reactContext, tokenFromJs)
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
                force = details.hasKey("force") && details.getBoolean("force"),
                // Default true when key missing — BG/kill must ring.
                playRingtone = !details.hasKey("playRingtone") || details.getBoolean("playRingtone"),
            )
            if (ok) promise.resolve(true) else promise.reject("DISPLAY_FAILED", "notify failed")
        } catch (e: Exception) {
            promise.reject("DISPLAY_FAILED", e.message, e)
        }
    }

    /**
     * Sync Home/BG handoff: start ONE MediaPlayer + silent CallStyle shade.
     * BG ring must be audible immediately (no channel sound).
     */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun handoffBackgroundRingSync(details: ReadableMap): Boolean {
        return try {
            if (isRingtoneSuppressed()) {
                android.util.Log.i(NAME, "handoff skipped — ringtone suppressed")
                return false
            }
            val roomId = details.getString("roomId") ?: ""
            if (roomId.isEmpty()) return false
            // Sync Home/BG handoff: ONE MediaPlayer ring (channel is silent).
            Companion.setInAppIncomingUi(false, stopNativeRing = false)
            // Force + playRingtone: MediaPlayer only (no channel double-ring).
            displayFromContext(
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
                force = true,
                playRingtone = true,
            )
        } catch (e: Exception) {
            android.util.Log.e(NAME, "handoffBackgroundRingSync failed: ${e.message}", e)
            false
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
    fun stopRingtoneAndDismissJs(roomId: String, promise: Promise) {
        try {
            Companion.stopRingtoneAndDismiss(reactContext, roomId)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_DISMISS_FAILED", e.message, e)
        }
    }

    /** Accept/Reject — stop + suppress late re-ring. */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun stopAndSuppressRingtoneSync(roomId: String): Boolean {
        return try {
            Companion.stopAndSuppressRingtone(reactContext, roomId)
            true
        } catch (_: Exception) {
            false
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

    @ReactMethod(isBlockingSynchronousMethod = true)
    fun stopRingtoneSyncJs(): Boolean {
        return try {
            stopRingtone(reactContext)
            true
        } catch (_: Exception) {
            false
        }
    }

    /** Start native BG ringtone (Home handoff / kill). */
    @ReactMethod
    fun startRingtoneJs(promise: Promise) {
        try {
            Companion.setInAppIncomingUi(false)
            startRingtone(reactContext, ignoreInAppUi = true)
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("START_RING_FAILED", e.message, e)
        }
    }

    /** Sync start — must run before Activity pause drops async bridge calls. */
    @ReactMethod(isBlockingSynchronousMethod = true)
    fun startRingtoneSync(): Boolean {
        return try {
            Companion.setInAppIncomingUi(false)
            startRingtone(reactContext, ignoreInAppUi = true)
            true
        } catch (e: Exception) {
            android.util.Log.e(NAME, "startRingtoneSync failed: ${e.message}", e)
            false
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
