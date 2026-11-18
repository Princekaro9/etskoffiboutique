import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowDown, ArrowRight, ArrowUpRight, BadgeCheck, ChevronDown, MapPin, Menu, MessageCircle, Phone, Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Truck, X } from 'lucide-react'
import { SuperAdminPage } from '../pages/admin/SuperAdminPage'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

type Page = 'accueil' | 'catalogue' | 'catalogue-demo' | 'superadmin'

function isPasswordRecoveryCallback() {
  return window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('type') === 'recovery'
}

const categoryLinks = ['Tous les smartphones', 'Samsung', 'Tecno', 'Infinix', 'Xiaomi']
const carouselPhones = [
  { name: 'TECNO CAMON 40', image: '/images/phones/cutouts/tecno-camon-40.png', alt: 'TECNO CAMON 40 Galaxy Black, vue arrière sans fond' },
  { name: 'Samsung Galaxy A50', image: '/images/phones/cutouts/samsung-galaxy-a50.png', alt: 'Samsung Galaxy A50 noir, vue arrière sans fond' },
  { name: 'Infinix NOTE 60', image: '/images/phones/cutouts/infinix-note-60-isolated.png', alt: 'Infinix NOTE 60 noir, vue arrière sans fond' },
  { name: 'Infinix NOTE 60 Pro', image: '/images/phones/cutouts/infinix-note-60-pro-isolated.png', alt: 'Infinix NOTE 60 Pro titane, vue arrière sans fond' },
  { name: 'Infinix NOTE 60 Ultra', image: '/images/phones/cutouts/infinix-note-60-ultra-isolated.png', alt: 'Infinix NOTE 60 Ultra noir, vue arrière sans fond' },
]
// Coordonnées publiques de la boutique, configurables si elles changent.
const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '') || '2250505353615'
const storePhone = import.meta.env.VITE_STORE_PHONE?.replace(/\D/g, '') || '2250504041705'
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Bonjour ETS KOFFI BOUTIQUE, je souhaite obtenir des informations sur vos smartphones.')}`
const storeLocationUrl = 'https://share.google/CZP7X4Gmilhgha48N'

function getPage(): Page {
  if (isPasswordRecoveryCallback()) return 'superadmin'
  if (window.location.hash === '#superadmin') return 'superadmin'
  if (import.meta.env.DEV && window.location.hash === '#catalogue-demo') return 'catalogue-demo'
  return window.location.hash === '#catalogue' ? 'catalogue' : 'accueil'
}

