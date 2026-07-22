package com.fahdu
import expo.modules.ReactActivityDelegateWrapper

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import com.zoontek.rnbootsplash.RNBootSplash

class MainActivity : ReactActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    // Only show over lock-screen when user explicitly Accepted the call.
    // Do NOT use manifest showWhenLocked/turnScreenOn — that made the app
    // appear on unlock/wake after a call notification (no user tap).
    applyLockScreenFlagsForCallIntent(intent)

    RNBootSplash.init(this, R.style.BootTheme)
    super.onCreate(null)
    handleCallIntent(intent)
  }

  override fun onResume() {
    super.onResume()
    // User is visibly using the app — JS owns incoming-call UI (no CallStyle vibrate-only).
    IncomingCallStyleModule.setMainActivityResumed(true)
  }

  override fun onPause() {
    IncomingCallStyleModule.setMainActivityResumed(false)
    super.onPause()
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    applyLockScreenFlagsForCallIntent(intent)
    handleCallIntent(intent)
  }

  /**
   * Accept from notification may need to show over the lock screen.
   * Body tap / normal launch must NOT turn the screen on or show over lock.
   */
  private fun applyLockScreenFlagsForCallIntent(intent: Intent?) {
    val action = resolveCallAction(intent)
    // Accept OR full-screen IncomingCall from killed/locked state.
    val showOverLock = action == "accept_call" || action == "open_incoming_call"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(showOverLock)
      setTurnScreenOn(showOverLock)
    }
  }

  /**
   * Resolve action from EXTRA_ACTION or Intent.action (OEM extras can drop).
   */
  private fun resolveCallAction(intent: Intent?): String? {
    if (intent == null) return null
    val fromCallAction = intent.getStringExtra(IncomingCallStyleModule.EXTRA_ACTION)
    if (!fromCallAction.isNullOrBlank()) return fromCallAction
    val fromActionExtra = intent.getStringExtra("action")
    if (!fromActionExtra.isNullOrBlank()) return fromActionExtra
    return when (intent.action) {
      IncomingCallStyleModule.ACTION_ACCEPT -> "accept_call"
      IncomingCallStyleModule.ACTION_OPEN -> "open_incoming_call"
      IncomingCallStyleModule.ACTION_DECLINE -> "decline_call"
      else -> null
    }
  }

  /**
   * CallStyle notification intents:
   * - accept_call → stop ring, join CallScreen (JS) + native ACCEPTED API
   * - open_incoming_call → body tap → IncomingCall screen (JS)
   */
  private fun handleCallIntent(intent: Intent?) {
    if (intent == null) return
    val action = resolveCallAction(intent) ?: return
    if (action != "accept_call" && action != "open_incoming_call") return

    val extras = intent.extras ?: Bundle()
    // Ensure EXTRA_ACTION is always present for pending JSON / emit map.
    if (!extras.containsKey(IncomingCallStyleModule.EXTRA_ACTION)) {
      extras.putString(IncomingCallStyleModule.EXTRA_ACTION, action)
    }
    val roomId = extras.getString(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: ""
    val callId = extras.getString(IncomingCallStyleModule.EXTRA_CALL_ID) ?: ""
    val callType = extras.getString(IncomingCallStyleModule.EXTRA_CALL_TYPE) ?: "audio"
    val authToken = extras.getString(IncomingCallStyleModule.EXTRA_AUTH_TOKEN)

    Log.i(TAG, "handleCallIntent action=$action room=$roomId callId=$callId hasToken=${!authToken.isNullOrBlank()}")

    // Save pending FIRST so cold-start JS can open the right screen.
    IncomingCallStyleModule.savePendingAction(this, action, extras)

    if (action == "accept_call") {
      // Stop ring + suppress late FCM re-ring.
      if (roomId.isNotEmpty()) {
        IncomingCallStyleModule.stopAndSuppressRingtone(this, roomId, callId)
        IncomingCallStyleModule.dismissShadeOnly(this, roomId)
      } else {
        IncomingCallStyleModule.suppressRingtone(5_000L, roomId, callId)
        IncomingCallStyleModule.stopRingtone(this)
      }
      // ACCEPTED ASAP (retry) so iOS/Android caller leaves "Notifying..."
      if (roomId.isNotEmpty()) {
        IncomingCallApi.postStatusAsync(this, roomId, callType, "ACCEPTED", authToken)
      }
    }
    // Body tap keeps ringtone until IncomingCall / Accept handles it.

    IncomingCallStyleModule.emitAction(action, extras)
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      ReactActivityDelegateWrapper(
        this,
        BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled),
      )

  companion object {
    private const val TAG = "MainActivityCall"
  }
}
