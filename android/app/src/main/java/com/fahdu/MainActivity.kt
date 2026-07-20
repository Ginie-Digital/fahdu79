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
    val showOverLock = action == "accept_call"
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(showOverLock)
      setTurnScreenOn(showOverLock)
    }
  }

  /**
   * Persist Accept / body-tap intents from CallStyle notification so JS can
   * consume them on cold start (same pattern as Decline via SharedPreferences).
   *
   * These intents only fire from notification content/Accept PendingIntents
   * (user tap) — never from display alone.
   */
  private fun handleCallIntent(intent: Intent?) {
    if (intent == null) return
    val action = intent.getStringExtra(IncomingCallStyleModule.EXTRA_ACTION) ?: return
    if (action != "accept_call" && action != "default") return

    val extras = intent.extras ?: return
    // Accept / body tap: stop looping native ringtone immediately.
    IncomingCallStyleModule.stopRingtone(this)
    IncomingCallStyleModule.savePendingAction(this, action, extras)
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