export function App() {
  const [page, setPage] = useState<Page>(getPage)
  const [passwordRecovery, setPasswordRecovery] = useState(isPasswordRecoveryCallback)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  useEffect(() => {
    const updatePage = () => setPage(getPage())
    window.addEventListener('hashchange', updatePage)
    return () => window.removeEventListener('hashchange', updatePage)
  }, [])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(event => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true)
        setPage('superadmin')
        if (window.location.hash !== '#superadmin') window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#superadmin`)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (page === 'catalogue' && query.trim()) setSearchOpen(true)
  }, [page, query])

  const navigate = (next: Page) => {
    window.location.hash = next === 'catalogue' ? 'catalogue' : next === 'catalogue-demo' ? 'catalogue-demo' : next === 'superadmin' ? 'superadmin' : ''
    setPage(next)
    setMenuOpen(false)
  }

  if (page === 'superadmin') return <SuperAdminPage passwordRecovery={passwordRecovery} onExit={() => { setPasswordRecovery(false); navigate('accueil') }} />

  return (
    <div className="site-shell">
      <div className="announcement"><span className="announcement-dot" /> Votre prochain smartphone commence ici <span className="announcement-separator">·</span> Paiement en espèces à la livraison ou au retrait</div>
      <header className="site-header">
        <a className="wordmark" href="#" onClick={(event) => { event.preventDefault(); navigate('accueil') }} aria-label="ETS KOFFI BOUTIQUE, accueil">
          <span className="wordmark-symbol logo-emblem"><img src="/images/logo-ets-koffi-mark.png" alt="" /></span>
          <span className="wordmark-text">ETS KOFFI <b>BOUTIQUE</b></span>
        </a>
        <nav className={`desktop-nav ${menuOpen ? 'nav-open' : ''}`} aria-label="Navigation principale">
          <a className={page === 'accueil' ? 'nav-link active' : 'nav-link'} href="#" onClick={(event) => { event.preventDefault(); navigate('accueil') }}>Accueil</a>
          <a className={page === 'catalogue' || page === 'catalogue-demo' ? 'nav-link active' : 'nav-link'} href="#catalogue" onClick={(event) => { event.preventDefault(); navigate('catalogue') }}>Smartphones</a>
          <a className="nav-link" href="#engagements" onClick={(event) => { event.preventDefault(); setMenuOpen(false); if (page === 'catalogue') { navigate('accueil'); window.setTimeout(() => document.getElementById('engagements')?.scrollIntoView({ behavior: 'smooth' }), 0) } else document.getElementById('engagements')?.scrollIntoView({ behavior: 'smooth' }) }}>Notre promesse</a>
        </nav>
        <div className="header-actions">
          <button className="icon-button search-trigger" aria-label="Ouvrir la recherche" onClick={() => { navigate('catalogue'); setSearchOpen(true) }}><Search size={19} strokeWidth={1.7} /></button>
          <a className="whatsapp-link" href={whatsappUrl} target="_blank" rel="noreferrer"><MessageCircle size={17} strokeWidth={1.8} /><span>WhatsApp</span></a>
          <a className="bag-button" href="#catalogue" onClick={(event) => { event.preventDefault(); navigate('catalogue') }} aria-label="Voir le catalogue"><ShoppingBag size={18} strokeWidth={1.7} /><span>Découvrir</span></a>
          <button className="icon-button menu-trigger" aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
        </div>
      </header>

      {page === 'accueil' ? <HomePage onBrowse={() => navigate('catalogue')} /> : <CatalogPage query={query} setQuery={setQuery} searchOpen={searchOpen} setSearchOpen={setSearchOpen} demo={page === 'catalogue-demo'} />}

      <footer className="site-footer">
        <div className="footer-main">
          <a className="footer-logo-image-link" href="#" onClick={(event) => { event.preventDefault(); navigate('accueil') }}><img className="footer-logo-image" src="/images/logo-ets-koffi-cutout.png" alt="ETS KOFFI — Téléphones portables" /></a>
          <p>La technologie, avec du caractère.</p>
          <span className="footer-locale"><a href={`tel:+${storePhone}`} aria-label="Appeler le 05 04 04 17 05"><Phone size={14} strokeWidth={1.7} /><span>05 04 04 17 05</span></a></span>
        </div>
        <section className="location-strip" aria-labelledby="location-title">
          <div className="location-copy"><span className="eyebrow"><span className="eyebrow-line" /> NOUS TROUVER</span><h2 id="location-title">La boutique, sur votre itinéraire.</h2><p>Consultez notre localisation et préparez votre venue.</p></div>
          <a className="location-link" href={storeLocationUrl} target="_blank" rel="noreferrer"><span className="location-icon"><MapPin size={19} strokeWidth={1.6} /></span><span className="location-link-copy"><small>LOCALISATION</small><strong>Ouvrir Google Maps</strong></span><ArrowUpRight className="location-arrow" size={17} /></a>
        </section>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} ETS KOFFI BOUTIQUE</span><span>Pensé pour mieux choisir.</span><a href="#top" onClick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>Retour en haut <ArrowUpRight size={14} /></a></div>
      </footer>
    </div>
  )
}

