import Capacitor
import StoreKit
import UIKit

@objc(SubscriptionManagementPlugin)
public class SubscriptionManagementPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SubscriptionManagementPlugin"
    public let jsName = "SubscriptionManagement"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "openManageSubscriptions", returnType: CAPPluginReturnPromise)
    ]

    @objc public func openManageSubscriptions(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if #available(iOS 15.0, *) {
                guard let scene = UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene })
                    .first(where: { $0.activationState == .foregroundActive }) else {
                    self.openNativeSubscriptionsUrl(call)
                    return
                }

                Task { @MainActor in
                    do {
                        try await AppStore.showManageSubscriptions(in: scene)
                        call.resolve()
                    } catch {
                        self.openNativeSubscriptionsUrl(call)
                    }
                }
                return
            }

            self.openNativeSubscriptionsUrl(call)
        }
    }

    private func openNativeSubscriptionsUrl(_ call: CAPPluginCall) {
        guard let url = URL(string: "itms-apps://apps.apple.com/account/subscriptions") else {
            call.reject("Invalid subscriptions URL")
            return
        }

        UIApplication.shared.open(url, options: [:]) { success in
            if success {
                call.resolve()
            } else {
                call.reject("Unable to open native subscription management")
            }
        }
    }
}