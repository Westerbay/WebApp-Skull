# Design

Utiliser les tokens Tailwind et primitives partagés de `packages/ui`. Y placer
les modèles UX réutilisables et garder les compositions propres à une
fonctionnalité avec celle-ci. Privilégier les éléments natifs ayant le bon sens
sémantique. Chaque contrôle doit avoir un label associé, un focus visible et
des retours utiles pour le chargement, les états vides et les erreurs.
Préserver la navigation clavier, le lien d’évitement et l’utilisabilité sur
écran étroit. Les écrans produit ne doivent pas exposer le vocabulaire d’infrastructure.

## Formulaires et retours

Associer labels, aides et erreurs de validation à des identifiants de champ
uniques. Placer les erreurs de champ à côté du champ et celles de soumission
dans le formulaire ; éviter de répéter la même erreur dans un toast. Conserver
les valeurs saisies pendant la soumission et désactiver les actions en double.
Ne pas promettre la livraison d’un email lorsqu’une demande a seulement été acceptée.

Les formulaires auth utilisent une colonne lisible et des contrôles d’au moins
44 px de haut. La visibilité du mot de passe doit fonctionner au clavier.
L’indication de robustesse est indicative et ne doit pas modifier l’acceptation
du mot de passe. Garder les tokens de mot de passe hors des métadonnées et URL.
Les pages auth restent noindex et no-referrer.

## Localisation

Chaque texte visible, y compris les erreurs de fournisseurs traduites et les
messages de statut, appartient au catalogue actif. Utiliser des pluriels adaptés
à la langue. Localiser ensemble les chemins publics, la langue HTML, les
métadonnées et les liens d’action email. Préserver la langue courante dans les
liens ; l’URL publique est la source de vérité du SSR.

## Vues de données

Utiliser un tableau sémantique avec en-têtes et légende. Sur écran étroit,
rendre sa région nommée défilable et accessible au clavier. Annoncer l’état de
pagination, désactiver les actions indisponibles ou en cours et conserver les
lignes chargées pendant une nouvelle tentative après erreur. La recherche reste
modifiable pendant une requête ; indiquer lorsque le filtre saisi n’est pas
encore appliqué.
