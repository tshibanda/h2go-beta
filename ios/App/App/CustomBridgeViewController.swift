import UIKit
import Capacitor
import WebKit

class CustomBridgeViewController: CAPBridgeViewController {

    // Référence vers le delegate que Capacitor met en place lui-même.
    // On lui transfère tout ce qu'on ne veut pas intercepter, pour ne rien
    // casser de son fonctionnement interne (bridge JS, cycle de vie, etc.).
    private weak var originalDelegate: WKNavigationDelegate?

    // Domaines qui doivent ouvrir une session d'authentification native
    // (ASWebAuthenticationSession) au lieu de basculer vers Safari système.
    private let authDomains = [
        "accounts.google.com",
        "appleid.apple.com",
        "oauth.lovable.app"
    ]

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(AuthSessionPlugin())
        originalDelegate = webView?.navigationDelegate
        webView?.navigationDelegate = self
    }
}

extension CustomBridgeViewController: WKNavigationDelegate {

    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction,
        decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        if let url = navigationAction.request.url,
           let host = url.host,
           authDomains.contains(where: { host == $0 || host.hasSuffix(".\($0)") }) {
            decisionHandler(.cancel)
            if let plugin = self.bridge?.plugin(withName: "AuthSessionPlugin") as? AuthSessionPlugin {
                plugin.startSession(url: url)
            }
            return
        }

        // Tout le reste : transfère au delegate original de Capacitor.
        if originalDelegate?.webView?(webView, decidePolicyFor: navigationAction, decisionHandler: decisionHandler) == nil {
            decisionHandler(.allow)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        originalDelegate?.webView?(webView, didFinish: navigation)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        originalDelegate?.webView?(webView, didFail: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        originalDelegate?.webView?(webView, didFailProvisionalNavigation: navigation, withError: error)
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        originalDelegate?.webView?(webView, didStartProvisionalNavigation: navigation)
    }

    func webView(_ webView: WKWebView, didCommit navigation: WKNavigation!) {
        originalDelegate?.webView?(webView, didCommit: navigation)
    }
}
