// src/pages/Panel.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const ICONS = {
  kanban: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="12" rx="1"/><rect x="10" y="3" width="5" height="7" rx="1"/><rect x="17" y="3" width="4" height="10" rx="1"/></svg>
  ),
  notes: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
  ),
  users: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  espacios: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
};

const BentoCard = ({ title, icon, onClick, accentColor, accentRgb }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bento-card"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.bentoItem,
        gridColumn: 'span 1',
        transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
        borderColor: isHovered ? `rgba(${accentRgb}, 0.5)` : 'rgba(255,255,255,0.08)',
        background: isHovered ? `rgba(0, 0, 0, 0.4)` : 'rgba(20, 22, 40, 0.6)',
        boxShadow: isHovered ? '0 10px 30px rgba(0,0,0,0.5)' : '0 4px 15px rgba(0,0,0,0.3)',
      }}
    >
      <div style={{ ...styles.iconWrap, background: `rgba(${accentRgb}, 0.15)`, color: accentColor }}>
        {icon}
      </div>
      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{title}</h3>
      </div>
    </div>
  );
};

const Panel = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState('');
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserEmail(user.email || '');
        setDisplayName(user.displayName || user.email.split('@')[0]);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const inicialUsuario = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  const handleCerrarSesion = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const cards = [
    { title: 'Tablero Kanban', icon: ICONS.kanban, accentColor: '#8B85FF', accentRgb: '139,133,255', route: '/tareas' },
    { title: 'Escritorio Personal', icon: ICONS.notes, accentColor: '#1AACAC', accentRgb: '26,172,172', route: '/notas' },
    { title: 'Social', icon: ICONS.users, accentColor: '#fbbf24', accentRgb: '251,191,36', route: '/amigos' },
    { title: 'Entornos', icon: ICONS.espacios, accentColor: '#c084fc', accentRgb: '192,132,252', route: '/espacios' },
  ];

  return (
    <div style={styles.appContainer}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .panel-header  { animation: fadeUp 0.4s ease both; }
        .panel-welcome { animation: fadeUp 0.4s ease 0.1s both; }
        .panel-grid    { animation: fadeUp 0.4s ease 0.2s both; }
        .bento-card    { transition: transform 0.22s ease, border-color 0.22s ease, background 0.22s ease, box-shadow 0.22s ease !important; }
        @media (max-width: 950px) { .panel-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 600px) { .panel-grid { grid-template-columns: 1fr !important; } .panel-main { padding: 24px 20px !important; } .panel-header-el { padding: 0 20px !important; } }
      `}</style>

      <div style={styles.blurOverlay} />

      <header className="panel-header panel-header-el" style={styles.header}>
        <div style={styles.headerLeftPlaceholder}></div>
        <div style={styles.logoArea}>
          <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
        </div>
        <div style={styles.headerRight}>
          <div style={styles.profileCircle} onClick={() => navigate('/perfil')} title="Ver perfil">{inicialUsuario}</div>
          <button onClick={handleCerrarSesion} style={styles.logoutBtn}>{ICONS.logout} Salir</button>
        </div>
      </header>

      <main className="panel-main" style={styles.main}>
        <div className="panel-welcome" style={styles.welcomeBox}>
          <h1 style={styles.mainTitle}>Hola, <span style={{ color: '#1AACAC' }}>{displayName}</span></h1>
          <p style={styles.mainSubtitle}>¿Qué vamos a gestionar hoy?</p>
        </div>

        <div className="panel-grid" style={styles.bentoGrid}>
          {cards.map((card) => (
            <BentoCard key={card.route} {...card} onClick={() => navigate(card.route)} />
          ))}

          <div style={styles.infoBox}>
            <div style={styles.infoLabel}>Usuario activo</div>
            <div style={styles.infoValue}>{displayName}</div>
            <div style={styles.infoSub}>{userEmail}</div>
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  appContainer: { minHeight: '100vh', width: '100%', backgroundColor: '#000000', position: 'relative', overflowY: 'auto', color: '#FFF', fontFamily: "'Inter', sans-serif" },
  blurOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 11, 30, 0.4)', zIndex: 0 },
  header: { height: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#000000' },
  headerLeftPlaceholder: { flex: 1, display: 'flex', justifyContent: 'flex-start' },
  logoArea: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' },
  logoImage: { height: '32px', width: 'auto', objectFit: 'contain' },
  headerRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px' },
  profileCircle: { width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(26,172,172,0.15)', border: '1.5px solid rgba(26,172,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px', cursor: 'pointer', color: '#1AACAC', textTransform: 'uppercase' },
  logoutBtn: { background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: '0.2s' },
  main: { position: 'relative', zIndex: 1, padding: '40px 48px', maxWidth: '1020px', margin: '0 auto' },
  welcomeBox: { marginBottom: '28px' },
  mainTitle: { fontSize: '36px', fontWeight: '800', margin: 0, letterSpacing: '-0.5px', lineHeight: 1.1 },
  mainSubtitle: { fontSize: '15px', color: 'rgba(255,255,255,0.45)', marginTop: '8px' },
  
  bentoGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', gridAutoRows: '160px' },
  bentoItem: { borderRadius: '24px', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', cursor: 'pointer', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' },
  iconWrap: { width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', marginTop: '12px' },
  cardTitle: { fontSize: '17px', fontWeight: '700', margin: 0, lineHeight: 1.2 },
  
  // InfoBox ahora ocupa toda la fila
  infoBox: { gridColumn: '1 / -1', borderRadius: '24px', background: 'rgba(20, 22, 40, 0.6)', border: '1px solid rgba(255,255,255,0.08)', padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', boxShadow: '0 4px 15px rgba(0,0,0,0.3)' },
  infoLabel: { fontSize: '11px', fontWeight: '700', opacity: 0.4, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' },
  infoValue: { fontSize: '20px', fontWeight: '700', color: '#1AACAC', marginBottom: '4px' },
  infoSub: { fontSize: '13px', opacity: 0.5, color: '#FFF' }
};

export default Panel;