# Mise en service du Super Admin

La page est accessible à `/#superadmin`. Elle utilise Supabase Auth, les tables PostgreSQL protégées par RLS et le bucket Storage `product-images`.

## 1. Variables locales

Dans `.env.local`, utiliser l’URL racine du projet (sans `/rest/v1`) et sa clé publishable :

```dotenv
VITE_SUPABASE_URL=https://VOTRE-PROJET.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=VOTRE_CLE_PUBLISHABLE
```

Ces deux valeurs doivent venir du même projet Supabase. La clé publishable est prévue pour le navigateur. Ne jamais copier une clé `secret` ou `service_role` dans une variable `VITE_`.

## 2. Appliquer les migrations

Dans le SQL Editor Supabase, exécuter dans l’ordre :

1. `supabase/migrations/202611120001_superadmin_products.sql` — tables, rôles, catalogue, stockage et politiques initiales.
2. `supabase/migrations/202611120002_security_hardening.sql` — réduction des droits SQL et fonctions avec `search_path` fixé.

La deuxième migration est nécessaire avant la mise en production. Après son exécution, les visiteurs anonymes peuvent lire seulement les produits publiés; un compte authentifié ne peut écrire que si son profil a le rôle `super_admin`.

## 3. Créer et autoriser le compte

Dans Supabase → Authentication → Users, créer le compte avec l’adresse e-mail de l’administrateur. Ensuite, dans le SQL Editor, remplacer l’adresse par celle du compte créé :

```sql
update public.profiles
set role = 'super_admin'
where id = (
  select id from auth.users
  where lower(email) = lower('admin@votre-boutique.ci')
)
returning id, role;
```

Vérifier qu’une ligne avec le rôle `super_admin` est retournée. Seul un opérateur de confiance doit exécuter cette requête. Si la création du compte ne génère pas de ligne `profiles`, vérifier que la première migration et son déclencheur ont bien été exécutés.

## 4. Photos

Le formulaire propose les images locales disponibles pour TECNO CAMON 40, Samsung Galaxy A50 et certains Infinix NOTE. Pour un autre modèle, téléverser une photo PNG, JPG ou WebP de 5 Mo maximum. Les photos du bucket sont publiques à l’affichage; ne pas y placer d’images privées.

## 5. Configuration Vercel

Dans les variables d’environnement Vercel, ajouter pour Production et Preview :

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_WHATSAPP_NUMBER` (facultatif)
- `VITE_STORE_PHONE` (facultatif)

Après leur ajout ou modification, relancer un déploiement. Dans Supabase → Authentication → URL Configuration, mettre l’URL de production du site comme URL principale et autoriser les URL de redirection des environnements utilisés. N’ajouter que les domaines d’aperçu nécessaires.

## 6. Vérifier le parcours

Se connecter sur `/#superadmin`, ajouter un téléphone en brouillon, puis le publier. Vérifier qu’il apparaît dans le catalogue public avec le bon prix et la bonne image. Le site ne gère pas encore de panier ni de commande en ligne; le visiteur contacte la boutique par WhatsApp ou téléphone.
