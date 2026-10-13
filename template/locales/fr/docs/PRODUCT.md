# Produit

## Capacités

Créer un compte avec nom, email et mot de passe ; vérifier l’adresse via un
lien email ; se connecter et consulter le dashboard du compte ; se déconnecter ;
demander un nouveau lien de vérification ou réinitialiser un mot de passe.

Le dashboard affiche un exemple de tableau utilisateurs avec noms, emails et
statuts de vérification par pages de 20. Suivant charge une nouvelle page ;
Précédent revient aux données en cache. La recherche trouve une partie du nom
ou de l’email sans tenir compte de la casse. Une pause de 300 ms dans la saisie
applique le filtre et revient à la première page ; vider la recherche restaure
la liste sans filtre. La recherche est limitée à 100 caractères ; les caractères
joker SQL sont traités littéralement. Les mots de passe peuvent être affichés
ou masqués. L’inscription et la réinitialisation affichent une jauge de robustesse
indicative qui ne modifie pas les règles d’acceptation.

## Règles

Les nouveaux mots de passe sont vérifiés avec Have I Been Pwned en staging et
production. Les mots de passe compromis sont refusés ; les mots de passe de
connexion existants ne sont pas vérifiés. Après un refus ou un échec de la
vérification lors d’une réinitialisation, demander un nouveau lien.

- La vérification est obligatoire avant la connexion et l’accès aux routes privées.
- L’inscription et la vérification ne connectent pas automatiquement.
- Les mots de passe contiennent 8 à 128 caractères et ne sont pas transformés.
- Les liens de vérification expirent après 24 heures ; ceux de réinitialisation après une heure.
- Une réinitialisation réussie révoque les sessions et nécessite une nouvelle connexion.
- Les sessions durent sept jours et peuvent être renouvelées après un jour.
- Les demandes d’email ne révèlent pas si un compte existe. Leur acceptation ne garantit pas la livraison ; un nouveau lien peut être demandé.
- Better Auth autorise cinq requêtes sensibles par minute, adresse réseau et endpoint, avec une limite générale de 100.
- Nest autorise 120 requêtes par minute, pair réseau et endpoint ; `/api/me` en autorise 30. Les sondes de santé restent disponibles.
- Tout utilisateur connecté avec une adresse vérifiée peut lire la liste d’exemple, emails compris. Aucun rôle administrateur n’existe.
- L’anglais est la langue source par défaut. Les projets français ont des écrans, emails, documents et chemins publics français, tout en conservant les identifiants de code anglais.
- Les projets multilingues sélectionnent la langue depuis l’URL publique. Les liens d’action auth conservent cette langue ; les endpoints API ne sont pas traduits.

## Limites

Aucun domaine métier supplémentaire, rôle, OAuth, MFA, stockage de fichiers,
traitement durable en arrière-plan ou fournisseur email externe obligatoire
n’est défini.

## Quotas partagés optionnels

Valkey peut partager les quotas Nest existants entre instances API. Sans lui,
les quotas restent locaux au processus. Un échec de contrôle partagé renvoie 503. Les limites Better Auth restent dans PostgreSQL ; les sondes de santé
restent exemptées.