function HomePage({ onBrowse }: { onBrowse: () => void }) {
  return <main>
    <section className="hero-section">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> L’ART DE BIEN CHOISIR</div>
        <h1>La technologie,<br /><em>avec du caractère.</em></h1>
        <p className="hero-description">Un nouveau smartphone, c’est une nouvelle façon de voir les choses. Trouvez celui qui vous ressemble chez ETS KOFFI BOUTIQUE.</p>
        <div className="hero-actions"><button className="button button-primary" onClick={onBrowse}>Explorer la boutique <ArrowRight size={17} /></button><a className="text-link" href="#engagements">Notre promesse <ArrowDown size={15} /></a></div>
        <div className="hero-meta"><div className="avatar-stack"><span>K</span><span>+</span><span>✓</span></div><div><strong>Le bon choix, en toute confiance</strong><small>Une boutique à votre écoute</small></div></div>
      </div>
      <div className="hero-art" aria-label="Carrousel animé de smartphones">
        <div className="art-grid" />
        <div className="art-halo" />
        <div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" />
        <div className="carousel-stage" role="img" aria-label="Cinq smartphones Android tournent en boucle">
          <div className="carousel-ring">
            {carouselPhones.map((phone) => <div className="carousel-phone carousel-photo-card" key={phone.image}>
              <div className="carousel-photo-window"><img className="carousel-phone-photo" src={phone.image} alt={phone.alt} loading="eager" decoding="async" /></div>
              <span className="carousel-model-label">{phone.name}</span>
            </div>)}
          </div>
        </div>
        <div className="art-caption"><span className="caption-line" /><div><small>SMARTPHONES ANDROID</small><strong>De vrais appareils, en mouvement.</strong></div></div>
        <div className="floating-tag"><Sparkles size={15} /><span>À votre image</span></div>
        <div className="art-bottom-note">L’EXPÉRIENCE KOFFI <span>—</span> VOTRE BOUTIQUE</div>
      </div>
      <div className="hero-scroll"><span /> DÉFILER POUR DÉCOUVRIR</div>
    </section>

    <section className="intro-strip" id="engagements">
      <div className="intro-heading"><span className="eyebrow">CHOISIR EN CONFIANCE</span><h2>Plus qu’un téléphone.<br /><em>Le bon compagnon.</em></h2></div>
      <div className="intro-copy"><p>Nous croyons qu’un bon choix commence par les bonnes informations. Prenez le temps de découvrir, comparer et choisir le smartphone qui vous accompagnera au quotidien.</p><a className="text-link" href="#catalogue" onClick={(event) => { event.preventDefault(); onBrowse() }}>Découvrir nos smartphones <ArrowUpRight size={16} /></a></div>
    </section>

    <section className="benefits" aria-label="Nos engagements">
      <Benefit icon={<BadgeCheck />} title="Un choix éclairé" text="Des informations utiles pour choisir à votre rythme." number="01" />
      <Benefit icon={<Truck />} title="À votre convenance" text="Choisissez la livraison ou le retrait en boutique." number="02" />
      <Benefit icon={<ShieldCheck />} title="Paiement en confiance" text="Réglez en espèces à la livraison ou au retrait." number="03" />
    </section>

    <section className="closing-cta">
      <div className="closing-phones" role="img" aria-label="TECNO CAMON 40, Samsung Galaxy A50 et trois modèles Infinix NOTE">
        {carouselPhones.map((phone) => <figure className="closing-phone" key={phone.name}><img src={phone.image} alt={phone.alt} loading="lazy" /></figure>)}
      </div>
      <div className="closing-cta-content"><span className="eyebrow"><span className="eyebrow-line" /> À VOUS DE CHOISIR</span><h2>Et si le prochain,<br /><em>c’était le vôtre ?</em></h2><button className="button button-light" onClick={onBrowse}>Voir la boutique <ArrowRight size={17} /></button></div>
    </section>
  </main>
}

function Benefit({ icon, title, text, number }: { icon: ReactNode; title: string; text: string; number: string }) {
  return <article className="benefit-card"><div className="benefit-top"><span className="benefit-icon">{icon}</span><span className="benefit-number">{number}</span></div><h3>{title}</h3><p>{text}</p></article>
}

