# Performances PostgreSQL

L’intégration `pg_stat_statements` ajoute les tendances de charge SQL au
dashboard d’infrastructure Grafana. La collecte est activée par défaut dans
la stack d’observabilité, indépendamment du serveur de métriques de l’API.
Elle nécessite des colonnes de statistiques compatibles avec PostgreSQL 17.
Le démarrage de l’API et les migrations applicatives n’installent aucune extension.

## Configuration locale

Le service Compose de développement standard précharge `pg_stat_statements` :

```bash
pnpm dev:infra
```

Les nouvelles bases installent l’extension grâce au script d’initialisation
monté. Les conteneurs existants sont recréés pour appliquer les réglages de
préchargement, en conservant leur volume de données. Les scripts
d’initialisation ne sont pas réexécutés sur les volumes existants. Pour un
volume local existant, installer explicitement l’extension avec son administrateur :

```bash
docker compose exec postgres \
  sh -c 'psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/query-statistics.sql'
```

Démarrer l’API avec `pnpm dev:logs` et le collecteur avec `pnpm logs:up`.
Les valeurs par défaut du DSN local du collecteur correspondent à `.env.example` ;
exporter `OBS_POSTGRES_DSN` pour utiliser une autre base ou un autre rôle.
Pour désactiver la collecte, retirer le job de collecte
`webapp-template-postgres-statements` de la configuration Prometheus. Il n’est pas
nécessaire de réinitialiser les statistiques ni de supprimer un volume.

## Configuration en production

L’administrateur de la base ou la plateforme d’hébergement doit ajouter
`pg_stat_statements` à `shared_preload_libraries`, en conservant les autres
bibliothèques préchargées, activer les identifiants de requête
(`compute_query_id=auto` suffit généralement) et redémarrer PostgreSQL.
Installer `pg_stat_statements` dans la base applicative, dans le schéma `public`.
Le service Compose de développement illustre ces réglages ; les bases déployées
restent gérées par leur administrateur ou leur plateforme d’hébergement.

Configurer le DSN PostgreSQL d’Alloy via le mécanisme de secrets de la plateforme.
Le rôle du collecteur doit pouvoir lire `public.pg_stat_statements(false)` et
`public.pg_stat_statements_info` ; les privilèges de superutilisateur et
`pg_read_all_stats` ne sont pas nécessaires pour observer son propre rôle.
Se connecter avec le rôle applicatif pour conserver le périmètre de charge du
rôle courant, ou adapter délibérément le SQL et les permissions à un rôle de
supervision dédié. Les réplicas applicatifs ne collectent plus ces statistiques.

L’exportateur de statistiques SQL est séparé des observations de base sur les
connexions. Son état combine la réussite de la collecte, la connectivité
PostgreSQL et les erreurs de requête de l’exportateur. Une extension absente
déclenche un avertissement sans faire échouer la readiness de l’API. Les
requêtes du dashboard masquent les échantillons de charge lorsque la collecte
échoue. Le DSN local fourni impose un délai maximal de 1,5 seconde par requête,
des sessions en lecture seule et un délai de connexion de deux secondes ;
conserver des limites équivalentes dans la configuration du collecteur déployé.

## Lecture du dashboard

Les panneaux montrent l’état de la collecte, les exécutions SQL par seconde,
le temps moyen pondéré d’exécution SQL, le taux de succès du cache de blocs
partagés, les écritures de blocs temporaires et le nombre de familles de
requêtes conservées. Le temps d’exécution exclut l’attente côté application,
réseau et pool de connexions, et ne fournit pas de p95/p99. Les lectures de
blocs partagés peuvent être servies par le cache du système d’exploitation ;
les blocs temporaires sont des nombres de blocs, pas des octets. Les requêtes
de supervision sont incluses.

L’exportateur expose uniquement des agrégats fixes, jamais le texte SQL, les
paramètres liés, les identifiants de requête, les noms de bases ou de rôles.
Utiliser un collecteur par base et par rôle. Les panneaux supposent une base
et un rôle par service et environnement ; des bases distinctes nécessitent
des identités de supervision distinctes. Les échantillons d’infrastructure
restent disponibles lorsque l’API est arrêtée et ignorent les filtres
d’instance de l’API.

Les totaux source peuvent diminuer après une réinitialisation, un redémarrage
ou l’éviction d’une entrée. Prometheus gère les remises à zéro de compteurs
observées, mais le renouvellement des entrées peut fausser les débits. Utiliser
ces valeurs comme tendances de diagnostic, pas comme comptabilité exacte ou
objectifs de niveau de service. L’horodatage de réinitialisation est aussi
exposé. Ne jamais réinitialiser les statistiques d’une base partagée pour
mesurer un changement ; comparer des instantanés sur une fenêtre de trafic connue.

Pour une investigation privée par un opérateur, identifier les familles de
requêtes coûteuses sans retourner leur texte SQL :

```sql
SELECT queryid, calls, total_exec_time, mean_exec_time,
       shared_blks_hit, shared_blks_read, temp_blks_written
FROM public.pg_stat_statements(false)
WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
  AND userid = current_user::regrole::oid AND toplevel
ORDER BY total_exec_time DESC
LIMIT 20;
```

## Quand utiliser auto_explain

`pg_stat_statements` identifie les charges coûteuses ; `auto_explain` enregistre
les plans pour comprendre pourquoi une requête est lente. Commencer par une
requête représentative et maîtrisée avec un simple `EXPLAIN` en staging.
Utiliser temporairement `auto_explain` dans une session de diagnostic
privilégiée lorsque les plans lents intermittents sont difficiles à reproduire :

```sql
LOAD 'auto_explain';
SET auto_explain.log_min_duration = '1s';
SET auto_explain.sample_rate = 0.1;
SET auto_explain.log_analyze = off;
SET auto_explain.log_timing = off;
SET auto_explain.log_parameter_max_length = 0;
```

Ces réglages concernent uniquement cette session ; ils n’instrumentent pas les
autres connexions du pool de l’API. Se déconnecter ensuite. La journalisation
des paramètres est désactivée, mais le texte SQL, les littéraux et les détails
des plans peuvent toujours contenir des données sensibles. Restreindre l’accès
aux logs de la base et ne pas les transmettre par le pipeline de logs API
assainis. `log_analyze` ajoute un coût d’instrumentation à l’exécution ; évaluer
l’échantillonnage et ce coût avant toute utilisation en production gérée par
la plateforme. Rien dans ce template n’active automatiquement `auto_explain`.

Références : [pg_stat_statements](https://www.postgresql.org/docs/17/pgstatstatements.html)
et [auto_explain](https://www.postgresql.org/docs/17/auto-explain.html).
