// src/pages/Entorno.jsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, onSnapshot, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

const ICONS = {
  kanban: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="5" height="12" rx="1"/><rect x="10" y="3" width="5" height="7" rx="1"/><rect x="17" y="3" width="4" height="10" rx="1"/>
    </svg>
  ),
  notes: (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),
  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
    </svg>
  ),
  publicacion: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
  dual: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  group: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
};

const Entorno = () => {
  const { id } = useParams(); // ID del Espacio
  const navigate = useNavigate();
  
  const [espacio, setEspacio] = useState(null);
  const [modalConfigVisible, setModalConfigVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  
  // Formulario para la personalización avanzada interna
  const [formularioConfig, setFormularioConfig] = useState({
    nombre: '', descripcion: '', tipo: 'publicacion', modulos: { kanban: false, escritorio: false }
  });

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) { navigate('/login'); return; }

    // Escuchar los datos de este espacio en específico en tiempo real
    const unsub = onSnapshot(doc(db, 'espacios', id), (snapshot) => {
      if (snapshot.exists()) {
        const data = { id: snapshot.id, ...snapshot.data() };
        setEspacio(data);
        
        // Inicializar el formulario de configuraciones avanzadas
        setFormularioConfig({
          nombre: data.nombre,
          descripcion: data.descripcion || '',
          tipo: data.tipo || 'publicacion',
          modulos: {
            kanban: data.modulosActivos?.includes('kanban') || false,
            escritorio: data.modulosActivos?.includes('escritorio') || false
          }
        });
      } else {
        navigate('/espacios');
      }
    });

    return () => unsub();
  }, [id, navigate]);

  const guardarConfiguracionAvanzada = async (e) => {
    e.preventDefault();
    try {
      const modulosSeleccionados = Object.keys(formularioConfig.modulos).filter(k => formularioConfig.modulos[k]);
      
      await updateDoc(doc(db, 'espacios', id), {
        nombre: formularioConfig.nombre,
        descripcion: formularioConfig.descripcion,
        tipo: formularioConfig.tipo,
        modulosActivos: modulosSeleccionados
      });
      setModalConfigVisible(false);
    } catch (error) {
      console.error("Error actualizando entorno:", error);
    }
  };

  const copiarLinkPublico = () => {
    const urlPublica = `${window.location.origin}/vista/${espacio.linkVista}`;
    navigator.clipboard.writeText(urlPublica);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  if (!espacio) return <div style={styles.loading}>Cargando entorno...</div>;

  const inicialUsuario = auth.currentUser?.displayName?.[0] || 'U';

  // Configuración visual de etiquetas
  let badgeColor = '#FFF';
  let badgeText = '';
  if (espacio.tipo === 'publicacion') { badgeColor = '#c084fc'; badgeText = 'Publicación'; }
  else if (espacio.tipo === 'duo') { badgeColor = '#1AACAC'; badgeText = 'Dúo'; }
  else if (espacio.tipo === 'grupo') { badgeColor = '#fbbf24'; badgeText = 'Grupo'; }

  return (
    <div style={styles.appContainer}>
      <style>{`
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .bento-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; width: 100%; }
      `}</style>

      {toastVisible && <div style={styles.toast}>Link de vista copiado al portapapeles ✓</div>}

      {/* HEADER UNIFICADO */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/espacios')} style={styles.backBtn}>Volver</button>
        </div>
        <div style={styles.logoArea}>
          <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
          <span style={styles.headerDivider}>|</span>
          <span style={styles.headerTitle}>{espacio.nombre}</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.profileCircle} onClick={() => navigate('/perfil')}>{inicialUsuario}</div>
        </div>
      </header>

      {/* BARRA DE ACCIÓN INTERNA */}
      <div style={styles.actionBar}>
        <div style={styles.controlGroup}>
          <span style={{ ...styles.badge, color: badgeColor, borderColor: badgeColor }}>{badgeText}</span>
          <p style={styles.descText}>{espacio.descripcion || 'Sin descripción'}</p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={copiarLinkPublico} style={styles.neutralBtn}>{ICONS.link} Compartir Link</button>
          <button onClick={() => setModalConfigVisible(true)} style={styles.neutralBtn}>{ICONS.settings} Personalizar</button>
        </div>
      </div>

      {/* CUADRÍCULA BENTO DE ACCESOS DIRECTOS */}
      <main style={styles.main}>
        <div className="bento-grid">
          
          {/* CARD: KANBAN (Si está activo) */}
          {espacio.modulosActivos?.includes('kanban') ? (
            <div style={styles.bentoCard} onClick={() => navigate(`/espacio/${id}/kanban`)}>
              <div style={{ ...styles.iconWrap, color: '#8B85FF', background: 'rgba(139,133,255,0.15)' }}>{ICONS.kanban}</div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>Tablero Kanban</h3>
                <p style={styles.cardDesc}>Organiza y gestiona las tareas colaborativas asignadas a este entorno.</p>
              </div>
            </div>
          ) : null}

          {/* CARD: ESCRITORIO / NOTAS (Si está activo) */}
          {espacio.modulosActivos?.includes('escritorio') ? (
            <div style={styles.bentoCard} onClick={() => navigate(`/espacio/${id}/escritorio`)}>
              <div style={{ ...styles.iconWrap, color: '#1AACAC', background: 'rgba(26,172,172,0.15)' }}>{ICONS.notes}</div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>Escritorio</h3>
                <p style={styles.cardDesc}>Crea carpetas, toma notas estructuradas y guarda enlaces de interés compartidos.</p>
              </div>
            </div>
          ) : null}

          {/* ESTADO VACÍO SI NO HAY MÓDULOS ACTIVADOS */}
          {(!espacio.modulosActivos || espacio.modulosActivos.length === 0) && (
            <div style={styles.emptyState}>
              Este entorno no tiene herramientas activas todavía. Presiona el botón <strong>Personalizar</strong> arriba para activar módulos de trabajo.
            </div>
          )}

        </div>
      </main>

      {/* MODAL DE PERSONALIZACIÓN Y CONFIGURACIÓN AVANZADA */}
      {modalConfigVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>Personalizar Entorno</h3>
            <form onSubmit={guardarConfiguracionAvanzada} style={styles.modalForm}>
              
              <label style={styles.modalLabel}>Nombre del entorno</label>
              <input required style={styles.input} value={formularioConfig.nombre} onChange={(e) => setFormularioConfig({ ...formularioConfig, nombre: e.target.value })} />

              <label style={styles.modalLabel}>Descripción</label>
              <textarea style={styles.input} value={formularioConfig.descripcion} onChange={(e) => setFormularioConfig({ ...formularioConfig, descripcion: e.target.value })} />

              <label style={styles.modalLabel}>Tipo de Entorno</label>
              <div style={styles.typeSelector}>
                <div 
                  style={{ ...styles.typeOption, borderColor: formularioConfig.tipo === 'publicacion' ? '#c084fc' : 'rgba(255,255,255,0.1)', background: formularioConfig.tipo === 'publicacion' ? 'rgba(192,132,252,0.1)' : 'transparent' }}
                  onClick={() => setFormularioConfig({ ...formularioConfig, tipo: 'publicacion' })}
                >
                  {ICONS.publicacion}
                  <div style={styles.typeText}>Publicación</div>
                </div>
                <div 
                  style={{ ...styles.typeOption, borderColor: formularioConfig.tipo === 'duo' ? '#1AACAC' : 'rgba(255,255,255,0.1)', background: formularioConfig.tipo === 'duo' ? 'rgba(26,172,172,0.1)' : 'transparent' }}
                  onClick={() => setFormularioConfig({ ...formularioConfig, tipo: 'duo' })}
                >
                  {ICONS.dual}
                  <div style={styles.typeText}>Dúo</div>
                </div>
                <div 
                  style={{ ...styles.typeOption, borderColor: formularioConfig.tipo === 'grupo' ? '#fbbf24' : 'rgba(255,255,255,0.1)', background: formularioConfig.tipo === 'grupo' ? 'rgba(251,191,36,0.1)' : 'transparent' }}
                  onClick={() => setFormularioConfig({ ...formularioConfig, tipo: 'grupo' })}
                >
                  {ICONS.group}
                  <div style={styles.typeText}>Grupo</div>
                </div>
              </div>

              <label style={styles.modalLabel}>Módulos Activos</label>
              <div style={styles.modulesContainer}>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={formularioConfig.modulos.kanban} onChange={(e) => setFormularioConfig({ ...formularioConfig, modulos: { ...formularioConfig.modulos, kanban: e.target.checked } })} />
                  Activar Tablero Kanban
                </label>
                <label style={styles.checkboxLabel}>
                  <input type="checkbox" checked={formularioConfig.modulos.escritorio} onChange={(e) => setFormularioConfig({ ...formularioConfig, modulos: { ...formularioConfig.modulos, escritorio: e.target.checked } })} />
                  Activar Escritorio (Notas)
                </label>
              </div>

              <div style={styles.modalActions}>
                <button type="button" onClick={() => setModalConfigVisible(false)} style={styles.btnGhost}>Cancelar</button>
                <button type="submit" style={styles.btnPrimary}>Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// =================================================================
// ESTILOS: NEGRO PURO, SÓLIDO Y SIMÉTRICO
// =================================================================
const styles = {
  appContainer: { height: '100vh', width: '100vw', backgroundColor: '#000000', overflow: 'hidden', color: '#FFF', fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column' },
  loading: { height: '100vh', width: '100vw', backgroundColor: '#000000', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' },
  
  header: { height: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#000000', flexShrink: 0 },
  headerLeft: { flex: 1, display: 'flex', justifyContent: 'flex-start' },
  backBtn: { background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
  logoArea: { flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' },
  logoImage: { height: '32px', width: 'auto', objectFit: 'contain' },
  headerDivider: { color: 'rgba(255,255,255,0.2)', fontSize: '24px', fontWeight: '300' },
  headerTitle: { fontSize: '26px', fontWeight: '800', color: '#FFF', letterSpacing: '-0.5px' },
  headerRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  profileCircle: { width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#1AACAC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' },

  actionBar: { position: 'relative', zIndex: 5, padding: '15px 48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 },
  controlGroup: { display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden', flex: 1, paddingRight: '20px' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: '800', padding: '4px 10px', borderRadius: '8px', border: '1px solid', flexShrink: 0, textTransform: 'uppercase' },
  descText: { fontSize: '14px', color: 'rgba(255,255,255,0.5)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  neutralBtn: { display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },

  main: { position: 'relative', zIndex: 1, padding: '40px 48px', maxWidth: '1200px', margin: '0 auto', width: '100%', overflowY: 'auto', flex: 1 },
  
  // Tarjeta Bento adaptada al diseño de Panel
  bentoCard: { background: 'rgba(20, 22, 40, 0.6)', borderRadius: '24px', padding: '24px', border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '20px', transition: '0.2s', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', minHeight: '160px' },
  iconWrap: { width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardBody: { display: 'flex', flexDirection: 'column', gap: '8px' },
  cardTitle: { fontSize: '20px', fontWeight: '700', margin: 0 },
  cardDesc: { fontSize: '13px', color: 'rgba(255,255,255,0.4)', margin: 0, lineHeight: '1.5' },
  
  emptyState: { width: '100%', gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '60px 20px', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '24px', fontSize: '14px', lineHeight: '1.6' },
  toast: { position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', background: '#1AACAC', color: '#FFF', padding: '12px 24px', borderRadius: '30px', fontWeight: '700', fontSize: '14px', zIndex: 2000, boxShadow: '0 10px 30px rgba(26,172,172,0.4)', animation: 'popIn 0.3s ease' },

  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modalBox: { background: 'rgba(20, 22, 35, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '30px', width: '90%', maxWidth: '550px', animation: 'popIn 0.2s ease' },
  modalTitle: { margin: '0 0 20px 0', fontSize: '22px', fontWeight: '800' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '15px' },
  modalLabel: { fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  input: { background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 16px', borderRadius: '10px', color: '#FFF', fontSize: '14px', outline: 'none', fontFamily: 'inherit' },
  
  typeSelector: { display: 'flex', gap: '10px' },
  typeOption: { flex: 1, border: '1px solid', padding: '12px 8px', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: '0.2s' },
  typeText: { fontWeight: '700', fontSize: '13px' },
  
  modulesContainer: { display: 'flex', flexDirection: 'column', gap: '10px', background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', cursor: 'pointer' },
  
  modalActions: { display: 'flex', gap: '15px', marginTop: '20px' },
  btnPrimary: { flex: 1, background: '#FFF', color: '#000', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
  btnGhost: { flex: 1, background: 'transparent', color: '#FFF', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer', fontSize: '14px' }
};

export default Entorno;