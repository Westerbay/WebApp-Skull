# Produit

## Recherche utilisateurs

La recherche trouve une partie du nom ou de l’email sans tenir compte de la
casse, sur toute la liste. Après 300 ms sans saisie, le filtre s’applique et
revient à la première page. Effacer le champ rétablit la liste complète.
La saisie est limitée à 100 caractères ; les caractères SQL `%` et `_` restent
littéraux.

## Mots de passe compromis

En staging/production, les nouveaux mots de passe sont vérifiés avec Have I
Been Pwned. Les mots de passe compromis sont refusés ; une erreur du service
laisse le mot de passe inchangé. La connexion existante n’est pas vérifiée.
Après un refus ou une erreur pendant le reset, demander un nouveau lien.

## Capacités

Créer un compte avec nom, email et mot de passe ; confirmer l’adresse avec le
lien reçu ; se connecter et consulter son espace ; se déconnecter ; demander
un nouveau lien de vérification ou un changement de mot de passe.

L’accueil connecté présente un tableau d’exemple des utilisateurs (nom, email et
statut de vérification), par pages de 20. Suivant charge une page supplémentaire ;
Précédent revient à une page déjà chargée.

## Règles

- L’adresse doit être vérifiée avant la connexion et l’accès aux routes privées.
- L’inscription et la vérification ne connectent pas automatiquement.
- Le mot de passe contient entre 8 et 128 caractères, sans transformation.
- Le lien de vérification est valable 24 heures ; le reset, une heure.
- Un reset réussi révoque les sessions et exige une nouvelle connexion.
- La session dure 7 jours et peut être renouvelée après un jour.
- Les demandes d’email ne révèlent pas si un compte existe. Une demande reçue
  ne garantit pas que le message a été livré ; le renvoi reste disponible.
- Better Auth limite les tentatives sensibles à 5 par minute par adresse réseau
  et endpoint ; son plafond général est de 100 par minute.
- Les controllers Nest acceptent 120 requêtes par minute et pair réseau par
  endpoint ; `/api/me` en accepte 30. Les sondes de santé restent disponibles.
- Tout compte connecté avec une adresse vérifiée peut consulter cette liste
  d’exemple, y compris les emails. Aucun rôle administrateur n’est défini.
- L’interface, les emails et les chemins publics sont français. Le code et les
  routes internes restent anglais. Les callbacks auth conservent la langue ;
  les endpoints API ne sont pas traduits.

## Limites

Aucun domaine métier supplémentaire, rôles, OAuth, MFA, stockage de fichiers,
file de jobs durable ou fournisseur email imposé.

Le mot de passe peut être affiché ou masqué dans chaque champ. Une jauge indicative accompagne sa création à l’inscription et au reset ; elle ne change pas les critères d’acceptation.

## Quotas partagés optionnels

Valkey partage les quotas Nest existants entre instances API. Sans activation,
ils restent locaux au processus. Une panne du contrôle partagé retourne 503.
Better Auth conserve ses quotas PostgreSQL ; les sondes de santé restent exemptes.
