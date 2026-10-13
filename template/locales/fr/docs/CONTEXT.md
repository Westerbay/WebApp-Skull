# Contexte

WebApp Template est une base full-stack réutilisable. Elle fournit un parcours
d’identité fonctionnel, un exemple de tableau utilisateurs avec recherche et
une infrastructure locale optionnelle ; elle ne prescrit pas le domaine métier
du prochain projet.

Le web utilise TanStack Start, Query, Form et Table. NestJS compose l’API,
Better Auth gère l’identité et PostgreSQL assure la persistance. Les contrats
Zod partagés, la localisation Paraglide et les primitives UI ont leurs packages
séparés. Voir [ARCHITECTURE.md](ARCHITECTURE.md) pour les frontières et
[REUSE.md](REUSE.md) pour les points d’extension partagés.

Le template permet l’inscription, la vérification d’adresse, la connexion,
la réinitialisation du mot de passe et la déconnexion. Le dashboard illustre
la pagination par curseur et la recherche. Les emails de développement sont
capturés localement. Valkey peut partager les quotas Nest entre réplicas ; une
stack Grafana optionnelle fournit logs, métriques, dashboards, sondes de readiness
et règles d’alerte initiales. Les statistiques de charge SQL PostgreSQL sont
activées par défaut dans la stack d’observabilité. Alloy intègre les exportateurs
de dépendances : leur supervision est indépendante des processus API. Ni Valkey
ni la stack d’observabilité ne sont nécessaires à l’application de base.

## Carte documentaire

- [PRODUCT.md](PRODUCT.md) : capacités et règles durables.
- [ARCHITECTURE.md](ARCHITECTURE.md) : frontières des modules et flux.
- [DESIGN.md](DESIGN.md) : conventions d’interface.
- [REUSE.md](REUSE.md) : points d’extension réutilisables.
- [DEVELOPMENT.md](DEVELOPMENT.md) : installation, commandes et procédures.
- [OBSERVABILITY.md](OBSERVABILITY.md) : dashboards, métriques, alertes et procédures de diagnostic.
- [POSTGRESQL-PERFORMANCE.md](POSTGRESQL-PERFORMANCE.md) : activation des statistiques SQL, interprétation et diagnostic ciblé.

## Limites actuelles

Le domaine métier au-delà de l’exemple reste à définir. L’envoi email ne dispose
ni d’une file durable ni d’une garantie de livraison après un crash. Sans Valkey,
les quotas Nest sont locaux au processus. La localisation couvre les messages
d’interface et d’email ainsi que les chemins publics, pas des contenus traduits
persistés. L’hébergement de l’observabilité en production, l’acheminement des
notifications et les sondes publiques indépendantes relèvent de la plateforme ;
les traces ne sont pas fournies. Le collecteur de logs Docker destiné aux
environnements déployés est vérifié localement, pas contre un backend de staging
ou de production.

Le projet utilise la [licence MIT](../LICENSE), copyright Mathis Dubuisson.
La mention du projet lors de sa réutilisation est encouragée, mais facultative.
