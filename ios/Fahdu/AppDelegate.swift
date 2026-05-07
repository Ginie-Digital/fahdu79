import UIKit
import Expo
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider
import Firebase
import RNBootSplash

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    FirebaseApp.configure()

    // 1. Set up the React Native factory with Expo's delegate.
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()
    bindReactNativeFactory(factory)

    // 2. Explicitly create the root view through the factory.
    //    This triggers: ExpoReactRootViewFactory → ExpoReactDelegate.createReactRootView()
    //    → ExpoDevLauncherReactDelegateHandler.createReactRootView() → autoSetupPrepare()
    //    Without this, autoSetupPrepare is never called and autoSetupStart crashes.
    let rootView = factory.rootViewFactory.view(
      withModuleName: "main",
      initialProperties: [:],
      launchOptions: launchOptions
    )

    // 3. Set up the window with the root view and make it key+visible.
    //    Must happen BEFORE super.application() because the dev-launcher
    //    subscriber needs a keyWindow to call autoSetupStart(window).
    self.window = UIWindow(frame: UIScreen.main.bounds)
    let rootViewController = UIViewController()
    rootViewController.view = rootView
    self.window?.rootViewController = rootViewController
    self.window?.makeKeyAndVisible()

    // 4. Call super — subscribers run including dev-launcher's autoSetupStart.
    //    autoSetupPrepare was already called in step 2, so this will succeed.
    super.application(application, didFinishLaunchingWithOptions: launchOptions)

    // 5. Initialize BootSplash (skip for dev-launcher's deferred root view)
    let className = String(describing: type(of: rootView))
    if !className.contains("Deferred") {
      RNBootSplash.initWithStoryboard("BootSplash", rootView: rootView)
    }

    return true
  }

  override func application(
    _ application: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey : Any] = [:]
  ) -> Bool {
    return super.application(application, open: url, options: options)
  }

  override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler)
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
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
