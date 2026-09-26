# Réutilisation

## Configuration et contrats transverses

- `packages/config/src/project.json` : identité publique du produit (nom et
  description), commune au web et à l'API. Les réglages techniques restent dans
  le module qui les possède.
- `packages/contracts/src/common.ts` : schéma de l'enveloppe d'erreur échangée
  entre le web et l'API.

## Interface

Les primitives réutilisables se trouvent dans
`packages/ui/src/components`. Réutiliser notamment `Button`, `Card`, `Field`,
`Input`, `Spinner`, `Tabs` et `Sonner` avant de créer une variante locale.
Les styles et tokens communs sont dans `packages/ui/src/styles/globals.css`.

## Web

- `apps/web/src/lib/auth/auth-client.ts` : client Better Auth partagé.
- `apps/web/src/lib/auth/current-user.ts` : requête d'identité, vérification
  fraîche avant une route protégée et purge de tout cache privé lors d'une
  connexion ou déconnexion.
- `apps/web/src/lib/api/client.ts` : client OpenAPI typé, configuré avec les
  cookies de session.
- `apps/web/src/lib/query/query-client.ts` : configuration TanStack Query ; les réglages partagés sont dans `query.config.ts`.
- `apps/web/src/lib/query/query-keys.ts` : préfixe `privateQueryKeyPrefix` pour
  toutes les queries dépendant de la session ou contenant des données privées.
  Construire leurs clés avec `[...privateQueryKeyPrefix, feature, ...identifiants]`.
  Les transitions d’identité annulent puis retirent seulement ce préfixe ;
  les queries publiques, y compris celles en cours, sont conservées.
- `apps/web/src/lib/api/config.ts` : URL publique de l'API.
- `apps/web/src/lib/api/http-status.ts` : statuts nommés utilisés par le client.
- `apps/web/src/features/auth/schemas/auth-form.constraints.ts` : contrainte du nom
  propre aux formulaires d’authentification. Les schémas utilisent directement
  les bornes de mot de passe du contrat auth partagé.

- `packages/contracts/src/auth.constraints.ts` : bornes du mot de passe et durées des jetons partagées
  entre validation web, configuration serveur Better Auth et contenu des emails.

## Serveur

- `apps/api/src/infrastructure/auth/guard.ts` : protection globale Nest et
  décorateurs `Public` et `CurrentUser`.
- `apps/api/src/infrastructure/auth/auth.config.ts` : durées de session et de
  jetons, fenêtre et quotas du rate limit Better Auth.
- `packages/contracts/src/identity.ts` : forme publique de l'identité courante.
- `apps/api/src/infrastructure/http/http-error.filter.ts` : enveloppe d'erreur
  des controllers Nest ; ne pas l'appliquer aux routes Better Auth.
- `apps/api/src/infrastructure/rate-limit/rate-limit.decorators.ts` : décorateurs
  `RateLimit` et `SkipRateLimit` pour remplacer ou désactiver le quota global sur
  un controller ou une méthode Nest.
- `apps/api/src/infrastructure/rate-limit/rate-limit.config.ts` : quota Nest par
  défaut et règles propres aux endpoints. Le tracker natif utilise l’adresse
  Express non proxifiée et normalise IPv6. Les quotas Better Auth restent dans
  `infrastructure/auth/auth.config.ts`.
- `packages/database/src/client.ts` : création et fermeture du client Drizzle.
- `packages/database/src/config.ts` : réglages du pool PostgreSQL.
- `packages/database/src/target.ts` : garde commune exécutée avant toute
  ouverture de connexion par les CLI migration et seed.
- `apps/api/src/modules/health/readiness.ts` : contrat de sonde et timeout de
  readiness injectables.
- `apps/api/src/infrastructure/logging/logging.ts` : logger Pino et contrat de
  sérialisation HTTP nettoyé.
- `apps/api/src/seeds/seed.ts` : contrat pur `SeedScenario`, préparation globale
  avant mutation et exécution d’une sélection ; `apps/api/src/seeds/registry.ts`
  possède l’ordre central et refuse les noms absents ou dupliqués.
- `apps/api/src/seeds/auth/scenario.ts` : scénario et fixtures auth sans
  dépendance à Drizzle.
- `apps/api/src/seeds/auth/store.ts` : adaptateur de
  persistance des fixtures auth ; il centralise la détection des IDs réservés et
  les remplacements/nettoyages transactionnels.
- `apps/api/test/support/auth.harness.ts` : application, base possédée, Mailpit
  et helpers HTTP partagés uniquement par les suites d’intégration et E2E auth.
- `apps/api/src/openapi/config.ts` : chemin de documentation et version de l'API.

Ajouter ici seulement une capacité destinée à plusieurs consommateurs, avec sa
source et sa règle d'usage.

