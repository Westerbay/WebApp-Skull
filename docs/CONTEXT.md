# Contexte

## État actuel

L’application propose inscription, vérification d’adresse, connexion explicite,
récupération de mot de passe et déconnexion. Les champs de mot de passe peuvent être affichés ; leur création dispose d’une jauge locale indicative. Better Auth possède les endpoints
`/api/auth/*` ; NestJS protège `GET /api/me`. PostgreSQL stocke l’authentification
et les compteurs de limitation Better Auth. Les controllers Nest possèdent leur
propre quota en mémoire par processus ; les sondes de santé en sont exclues.

Les écrans et les emails utilisent le catalogue français Paraglide. Les routes
visibles sont françaises, sans préfixe de langue. Les emails sont capturés par
Mailpit en développement ; aucun fournisseur réel n’est présupposé.

Les migrations et fixtures passent par une garde de cible locale alignée sur la
configuration Compose. Deux comptes auth de référence et 60 profils Faker aux IDs réservés peuvent être recréés
de façon déterministe et atomique. L’API journalise les
requêtes avec Pino, expose une readiness PostgreSQL bornée et ferme ses
ressources à l’arrêt. La CI rejoue contrôles rapides, intégration et E2E dans
des environnements distincts et recherche les secrets dans tout l’historique Git.

L’accueil connecté démontre la pagination par curseur avec une liste des utilisateurs
dans une TanStack Table et les actions Précédent/Suivant. Les contrats, la construction
des pages serveur et le hook `useInfiniteQuery` sont réutilisables. Le domaine métier
au-delà de cet exemple reste à définir. Les contraintes partagées, la taille
d’affichage et les réglages Faker ont leurs modules propriétaires ; le tableau
sépare son orchestration de ses composants de rendu.

Le projet est distribué sous [licence MIT](../LICENSE), avec Mathis Dubuisson
comme titulaire du copyright. La citation du dépôt lors d’une réutilisation
comme base est encouragée, mais reste facultative.

La stack locale optionnelle Alloy → Loki → Grafana collecte les logs JSON API,
avec labels de service/environnement et rétention de sept jours. Elle possède
son propre Compose et ses volumes. Un test isolé exerce le flux HTTP jusqu’à
Grafana sans base ni fichier d’environnement. Un fragment Compose de collecte
Docker prépare staging/prod avec sélection explicite par environnement, labels
stables et connexion Loki paramétrable. Son flux est testé localement dans des
conteneurs éphémères ; aucun staging/prod n’est déployé.

## Carte documentaire

- [PRODUCT.md](PRODUCT.md) : capacités et règles utilisateur.
- [ARCHITECTURE.md](ARCHITECTURE.md) : frontières et flux techniques.
- [DESIGN.md](DESIGN.md) : conventions d’interface.
- [REUSE.md](REUSE.md) : catalogue des éléments partagés.
- [DEVELOPMENT.md](DEVELOPMENT.md) : environnement et commandes.

## Limite actuelle

Le suivi des envois email est local au processus, sans file durable ni garantie
de livraison après un crash. Aucun environnement de staging ou fournisseur SMTP
réel n’est exercé par la CI. Le rate limit Nest n’est pas partagé entre les
instances ; un déploiement multi-instance exigera un adaptateur de stockage
commun.
