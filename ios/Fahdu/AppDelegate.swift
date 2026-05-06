import UIKit
import Expo
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase
import RNBootSplash

@main
class AppDelegate: ExpoAppDelegate {
  override var window: UIWindow? {
    get { return super.window }
    set { super.window = newValue }
  }

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()
    
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    self.reactNativeDelegate = delegate
    self.reactNativeFactory = factory
    bindReactNativeFactory(factory)

    super.application(application, didFinishLaunchingWithOptions: launchOptions)
    
    if let rootView = self.window?.rootViewController?.view {
      RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
    }

    return true
  }

  override func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    return RCTLinkingManager.application(application, open: url, options: options)
  }

  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