function CatalogPage({ query, setQuery, searchOpen, setSearchOpen, demo }: { query: string; setQuery: (value: string) => void; searchOpen: boolean; setSearchOpen: (value: boolean) => void; demo: boolean }) {
  const demoPhone = { id: 'demo-camon-40', name: 'TECNO CAMON 40', brand: 'TECNO', model: 'CAMON 40', price: 165000, promo_price: null, stock: 1, image_url: '/images/phones/cutouts/tecno-camon-40.png', description: 'Fiche de démonstration uniquement. Prix et stock fictifs, aucune commande réelle.' }
  const [products, setProducts] = useState<Array<typeof demoPhone>>(() => demo ? [demoPhone] : [])
  const [loading, setLoading] = useState(!demo && isSupabaseConfigured)
  const [catalogError, setCatalogError] = useState('')

  useEffect(() => {
    if (demo) { setProducts([demoPhone]); setCatalogError(''); setLoading(false); return }
    if (!supabase) { setProducts([]); setCatalogError(''); setLoading(false); return }
    setLoading(true)
    setCatalogError('')
    let active = true
    supabase.from('products').select('id,name,brand,model,price,promo_price,stock,image_url,description').eq('is_published', true).order('created_at', { ascending: false }).then(({ data, error }) => {
      if (!active) return
      if (error) { setProducts([]); setCatalogError('Le catalogue est momentanément indisponible. Réessaie dans quelques instants.') }
      else setProducts((data ?? []) as typeof products)
      setLoading(false)
    }, () => {
      if (!active) return
      setProducts([])
      setCatalogError('Le catalogue est momentanément indisponible. Réessaie dans quelques instants.')
      setLoading(false)
    })
    return () => { active = false }
  }, [demo])

  const shownProducts = products.filter(product => {
    const matchesQuery = !query.trim() || `${product.name} ${product.brand} ${product.model} ${product.description}`.toLowerCase().includes(query.trim().toLowerCase())
    const brandFilter = categoryLinks.includes(query) && query !== 'Tous les smartphones'
    return matchesQuery && (!brandFilter || product.brand.toLowerCase() === query.toLowerCase())
  })

  const getSellerLink = (product: typeof demoPhone) => {
    const price = new Intl.NumberFormat('fr-FR').format(product.promo_price ?? product.price)
    const message = `Bonjour ETS KOFFI BOUTIQUE, je souhaite des informations sur le ${product.brand} ${product.model} affiché à ${price} FCFA. Est-il toujours disponible ?`
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
  }

  return <main className="catalog-page">
    <div className="catalog-topline"><a href="#" onClick={(event) => { event.preventDefault(); window.location.hash = '' }}>Accueil</a><span>/</span><strong>Smartphones</strong></div>
    {demo && <div className="catalog-demo-banner">APERÇU DE TEST — TECNO CAMON 40, prix et stock fictifs, aucune donnée enregistrée.</div>}
    <section className="catalog-heading"><div><span className="eyebrow"><span className="eyebrow-line" /> LA BOUTIQUE</span><h1>À chacun son <em>smartphone.</em></h1><p>Explorez, comparez et trouvez celui qui vous correspond.</p></div><button className="catalog-search-toggle" onClick={() => setSearchOpen(!searchOpen)}><Search size={17} /> Rechercher <ChevronDown className={searchOpen ? 'rotated' : ''} size={15} /></button></section>
    {searchOpen && <label className="search-field"><Search size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Une marque, un modèle…" aria-label="Rechercher un smartphone" />{query && <button aria-label="Effacer la recherche" onClick={() => setQuery('')}><X size={17} /></button>}</label>}
    <div className="catalog-toolbar"><div className="category-pills">{categoryLinks.map((item, index) => <button key={item} className={(index === 0 ? !query : query === item) ? 'category-pill selected' : 'category-pill'} onClick={() => setQuery(index === 0 ? '' : item)}>{item}</button>)}</div><span className="sort-note">Une sélection pensée pour vous <ArrowDown size={14} /></span></div>
    {loading ? <div className="catalog-loading">Chargement des téléphones…</div> : catalogError ? <section className="empty-catalog"><span className="eyebrow">CATALOGUE</span><h2>Un instant, s’il vous plaît.</h2><p>{catalogError}</p><button className="button button-primary" onClick={() => window.location.reload()}>Réessayer</button></section> : shownProducts.length ? <section className="catalog-products" aria-label="Téléphones disponibles">{shownProducts.map(product => <article className="catalog-product-card" key={product.id}>{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy" /> : <div className="catalog-product-placeholder"><Smartphone size={32} /></div>}<div className="catalog-product-details"><span>{product.brand}</span><h2>{product.model}</h2>{product.description && <p>{product.description}</p>}<strong>{new Intl.NumberFormat('fr-FR').format(product.promo_price ?? product.price)} FCFA</strong>{product.promo_price && <small className="catalog-old-price">{new Intl.NumberFormat('fr-FR').format(product.price)} FCFA</small>}<small className={product.stock > 0 ? 'catalog-stock' : 'catalog-stock unavailable'}>{product.stock > 0 ? 'Disponible' : 'Rupture de stock'}</small><a className="catalog-contact-button" href={getSellerLink(product)} target="_blank" rel="noreferrer"><MessageCircle size={17} strokeWidth={1.8} /> Contacter le vendeur</a></div></article>)}</section> : <section className="empty-catalog"><div className="empty-art"><span className="empty-orbit" /><div className="empty-phone"><span /></div><Sparkles className="empty-spark" size={20} /></div><span className="eyebrow">BIENTÔT DISPONIBLE</span><h2>{query ? <>Aucun téléphone trouvé<br /><em>pour cette recherche.</em></> : <>Votre prochain coup de cœur<br /><em>se prépare.</em></>}</h2><p>{query ? 'Essaie un autre nom de marque ou de modèle.' : 'Notre sélection de smartphones arrive très bientôt. Revenez découvrir les modèles disponibles.'}</p><a className="button button-primary" href={whatsappUrl} target="_blank" rel="noreferrer">Nous contacter <ArrowUpRight size={16} /></a><small>Pour toute question, notre équipe reste à votre écoute.</small></section>}
    <div className="catalog-bottom-note"><span>ETS KOFFI BOUTIQUE</span><span>Le bon choix prend le temps.</span><span>FCFA · PAIEMENT EN ESPÈCES</span></div>
  </main>
}
