# Architecture technique — ETS KOFFI BOUTIQUE

## Vue d’ensemble réelle

```text
Navigateur (React + TypeScript + Vite)
  ├── Site public : accueil, catalogue et contacts
  └── Super Admin : Supabase Auth
        ├── PostgreSQL via API Supabase + RLS
        └── Storage Supabase : photos publiques du catalogue
```

Il n’y a actuellement ni serveur applicatif propre, ni fonction Edge, ni commande, panier ou paiement. La clé publishable est présente dans le client et doit être limitée par les règles RLS et Storage.

## Organisation constatée

```text
src/
  app/App.tsx                  Navigation par hash et écrans publics
  lib/supabase.ts              Client Supabase et lecture de configuration
  pages/admin/SuperAdminPage.tsx
  styles/                      Styles du site et de l’administration
public/images/                 Logos, visuels du site et photos locales de modèles
supabase/migrations/           Schéma, politiques RLS et droits SQL
vercel.json                    Réécriture SPA et en-têtes HTTP
```

## Données

### `profiles`

`id` référence `auth.users(id)`; `role` accepte `client` ou `super_admin`. L’utilisateur connecté peut lire son profil. L’attribution du rôle admin doit se faire par une action SQL de confiance.

### `products`

La table contient marque, modèle, nom, prix entier en FCFA, prix promotionnel facultatif, stock, URL d’image, description, statut de publication et horodatages. Le public ne peut lire que les fiches publiées. Un superadmin authentifié peut lire toutes les fiches, ajouter et modifier les produits, notamment les brouillons.

### Storage `product-images`

Bucket public pour la lecture des images destinées au catalogue; ajout, remplacement et suppression sont réservés au rôle `super_admin`. Une URL publique signifie que toute personne connaissant l’adresse peut afficher l’image.

## Contrôles de sécurité

- Authentification Super Admin avec Supabase Auth, puis vérification du rôle dans `profiles`.
- RLS sur `profiles` et `products`; fonctions SQL de contrôle avec `search_path` fixé.
- Droits SQL limités aux opérations nécessaires au catalogue.
- Validation côté formulaire des prix, promotions, stock et type/taille de photo; les contraintes SQL protègent aussi les valeurs principales.
- Aucun mot de passe ou clé secrète Supabase n’est intégré au code frontend.
- `vercel.json` ajoute CSP, anti-framing, MIME sniffing, politique de référent et permissions navigateur.

La clé publishable est nécessaire au navigateur et n’est pas un secret. Elle ne doit pas être considérée comme une autorisation: les politiques RLS sont la frontière d’accès. La clé `service_role`/`secret` ne doit jamais être exposée côté client.

## Limites fonctionnelles avant évolution

Le site ne traite pas les commandes ni les paiements. Le catalogue affiche les informations et dirige les visiteurs vers le contact. Les images proposées automatiquement sont une collection locale limitée; les autres modèles nécessitent un téléversement manuel. L’image choisie doit être vérifiée par l’administrateur avant publication.
