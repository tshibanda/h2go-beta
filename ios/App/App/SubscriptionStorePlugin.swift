import Foundation
import Capacitor
import SwiftUI

@objc(SubscriptionStorePlugin)
public class SubscriptionStorePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubscriptionStorePlugin"
    public let jsName = "SubscriptionStore"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        if #available(iOS 17.0, *) {
            call.resolve(["available": true])
        } else {
            call.resolve(["available": false])
        }
    }

    @objc func present(_ call: CAPPluginCall) {
        guard let groupID = call.getString("groupID") else {
            call.reject("Missing groupID")
            return
        }

        guard #available(iOS 17.0, *) else {
            call.reject("SubscriptionStoreView requires iOS 17+")
            return
        }

        DispatchQueue.main.async {
            guard let rootVC = self.bridge?.viewController else {
                call.reject("No root view controller")
                return
            }

            let screen = SubscriptionStoreScreen(groupID: groupID) { outcome in
                DispatchQueue.main.async {
                    rootVC.dismiss(animated: true)
                }
                call.resolve(["result": outcome])
            }

            let hosting = UIHostingController(rootView: screen)
            hosting.modalPresentationStyle = .pageSheet
            rootVC.present(hosting, animated: true)
        }
    }
}