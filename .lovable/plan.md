# Plan d'évolution H2GO

Je livre les 4 chantiers dans l'ordre que tu as choisi. Certaines parties iOS natives nécessiteront un build Xcode de ton côté (je le signalerai).

---

## 1) Transitions & fluidité UI

- **Transitions de routes** : wrapper `<AnimatePresence mode="wait">` autour du `<Outlet/>` dans `__root.tsx` (et `_authenticated/route.tsx`) avec `framer-motion` — fade+slide léger (200ms).
- **Micro-interactions** : ajout de classes `transition-all`, `hover-scale`, `active:scale-95` sur les boutons principaux (Home, Validate, Profile, Premium, Tree).
- **Animation d'entrée** des cartes (stats, badges, leaderboard) avec `motion.div` staggered (40ms entre items).
- **Splash/Mascotte** : easing plus doux + `motion.div` pour les expressions du Splash.
- **Toasts/Modals** déjà animés via Radix — homogénéiser les durées (200ms ease-out).

Pas d'impact métier, uniquement présentation.

---

## 2) Objectif d'hydratation dynamique

**Source des données** : Open-Meteo (gratuit, sans clé) + géoloc navigateur (`navigator.geolocation`), fallback IP-based ou ville renseignée dans le profil.

**Formule** : base `poids × 35 ml`, puis multiplicateurs :
- activité (low ×0.95, moderate ×1.0, high ×1.10)
- minutes d'exercice quotidiennes (+500 ml / 30 min) — déjà dans `/calculator`
- météo du jour : si T° max ≥ 28°C ×1.10, ≥ 32°C ×1.20 ; humidité ≥ 70 % +5 %
- climat (zone tropicale/sec si renseignée) +5 %

**Implémentation** :
- Migration : ajout colonnes `profiles.weight_kg`, `activity_level`, `exercise_minutes`, `climate_zone`, `daily_goal_ml_override` (nullable), `daily_goal_computed_at`.
- Server fn `computeDailyGoal` qui prend coords + profil et renvoie `goal_ml`, exposée via `useServerFn`.
- Hook `useDailyGoal()` côté client : calcule au mount de `/home`, met en cache TanStack Query (clé du jour) et stocke dans `profiles.daily_goal_ml`.
- UI : section "Profil > Objectif" pour saisir poids/activité/zone climatique ; sur `/home`, petit badge "Objectif adapté à la météo : 28°C → +10%".

---

## 3) Profil : Report a bug + Nous contacter (mailto)

- En bas de `_authenticated/profile.tsx`, deux liens stylés (icônes `Bug`, `Mail`) :
  - **Report a bug** → nouvelle route `/report-bug` avec formulaire (titre, description, étapes, capture facultative). Submit → `mailto:support@h2go-app.com` enrichi (sujet, corps pré-rempli avec contexte : version app, OS, user id).
  - **Nous contacter** → `mailto:support@h2go-app.com?subject=...` direct.
- Page `/report-bug` respecte la charte (gradient bleu/teal, Fredoka, Splash).

---

## 4) Notifications intelligentes + Widget iOS + Partage badges

### 4a) Notifications adaptatives

- Étendre `src/lib/notifications.ts` :
  - Récupération météo (Open-Meteo) à la planification quotidienne.
  - Si T° ≥ 28°C : +2 créneaux supplémentaires (toutes les 1.5h au lieu de 2h).
  - Heure de la journée : densité plus élevée entre 11h-15h (heures chaudes).
  - HealthKit (activité physique) : nécessite plugin Capacitor `@perfood/capacitor-healthkit`. J'installe et j'ajoute un hook quotidien qui interroge les pas/calories ; si > seuil, ajoute un rappel post-effort. **Build Xcode requis pour activer la capability HealthKit**.
- Re-planification automatique tous les matins (background fetch iOS via `BackgroundTasks` Capacitor plugin).

### 4b) Widget iOS (écran d'accueil + Lock Screen)

C'est **du Swift natif** (WidgetKit) : je scaffolde une extension `H2GOWidget` dans `ios/App/` :
- `H2GOWidget.swift` : timeline provider, 3 tailles (small/medium + accessoryCircular pour lock screen).
- Affiche % de progression du jour + heure prochain rappel.
- Données partagées via App Group `group.com.h2goapp.shared` ; côté JS, j'écris `progress.json` à chaque sip via `@capacitor-community/file-opener` ou un plugin custom léger.
- **Action utilisateur requise** : ouvrir Xcode → File > New > Target > Widget Extension → coller mes fichiers + activer App Group. Je documente précisément.

### 4c) Partage de badges sur les réseaux sociaux

- Au clic sur un badge dans `/profile` ou `/leaderboard`, ouvrir une modal avec :
  - **Génération d'image** côté client via `<canvas>` 1080×1920 (story format) : fond gradient H2GO, mascotte Splash, nom du badge, pseudo, date. Pas besoin d'IA — pur Canvas avec polices Fredoka/Poppins (déjà chargées).
  - Bouton "Partager" : `navigator.share({ files: [pngBlob] })` (Web Share API, supporté iOS Safari + Capacitor Share).
  - Bouton "Télécharger" : fallback download.

---

## Détails techniques

- **Packages à installer** : `framer-motion` (transitions), `@perfood/capacitor-healthkit` (HealthKit), `@capacitor/share` (déjà ?), à confirmer.
- **Migrations Supabase** : 1 migration pour les colonnes profil (poids/activité/climat/objectif calculé).
- **Server fns** : `computeDailyGoal.functions.ts`, ajout dans `payments.functions.ts` style.
- **Pas de nouveaux secrets** (Open-Meteo gratuit sans clé).

## Découpage de livraison

Je livre **dans ce message** : chantiers 1, 2, 3 entièrement + 4c (partage badges Canvas) — tout web/JS, fonctionne immédiatement.

Dans un **second message** : 4a (notifications intelligentes météo) + 4b (widget iOS scaffolding Swift). Ces deux-là demandent un build Xcode de ton côté.

OK pour ce découpage ?
