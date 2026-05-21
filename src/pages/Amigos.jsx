// src/pages/Amigos.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, getDocs, deleteDoc } from 'firebase/firestore';

const ICONS = {
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  send: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
};

const Avatar = ({ nombre, color }) => (
  <div style={{ ...styles.avatar, backgroundColor: color || 'rgba(26,172,172,0.15)', color: color ? '#000' : '#1AACAC' }}>
    {(nombre || 'U').charAt(0).toUpperCase()}
  </div>
);

const Amigos = () => {
  const navigate = useNavigate();
  const [bgImage, setBgImage] = useState('');
  
  const [amigos, setAmigos] = useState([]);
  const [solicitudesRecibidas, setSolicitudesRecibidas] = useState([]);
  const [solicitudesEnviadas, setSolicitudesEnviadas] = useState([]); // Nuevo estado
  
  const [rightTab, setRightTab] = useState('buscar'); // 'buscar' | 'recibidas' | 'enviadas'
  
  const [busqueda, setBusqueda] = useState('');
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [buscando, setBuscando] = useState(false);

  const [contextMenu, setContextMenu] = useState(null);

  // SISTEMA UNIVERSAL DE MODALES
  const [modal, setModal] = useState({
    visible: false,
    title: '',
    text: '',
    type: 'info', // 'danger' (rojo) o 'info' (acento)
    confirmText: 'Aceptar',
    showCancel: true,
    action: null
  });

  const cerrarModal = () => setModal({ ...modal, visible: false });

  // Función ayudante para lanzar alertas simples sin botón de cancelar
  const mostrarAlerta = (title, text, type = 'info') => {
    setModal({
      visible: true, title, text, type, confirmText: 'Entendido', showCancel: false, action: cerrarModal
    });
  };

  useEffect(() => {
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    setBgImage(fondos[Math.floor(Math.random() * fondos.length)]);
  }, []);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    // 1. Escuchar Mis Amigos
    const qAmigos = query(collection(db, 'amigos'), where('miId', '==', user.uid));
    const unsubAmigos = onSnapshot(qAmigos, (snapshot) => {
      let lista = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      lista.sort((a, b) => {
        if (a.favorito === b.favorito) return a.amigoNombre.localeCompare(b.amigoNombre);
        return a.favorito ? -1 : 1;
      });
      setAmigos(lista);
    });

    // 2. Escuchar Solicitudes Recibidas
    const qSolRecibidas = query(collection(db, 'solicitudes'), where('paraId', '==', user.uid), where('estado', '==', 'pendiente'));
    const unsubSolRecibidas = onSnapshot(qSolRecibidas, (snapshot) => {
      setSolicitudesRecibidas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Escuchar Solicitudes Enviadas (NUEVO)
    const qSolEnviadas = query(collection(db, 'solicitudes'), where('deId', '==', user.uid), where('estado', '==', 'pendiente'));
    const unsubSolEnviadas = onSnapshot(qSolEnviadas, (snapshot) => {
      setSolicitudesEnviadas(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAmigos(); unsubSolRecibidas(); unsubSolEnviadas(); };
  }, [navigate]);

  useEffect(() => {
    const handleClickFuera = () => setContextMenu(null);
    window.addEventListener('click', handleClickFuera);
    return () => window.removeEventListener('click', handleClickFuera);
  }, []);

  const handleBusquedaChange = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    if (valor.trim() === '') setResultadosBusqueda([]);
  };

  const buscarUsuario = async (e) => {
    e.preventDefault();
    const textoBuscado = busqueda.toLowerCase().trim();
    if (!textoBuscado) return;
    
    setBuscando(true);
    setResultadosBusqueda([]);

    try {
      const q = query(collection(db, 'usuarios'));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const resultados = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(u => {
            if (u.id === auth.currentUser.uid) return false;
            const matchEmail = u.email?.toLowerCase().includes(textoBuscado);
            const matchNombre = u.displayName?.toLowerCase().includes(textoBuscado);
            return matchEmail || matchNombre;
          });
          
        setResultadosBusqueda(resultados.length > 0 ? resultados : 'no_encontrado');
      } else {
        setResultadosBusqueda('no_encontrado');
      }
    } catch (error) {
      console.error("Error buscando:", error);
      mostrarAlerta("Error de conexión", "Hubo un problema al buscar. Revisa tu conexión.", "danger");
    }
    setBuscando(false);
  };

  // ==========================================
  // LÓGICA DE MODALES DE CONFIRMACIÓN
  // ==========================================

  const confirmarEnviarSolicitud = (usuarioDestino) => {
    setModal({
      visible: true,
      title: 'Enviar Solicitud',
      text: `¿Deseas enviar una solicitud de amistad a ${usuarioDestino.displayName || usuarioDestino.email}?`,
      type: 'info',
      confirmText: 'Enviar solicitud',
      showCancel: true,
      action: async () => {
        try {
          const user = auth.currentUser;
          const qExiste = query(collection(db, 'solicitudes'), where('deId', '==', user.uid), where('paraId', '==', usuarioDestino.id));
          const snapExiste = await getDocs(qExiste);
          
          if (!snapExiste.empty) {
            cerrarModal();
            mostrarAlerta("Aviso", "Ya le has enviado una solicitud a esta persona o ya son amigos.", "info");
            return;
          }

          await addDoc(collection(db, 'solicitudes'), {
            deId: user.uid, deEmail: user.email, deNombre: user.displayName || user.email.split('@')[0],
            paraId: usuarioDestino.id, paraEmail: usuarioDestino.email,
            estado: 'pendiente', fecha: Date.now()
          });
          
          setResultadosBusqueda([]);
          setBusqueda('');
          cerrarModal();
          mostrarAlerta("¡Éxito!", `Solicitud enviada a ${usuarioDestino.displayName || usuarioDestino.email}`, "info");
        } catch (error) {
          console.error("Error al enviar solicitud", error);
        }
      }
    });
  };

  const confirmarEliminarAmigo = (amigo) => {
    setModal({
      visible: true,
      title: 'Eliminar contacto',
      text: `¿Estás seguro que deseas eliminar a ${amigo.amigoNombre} de tu red? Esta acción no se puede deshacer.`,
      type: 'danger',
      confirmText: 'Sí, eliminar',
      showCancel: true,
      action: async () => {
        try {
          await deleteDoc(doc(db, 'amigos', amigo.id));
          const q = query(collection(db, 'amigos'), where('miId', '==', amigo.amigoId), where('amigoId', '==', auth.currentUser.uid));
          const snap = await getDocs(q);
          snap.forEach(async (documento) => await deleteDoc(documento.ref));
        } catch (error) {
          console.error("Error eliminando amigo:", error);
        }
        cerrarModal();
      }
    });
  };

  const confirmarCancelarSolicitud = (id) => {
    setModal({
      visible: true,
      title: 'Cancelar Solicitud',
      text: '¿Deseas cancelar esta solicitud de amistad que enviaste?',
      type: 'danger',
      confirmText: 'Sí, cancelar',
      showCancel: true,
      action: async () => {
        await deleteDoc(doc(db, 'solicitudes', id));
        cerrarModal();
      }
    });
  };

  // ==========================================
  // ACCIONES DIRECTAS (Sin modal)
  // ==========================================
  const aceptarSolicitud = async (solicitud) => {
    try {
      const user = auth.currentUser;
      await updateDoc(doc(db, 'solicitudes', solicitud.id), { estado: 'aceptada' });
      await addDoc(collection(db, 'amigos'), { miId: user.uid, amigoId: solicitud.deId, amigoEmail: solicitud.deEmail, amigoNombre: solicitud.deNombre, favorito: false });
      await addDoc(collection(db, 'amigos'), { miId: solicitud.deId, amigoId: user.uid, amigoEmail: user.email, amigoNombre: user.displayName || user.email.split('@')[0], favorito: false });
    } catch (error) {
      console.error("Error aceptando:", error);
    }
  };

  const rechazarSolicitud = async (id) => {
    await deleteDoc(doc(db, 'solicitudes', id));
  };

  const toggleFavorito = async (amigoId, estadoActual) => {
    await updateDoc(doc(db, 'amigos', amigoId), { favorito: !estadoActual });
  };

  const handleRightClick = (e, amigo) => {
    e.preventDefault();
    setContextMenu({ x: e.pageX, y: e.pageY, amigo });
  };

  const inicialUsuario = auth.currentUser?.displayName ? auth.currentUser.displayName.charAt(0).toUpperCase() : (auth.currentUser?.email ? auth.currentUser.email.charAt(0).toUpperCase() : 'U');

  return (
    <div style={{ ...styles.appContainer, backgroundImage: `url(${bgImage})` }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .anim-fade { animation: fadeUp 0.4s ease both; }
        
        .layout-split { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; }
        
        .custom-scroll { overflow-y: auto; flex: 1; padding-right: 8px; }
        .custom-scroll::-webkit-scrollbar { width: 6px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 10px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }

        @media (max-width: 900px) {
          .layout-split { grid-template-columns: 1fr; }
          .main-amigos { padding: 24px 20px !important; }
          .header-amigos { padding: 0 20px !important; }
          .panel-box { height: 500px !important; }
          .sub-tabs-container { flex-wrap: wrap; }
        }
      `}</style>
      
      <div style={styles.blurOverlay} />

      {/* MODAL UNIVERSAL */}
      {modal.visible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <div style={{ ...styles.modalIcon, color: modal.type === 'danger' ? '#f87171' : '#1AACAC' }}>
              {modal.type === 'danger' ? ICONS.trash : ICONS.info}
            </div>
            <h3 style={styles.modalTitle}>{modal.title}</h3>
            <p style={styles.modalText}>{modal.text}</p>
            <div style={styles.modalActions}>
              {modal.showCancel && (
                <button onClick={cerrarModal} style={styles.modalCancelBtn}>Cancelar</button>
              )}
              <button 
                onClick={modal.action} 
                style={{ ...styles.modalConfirmBtn, backgroundColor: modal.type === 'danger' ? '#f87171' : '#1AACAC' }}
              >
                {modal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MENÚ CONTEXTUAL (Clic Derecho) */}
      {contextMenu && (
        <div style={{ ...styles.contextMenu, top: contextMenu.y, left: contextMenu.x }}>
          <button style={styles.contextBtn} onClick={() => confirmarEliminarAmigo(contextMenu.amigo)}>
            {ICONS.trash} Eliminar contacto
          </button>
        </div>
      )}

      <header className="header-amigos" style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => navigate('/panel')} style={styles.backBtn}>Volver</button>
        </div>
        <div style={styles.logoArea}>
          <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
          <span style={styles.headerDivider}>|</span>
          <span style={styles.headerTitle}>Social</span>
        </div>
        <div style={styles.profileCircle} onClick={() => navigate('/perfil')}>{inicialUsuario}</div>
      </header>

      <main className="main-amigos anim-fade" style={styles.main}>
        <div className="layout-split">
          
          {/* COLUMNA IZQUIERDA: LISTA DE AMIGOS */}
          <div style={styles.panelBox} className="panel-box">
            <h2 style={styles.sectionHeading}>Mis Contactos ({amigos.length})</h2>
            
            <div className="custom-scroll" style={styles.listContainer}>
              {amigos.length === 0 ? (
                <div style={styles.emptyState}>No tienes contactos aún. Búscalos en el panel derecho.</div>
              ) : (
                amigos.map(amigo => (
                  <div key={amigo.id} style={styles.amigoCard} onContextMenu={(e) => handleRightClick(e, amigo)} title="Clic derecho para opciones">
                    <div style={styles.amigoInfo}>
                      <Avatar nombre={amigo.amigoNombre} color={amigo.favorito ? '#fbbf24' : ''} />
                      <div style={styles.textWrap}>
                        <div style={styles.amigoName}>{amigo.amigoNombre}</div>
                        <div style={styles.amigoEmail}>{amigo.amigoEmail}</div>
                      </div>
                    </div>
                    <div style={styles.actionBtns}>
                      <button onClick={(e) => { e.stopPropagation(); toggleFavorito(amigo.id, amigo.favorito); }} style={{...styles.starBtn, color: amigo.favorito ? '#fbbf24' : 'rgba(255,255,255,0.15)'}}>
                        ★
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: TRES PESTAÑAS */}
          <div style={styles.panelBox} className="panel-box">
            
            <div className="sub-tabs-container" style={styles.subTabsContainer}>
              <button onClick={() => setRightTab('buscar')} style={rightTab === 'buscar' ? styles.subTabActive : styles.subTabInactive}>
                Buscar
              </button>
              <button onClick={() => setRightTab('recibidas')} style={rightTab === 'recibidas' ? styles.subTabActive : styles.subTabInactive}>
                Recibidas {solicitudesRecibidas.length > 0 && <span style={styles.badge}>{solicitudesRecibidas.length}</span>}
              </button>
              <button onClick={() => setRightTab('enviadas')} style={rightTab === 'enviadas' ? styles.subTabActive : styles.subTabInactive}>
                Enviadas
              </button>
            </div>

            <div className="custom-scroll" style={styles.listContainer}>
              
              {/* TAB: BUSCAR */}
              {rightTab === 'buscar' && (
                <>
                  <form onSubmit={buscarUsuario} style={styles.searchForm}>
                    <input type="text" placeholder="Nombre o correo..." value={busqueda} onChange={handleBusquedaChange} style={styles.searchInput} />
                    <button type="submit" style={styles.searchBtn} disabled={buscando || !busqueda.trim()}>{buscando ? '...' : 'Buscar'}</button>
                  </form>
                  <div style={{ paddingBottom: '20px' }}>
                    {resultadosBusqueda === 'no_encontrado' && <div style={styles.errorResult}>No se encontraron usuarios.</div>}
                    {Array.isArray(resultadosBusqueda) && resultadosBusqueda.map(user => (
                      <div key={user.id} style={styles.resultCard}>
                        <div style={styles.amigoInfo}>
                          <Avatar nombre={user.displayName || user.email} />
                          <div style={styles.textWrap}>
                            <div style={styles.amigoName}>{user.displayName || 'Usuario UMA'}</div>
                            <div style={styles.amigoEmail}>{user.email}</div>
                          </div>
                        </div>
                        {/* Invoca al modal universal */}
                        <button onClick={() => confirmarEnviarSolicitud(user)} style={styles.sendReqBtn}>{ICONS.send} Enviar</button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* TAB: RECIBIDAS */}
              {rightTab === 'recibidas' && (
                <>
                  {solicitudesRecibidas.length === 0 ? (
                    <div style={styles.emptyState}>No tienes solicitudes nuevas.</div>
                  ) : (
                    solicitudesRecibidas.map(sol => (
                      <div key={sol.id} style={styles.amigoCard}>
                        <div style={styles.amigoInfo}>
                          <Avatar nombre={sol.deNombre} />
                          <div style={styles.textWrap}>
                            <div style={styles.amigoName}>{sol.deNombre}</div>
                            <div style={styles.amigoEmail}>{sol.deEmail}</div>
                          </div>
                        </div>
                        <div style={styles.actionBtns}>
                          <button onClick={() => aceptarSolicitud(sol)} style={styles.acceptBtn}>✓</button>
                          <button onClick={() => rechazarSolicitud(sol.id)} style={styles.rejectBtn}>✕</button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

              {/* TAB: ENVIADAS */}
              {rightTab === 'enviadas' && (
                <>
                  {solicitudesEnviadas.length === 0 ? (
                    <div style={styles.emptyState}>No has enviado ninguna solicitud.</div>
                  ) : (
                    solicitudesEnviadas.map(sol => (
                      <div key={sol.id} style={styles.amigoCard}>
                        <div style={styles.amigoInfo}>
                          <Avatar nombre={sol.paraNombre || sol.paraEmail} color="rgba(255,255,255,0.1)" />
                          <div style={styles.textWrap}>
                            <div style={styles.amigoName}>{sol.paraNombre || sol.paraEmail}</div>
                            <div style={styles.amigoEmail}>Pendiente de respuesta...</div>
                          </div>
                        </div>
                        <div style={styles.actionBtns}>
                          <button onClick={() => confirmarCancelarSolicitud(sol.id)} style={styles.cancelReqBtn}>Cancelar</button>
                        </div>
                      </div>
                    ))
                  )}
                </>
              )}

            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// =================================================================
// ESTILOS GLASSMORPHISM 
// =================================================================
const styles = {
  appContainer: { minHeight: '100vh', width: '100%', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflowY: 'hidden', color: '#FFF', fontFamily: "'Inter', sans-serif" },
  blurOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 11, 30, 0.7)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', zIndex: 0 },
  
  header: { height: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  headerLeft: { flex: 1, display: 'flex', justifyContent: 'flex-start' },
  backBtn: { background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
  
  logoArea: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' },
  logoImage: { height: '32px', width: 'auto', objectFit: 'contain' },
  headerDivider: { color: 'rgba(255,255,255,0.2)', fontSize: '24px', fontWeight: '300' },
  headerTitle: { fontSize: '26px', fontWeight: '800', color: '#FFF', letterSpacing: '-0.5px' },
  
  profileCircle: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  
  main: { position: 'relative', zIndex: 1, padding: '30px 48px', maxWidth: '1200px', margin: '0 auto', boxSizing: 'border-box', width: '100%' },
  panelBox: { background: 'rgba(255,255,255,0.03)', padding: '25px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', boxSizing: 'border-box' },
  sectionHeading: { fontSize: '20px', fontWeight: '700', margin: '0 0 20px 0', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '15px' },

  subTabsContainer: { display: 'flex', gap: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' },
  subTabActive: { background: 'none', border: 'none', borderBottom: '2px solid #1AACAC', color: '#FFF', fontSize: '14px', fontWeight: '700', padding: '0 0 10px 0', cursor: 'pointer' },
  subTabInactive: { background: 'none', border: 'none', borderBottom: '2px solid transparent', color: 'rgba(255,255,255,0.4)', fontSize: '14px', fontWeight: '600', padding: '0 0 10px 0', cursor: 'pointer' },
  badge: { background: '#fbbf24', color: '#000', fontSize: '10px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '12px', marginLeft: '5px' },

  listContainer: { display: 'flex', flexDirection: 'column', gap: '12px' },
  amigoCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)', transition: '0.2s', marginBottom: '8px' },
  amigoInfo: { display: 'flex', alignItems: 'center', gap: '15px', overflow: 'hidden' },
  textWrap: { display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  avatar: { width: '42px', height: '42px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '16px', flexShrink: 0 },
  amigoName: { fontSize: '15px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  amigoEmail: { fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  
  actionBtns: { display: 'flex', alignItems: 'center', gap: '5px' },
  starBtn: { background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', transition: '0.2s', padding: '5px' },
  acceptBtn: { background: '#1AACAC', color: '#FFF', border: 'none', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  rejectBtn: { background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  cancelReqBtn: { background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },

  searchForm: { display: 'flex', gap: '10px', marginBottom: '15px' },
  searchInput: { flex: 1, padding: '12px 16px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: '#FFF', outline: 'none', fontSize: '14px', fontFamily: 'inherit' },
  searchBtn: { padding: '0 20px', background: '#fbbf24', color: '#000', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', fontSize: '14px' },
  resultCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(251,191,36,0.05)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.3)', marginBottom: '10px' },
  sendReqBtn: { display: 'flex', alignItems: 'center', gap: '6px', background: '#1AACAC', color: '#FFF', border: 'none', padding: '8px 14px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '12px' },
  errorResult: { color: '#f87171', fontSize: '13px', background: 'rgba(248,113,113,0.1)', padding: '12px', borderRadius: '8px', marginBottom: '10px' },
  emptyState: { color: 'rgba(255,255,255,0.3)', fontSize: '14px', padding: '10px 0' },

  contextMenu: { position: 'absolute', background: 'rgba(20,21,39,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 100, backdropFilter: 'blur(10px)', animation: 'popIn 0.15s ease' },
  contextBtn: { background: 'transparent', color: '#f87171', border: 'none', width: '100%', padding: '10px 15px', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', borderRadius: '6px' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999 },
  modalBox: { background: 'rgba(30, 32, 50, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '20px', padding: '30px', maxWidth: '400px', width: '90%', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'popIn 0.3s ease' },
  modalIcon: { marginBottom: '15px', transform: 'scale(1.5)', display: 'inline-block' },
  modalTitle: { margin: '0 0 10px 0', fontSize: '20px', fontWeight: '700' },
  modalText: { margin: '0 0 25px 0', fontSize: '14px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.5' },
  modalActions: { display: 'flex', gap: '10px', justifyContent: 'center' },
  modalCancelBtn: { flex: 1, padding: '10px', background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' },
  modalConfirmBtn: { flex: 1, padding: '10px', color: '#FFF', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer' }
};

export default Amigos;