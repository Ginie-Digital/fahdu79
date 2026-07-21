package com.fahdu
import expo.modules.ReactActivityDelegateWrapper

import android.content.Intent
import android.os.Build
import android.os.Bundle
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
    val action = intent?.getStringExtra(IncomingCallStyleModule.EXTRA_ACTION)
    // Accept OR full-screen IncomingCall from killed/locked state.
    val showOverLock = action == "accept_call" || action == "open_incoming_call"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(showOverLock)
      setTurnScreenOn(showOverLock)
    }
  }

  /**
   * CallStyle notification intents:
   * - accept_call → stop ring, join CallScreen (JS)
   * - open_incoming_call → body tap → IncomingCall screen (JS)
   */
  private fun handleCallIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.getStringExtra(IncomingCallStyleModule.EXTRA_ACTION) ?: return
    if (action != "accept_call" && action != "open_incoming_call") return

    val extras = intent.extras ?: return
    val roomId = extras.getString(IncomingCallStyleModule.EXTRA_ROOM_ID) ?: ""

    // Save pending FIRST so cold-start JS can open the right screen.
    IncomingCallStyleModule.savePendingAction(this, action, extras)

    if (action == "accept_call") {
      // Stop ring + suppress late FCM re-ring. Stamp this call ended natively only.
      val callId = extras.getString(IncomingCallStyleModule.EXTRA_CALL_ID) ?: ""
      if (roomId.isNotEmpty()) {
        IncomingCallStyleModule.stopAndSuppressRingtone(this, roomId, callId)
      } else {
        IncomingCallStyleModule.suppressRingtone(60_000L, roomId, callId)
        IncomingCallStyleModule.stopRingtone(this)
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
}
