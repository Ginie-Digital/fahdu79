package com.fahdu

import android.content.Context
import android.util.Log
import org.json.JSONObject
import java.io.BufferedReader
import java.io.File
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * Hit accept/reject API from native so CallStyle Decline/Answer work even when
 * JS is paused, headless is blocked (Android 12+), or React is not ready.
 */
object IncomingCallApi {
    private const val TAG = "IncomingCallApi"
    private const val BASE_URL = "https://api.fahdu.com"
    private const val PREFS = "fahdu_incoming_call_style"
    private const val PREF_AUTH_TOKEN = "cached_auth_token"
    private const val TOKEN_FILE = "fahdu_call_auth_token.txt"
    private val executor = Executors.newSingleThreadExecutor()

    @JvmStatic
    fun cacheAuthToken(context: Context, token: String?) {
        if (token.isNullOrBlank()) return
        val clean = token.trim()
        try {
            context.applicationContext
                .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                .edit()
                .putString(PREF_AUTH_TOKEN, clean)
                .apply()
        } catch (e: Exception) {
            Log.w(TAG, "cacheAuthToken prefs failed: ${e.message}")
        }
        try {
            File(context.applicationContext.filesDir, TOKEN_FILE).writeText(clean)
        } catch (e: Exception) {
            Log.w(TAG, "cacheAuthToken file failed: ${e.message}")
        }
    }

    @JvmStatic
    fun readAuthToken(context: Context, extrasToken: String? = null): String? {
        if (!extrasToken.isNullOrBlank()) return extrasToken.trim()

        val app = context.applicationContext

        try {
            val cached =
                app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
                    .getString(PREF_AUTH_TOKEN, null)
            if (!cached.isNullOrBlank()) return cached.trim()
        } catch (_: Exception) {
        }

        try {
            val file = File(app.filesDir, TOKEN_FILE)
            if (file.exists()) {
                val t = file.readText().trim()
                if (t.isNotBlank()) return t
            }
        } catch (_: Exception) {
        }

        // AsyncStorage (legacy SharedPreferences)
        try {
            val names =
                listOf(
                    "RNCAsyncLocalStorage_V1",
                    "AsyncStorage",
                    "CatylistLocalStorage",
                    "RKStorage",
                )
            for (name in names) {
                val prefs = app.getSharedPreferences(name, Context.MODE_PRIVATE)
                val direct = prefs.getString("data", null)
                if (!direct.isNullOrBlank()) return direct.trim().trim('"')
                prefs.all?.values?.forEach { v ->
                    if (v is String && v.length > 40 && !v.trim().startsWith("{")) {
                        return v.trim().trim('"')
                    }
                }
            }
        } catch (_: Exception) {
        }

        // redux-persist via MMKV Java API (transitive from react-native-mmkv)
        try {
            val token = readTokenFromMmkv(app)
            if (!token.isNullOrBlank()) return token
        } catch (e: Exception) {
            Log.w(TAG, "MMKV token read failed: ${e.message}")
        }

        return null
    }

    private fun readTokenFromMmkv(context: Context): String? {
        return try {
            val mmkvClass = Class.forName("com.tencent.mmkv.MMKV")
            val init = mmkvClass.getMethod("initialize", Context::class.java)
            init.invoke(null, context)

            val mmkvWithID =
                mmkvClass.getMethod(
                    "mmkvWithID",
                    String::class.java,
                    Int::class.javaPrimitiveType,
                )
            // MULTI_PROCESS_MODE = 2
            val kv = mmkvWithID.invoke(null, "default", 2)
                ?: mmkvClass.getMethod("defaultMMKV").invoke(null)

            val decodeString =
                kv.javaClass.getMethod("decodeString", String::class.java)
            val persist = decodeString.invoke(kv, "persist:root") as? String
            if (persist.isNullOrBlank()) return null

            val root = JSONObject(persist)
            val authRaw = root.opt("auth")
            val auth =
                when (authRaw) {
                    is String -> JSONObject(authRaw)
                    is JSONObject -> authRaw
                    else -> null
                } ?: return null
            val user = auth.optJSONObject("user") ?: return null
            user.optString("token", null)?.takeIf { it.isNotBlank() }
        } catch (_: ClassNotFoundException) {
            null
        } catch (e: Exception) {
            Log.w(TAG, "readTokenFromMmkv error: ${e.message}")
            null
        }
    }

