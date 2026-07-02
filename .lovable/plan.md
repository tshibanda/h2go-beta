
# Migration Paiements : RevenueCat (natif) + Stripe (web)

## Ce que tu obtiens

- **iPhone/iPad + Android natif** → paiement via le composant natif Apple/Google (StoreKit / Play Billing) piloté par RevenueCat. Zéro friction, Face ID / Touch ID.
- **h2go-app.com dans Safari desktop / Chrome / mobile web** → Stripe Embedded Checkout (inchangé).
- **Une seule table `subscriptions`** dans la base : le gating premium fonctionne de la même manière quel que soit le canal d'achat.

## Étapes que TU dois faire (je ne peux pas les faire à ta place)

### 1. App Store Connect (obligatoire pour iOS)
- Créer 2 produits **Auto-Renewable Subscription** dans un même Subscription Group « H2GO Premium » :
  - `premium_monthly_v1` (mensuel)
  - `premium_yearly_v1` (annuel)
- Remplir : prix, description localisée FR/EN, capture d'écran de review, politique de confidentialité, EULA.
- Signer l'accord **Paid Applications** (Business → Agreements).

### 2. Google Play Console (pour Android plus tard)
- Créer les mêmes IDs produits en abonnements.

### 3. RevenueCat (app.revenuecat.com)
- Créer projet « H2GO ».
- Ajouter app iOS avec bundle `com.h2go.app` + App Store Shared Secret.
- Ajouter app Android (quand prête).
- Créer **Entitlement** `premium`.
- Créer **Offering** `default` avec 2 packages : `$rc_monthly` et `$rc_annual` liés aux produits App Store Connect / Play.
- Récupérer :
  - **Apple public SDK key** (`appl_...`)
  - **Google public SDK key** (`goog_...`)
  - **Webhook auth header** (à définir : je te génère une valeur aléatoire)
  - **REST API key secret** (`sk_...`) pour lookups serveur

Je te demanderai ces valeurs via le formulaire sécurisé quand j'aurai tout branché.

## Ce que je vais faire côté code

### Dépendances
- `bun add @revenuecat/purchases-capacitor` (SDK natif iOS/Android)
- `npx cap sync ios` après install
- Ajout de la capability **In-App Purchase** dans `ios/App/App.entitlements`

### Fichiers nouveaux
- `src/lib/revenuecat.ts` — init du SDK au boot (`Purchases.configure`), helpers `getOfferings()`, `purchasePackage()`, `restorePurchases()`, `getCustomerInfo()`.
- `src/lib/payment-router.ts` — décide RC vs Stripe selon `Capacitor.isNativePlatform()`.
- `src/components/h2go/NativePaywall.tsx` — écran natif style Apple avec les 2 offres (mensuel / annuel), CTA « S'abonner », restore purchases, mentions légales EULA + politique de confidentialité (exigé par Apple review).
- `src/routes/api/public/revenuecat/webhook.ts` — endpoint webhook RC → écrit dans `subscriptions` (INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, PRODUCT_CHANGE). Vérifie le header `Authorization` avec le secret `REVENUECAT_WEBHOOK_SECRET`.
- `src/lib/revenuecat-sync.functions.ts` — server fn qui, au premier login natif, appelle l'API REST RC pour identifier l'utilisateur (`Purchases.logIn(userId)`) et hydrater `subscriptions`.

### Fichiers modifiés
- `src/routes/_authenticated/premium.tsx` : `if (native) → <NativePaywall />, else → <StripeEmbeddedCheckout />`.
- `src/routes/_authenticated/profile.tsx` :
  - Sur natif → bouton « Gérer mon abonnement » ouvre `https://apps.apple.com/account/subscriptions` (iOS) ou l'équivalent Play (Android). C'est **imposé par Apple**, on n'a pas le droit d'ouvrir Stripe portal pour un achat StoreKit.
  - Sur web → comportement Stripe portal actuel conservé.
- `src/lib/premium-guard.ts` (ou équivalent existant) : lit `subscriptions` sans se soucier du provider.

### Migration DB
Ajout de colonnes à `subscriptions` :
- `provider text not null default 'stripe'` (`stripe` | `revenuecat`)
- `revenuecat_user_id text`
- `store text` (`app_store` | `play_store` | `stripe`)
- `original_transaction_id text`
- Index sur `(user_id, provider)`.

Grants + RLS conservés à l'identique.

### Secrets à ajouter
- `REVENUECAT_PUBLIC_APPLE_KEY` (côté client via `VITE_REVENUECAT_APPLE_KEY` — publique, safe dans le bundle)
- `REVENUECAT_PUBLIC_GOOGLE_KEY` (idem, `VITE_REVENUECAT_GOOGLE_KEY`)
- `REVENUECAT_SECRET_API_KEY` (serveur uniquement, pour REST)
- `REVENUECAT_WEBHOOK_SECRET` (généré, à recopier dans RC dashboard)

## Détails techniques

- **Identification utilisateur** : `Purchases.logIn(supabaseUserId)` juste après le sign-in, `Purchases.logOut()` au sign-out. Ça lie l'App Store transaction au bon compte H2GO côté RC.
- **Restore purchases** obligatoire (bouton dans le paywall + dans profil) — sinon rejet Apple review.
- **Sandbox testing** : compte Sandbox Tester dans App Store Connect → se connecter dans Réglages iOS → l'app détecte automatiquement Sandbox.
- **Stripe web reste 100% identique** : `createCheckoutSession`, webhook `/api/public/payments/webhook`, portal, rien à toucher.
- **Cas particulier** : un utilisateur premium via iOS qui se connecte sur Safari desktop → on lit `subscriptions.provider = 'revenuecat'` et on affiche « Ton abonnement est géré depuis ton iPhone » (pas de bouton Stripe portal).

## Ordre d'exécution

1. Migration DB + code (je fais tout).
2. Je te demande les 3 clés RC (public Apple, secret REST, webhook secret).
3. Tu configures App Store Connect + RC dashboard.
4. Tu rebuild dans Xcode, tu testes en Sandbox.
5. Publish web → Stripe reste live.

## Ce que je NE fais PAS

- Créer ton compte RevenueCat ou tes produits App Store Connect (impossible sans tes credentials Apple Developer).
- Signer l'accord Paid Applications à ta place.
- Toucher au flow Stripe web existant (il reste tel quel).

Confirme et je démarre par la migration DB + install du SDK.
