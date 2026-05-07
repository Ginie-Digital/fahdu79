package com.fahdu

import android.app.Activity
import android.os.Build
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

class ScreenshotDetectionModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext), LifecycleEventListener {

    private var isHandlerRegistered = false
    private val screenshotCallback = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
        Activity.ScreenCaptureCallback {
            sendEvent("onScreenshotTaken", null)
        }
    } else {
        null
    }

    init {
        reactContext.addLifecycleEventListener(this)
    }

    override fun getName(): String {
        return "ScreenshotDetectionModule"
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactApplicationContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun registerCallback() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && !isHandlerRegistered) {
            val activity = currentActivity
            if (activity != null && screenshotCallback != null) {
                activity.registerScreenCaptureCallback(activity.mainExecutor, screenshotCallback)
                isHandlerRegistered = true
            }
        }
    }

    private fun unregisterCallback() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE && isHandlerRegistered) {
            val activity = currentActivity
            if (activity != null && screenshotCallback != null) {
                activity.unregisterScreenCaptureCallback(screenshotCallback)
                isHandlerRegistered = false
            }
        }
    }

    @ReactMethod
    fun addListener(eventName: String) {
        // Required for NativeEventEmitter
    }

    @ReactMethod
    fun removeListeners(count: Int) {
        // Required for NativeEventEmitter
    }

    override fun onHostResume() {
        registerCallback()
    }

    override fun onHostPause() {
        unregisterCallback()
    }

    override fun onHostDestroy() {
        unregisterCallback()
    }
}
