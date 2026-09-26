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
configuration Compose. Deux comptes auth aux IDs réservés peuvent être recréés
de façon déterministe et atomique. L’API journalise les
requêtes avec Pino, expose une readiness PostgreSQL bornée et ferme ses
ressources à l’arrêt. La CI rejoue contrôles rapides, intégration et E2E dans
des environnements distincts et recherche les secrets dans tout l’historique Git.

Le domaine produit au-delà de l’authentification reste à définir. Ne pas ajouter
une fonctionnalité de démonstration pour combler ce vide.

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