    @JvmStatic
    fun postStatusAsync(
        context: Context,
        roomId: String,
        callType: String,
        status: String,
        extrasToken: String? = null,
    ) {
        if (roomId.isBlank()) return
        val app = context.applicationContext
        executor.execute {
            postStatusWithRetry(app, roomId, callType, status, extrasToken)
        }
    }

    @JvmStatic
    fun postStatusWithRetry(
        context: Context,
        roomId: String,
        callType: String,
        status: String,
        extrasToken: String? = null,
        attempts: Int = 3,
    ): Boolean {
        repeat(attempts) { i ->
            val ok = postStatusBlocking(context, roomId, callType, status, extrasToken)
            if (ok) return true
            Log.w(TAG, "postStatus retry ${i + 1}/$attempts failed status=$status room=$roomId")
            try {
                Thread.sleep(400L * (i + 1))
            } catch (_: Exception) {
            }
        }
        // Decline fallback endpoint used by CallScreen hangup.
        if (status == "REJECTED") {
            return postRejectCallFallback(context, roomId, callType, extrasToken)
        }
        return false
    }

    @JvmStatic
    fun postStatusBlocking(
        context: Context,
        roomId: String,
        callType: String,
        status: String,
        extrasToken: String? = null,
    ): Boolean {
        val token = readAuthToken(context, extrasToken)
        if (token.isNullOrBlank()) {
            Log.e(TAG, "No auth token — cannot $status room=$roomId")
            return false
        }
        // Keep cache warm for next ring.
        cacheAuthToken(context, token)

        var conn: HttpURLConnection? = null
        return try {
            val url = URL("$BASE_URL/api/stream/call/accept/manual")
            conn =
                (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 12_000
                    readTimeout = 12_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Authorization", "Bearer $token")
                }

            val body =
                JSONObject()
                    .put("roomId", roomId)
                    .put("callType", if (callType.isBlank()) "audio" else callType)
                    .put("status", status)
                    .toString()

            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body) }

            val code = conn.responseCode
            val stream = if (code in 200..299) conn.inputStream else conn.errorStream
            val response =
                stream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            Log.i(TAG, "postStatus $status room=$roomId → HTTP $code $response")
            code in 200..299
        } catch (e: Exception) {
            Log.e(TAG, "postStatus $status failed room=$roomId: ${e.message}", e)
            false
        } finally {
            conn?.disconnect()
        }
    }

    private fun postRejectCallFallback(
        context: Context,
        roomId: String,
        callType: String,
        extrasToken: String?,
    ): Boolean {
        val token = readAuthToken(context, extrasToken) ?: return false
        var conn: HttpURLConnection? = null
        return try {
            val url = URL("$BASE_URL/api/stream/reject-call")
            conn =
                (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    connectTimeout = 12_000
                    readTimeout = 12_000
                    doOutput = true
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("Authorization", "Bearer $token")
                }
            val body =
                JSONObject()
                    .put("roomId", roomId)
                    .put("callType", if (callType.isBlank()) "audio" else callType)
                    .toString()
            OutputStreamWriter(conn.outputStream, Charsets.UTF_8).use { it.write(body) }
            val code = conn.responseCode
            Log.i(TAG, "reject-call fallback room=$roomId → HTTP $code")
            code in 200..299
        } catch (e: Exception) {
            Log.e(TAG, "reject-call fallback failed: ${e.message}", e)
            false
        } finally {
            conn?.disconnect()
        }
    }
}
