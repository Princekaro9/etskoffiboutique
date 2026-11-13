import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { ArrowLeft, ImagePlus, LogOut, PackagePlus, Pencil, Smartphone, Store, X } from 'lucide-react'
import { isSupabaseConfigured, supabase } from '../../lib/supabase'
import '../../styles/admin.css'

type Product = {
  id: string
  brand: string
  model: string
  name: string
  price: number
  promo_price: number | null
  stock: number
  image_url: string | null
  description: string
  is_published: boolean
  created_at: string
}

type ProductForm = {
  brand: string
  model: string
  price: string
  promoPrice: string
  stock: string
  description: string
}

type ImageSearchResult = { title: string; imageUrl: string; thumbnailUrl: string; source: string; match: string }

const localPhoneImages: ImageSearchResult[] = [
  { match: 'tecno camon 40', title: 'TECNO CAMON 40', imageUrl: '/images/phones/cutouts/tecno-camon-40.png', thumbnailUrl: '/images/phones/cutouts/tecno-camon-40.png', source: 'Image incluse dans la boutique' },
  { match: 'samsung galaxy a50', title: 'Samsung Galaxy A50', imageUrl: '/images/phones/cutouts/samsung-galaxy-a50.png', thumbnailUrl: '/images/phones/cutouts/samsung-galaxy-a50.png', source: 'Image incluse dans la boutique' },
  { match: 'infinix note 60 pro', title: 'Infinix NOTE 60 Pro', imageUrl: '/images/phones/cutouts/infinix-note-60-pro-isolated.png', thumbnailUrl: '/images/phones/cutouts/infinix-note-60-pro-isolated.png', source: 'Image incluse dans la boutique' },
  { match: 'infinix note 60 ultra', title: 'Infinix NOTE 60 Ultra', imageUrl: '/images/phones/cutouts/infinix-note-60-ultra-isolated.png', thumbnailUrl: '/images/phones/cutouts/infinix-note-60-ultra-isolated.png', source: 'Image incluse dans la boutique' },
  { match: 'infinix note 60', title: 'Infinix NOTE 60', imageUrl: '/images/phones/cutouts/infinix-note-60-isolated.png', thumbnailUrl: '/images/phones/cutouts/infinix-note-60-isolated.png', source: 'Image incluse dans la boutique' },
  { match: 'infinix note edge', title: 'Infinix NOTE Edge', imageUrl: '/images/phones/cutouts/infinix-note-edge-isolated.png', thumbnailUrl: '/images/phones/cutouts/infinix-note-edge-isolated.png', source: 'Image incluse dans la boutique' },
]

const normalizeModel = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

