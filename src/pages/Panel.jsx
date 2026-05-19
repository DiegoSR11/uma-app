// src/pages/Panel.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

// Componente para las Tarjetas del Bento Grid
const BentoCard = ({ title, description, icon, onClick, color, gridArea, isLarge = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.bentoItem,
        gridArea: gridArea,
        transform: isHovered ? 'scale(1.02) translateY(-5px)' : 'scale(1)',
        backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.15)',
        boxShadow: isHovered ? '0 20px 40px rgba(0,0,0,0.2)' : '0 8px 32px rgba(0,0,0,0.1)',
        border: isHovered ? `1px solid ${color}` : '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      <div style={{ ...styles.iconBadge, backgroundColor: color }}>{icon}</div>
      <div style={styles.cardContent}>
        <h3 style={{ ...styles.cardTitle, fontSize: isLarge ? '28px' : '20px' }}>{title}</h3>
        <p style={{ ...styles.cardDesc, fontSize: isLarge ? '16px' : '14px' }}>{description}</p>
      </div>
      <div style={{ ...styles.arrowAction, opacity: isHovered ? 1 : 0.5, color: color }}>
        {isLarge ? 'Gestionar ahora →' : 'Abrir →'}
      </div>
    </div>
  );
};

const Panel = () => {
  const navigate = useNavigate();
  const [bgImage, setBgImage] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    setBgImage(fondos[Math.floor(Math.random() * fondos.length)]);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) setUserEmail(user.email);
      else navigate('/login');
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const handleCerrarSesion = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const inicialUsuario = userEmail ? userEmail.charAt(0).toUpperCase() : 'U';

  return (
    <div style={{ ...styles.appContainer, backgroundImage: `url(${bgImage})` }}>
      {/* Overlay de desenfoque dinámico */}
      <div style={styles.blurOverlay}></div>

      {/* HEADER MINIMALISTA GLASS */}
      <header style={styles.header}>
        <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
        <div style={styles.headerRight}>
          <div style={styles.profileCircle}>
            {inicialUsuario}
            <div style={styles.onlineBadge}></div>
          </div>
          <button onClick={handleCerrarSesion} style={styles.logoutBtn}>Cerrar Sesión</button>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main style={styles.main}>
        <div style={styles.welcomeBox}>
          <h1 style={styles.mainTitle}>Hola de nuevo, <span>Diego</span></h1>
          <p style={styles.mainSubtitle}>¿En qué proyecto vamos a avanzar hoy?</p>
        </div>

        {/* ESTRUCTURA BENTO GRID */}
        <div style={styles.bentoGrid}>
          
          {/* Módulo Tareas (Grande) */}
          <BentoCard 
            gridArea="tareas"
            isLarge={true}
            title="Tablero Kanban"
            description="Visualiza tu flujo de trabajo, organiza prioridades y mueve tus objetivos hacia el éxito."
            icon="📋"
            color="#362FD9"
            onClick={() => navigate('/tareas')}
          />

          {/* Módulo Notas (Mediano) */}
          <BentoCard 
            gridArea="notas"
            title="Notas y Prompts"
            description="Tu biblioteca personal de fórmulas, ideas y bloques de código listos para copiar."
            icon="📝"
            color="#1AACAC"
            onClick={() => navigate('/notas')}
          />

          {/* Módulo Perfil (Pequeño/Info) */}
          <div style={{ ...styles.infoBox, gridArea: 'user' }}>
            <div style={styles.infoLabel}>USUARIO ACTIVO</div>
            <div style={styles.infoValue}>{userEmail.split('@')[0]}</div>
            <div style={styles.infoSub}>{userEmail}</div>
          </div>

          {/* Próximamente (Pequeño) */}
          <div style={{ ...styles.comingSoonBox, gridArea: 'next' }}>
            <span style={{ fontSize: '24px' }}>🚀</span>
            <div style={{ fontWeight: 'bold', marginTop: '5px' }}>Calendario</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>Próximo módulo</div>
          </div>

        </div>
      </main>
    </div>
  );
};

// =================================================================
// ESTILOS GLASSMOPRHISM & BENTO
// =================================================================
const styles = {
  appContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden', color: '#FFF' },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 11, 30, 0.4)', backdropFilter: 'blur(10px)', zIndex: 0 },
  
  header: { height: '80px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 50px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  logoImage: { height: '40px', width: 'auto', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' },
  
  headerRight: { display: 'flex', alignItems: 'center', gap: '20px' },
  profileCircle: { width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#1AACAC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px', position: 'relative', border: '2px solid rgba(255,255,255,0.5)' },
  onlineBadge: { width: '12px', height: '12px', backgroundColor: '#4ade80', borderRadius: '50%', position: 'absolute', bottom: 0, right: 0, border: '2px solid #0a0b1e' },
  logoutBtn: { backgroundColor: 'transparent', color: '#FFF', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.3s' },

  main: { position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', overflowY: 'auto' },
  welcomeBox: { textAlign: 'center', marginBottom: '40px' },
  mainTitle: { fontSize: '42px', fontWeight: '800', margin: 0, letterSpacing: '-1px' },
  mainSubtitle: { fontSize: '18px', opacity: 0.8, marginTop: '5px' },

  // GRILLA BENTO
  bentoGrid: {
    display: 'grid',
    width: '100%',
    maxWidth: '1100px',
    gap: '20px',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gridTemplateRows: 'repeat(2, 220px)',
    gridTemplateAreas: `
      "tareas tareas notas notas"
      "tareas tareas user next"
    `,
  },

  // ESTILOS DE TARJETA BENTO
  bentoItem: {
    borderRadius: '24px',
    padding: '30px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    position: 'relative',
    overflow: 'hidden'
  },
  iconBadge: { width: '45px', height: '45px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '15px' },
  cardTitle: { fontWeight: '800', margin: '0 0 10px 0', letterSpacing: '-0.5px' },
  cardDesc: { opacity: 0.7, lineHeight: '1.5', margin: 0 },
  arrowAction: { fontWeight: 'bold', fontSize: '14px', transition: '0.3s' },

  // CAJAS DE INFO EXTRA
  infoBox: { borderRadius: '24px', backgroundColor: 'rgba(255,255,255,0.05)', padding: '25px', display: 'flex', flexDirection: 'column', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' },
  infoLabel: { fontSize: '10px', fontWeight: 'bold', opacity: 0.5, letterSpacing: '1px', marginBottom: '5px' },
  infoValue: { fontSize: '24px', fontWeight: 'bold', color: '#1AACAC' },
  infoSub: { fontSize: '12px', opacity: 0.6, marginTop: '2px', wordBreak: 'break-all' },

  comingSoonBox: { borderRadius: '24px', border: '2px dashed rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.6 },
};

export default Panel;