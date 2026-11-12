# ETS KOFFI BOUTIQUE

Boutique de smartphones construite avec React, TypeScript, Vite et Supabase. Le site présente les téléphones publiés et fournit un espace Super Admin pour gérer les fiches et les photos.

## Fonctionnalités actuelles

- Page d’accueil avec identité visuelle, animation de téléphones et contact WhatsApp/téléphone.
- Catalogue lu depuis la table Supabase `products`; seuls les produits publiés sont visibles.
- Recherche et filtres de marque dans le catalogue.
- Espace Super Admin accessible par `/#superadmin`, protégé par Supabase Auth, profil `super_admin` et politiques RLS.
- Ajout et modification de téléphones, prix, promotions, stock, description, photo et publication.
- Galerie locale de photos pour quelques modèles connus; pour un autre modèle, l’administrateur téléverse une photo.

Le projet ne comprend pas encore de panier, de paiement, de commande, de compte client ni de fonctions Supabase Edge. Le contact commercial se fait par téléphone ou WhatsApp.

## Démarrage local

1. Installer Node.js LTS.
2. À la racine du projet, exécuter `npm install`.
3. Copier `.env.example` vers `.env.local` et renseigner l’URL Supabase et la clé **publishable** du même projet.
4. Exécuter `npm run dev` pour ouvrir l’aperçu local.
5. Exécuter `npm run build` pour produire la version de déploiement dans `dist/`.

Les variables `VITE_*` sont intégrées au JavaScript envoyé au navigateur. La clé Supabase publishable/anon est destinée au client et n’accorde aucun accès privilégié à elle seule; la protection des données dépend des politiques RLS. Ne jamais mettre une clé `secret` ou `service_role` dans le site, `.env.local` versionné ou une variable `VITE_`.

## Supabase

Appliquer dans l’ordre les migrations du dossier `supabase/migrations` au SQL Editor Supabase. Les étapes de création du premier compte, d’attribution du rôle et de configuration Auth sont dans [`docs/superadmin-setup.md`](docs/superadmin-setup.md). La migration de renforcement des droits doit être appliquée avant la mise en ligne.

Le bucket `product-images` est public pour afficher les images dans le catalogue. Seuls les superadmins peuvent envoyer, modifier ou supprimer des images via les règles Storage. N’y téléverser que des photos destinées à être publiques.

## Déploiement Vercel

Le projet est une application Vite monopage. Le fichier `vercel.json` contient le renvoi des routes vers `index.html` et des en-têtes HTTP de protection.

Dans les paramètres Vercel du projet, ajouter pour **Production** et **Preview** :

- `VITE_SUPABASE_URL` — URL racine du projet, par exemple `https://votre-projet.supabase.co` (sans `/rest/v1`).
- `VITE_SUPABASE_PUBLISHABLE_KEY` — clé publishable issue du même projet.
- `VITE_WHATSAPP_NUMBER` — facultatif, format international sans `+`.
- `VITE_STORE_PHONE` — facultatif, format international sans `+`.

Après toute modification des variables Vercel, créer un nouveau déploiement. Dans Supabase → Authentication → URL Configuration, définir le domaine Vercel de production comme URL principale et ajouter les URL exactes de redirection nécessaires, notamment celles des aperçus Vercel si ces parcours sont utilisés. Voir la documentation [Vercel pour Vite](https://vercel.com/docs/frameworks/frontend/vite) et [les redirections Supabase Auth](https://supabase.com/docs/guides/auth/redirect-urls).

Avant publication, vérifier que les deux migrations sont appliquées et que les variables pointent vers le bon projet. Garder `.env.local` privé; `.gitignore` l’exclut déjà.