const emptyForm: ProductForm = { brand: '', model: '', price: '', promoPrice: '', stock: '1', description: '' }
const formatPrice = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`

export function SuperAdminPage({ onExit, passwordRecovery = false }: { onExit: () => void; passwordRecovery?: boolean }) {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [productsLoadError, setProductsLoadError] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [recoveryMode, setRecoveryMode] = useState(passwordRecovery)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [notice, setNotice] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imageUrlInput, setImageUrlInput] = useState('')
  const [imageError, setImageError] = useState('')
  const previewUrl = useMemo(() => imageFile ? URL.createObjectURL(imageFile) : '', [imageFile])
  const imageResults = useMemo(() => {
    const query = normalizeModel(`${form.brand} ${form.model}`)
    if (!query) return []
    const suffixes = ['pro', 'ultra', 'plus', 'premier', 'edge', 'lite', 'max']
    const extraModelSuffix = suffixes.find(suffix => new RegExp(`\\b${suffix}\\b`).test(query))
    const matches = localPhoneImages.filter(image => query.includes(image.match) && (!extraModelSuffix || image.match.endsWith(extraModelSuffix)))
    const mostSpecificLength = Math.max(0, ...matches.map(image => image.match.length))
    return matches.filter(image => image.match.length === mostSpecificLength)
  }, [form.brand, form.model])
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (active) { setSession(data.session); setAuthLoading(false) }
    }).catch(() => { if (active) setAuthLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setAuthorized(false)
      if (event === 'SIGNED_IN') setAuthError('')
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
    })
    return () => { active = false; subscription.unsubscribe() }
  }, [])

  useEffect(() => {
    if (recoveryMode || !supabase || !session) { setAuthorized(false); return }
    let active = true
    supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle().then(({ data, error }) => {
      if (!active) return
      if (!error && data?.role === 'super_admin') setAuthorized(true)
      else {
        setAuthError(error ? 'Impossible de vérifier les droits de ce compte. Réessaie dans un instant.' : 'Ce compte ne possède pas les droits Super Admin.')
        void supabase?.auth.signOut()
      }
    }, () => {
      if (!active) return
      setAuthError('Impossible de vérifier les droits de ce compte. Réessaie dans un instant.')
      void supabase?.auth.signOut()
    })
    return () => { active = false }
  }, [session, recoveryMode])

  useEffect(() => {
    if (!supabase || !authorized) return
    let active = true
    setProductsLoading(true)
    setProductsLoadError('')
    supabase.from('products').select('*').order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return
      if (error) { setProductsLoadError('Impossible de charger le catalogue. Réessaie dans quelques instants.'); setNotice(`Impossible de charger les téléphones : ${error.message}`) }
      else setProducts((data ?? []) as Product[])
      setProductsLoading(false)
    }, () => {
      if (!active) return
      setProductsLoadError('Impossible de charger le catalogue. Réessaie dans quelques instants.')
      setProductsLoading(false)
    })
    return () => { active = false }
  }, [authorized])

  const signIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setAuthError('')
    setAuthLoading(true)
    let error: { code?: string; message: string } | null = null
    try {
      const result = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      error = result.error
    } catch {
      setAuthError('Connexion impossible pour le moment. Vérifie ta connexion internet et réessaie.')
    } finally {
      setAuthLoading(false)
    }
    if (error) {
      if (error.code === 'invalid_credentials') {
        setAuthError('Identifiants refusés par Supabase. Vérifie que tu utilises le mot de passe défini pour ce compte dans ce projet.')
      } else if (error.code === 'email_not_confirmed') {
        setAuthError('Cette adresse e-mail doit être confirmée dans Supabase avant la connexion.')
      } else if (error.code === 'invalid_api_key' || error.message.toLowerCase().includes('invalid api key')) {
        setAuthError('La clé publique Supabase est refusée. Vérifie que la clé publiable et l’URL viennent du même projet.')
      } else {
        setAuthError(`Connexion Supabase impossible : ${error.message}`)
      }
    }
  }

  const saveNewPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase) return
    setAuthError('')
    if (newPassword.length < 8) { setAuthError('Choisis un mot de passe d’au moins 8 caractères.'); return }
    if (newPassword !== confirmPassword) { setAuthError('Les deux mots de passe ne sont pas identiques.'); return }
    setAuthLoading(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setAuthLoading(false)
    if (error) { setAuthError(`Impossible de modifier le mot de passe : ${error.message}`); return }
    await supabase.auth.signOut()
    setRecoveryMode(false)
    setPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setAuthError('Mot de passe modifié. Connecte-toi avec ton nouveau mot de passe.')
  }

  const resetForm = () => { setEditing(null); setForm(emptyForm); setImageFile(null); setImageUrlInput(''); setImageError('') }

  const startEdit = (product: Product) => {
    setEditing(product)
    setForm({ brand: product.brand, model: product.model, price: String(product.price), promoPrice: product.promo_price ? String(product.promo_price) : '', stock: String(product.stock), description: product.description ?? '' })
    setImageFile(null)
    setImageUrlInput(product.image_url ?? '')
    setImageError('')
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !session) return
    const price = Number(form.price)
    const promoPrice = form.promoPrice ? Number(form.promoPrice) : null
    const stock = Number(form.stock)
    if (!Number.isInteger(price) || price < 1 || !Number.isInteger(stock) || stock < 0 || (promoPrice !== null && (!Number.isInteger(promoPrice) || promoPrice < 1 || promoPrice >= price))) {
      setNotice('Vérifie le prix, le stock et le prix promotionnel. La promotion doit être inférieure au prix normal.')
      return
    }
    if (imageUrlInput.trim() && !imageUrlInput.trim().startsWith('/images/phones/') && !imageUrlInput.trim().startsWith('https://')) {
      setNotice('Sélectionne une image de la galerie ou une photo depuis ton appareil.')
      return
    }
    setSaving(true)
    setNotice('')
    let imageUrl = imageUrlInput.trim() || editing?.image_url || null
    if (imageFile) {
      const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg'
      const imagePath = `catalog/${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(imagePath, imageFile, { upsert: true, contentType: imageFile.type })
      if (uploadError) {
        setSaving(false)
        setNotice(`La photo n’a pas pu être envoyée : ${uploadError.message}`)
        return
      }
      imageUrl = supabase.storage.from('product-images').getPublicUrl(imagePath).data.publicUrl
    }
    const brand = form.brand.trim()
    const model = form.model.trim()
    const payload = { brand, model, name: `${brand} ${model}`, price, promo_price: promoPrice, stock, image_url: imageUrl, description: form.description.trim(), is_published: editing?.is_published ?? false }
    const result = editing
      ? await supabase.from('products').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('products').insert(payload).select().single()
    setSaving(false)
    if (result.error) { setNotice(`Enregistrement impossible : ${result.error.message}`); return }
    const saved = result.data as Product
    setProducts(current => editing ? current.map(item => item.id === saved.id ? saved : item) : [saved, ...current])
    setNotice(editing ? 'Téléphone mis à jour.' : 'Téléphone ajouté au catalogue en brouillon.')
    resetForm()
  }

  const togglePublished = async (product: Product) => {
    if (!supabase) return
    const { data, error } = await supabase.from('products').update({ is_published: !product.is_published }).eq('id', product.id).select().single()
    if (error) setNotice(`Mise à jour impossible : ${error.message}`)
    else setProducts(current => current.map(item => item.id === product.id ? data as Product : item))
  }

  if (!isSupabaseConfigured) return <AdminFrame onExit={onExit}><div className="admin-not-configured"><span className="admin-icon"><Store size={23} /></span><p className="admin-overline">MISE EN SERVICE</p><h1>Connecte ta boutique</h1><p>La page Super Admin est prête, mais la base de données sécurisée n’est pas encore reliée. Ajoute l’URL publique et la clé publique de ton projet Supabase dans <code>.env.local</code>, puis applique la migration du dossier <code>supabase/migrations</code>.</p><p>Crée ensuite ton compte dans Supabase Auth et attribue-lui le rôle <code>super_admin</code> avec la requête fournie dans <code>docs/superadmin-setup.md</code>. Les téléphones, prix et photos seront alors enregistrés en base et visibles dans la boutique après publication.</p>{import.meta.env.DEV && <a className="admin-primary admin-demo-link" href="#catalogue-demo">Aperçu client avec un téléphone de test</a>}</div></AdminFrame>

  if (authLoading) return <AdminFrame onExit={onExit}><div className="admin-loading">Vérification de la session…</div></AdminFrame>

  if (!authorized) return <AdminFrame onExit={onExit}><form className="admin-login" onSubmit={recoveryMode ? saveNewPassword : signIn}><span className="admin-icon"><Store size={23} /></span><p className="admin-overline">ESPACE SÉCURISÉ</p><h1>{recoveryMode ? 'Nouveau mot de passe' : 'Super Admin'}</h1><p>{recoveryMode ? 'Choisis un nouveau mot de passe pour ton compte administrateur.' : 'Connecte-toi avec le compte administrateur de la boutique.'}</p>{authError && <div className="admin-alert" role="alert">{authError}</div>}{recoveryMode ? <><label>Nouveau mot de passe<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={event => setNewPassword(event.target.value)} required /></label><label>Confirmer le mot de passe<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} required /></label><button className="admin-primary" type="submit" disabled={authLoading}>{authLoading ? 'Enregistrement…' : 'Enregistrer le mot de passe'}</button></> : <><label>Adresse e-mail<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required /></label><label>Mot de passe<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required /></label><button className="admin-primary" type="submit" disabled={authLoading}>{authLoading ? 'Connexion…' : 'Se connecter'}</button></>}<button className="admin-back" type="button" onClick={onExit}><ArrowLeft size={15} /> Retour à la boutique</button></form></AdminFrame>

  return <AdminFrame onExit={onExit} onSignOut={() => { void supabase?.auth.signOut() }}>
    <div className="admin-dashboard">
      <header className="admin-header"><div><p className="admin-overline">GESTION DE LA BOUTIQUE</p><h1>Super Admin</h1><p>Ajoute tes téléphones, mets les prix à jour et publie le catalogue.</p></div><button className="admin-back" onClick={onExit}><ArrowLeft size={15} /> Voir la boutique</button></header>
      <div className="admin-summary"><span><Smartphone size={19} /> {products.length} téléphone{products.length > 1 ? 's' : ''}</span><span>{products.filter(item => item.is_published).length} en ligne</span><button className="admin-signout" onClick={() => { void supabase?.auth.signOut() }}><LogOut size={15} /> Déconnexion</button></div>
    {notice && <div className="admin-notice" role="status">{notice}<button aria-label="Fermer" onClick={() => setNotice('')}><X size={15} /></button></div>}
      <div className="admin-columns">
        <form className="admin-product-form" onSubmit={saveProduct}>
          <div className="admin-form-title"><span className="admin-icon small"><PackagePlus size={18} /></span><div><h2>{editing ? 'Modifier un téléphone' : 'Ajouter un téléphone'}</h2><p>Prix en FCFA, stock en unités.</p></div>{editing && <button type="button" className="admin-close" aria-label="Annuler la modification" onClick={resetForm}><X size={17} /></button>}</div>
          <div className="admin-fields two"><label>Marque<input value={form.brand} onChange={event => { setForm({ ...form, brand: event.target.value }); setImageUrlInput(''); setImageFile(null) }} placeholder="Ex. Infinix" required maxLength={60} /></label><label>Modèle<input value={form.model} onChange={event => { setForm({ ...form, model: event.target.value }); setImageUrlInput(''); setImageFile(null) }} placeholder="Ex. NOTE 60 Pro" required maxLength={90} /></label></div>
          <div className="admin-fields three"><label>Prix (FCFA)<input type="number" min="1" step="1" value={form.price} onChange={event => setForm({ ...form, price: event.target.value })} placeholder="250000" required /></label><label>Prix promo. (FCFA)<input type="number" min="1" step="1" value={form.promoPrice} onChange={event => setForm({ ...form, promoPrice: event.target.value })} placeholder="Facultatif" /></label><label>Stock<input type="number" min="0" step="1" value={form.stock} onChange={event => setForm({ ...form, stock: event.target.value })} required /></label></div>
          <label className="admin-photo-label">Photo depuis l’appareil <span>PNG, JPG ou WebP · 5 Mo max</span><div className="admin-photo-input"><ImagePlus size={19} /><span>{imageFile?.name ?? 'Choisir une photo'}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0] ?? null; if (file && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setImageError('Choisis une photo PNG, JPG ou WebP.'); setImageFile(null) } else if (file && file.size > 5 * 1024 * 1024) { setImageError('La photo doit faire 5 Mo maximum.'); setImageFile(null) } else { setImageError(''); setImageFile(file); if (file) setImageUrlInput('') } }} /></div>{imageError && <small className="admin-field-error">{imageError}</small>}</label>
          <section className="admin-image-search" aria-live="polite"><div className="admin-image-search-title"><strong>Images proposées automatiquement</strong><span>{!form.brand.trim() || !form.model.trim() ? 'Saisis la marque et le modèle : les photos disponibles apparaîtront ici.' : imageResults.length ? 'Clique sur la photo qui correspond au téléphone.' : 'Aucune photo correspondante n’est incluse pour ce modèle. Ajoute une photo depuis ton appareil.'}</span></div>{imageResults.length > 0 && <div className="admin-image-results">{imageResults.map((image, index) => <button type="button" key={`${image.imageUrl}-${index}`} className={`admin-image-result ${imageUrlInput === image.imageUrl ? 'selected' : ''}`} onClick={() => { setImageUrlInput(image.imageUrl); setImageFile(null) }} aria-label={`Choisir l’image de ${image.title}`}><img src={image.thumbnailUrl} alt={image.title} loading="lazy" /><span>{image.title}</span></button>)}</div>}</section>
          <label className="admin-photo-label">Ou choisir une photo depuis l’appareil <span>PNG, JPG ou WebP · 5 Mo max</span><div className="admin-photo-input"><ImagePlus size={19} /><span>{imageFile?.name ?? 'Choisir une photo'}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => { const file = event.target.files?.[0] ?? null; if (file && !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setImageError('Choisis une photo PNG, JPG ou WebP.'); setImageFile(null) } else if (file && file.size > 5 * 1024 * 1024) { setImageError('La photo doit faire 5 Mo maximum.'); setImageFile(null) } else { setImageError(''); setImageFile(file); if (file) setImageUrlInput('') } }} /></div>{imageError && <small className="admin-field-error">{imageError}</small>}</label>
          {(previewUrl || imageUrlInput || editing?.image_url) && <img className="admin-image-preview" src={previewUrl || imageUrlInput || editing?.image_url || ''} alt="Aperçu de la photo sélectionnée" />}
          <label>Description<textarea rows={3} value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder="Couleur, mémoire, état…" maxLength={1200} /></label>
          <button className="admin-primary" type="submit" disabled={saving || Boolean(imageError)}>{saving ? 'Enregistrement…' : editing ? 'Enregistrer les changements' : 'Ajouter en brouillon'}</button>
          <small className="admin-form-help">Un nouveau téléphone est ajouté en brouillon. Tu pourras le publier depuis la liste.</small>
        </form>
        <section className="admin-inventory"><div className="admin-inventory-title"><div><p className="admin-overline">CATALOGUE</p><h2>Tes téléphones</h2></div></div>{productsLoading ? <div className="admin-empty">Chargement du catalogue…</div> : productsLoadError ? <div className="admin-empty" role="alert">{productsLoadError}</div> : products.length === 0 ? <div className="admin-empty">Aucun téléphone ajouté pour le moment.</div> : <div className="admin-product-list">{products.map(product => <article className="admin-product-row" key={product.id}>{product.image_url ? <img src={product.image_url} alt="" /> : <div className="admin-product-placeholder"><Smartphone size={20} /></div>}<div className="admin-product-info"><strong>{product.name}</strong><span>{product.promo_price ? <><s>{formatPrice(product.price)}</s> {formatPrice(product.promo_price)}</> : formatPrice(product.price)}</span><small>Stock : {product.stock}</small></div><span className={product.is_published ? 'admin-status published' : 'admin-status'}>{product.is_published ? 'En ligne' : 'Brouillon'}</span><div className="admin-row-actions"><button title="Modifier" aria-label={`Modifier ${product.name}`} onClick={() => startEdit(product)}><Pencil size={16} /></button><button className="admin-publish" onClick={() => void togglePublished(product)}>{product.is_published ? 'Masquer' : 'Publier'}</button></div></article>)}</div>}</section>
      </div>
    </div>
  </AdminFrame>
}

function AdminFrame({ children, onExit, onSignOut }: { children: ReactNode; onExit: () => void; onSignOut?: () => void }) {
  return <main className="superadmin-page"><div className="admin-topbar"><a className="admin-brand" href="#" onClick={event => { event.preventDefault(); onExit() }}><img src="/images/logo-ets-koffi-mark.png" alt="" /><span>ETS KOFFI <small>BOUTIQUE</small></span></a>{onSignOut && <button className="admin-signout top" onClick={onSignOut}><LogOut size={15} /> Déconnexion</button>}</div><div className="admin-content">{children}</div></main>
}
