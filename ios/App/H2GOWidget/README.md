# Widget iOS H2GO

Le code Swift (`H2GOWidget.swift`) est prêt. Il faut **créer la cible Widget
Extension dans Xcode** une seule fois — Capacitor ne le fait pas tout seul.

## Étapes (Xcode, ~5 min)

1. Ouvre `ios/App/App.xcworkspace` dans Xcode.
2. `File > New > Target… > Widget Extension`.
   - Product Name : **H2GOWidget**
   - Decoche "Include Configuration Intent".
   - Embed in : **App**.
3. Supprime le fichier `H2GOWidget.swift` généré, glisse à la place
   le fichier `ios/App/H2GOWidget/H2GOWidget.swift` (déjà présent dans ce dossier).
4. **App Groups** — sur *les deux* cibles (`App` et `H2GOWidget`) :
   - `Signing & Capabilities` > `+ Capability` > **App Groups**.
   - Ajoute `group.com.h2go.app` sur les deux.
5. Sur la cible `App`, ajoute le plugin `@capacitor/preferences` :
   ```bash
   bun add @capacitor/preferences
   npx cap sync ios
   ```
6. Build & run sur un iPhone (iOS 16+). Ajoute le widget H2GO depuis l'écran
   d'accueil / verrouillage.

## Données partagées

Le widget lit `UserDefaults(suiteName: "group.com.h2go.app")`, clé
`h2go_widget_snapshot` (JSON). Côté JS, on écrit via
`pushWidgetSnapshot(...)` (cf. `src/lib/ios-widget-bridge.ts`). Tant que les
étapes ci-dessus ne sont pas faites, l'appel JS est un no-op : aucune
régression côté web ou Android.

## Rafraîchissement à la demande (optionnel)

Pour forcer `WidgetCenter.shared.reloadAllTimelines()` depuis JS, créer un
plugin Capacitor custom `H2GOWidget` exposant `reload()`. Sans ça, iOS
rafraîchit tout seul toutes les ~15 min (policy `.after`).
