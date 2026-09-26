# Design

L'interface utilise les tokens Tailwind définis dans
`packages/ui/src/styles/globals.css` et les primitives de `packages/ui`.

- Conserver les labels associés aux champs et les erreurs accessibles.
- Montrer explicitement les états de chargement des actions asynchrones.
- Maintenir le parcours au clavier et le lien d'évitement vers le contenu.
- Garder les pages utilisables sur écran étroit avant d'ajouter des variantes.
- Ne pas exposer de vocabulaire d'infrastructure dans les écrans produit.
- Rediriger une identité sans session admissible vers la connexion avant de
  rendre le contenu de l'accueil.
- Afficher une erreur de déconnexion sans retirer prématurément l'identité ;
  après succès, vider les données privées avant la navigation.

Les nouveaux motifs réellement partagés rejoignent `packages/ui`. Un composant
propre à une fonctionnalité reste près de cette fonctionnalité.

## Authentification

Les écrans reprennent une colonne lisible, des champs de 44 px minimum, des
labels explicites et les tokens existants. Les erreurs de validation restent
près des champs, les erreurs de soumission dans le formulaire. La demande
email reçue reste visible dans son écran et ne promet pas de livraison.

Une instance Sonner à la racine annonce la déconnexion et le succès du reset.
Une même erreur ne doit pas apparaître à la fois dans un toast et dans le
formulaire. Désactiver les actions pendant l’envoi sans perdre les valeurs.

Tout texte utilisateur appartient au catalogue français, y compris les erreurs
provider mappées par code. Utiliser les pluriels Paraglide, jamais un suffixe
assemblé dans un composant. Chaque route possède titre, description et noindex.
Les pages avec tokens utilisent `no-referrer` et n’incluent jamais leurs
paramètres dans les métadonnées.

Les formulaires restent désactivés jusqu’à l’hydratation React et déclarent
`method="post"` en défense : aucune soumission HTML précoce ne doit placer un
mot de passe dans l’URL. Le header observe le store Better Auth pour suivre
les transitions de session indépendamment de la purge du cache privé.

Les champs de mot de passe disposent d’un bouton œil accessible au clavier. L’aide affiche seulement le minimum requis ; le maximum apparaît en erreur après dépassement. À l’inscription et au reset, une jauge avec libellé accessible indique la robustesse sans bloquer la soumission.
