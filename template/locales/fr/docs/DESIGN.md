# Design

## Mots de passe compromis

Les erreurs de mot de passe compromis demandent de choisir un autre mot de
passe. Au reset, un refus ou une erreur serveur indique également de demander
un nouveau lien de réinitialisation.

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
labels explicites et les tokens existants. Chaque instance de champ utilise
un identifiant unique pour associer label, aide et erreurs, même si plusieurs
formulaires utilisent le même nom de champ. Les erreurs de validation restent
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

Privilégier les balises HTML natives correspondant au contenu et aux actions.
La jauge de robustesse utilise un élément `meter` natif ; ses segments visuels
sont décoratifs et masqués aux technologies d’assistance. Les `div` restent
adaptées aux conteneurs de mise en page sans signification propre.

## Tableau des utilisateurs

Le dashboard conserve le message d’accueil et affiche une table HTML native
pilotée par TanStack Table. Les colonnes ont des en-têtes et la table une légende.
Sur mobile, seul le conteneur du tableau défile horizontalement ; il est accessible
au clavier. La navigation Précédent/Suivant annonce la page courante et désactive
les actions indisponibles ou pendant une requête. Une erreur laisse les lignes
déjà chargées visibles et propose Réessayer ; le chargement et la liste vide ont
un libellé explicite. Les textes restent dans le catalogue français.

La feature sépare l’orchestration dans un hook, les colonnes dans leur module
et les composants de rendu, de navigation et de feedback. Les handlers sont
nommés avant le JSX et passés directement aux propriétés d’événement. Les
fonctions de rendu des cellules sont également définies hors de la configuration
des colonnes. Le typage utilise les génériques et annotations sans assertion.

## Lisibilité du code d’interface

Les valeurs de formulaire utilisent `z.input` depuis leurs schémas Zod.
Les props utilisent des interfaces explicites ou les types natifs des
bibliothèques. Éviter les types dérivés avec `ComponentProps`,
`Pick`, `Partial`, `Omit` et `ReturnType`. Les callbacks déclarés dans
un composant ou un hook utilisent `const handleAction = () => {}`.

Réserver les ternaires aux choix simples de valeurs ; utiliser des `if` pour
construire des objets, tableaux ou éléments JSX et pour choisir une opération.
Les variables CSS du toaster sont définies dans la feuille de styles commune.
Utiliser les éléments HTML adaptés : une jauge avec sa légende forme un
`figure` avec `figcaption`, un conteneur nommé de tableau forme une `section`.
Les conteneurs purement visuels peuvent rester des `div`.
