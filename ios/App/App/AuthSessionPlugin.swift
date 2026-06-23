import Foundation
import Capacitor
import AuthenticationServices
import UIKit

@objc(AuthSessionPlugin)
public class AuthSessionPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "AuthSessionPlugin"
    public let jsName = "AuthSessionPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "cancel", returnType: CAPPluginReturnPromise),
    ]

    private var session: ASWebAuthenticationSession?

    // Méthode Swift directe, appelée depuis CustomBridgeViewController
    // (interception de navigation), pas depuis JS.
    func startSession(url: URL) {
        DispatchQueue.main.async {
            // Le callbackURLScheme ici ne sera jamais réellement déclenché
            // (le serveur ne redirige qu'en https), c'est juste une valeur
            // requise par l'API. Le vrai retour passe par le Universal Link
            // (capté côté JS via appUrlOpen), suivi d'un appel JS à cancel()
            // pour fermer cette session proprement.
            let session = ASWebAuthenticationSession(
                url: url,
                callbackURLScheme: "com.h2go.app"
            ) { _, _ in }
            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.session = session
            session.start()
        }
    }

    // Appelée depuis JS une fois le Universal Link capté, pour fermer
    // proprement la session d'authentification encore affichée.
    @objc func cancel(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.session?.cancel()
            self.session = nil
            call.resolve()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return UIApplication.shared.connectedScenes
            .compactMap { ($0 as? UIWindowScene)?.keyWindow }
            .first ?? ASPresentationAnchor()
    }
}