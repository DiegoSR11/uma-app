// src/pages/Tareas.jsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';

const COLUMNAS = ['Pendiente', 'En Proceso', 'Completado'];

// =================================================================
// COMPONENTE: Select Personalizado (Estilo Glass Neutro)
// =================================================================
const CustomSelect = ({ value, onChange, options, style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div 
      style={{ position: 'relative', width: '100%', zIndex: isOpen ? 999 : 1, ...style }} 
      tabIndex={0} 
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false); }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={styles.customSelectTrigger}
      >
        <span>{selectedOption.label}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>{isOpen ? '▲' : '▼'}</span>
      </div>
      
      {isOpen && (
        <div style={styles.customSelectMenu}>
          {options.map(opt => (
            <div 
              key={opt.value} 
              style={{
                ...styles.customSelectItem,
                backgroundColor: value === opt.value ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                fontWeight: value === opt.value ? 'bold' : 'normal',
                color: opt.color || '#FFF' 
              }}
              onClick={() => { onChange(opt.value); setIsOpen(false); }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Tareas = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // Capturamos el ID del entorno (si existe)

  const [tareas, setTareas] = useState([]);
  const [nombreEntorno, setNombreEntorno] = useState(''); 
  const [tareaEditando, setTareaEditando] = useState(null); 
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(null);
  const [menuContextual, setMenuContextual] = useState({ visible: false, x: 0, y: 0, tarea: null });
  const [mensajeCopiado, setMensajeCopiado] = useState(false);

  // Estados de Filtro y Búsqueda Global
  const [busqueda, setBusqueda] = useState('');
  const [filtroGlobalTipo, setFiltroGlobalTipo] = useState('Todos');
  const [ordenGlobal, setOrdenGlobal] = useState('Reciente');

  const inicialUsuario = auth.currentUser?.displayName ? auth.currentUser.displayName.charAt(0).toUpperCase() : (auth.currentUser?.email ? auth.currentUser.email.charAt(0).toUpperCase() : 'U');

  useEffect(() => {
    const handleClickOutside = () => setMenuContextual({ visible: false, x: 0, y: 0, tarea: null });
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  // Efecto para buscar el nombre del Entorno si hay un "id" en la URL
  useEffect(() => {
    if (id) {
      const unsub = onSnapshot(doc(db, 'espacios', id), (docSnap) => {
        if (docSnap.exists()) {
          setNombreEntorno(docSnap.data().nombre);
        }
      });
      return () => unsub();
    }
  }, [id]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        let q;
        if (id) {
          q = query(collection(db, 'tareas'), where('espacioId', '==', id));
        } else {
          q = query(collection(db, 'tareas'), where('userId', '==', user.uid));
        }

        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          let docs = snapshot.docs.map(d => ({ idBaseDatos: d.id, ...d.data(), tipo: d.data().tipo || 'General' }));
          
          if (!id) {
            docs = docs.filter(d => !d.espacioId);
          }

          setTareas(docs);
        });
        return () => unsubscribeFirestore();
      } else { navigate('/login'); }
    });
    return () => unsubscribeAuth();
  }, [id, navigate]);

  const abrirModalNuevaTarea = (estadoInicial = 'Pendiente') => {
    setTareaEditando({ esNueva: true, texto: '', estado: estadoInicial, tipo: 'Trabajo', estrellada: false });
  };

  const guardarTarea = async (e) => {
    e.preventDefault();
    if (!tareaEditando.texto.trim()) return; 

    let colorTipo = '#94a3b8'; 
    if (tareaEditando.tipo === 'Trabajo') colorTipo = '#fbbf24'; 
    if (tareaEditando.tipo === 'Personal') colorTipo = '#60a5fa'; 

    try {
      if (tareaEditando.esNueva) {
        const numeroId = String(tareas.length + 1).padStart(8, '0');
        await addDoc(collection(db, 'tareas'), {
          idVisual: `#G${numeroId}`, texto: tareaEditando.texto, estado: tareaEditando.estado,
          tipo: tareaEditando.tipo, colorTipo: colorTipo, estrellada: false,
          fechaCreacion: new Date().toISOString(), userId: auth.currentUser.uid,
          espacioId: id || null 
        });
      } else {
        await updateDoc(doc(db, 'tareas', tareaEditando.idBaseDatos), {
          texto: tareaEditando.texto, estado: tareaEditando.estado, tipo: tareaEditando.tipo, colorTipo: colorTipo,
        });
      }
      setTareaEditando(null);
    } catch (error) { console.error(error); }
  };

  const toggleEstrella = async (e, tarea) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'tareas', tarea.idBaseDatos), { estrellada: !tarea.estrellada });
    setMenuContextual({ visible: false, x: 0, y: 0, tarea: null });
  };

  const ejecutarEliminacion = async () => {
    await deleteDoc(doc(db, 'tareas', confirmacionEliminar.id));
    setConfirmacionEliminar(null);
    if (tareaEditando && tareaEditando.idBaseDatos === confirmacionEliminar.id) {
      setTareaEditando(null);
    }
  };

  const handleContextMenu = (e, tarea) => {
    e.preventDefault(); e.stopPropagation();
    setMenuContextual({ visible: true, x: e.pageX, y: e.pageY, tarea });
  };

  const handleDragStart = (e, id) => e.dataTransfer.setData('taskId', id);
  const handleDragOver = (e) => e.preventDefault();

  const handleDropOnColumn = async (e, nuevoEstado) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('taskId');
    if (!draggedId) return;
    const draggedTask = tareas.find(t => t.idBaseDatos === draggedId);
    if (draggedTask && draggedTask.estado !== nuevoEstado) {
      await updateDoc(doc(db, 'tareas', draggedId), { estado: nuevoEstado });
    }
  };

  const copiarCodigo = (e, codigo) => {
    e.stopPropagation();
    navigator.clipboard.writeText(codigo);
    setMensajeCopiado(true);
    setTimeout(() => setMensajeCopiado(false), 2000);
  };

  const renderCard = (tarea) => {
    let bgBadge = 'rgba(255,255,255,0.1)', colorTxt = '#cbd5e1';
    if (tarea.estado === 'En Proceso') { bgBadge = 'rgba(251, 191, 36, 0.2)'; colorTxt = '#fbbf24'; } 
    else if (tarea.estado === 'Completado') { bgBadge = 'rgba(34, 197, 94, 0.2)'; colorTxt = '#4ade80'; }

    return (
      <div 
        key={tarea.idBaseDatos} style={styles.card}
        onClick={() => setTareaEditando({ ...tarea, esNueva: false })}
        onContextMenu={(e) => handleContextMenu(e, tarea)}
        draggable onDragStart={(e) => handleDragStart(e, tarea.idBaseDatos)}
      >
        <div style={styles.cardHeader}>
          <div 
            style={{ ...styles.cardIdBadge, backgroundColor: bgBadge, color: colorTxt }}
            onClick={(e) => copiarCodigo(e, tarea.idVisual)}
            title="Copiar Código"
          >
            {tarea.idVisual}
          </div>
          <div style={styles.cardHeaderRight}>
            <div style={{ ...styles.typeTag, color: tarea.colorTipo, borderColor: tarea.colorTipo }}>{tarea.tipo}</div>
            <div style={{ ...styles.star, color: tarea.estrellada ? '#fbbf24' : 'rgba(255,255,255,0.2)' }} onClick={(e) => toggleEstrella(e, tarea)}>
              {tarea.estrellada ? '★' : '☆'}
            </div>
          </div>
        </div>
        <div style={styles.cardTitle}>{tarea.texto}</div>
      </div>
    );
  };

  const optionsTipo = [{ value: 'Todos', label: 'Todos los tipos' }, { value: 'Personal', label: 'Personal' }, { value: 'Trabajo', label: 'Trabajo' }, { value: 'General', label: 'General' }];
  const optionsOrden = [{ value: 'Reciente', label: 'Recientes' }, { value: 'Antiguo', label: 'Antiguos' }, { value: 'A-Z', label: 'A-Z' }, { value: 'Destacados', label: 'Destacados' }];

  return (
    <div style={styles.appContainer}>
      <style>
        {`
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
          * { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.15) transparent; }
          ::placeholder { color: rgba(255,255,255,0.4); }
          @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        `}
      </style>

      {/* TOAST NOTIFICATION */}
      {mensajeCopiado && (
        <div style={styles.toast}>Código copiado al portapapeles ✓</div>
      )}

      {/* HEADER DINÁMICO */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => id ? navigate(`/espacio/${id}`) : navigate('/panel')} style={styles.backBtn}>
            Volver
          </button>
        </div>
        
        <div style={styles.logoArea}>
          <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
          {nombreEntorno && (
            <>
              <span style={styles.headerDivider}>|</span>
              <span style={styles.headerTitle}>{nombreEntorno}</span>
            </>
          )}
          <span style={styles.headerDivider}>|</span>
          <span style={styles.headerTitle}>Kanban</span>
        </div>
        
        <div style={styles.headerRight}>
          <div style={styles.profileCircle} onClick={() => navigate('/perfil')} title="Ver perfil">
            {inicialUsuario}
          </div>
        </div>
      </header>

      {/* BARRA DE ACCIÓN GLOBAL UNIFICADA */}
      <div style={styles.actionBar}>
        <div style={styles.controlGroup}>
          <span style={styles.label}>Buscar:</span>
          <input 
            type="text" 
            placeholder="Código o descripción..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            style={styles.searchInput}
          />
        </div>
        <div style={{ display: 'flex', gap: '20px' }}>
          <div style={styles.controlGroup}>
            <span style={styles.label}>Filtro:</span>
            <CustomSelect style={{ width: 140 }} value={filtroGlobalTipo} onChange={setFiltroGlobalTipo} options={optionsTipo} />
          </div>
          <div style={styles.controlGroup}>
            <span style={styles.label}>Orden:</span>
            <CustomSelect style={{ width: 140 }} value={ordenGlobal} onChange={setOrdenGlobal} options={optionsOrden} />
          </div>
        </div>
      </div>

      <div style={styles.board}>
        {COLUMNAS.map(col => {
          // Lógica de Filtrado y Búsqueda Global
          let tasks = tareas.filter(t => t.estado === col || (col === 'Pendiente' && t.estado === 'Abierto') || (col === 'Completado' && t.estado === 'Cerrado'));
          
          if (filtroGlobalTipo !== 'Todos') {
            tasks = tasks.filter(t => t.tipo === filtroGlobalTipo);
          }

          if (busqueda.trim() !== '') {
            const searchLower = busqueda.toLowerCase();
            tasks = tasks.filter(t => 
              (t.idVisual && t.idVisual.toLowerCase().includes(searchLower)) || 
              (t.texto && t.texto.toLowerCase().includes(searchLower))
            );
          }
          
          // Lógica de Orden Global
          tasks.sort((a, b) => {
            if (ordenGlobal === 'A-Z') return a.texto.localeCompare(b.texto);
            if (ordenGlobal === 'Destacados') return a.estrellada === b.estrellada ? 0 : a.estrellada ? -1 : 1;
            
            const fechaA = new Date(a.fechaCreacion).getTime() || 0;
            const fechaB = new Date(b.fechaCreacion).getTime() || 0;
            return ordenGlobal === 'Antiguo' ? fechaA - fechaB : fechaB - fechaA;
          });

          return (
            <div key={col} style={styles.column} onDragOver={handleDragOver} onDrop={(e) => handleDropOnColumn(e, col)}>
              <div style={styles.columnHeader}>
                <div style={styles.columnHeaderTop}>
                  <h3 style={styles.columnTitle}>{col}</h3>
                  <div style={styles.count}>{tasks.length}</div>
                </div>
              </div>
              <div style={styles.cardList}>{tasks.map(t => renderCard(t))}</div>
              <div style={styles.addBtn} onClick={() => abrirModalNuevaTarea(col)}>+ Agregar tarjeta</div>
            </div>
          );
        })}
      </div>

      {/* MODAL EDITAR / NUEVA TAREA */}
      {tareaEditando && (
        <div style={styles.modalOverlay}>
          <div style={styles.glassModal}>
            
            {/* Header del Modal (X alineada arriba a la derecha) */}
            <div style={styles.modalHeader}>
              <h2 style={{ margin:0, fontSize: '22px', fontWeight: '800' }}>
                {tareaEditando.esNueva ? 'Nueva Tarea' : tareaEditando.idVisual}
              </h2>
              <button style={styles.closeBtn} onClick={() => setTareaEditando(null)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <div style={styles.modalBody}>
              {/* Columna Izquierda */}
              <div style={styles.modalMain}>
                <label style={styles.modalLabel}>Descripción</label>
                <textarea 
                  style={styles.glassTextarea} 
                  value={tareaEditando.texto} 
                  onChange={(e) => setTareaEditando({...tareaEditando, texto: e.target.value})} 
                  autoFocus 
                />
              </div>

              {/* Columna Derecha */}
              <div style={styles.modalSide}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <label style={{...styles.modalLabel, marginBottom: '-5px'}}>Estado</label>
                  <CustomSelect value={tareaEditando.estado} onChange={(v) => setTareaEditando({...tareaEditando, estado: v})} options={COLUMNAS.map(c=>({value:c, label:c}))} />
                  
                  <label style={{...styles.modalLabel, marginBottom: '-5px'}}>Categoría</label>
                  <CustomSelect value={tareaEditando.tipo} onChange={(v) => setTareaEditando({...tareaEditando, tipo: v})} options={optionsTipo.slice(1)} />
                </div>

                {/* Botones apilados al fondo */}
                <div style={styles.modalActions}>
                  {!tareaEditando.esNueva && (
                    <button style={styles.btnDanger} onClick={() => setConfirmacionEliminar({id: tareaEditando.idBaseDatos})}>
                      Eliminar
                    </button>
                  )}
                  <button style={styles.btnPrimary} onClick={guardarTarea}>Guardar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENÚ CONTEXTUAL */}
      {menuContextual.visible && (
        <div style={{ ...styles.contextMenu, top: menuContextual.y, left: menuContextual.x }}>
          <div style={styles.contextItem} onClick={(e) => toggleEstrella(e, menuContextual.tarea)}>
            {menuContextual.tarea.estrellada ? '☆ Quitar Favorito' : '★ Destacar'}
          </div>
          <div style={{ height:1, background:'rgba(255,255,255,0.1)', margin:'4px 0' }} />
          <div style={{ ...styles.contextItem, color: '#f87171' }} onClick={() => { setConfirmacionEliminar({ id: menuContextual.tarea.idBaseDatos }); setMenuContextual({ visible: false, x: 0, y: 0, tarea: null }); }}>🗑 Eliminar</div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN SIMÉTRICO */}
      {confirmacionEliminar && (
        <div style={{ ...styles.modalOverlay, zIndex: 3000 }}>
          <div style={styles.alertBox}>
            <h2 style={{ margin: '0 0 10px 0', color:'#f87171', fontSize: '24px' }}>¿Eliminar?</h2>
            <p style={{ margin: '0 0 25px 0', color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>Esta acción no se puede deshacer.</p>
            
            <div style={{ display:'flex', gap: '15px', justifyContent:'center' }}>
              <button style={styles.btnCancelAlert} onClick={() => setConfirmacionEliminar(null)}>Cancelar</button>
              <button style={styles.btnDangerAlert} onClick={ejecutarEliminacion}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =================================================================
// ESTILOS: MODO OSCURO PURO Y BOTONES NEUTROS
// =================================================================
const styles = {
  appContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#000000', overflow: 'hidden', color: '#FFF', fontFamily: 'Inter, sans-serif' },
  
  header: { height: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#000000' },
  headerLeft: { flex: 1, display: 'flex', justifyContent: 'flex-start' },
  backBtn: { background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
  logoArea: { flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' },
  logoImage: { height: '32px', width: 'auto', objectFit: 'contain' },
  headerDivider: { color: 'rgba(255,255,255,0.2)', fontSize: '24px', fontWeight: '300' },
  headerTitle: { fontSize: '22px', fontWeight: '800', color: '#FFF', letterSpacing: '-0.5px' },
  headerRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  profileCircle: { width: '38px', height: '38px', borderRadius: '50%', backgroundColor: '#1AACAC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' },

  actionBar: { position: 'relative', zIndex: 5, padding: '15px 48px', display: 'flex', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexWrap: 'wrap', gap: '15px' },
  controlGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  label: { fontSize: '13px', fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  searchInput: { background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 15px', borderRadius: '8px', color: '#FFF', fontSize: '13px', outline: 'none', width: '220px', fontFamily: 'inherit' },

  board: { flex: 1, display: 'flex', padding: '25px 48px', gap: '25px', overflowX: 'auto', position: 'relative', zIndex: 1, alignItems: 'flex-start' },
  
  column: { flex: '1 1 320px', minWidth: '320px', height: '100%', backgroundColor: 'rgba(20, 22, 40, 0.6)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.3)' },
  columnHeader: { padding: '20px 25px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  columnHeaderTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  columnTitle: { margin: 0, fontSize: '15px', fontWeight: '800', letterSpacing: '0.5px', textTransform: 'uppercase', color: '#FFF' },
  count: { backgroundColor: 'rgba(255,255,255,0.1)', padding: '3px 12px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },

  cardList: { flex: 1, padding: '15px 25px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  
  card: { backgroundColor: 'rgba(0, 0, 0, 0.3)', padding: '16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', cursor: 'grab', transition: '0.2s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  cardIdBadge: { padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', fontFamily: 'monospace', cursor: 'pointer', transition: '0.2s' },
  cardHeaderRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  typeTag: { fontSize: '10px', fontWeight: '700', padding: '3px 8px', borderRadius: '6px', border: '1px solid' },
  star: { fontSize: '18px', cursor: 'pointer' },
  
  cardTitle: { fontSize: '14px', color: '#FFFFFF', fontWeight: '600', lineHeight: '1.5', opacity: 0.9, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  
  addBtn: { margin: '10px 25px 25px', padding: '12px', textAlign: 'center', background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },

  toast: { position: 'fixed', bottom: '40px', left: '50%', transform: 'translateX(-50%)', background: '#1AACAC', color: '#FFF', padding: '12px 24px', borderRadius: '30px', fontWeight: '700', fontSize: '14px', zIndex: 2000, boxShadow: '0 10px 30px rgba(26,172,172,0.4)', animation: 'popIn 0.3s ease' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  glassModal: { backgroundColor: 'rgba(20, 20, 25, 0.95)', width: '90%', maxWidth: '750px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.8)', animation: 'popIn 0.2s ease' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }, // X al tope
  modalBody: { display: 'flex', gap: '30px', flexWrap: 'wrap' },
  modalMain: { flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '10px' },
  modalSide: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '15px' },
  glassTextarea: { backgroundColor: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', color: '#FFF', fontSize: '14px', outline: 'none', minHeight: '220px', resize: 'none', fontFamily: 'inherit' },
  modalLabel: { fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' },
  modalActions: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px' },
  
  btnPrimary: { backgroundColor: '#FFF', color: '#000', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px', transition: '0.2s' },
  btnDanger: { background: 'rgba(248,113,113,0.1)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  closeBtn: { background: 'none', border: 'none', color: '#FFF', opacity: 0.6, cursor: 'pointer', display: 'flex', transition: '0.2s', padding: 0 },

  customSelectTrigger: { backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px', borderRadius: '10px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  customSelectMenu: { position: 'absolute', top: '105%', left: 0, right: 0, backgroundColor: 'rgba(30, 32, 50, 0.95)', backdropFilter: 'blur(10px)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.4)' },
  customSelectItem: { padding: '10px 15px', fontSize: '12px', cursor: 'pointer' },

  contextMenu: { position: 'absolute', backgroundColor: 'rgba(20, 20, 35, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 0', zIndex: 3000, minWidth: '160px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  contextItem: { padding: '10px 15px', fontSize: '12px', cursor: 'pointer', transition: '0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } },
  
  // Modal Alerta Simétrica
  alertBox: { backgroundColor: 'rgba(20, 22, 30, 0.95)', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', minWidth: '320px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', animation: 'popIn 0.2s ease' },
  btnCancelAlert: { flex: 1, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: '12px 15px', borderRadius: '12px', cursor: 'pointer', fontSize: '14px', fontWeight: '700', transition: '0.2s' },
  btnDangerAlert: { flex: 1, backgroundColor: '#f87171', color: '#000', border: 'none', padding: '12px 15px', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }
};

export default Tareas;