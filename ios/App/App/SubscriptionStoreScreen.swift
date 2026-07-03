import SwiftUI
import StoreKit

@available(iOS 17.0, *)
struct SubscriptionStoreScreen: View {
    let groupID: String
    var onComplete: (String) -> Void   // "productId" | "cancelled" | "pending" | "failed" | "unverified"

    var body: some View {
        SubscriptionStoreView(groupID: groupID) {
            VStack(spacing: 12) {
                Text("💧")
                    .font(.system(size: 56))
                Text("Passe Premium avec H2GO")
                    .font(.title2.bold())
                Text("Suivi avancé, statistiques détaillées et plus encore.")
                    .font(.subheadline)
                    .multilineTextAlignment(.center)
                    .foregroundColor(.secondary)
            }
            .padding()
        }
        .storeButton(.visible, for: .cancellation)
        .storeButton(.visible, for: .policies)
        .subscriptionStoreControlStyle(.prominentPicker)
        .subscriptionStorePolicyDestination(
            url: URL(string: "https://h2go-app.com/terms")!,
            for: .termsOfService
        )
        .subscriptionStorePolicyDestination(
            url: URL(string: "https://h2go-app.com/privacy")!,
            for: .privacyPolicy
        )
        .onInAppPurchaseCompletion { product, result in
            switch result {
            case .success(let purchaseResult):
                switch purchaseResult {
                case .success(let verification):
                    switch verification {
                    case .verified(let transaction):
                        await transaction.finish()
                        onComplete(product.id)
                    case .unverified:
                        onComplete("unverified")
                    }
                case .userCancelled:
                    onComplete("cancelled")
                case .pending:
                    onComplete("pending")
                @unknown default:
                    onComplete("unknown")
                }
            case .failure:
                onComplete("failed")
            }
        }
    }
}
