import UIKit
import Capacitor
import SafariServices
import WebKit

class CustomBridgeViewController: CAPBridgeViewController, WKNavigationDelegate {

    // Domaines qui doivent rester DANS la WebView de l'app (ton propre site).
    // Tout le reste sera ouvert dans un SFSafariViewController intégré,
    // SAUF les domaines OAuth (Google/Apple) qui doivent rester en navigateur
    // système complet pour des raisons de sécurité imposées par Google.
    private let ownDomains = ["h2go-app.com", "h2go-beta.lovable.app"]

    // Domaines qui doivent IMPÉRATIVEMENT ouvrir le vrai Safari système
    // (Google bloque les navigateurs intégrés pour son flux OAuth).
    private let mustUseSystemSafari = [
        "accounts.google.com",
        "appleid.apple.com"
    ]

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        self.webView?.navigationDelegate = self
    }

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = navigationAction.request.url,
              let host = url.host else {
            decisionHandler(.allow)
            return
        }

        // Navigation vers ton propre domaine : laisse faire normalement.
        if ownDomains.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) {
            decisionHandler(.allow)
            return
        }

        // Domaines OAuth sensibles : Safari système obligatoire.
        if mustUseSystemSafari.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) {
            decisionHandler(.cancel)
            UIApplication.shared.open(url, options: [:], completionHandler: nil)
            return
        }

        // Tout le reste (liens externes génériques) : navigateur intégré.
        decisionHandler(.cancel)
        let safariVC = SFSafariViewController(url: url)
        self.present(safariVC, animated: true, completion: nil)
    }
}
