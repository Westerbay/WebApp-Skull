# Observabilité

La stack locale optionnelle fournit des dashboards Grafana, des logs Loki,
des métriques Prometheus, une sonde HTTP de readiness Blackbox et des règles
d’alerte Prometheus. Elle sert d’environnement de développement et d’exemple
d’intégration versionné. Une plateforme de production doit fournir un accès
privé, un stockage durable et l’acheminement des notifications.

## Utilisation locale

```bash
pnpm logs:up
pnpm dev:logs
```

Ouvrir [Grafana](http://localhost:3002/d/webapp-template-api-overview). Les quatre
dashboards sont provisionnés depuis `infra/observability/grafana/dashboards`
et modifiés dans Git. Ils sont reliés entre eux et partagent les filtres
d’environnement, de service et d’instance. Le dashboard des routes ajoute
des filtres de route, méthode et statut, ainsi qu’une recherche littérale par
identifiant de requête. Les annotations de déploiement utilisent les logs
`api.started` et leur version.

`dev:logs` démarre l’application avec une copie JSON des logs dans
`output/logs/api.jsonl` et active le serveur de métriques séparé. Pour que
Docker puisse joindre l’hôte, cette commande utilise `METRICS_HOST=0.0.0.0`
par défaut ; restreindre l’accès avec le pare-feu de l’hôte ou choisir une
interface précise accessible au collecteur. Le démarrage normal de l’API
laisse les métriques désactivées et l’hôte par défaut du serveur de métriques
est `127.0.0.1`. Les ports d’interface publiés par Grafana, Prometheus, Loki et
Alloy sont liés à la boucle locale. Blackbox ne publie aucun port.

Grafana autorise la consultation anonyme en local et désactive le formulaire
de connexion. Les logs et métriques ont une rétention locale de sept jours.
La copie JSON de développement n’a pas de rotation automatique. Arrêter la
stack sans supprimer ses données avec :

```bash
pnpm logs:down
```

Pour une démonstration autonome sans `.env` local ni base existante :

```bash
pnpm logs:preview
```

Cette commande lance l’environnement de test d’intégration, affiche une URL
Grafana sur un port aléatoire de la boucle locale et continue à générer du
trafic d’exemple. Ctrl+C l’arrête et supprime uniquement ses propres
conteneurs, volumes et fichiers temporaires. Les réponses HTTP d’authentification
de cet environnement sont simulées ; PostgreSQL, Valkey, les collecteurs, le
stockage et les sondes sont réels. Aucune base applicative n’est peuplée.

## Ce que mesurent les dashboards

| Dashboard           | Objectif                                                                                                                                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| API overview        | État de la collecte, sonde de readiness, trafic applicatif, proportion de 5xx, p50/p95/p99 des requêtes réussies, latence des requêtes échouées, requêtes en cours et versions déployées.                                                                                                              |
| API routes and logs | Résultats HTTP, tendances 401/403/429, routes normalisées les plus utilisées, en échec ou les plus lentes, erreurs structurées et corrélation par identifiant de requête.                                                                                                                              |
| API infrastructure  | CPU Node.js, RSS et tas mémoire, retard de la boucle événementielle, ramasse-miettes, durée de fonctionnement du processus, redémarrages observés, observations des dépendances, connexions et charge SQL PostgreSQL, ressources Valkey, collectes des services de supervision et alertes déclenchées. |
| API auth and email  | Résultats HTTP Better Auth et blocages par quota, résultats et durée du transport email, événements assainis des fournisseurs et des échecs.                                                                                                                                                           |

Les endpoints de santé sont exclus des graphiques et alertes de trafic,
d’erreur et de latence applicatifs. Les durées des succès, erreurs client et
erreurs serveur sont séparées. Les percentiles d’histogrammes sont des
estimations. Sans trafic, la proportion d’erreurs n’est pas définie ; les
échantillons manquants restent **No data/Unknown** au lieu d’indiquer un succès.

Les routes proviennent des modèles du framework. L’adaptateur HTTP Better Auth
construit son mécanisme de correspondance à partir des métadonnées des endpoints
API configurés, y compris les chemins des plugins, les méthodes HTTP et les
modèles paramétrés tels que `/reset-password/:token`. Il utilise le même moteur
de routage que Better Auth ; ajouter un endpoint de contrôleur ou un plugin
d’authentification ne nécessite aucune liste de routes d’observabilité ni
décorateur supplémentaire. Les endpoints d’authentification désactivés et ceux
réservés au serveur sont exclus. Les chemins inconnus deviennent `unmatched`
ou `/api/auth/*`. Les paramètres d’URL, identifiants de requête, emails et
identifiants utilisateur ne deviennent jamais des labels de métriques.
Les logs contiennent des métadonnées de requête assainies et les identifiants
de requête ; les en-têtes, corps, cookies, chaînes de requête et tokens de
réinitialisation sont exclus. Seules les identités de service, d’environnement
et d’instance sont indexées dans Loki.

Un email **accepted** signifie que le transport configuré a accepté le message,
pas qu’il est arrivé dans une boîte de réception. Les résultats HTTP
d’authentification ne mesurent ni les utilisateurs uniques ni la conversion
métier. Le développement peut utiliser le transport email en mémoire.

Les exportateurs amont PostgreSQL et Redis/Valkey intégrés à Alloy collectent
les métriques des dépendances indépendamment de l’API. Prometheus interroge
leurs endpoints privés. Les requêtes PostgreSQL personnalisées exposent des
agrégats fixes limités à la base et au rôle configurés, ainsi que la capacité
de connexion globale du serveur. Le DSN impose un délai maximal de 1,5 seconde
par requête, des sessions en lecture seule et un délai de connexion de deux
secondes. La collecte Valkey utilise le délai de connexion de deux secondes
de l’exportateur ; les parcours de clés et leurs valeurs sont désactivés.
Les filtres d’instance API s’appliquent uniquement aux signaux du processus API,
pas à l’infrastructure partagée. L’alerte de dépendance Valkey dépend de son
indicateur d’activation dans l’API. Les échecs de collecte des exportateurs
sont présentés séparément de la readiness API ; l’absence de données n’est
pas un succès.

Un exportateur PostgreSQL séparé collecte les agrégats `pg_stat_statements`
par défaut. Ses échecs ne masquent pas les observations PostgreSQL de base.
Le Compose de développement configure automatiquement les nouvelles bases ;
les bases déployées nécessitent l’intervention de leur administrateur.
Voir [POSTGRESQL-PERFORMANCE.md](POSTGRESQL-PERFORMANCE.md) pour l’activation,
le périmètre, les effets des réinitialisations et évictions, et l’utilisation
temporaire d’`auto_explain`.

Les métriques Node.js concernent le processus API, pas l’hôte entier. La
détection des redémarrages nécessite une identité d’instance stable et des
échantillons avant et après le redémarrage. Les compteurs de remplacement
de conteneurs, les métriques disque/réseau de l’hôte, les traces de requêtes
SQL et les mesures du navigateur utilisateur nécessitent des exportateurs
de plateforme ou une instrumentation supplémentaire.

## Configuration et intégration en production

L’API possède la validation dans
`apps/api/src/infrastructure/observability/observability.config.ts` :

- `METRICS_ENABLED=true` active les métriques sur un serveur HTTP séparé.
- `METRICS_HOST` choisit son interface privée ; valeur par défaut : `127.0.0.1`.
- `METRICS_PORT` vaut `9464` par défaut.
- `APP_VERSION` est un identifiant de version de longueur bornée, tel qu’un SHA Git ; valeur par défaut : `unknown`.

La collecte d’infrastructure est configurée dans
`infra/observability/config.alloy`, avec les agrégats SQL dans `postgres.yml`
et `postgres-statements.yml`. Le Compose local accepte `OBS_POSTGRES_DSN` et
`OBS_VALKEY_URL` ; ses valeurs par défaut correspondent à `.env.example` et
ciblent les services de l’hôte via `host.docker.internal`. Exporter ces variables
dans le shell pour utiliser d’autres cibles. `logs:up` ne charge pas de vrai
`.env`. Un Valkey limité à la boucle locale peut nécessiter un réseau Docker
privé ou une interface accessible au collecteur ; ne pas l’exposer publiquement.
Le test isolé utilise le DNS des conteneurs.

En production, configurer un collecteur par base et rôle, et par instance Valkey,
avec les identifiants fournis par le mécanisme de secrets de la plateforme.
Conserver le SQL en lecture seule et les délais maximaux ; utiliser un TLS
vérifié pour les cibles PostgreSQL distantes. Le DSN local désactive TLS
uniquement pour le conteneur de développement. Ne pas accorder de privilèges
de supervision supplémentaires à l’API. Retirer le job de collecte des
statistiques SQL pour les désactiver ; retirer celui de Valkey lorsque Valkey
n’est pas utilisé. Alloy inclut déjà les deux exportateurs : aucune image
de conteneur ni aucun package applicatif supplémentaire n’est nécessaire.
Les endpoints des exportateurs et l’interface de diagnostic Alloy doivent
rester privés. Le Compose fourni est exclusivement local.

Seul `GET /metrics` est servi sur ce serveur. Il ne partage ni le routeur
public de l’API ni son authentification par session. Le conserver sur un réseau
ou une interface privés et utiliser les contrôles d’accès réseau de la
plateforme ou un proxy de collecte authentifié si nécessaire. Ne jamais
exposer publiquement la stack locale anonyme Grafana/Loki/Prometheus.

Les cibles locales de collecte et de sondes dans
`infra/observability/prometheus/prometheus.yml` supposent le port API 3001 de
l’hôte et le port de métriques 9464. Les adapter pour d’autres ports. Utiliser
une cible de collecte par réplica API, avec des labels correspondant à son
environnement et à son service réels. Les échantillons applicatifs portent
aussi `instance_id`, partagé avec leurs logs. Configurer un nom d’hôte ou une
identité d’instance stable, unique pour chaque réplica simultané. Les sondes
représentent l’endpoint du service et s’appliquent à toutes les instances ;
les filtres d’instance API ne réduisent pas le périmètre de disponibilité du service.

En production, provisionner les dashboards avec des sources compatibles Loki
et Prometheus ayant les UID `loki` et `prometheus`. Collecter les métriques de
chaque instance API de manière privée. Le collecteur Docker dans
`infra/compose/logs-collector.yml` transmet la sortie standard JSON des
conteneurs explicitement sélectionnés à un backend Loki géré séparément.
Il nécessite `APP_ENV=staging|production` et l’URL complète `LOKI_URL` ; les
réglages de fichier de token et de tenant sont facultatifs. Les conteneurs
doivent porter `webapp-template.logs=true` et un label `webapp-template.logs.environment`
correspondant. Même en lecture seule, l’accès au socket Docker donne de larges
privilèges sur l’hôte et exige une plateforme de confiance.

Exécuter une sonde hors du processus API contre l’URL du service déployé. La
sonde Docker locale prouve uniquement la connectivité et la readiness locales ;
un point de supervision indépendant est nécessaire pour mesurer la disponibilité
publique du DNS, de TLS et du réseau. Configurer séparément l’accès sécurisé
à la plateforme, la rétention, les sauvegardes et les notifications. Cette
intégration ne fournit ni traces ni confirmation de livraison réelle des emails.

## Règles d’alerte et procédures de diagnostic

Les règles sont dans `infra/observability/prometheus/rules.yml`. Leurs seuils
sont des valeurs de départ, pas un objectif de niveau de service établi.
Les adapter au trafic attendu et aux objectifs convenus de disponibilité et
de latence. Des seuils minimaux de trafic suppriment les alertes de proportion
lorsque le nombre d’échantillons est trop faible. Les alertes de sonde et de
collecte fonctionnent même sans trafic applicatif.

Prometheus évalue les règles et le dashboard d’infrastructure montre les
conditions déclenchées. Aucune destination de notification n’est configurée.
En production, acheminer les alertes via la configuration Alertmanager/Grafana,
tester leur livraison, remplacer les annotations locales `dashboard_url` et
référencer ces procédures depuis la documentation de la plateforme.

### PostgresQueryStatisticsUnavailable

La collecte des statistiques SQL échoue depuis deux minutes alors qu’elle est
activée. Vérifier l’installation de `pg_stat_statements` dans `public`, son
préchargement par le serveur, les permissions de lecture du rôle du collecteur
et le délai maximal des requêtes. La readiness PostgreSQL est indépendante de
cet avertissement. Suivre [POSTGRESQL-PERFORMANCE.md](POSTGRESQL-PERFORMANCE.md)
pour la configuration ; ne pas réinitialiser les statistiques ni accorder de
larges privilèges de supervision pour faire disparaître l’alerte.

### ApiUnavailable

La readiness ou la collecte de sa sonde échoue depuis deux minutes. Vérifier
la connectivité de la sonde, les logs API, le dernier déploiement et PostgreSQL
ainsi que Valkey s’il est activé. Comparer liveness et readiness pour distinguer
un processus inaccessible d’un échec de dépendance.

### ApiMetricsMissing

Une collecte échoue ou le job de collecte API est absent depuis trois minutes.
Vérifier le serveur de métriques, le réseau privé, la cible configurée et la
page des cibles Prometheus. Ne pas déduire une absence d’erreurs d’échantillons manquants.

### ApiHighServerErrorRate

Les 5xx dépassent 5 % pendant cinq minutes, avec au moins 30 requêtes par
fenêtre de cinq minutes. Ouvrir les routes en échec et filtrer les logs par
identifiant de requête. Vérifier les annotations de déploiement, les observations
des dépendances et les erreurs de validation des réponses.

### ApiSlowRequests

Le p95 des requêtes réussies dépasse une seconde pendant dix minutes, avec
le même seuil minimal de trafic. Examiner les routes lentes, le retard de la
boucle événementielle, le CPU et les observations des dépendances. La latence
d’observation est un indice de diagnostic, pas un profil des requêtes métier.

### ApiDependencyUnavailable

L’observation d’une dépendance activée échoue depuis deux minutes. Vérifier
sa disponibilité, l’accès réseau et les permissions d’observation
(`pg_stat_activity`/Valkey `INFO`). Examiner la readiness séparément : un
échec de permission de supervision peut survenir alors que les requêtes métier réussissent.

### PostgresConnectionPressure

Les connexions serveur dépassent 80 % de la capacité configurée pendant dix
minutes. Examiner le nombre de réplicas et de connexions des pools, les
traitements actifs et l’attente de verrous. Utiliser un collecteur par serveur
et rôle pour éviter les observations en double.

### ValkeyMemoryPressure

La mémoire dépasse 80 % d’une limite configurée strictement positive pendant
dix minutes. Examiner le trafic des quotas, la croissance des espaces de noms
et les événements serveur. Une limite nulle signifie illimité et ne permet
pas de calculer un pourcentage de capacité.

### ApiEventLoopDelay

Le retard p99 de la boucle événementielle dépasse 100 ms pendant dix minutes.
Le corréler au CPU du processus, au ramasse-miettes et à la latence des requêtes
réussies. Examiner les traitements synchrones avant de modifier les limites de ressources.

### AuthEmailFailures

Les échecs dépassent 10 % pendant cinq minutes, avec au moins cinq résultats
de transport par fenêtre de dix minutes. Vérifier la connectivité du fournisseur
email, les règles d’expéditeur et de destinataire, et les logs d’échec assainis.
Ne pas supposer de garantie de nouvelle tentative ni de livraison en boîte de réception.

### ObservabilityCollectorUnavailable

Loki, Alloy ou Blackbox ne peut plus être interrogé depuis trois minutes.
Vérifier la santé et les logs du service concerné avant d’interpréter l’absence
d’observations applicatives.

## Validation

```bash
pnpm logs:check
pnpm logs:test
pnpm logs:test:docker
```

Toutes ces commandes nécessitent Docker. `logs:check` utilise l’image Prometheus
épinglée pour valider la configuration et tester les durées d’alerte, les seuils
minimaux de trafic, les métriques manquantes, l’exclusion des sondes et le
comportement optionnel de Valkey. `logs:test` utilise ses propres services
temporaires pour exercer les vrais logs HTTP Nest, les résultats email, les
observations PostgreSQL/Valkey, la readiness externe et chaque requête de
panneau de dashboard via Grafana. Le test du collecteur Docker vérifie la
sélection explicite des conteneurs et l’isolation des environnements contre
un Loki local.

Valider le fragment du collecteur déployé sans contacter de backend distant :

```bash
APP_ENV=staging LOKI_URL=https://logs.example.invalid/loki/api/v1/push \
  docker compose --env-file /dev/null -f infra/compose/logs-collector.yml config --quiet
```