## Auth et messages

- `packages/core/src/email.ts` : port email indépendant des technologies.
- `packages/email/src/auth-email.tsx` : rendu HTML et texte des emails auth,
  avec locale explicitement fournie par le consommateur.
- `packages/email/src/config.ts` : modes d’envoi validés, capture locale,
  production SMTP et allowlist exacte en staging.
- `apps/api/src/infrastructure/email/auth-email-dispatcher.ts` : envois suivis,
  événements nettoyés et drainage à l’arrêt.
- `packages/i18n/messages/<locale>.json` : catalogues sélectionnés ; importer uniquement les
  fonctions requises depuis `@workspace/i18n/messages`.
- `packages/i18n/src/config.ts` : `DEFAULT_LOCALE` et `SUPPORTED_LOCALES`
  dérivés du runtime Paraglide généré.
- `apps/web/src/features/auth/components/auth-input.tsx` : champ auth avec label,
  erreurs associées et saisie contrôlée ; réutiliser dans les formulaires auth.
- `apps/web/src/features/auth/components/auth-panel.tsx` : cadre commun aux
  étapes d’authentification.
- `apps/web/src/features/auth/hooks` : inscription, connexion, demandes email,
  reset et déconnexion ; ne pas importer une route depuis un hook.
- `apps/web/src/lib/auth/redirect.ts` : `getSafeInternalRedirect`, validation restrictive d’un retour interne.
- `apps/web/src/lib/seo/private-head.ts` : métadonnées auth/privé sans indexation.

Le champ auth-input associe chaque label et erreur à un identifiant unique. Il délègue la visibilité du mot de passe à `password-input.tsx` et possède l’aide et l’option showStrength pour les champs de création. Le composant password-strength est partagé par l’inscription et le reset.

## Pagination

- `packages/contracts/src/pagination.constraints.ts` : bornes de `cursor`/`limit`
  et taille par défaut du contrat, partagées entre schéma et consommateurs.
- `packages/contracts/src/pagination.ts` : paramètres bornés `cursor`/`limit`,
  factory `cursorPageSchema` et type `CursorPage<T>` pour `{ items, nextCursor }`.
- `apps/api/src/infrastructure/pagination/cursor-page.ts` : construction d’une
  page à partir de `limit + 1` lignes ; fournir le curseur du dernier élément
  visible et garder le même ordre unique dans la requête.
- `apps/web/src/lib/query/use-cursor-infinite-query.ts` : hook
  `useCursorInfiniteQuery` et factory `cursorInfiniteQueryOptions` ; fournir
  clé et queryFn, transmettre le signal d’annulation, inclure filtres et taille
  dans la clé et utiliser le préfixe privé pour les données liées à une session.
  Les paramètres de curseur sont configurés automatiquement ; les options
  natives de `QueryObserverOptions`, `maxPages` et `subscribed` restent disponibles.

## Localisation

- `packages/i18n/src/routing.ts` : chemins publics et callbacks auth localisés.
- `packages/i18n/routing.json` : correspondance des routes internes anglaises et
  chemins publics de chaque langue sélectionnée.
- `packages/i18n/routing-config.mjs` : validation des routes et construction des
  patterns partagées par génération et compilation.
- `packages/i18n/compile.mjs` : compilation des messages et URL Paraglide.
- Dans le dépôt de maintenance : `scripts/template-profiles.mjs` définit les
  trois profils pour génération, archives et CI. `template-generator.mjs` prépare
  et valide les données avant écriture ; `template-files.mjs` possède la copie.
- `scripts/template-archives.mjs` : création des ZIP depuis des projets propres,
  partagée entre commande locale et CI ; fichiers cachés requis et permissions conservés.
- `apps/api/src/infrastructure/auth/email-locale.ts` : langue des emails déduite
  du callback sous l’origine web autorisée ; repli sur la langue par défaut.

## Observabilité

- `apps/api/src/infrastructure/logging/logging.config.ts` : validation des
  réglages de logging à la frontière ; JSON/stdout imposés hors développement.
- `compose.logs-collector.yml` : fragment de collecteur Docker pour une destination Loki externe ; aucun déploiement applicatif ou backend d’observabilité.
- `infra/observability` : configurations Alloy fichier/Docker, stockage Loki et
  provisionnement Grafana. Labels stables seulement, aucun identifiant de
  requête/utilisateur indexé.
- `scripts/test-logs.mjs` : assertions du flux réel Nest vers la datasource
  Grafana ; `scripts/support/logs-test-harness.mjs` possède les ressources Docker
  isolées, leur nettoyage et les délais de polling.

- `scripts/test-docker-logs.mjs` : test local du fragment de collecte, des labels de service et de la sélection par environnement/opt-in.
