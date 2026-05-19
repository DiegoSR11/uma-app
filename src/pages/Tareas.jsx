// src/pages/Tareas.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';

const COLUMNAS = ['Pendiente', 'En Proceso', 'Completado'];

// =================================================================
// COMPONENTE: Select Personalizado (Estilo Glass)
// =================================================================
const CustomSelect = ({ value, onChange, options, variant = 'normal', style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div 
      style={{ position: 'relative', width: '100%', zIndex: isOpen ? 9999 : 1, ...style }} 
      tabIndex={0} 
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false); }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={variant === 'mini' ? styles.customSelectTriggerMini : styles.customSelectTrigger}
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
                backgroundColor: value === opt.value ? 'rgba(54, 47, 217, 0.1)' : 'transparent',
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

  const [tareas, setTareas] = useState([]);
  const [tareaEditando, setTareaEditando] = useState(null); 
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(null);
  const [bgImage, setBgImage] = useState('');
  const [menuContextual, setMenuContextual] = useState({ visible: false, x: 0, y: 0, tarea: null });

  const [filtroGlobalTipo, setFiltroGlobalTipo] = useState('Todos');
  const [ordenGlobal, setOrdenGlobal] = useState('Reciente');
  const [controlesColumnas, setControlesColumnas] = useState({
    'Pendiente': { tipo: 'Global', orden: 'Global' },
    'En Proceso': { tipo: 'Global', orden: 'Global' },
    'Completado': { tipo: 'Global', orden: 'Global' }
  });

  const inicialUsuario = auth.currentUser?.email ? auth.currentUser.email.charAt(0).toUpperCase() : 'U';

  useEffect(() => {
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    setBgImage(fondos[Math.floor(Math.random() * fondos.length)]);
    
    const handleClickOutside = () => setMenuContextual({ visible: false, x: 0, y: 0, tarea: null });
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, 'tareas'), where('userId', '==', user.uid), orderBy('fechaCreacion', 'desc'));
        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          setTareas(snapshot.docs.map(d => ({ idBaseDatos: d.id, ...d.data(), tipo: d.data().tipo || 'General' })));
        });
        return () => unsubscribeFirestore();
      } else { navigate('/login'); }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const abrirModalNuevaTarea = (estadoInicial = 'Pendiente') => {
    setTareaEditando({ esNueva: true, texto: '', estado: estadoInicial, tipo: 'General', estrellada: false });
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
          fechaCreacion: new Date(), userId: auth.currentUser.uid 
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
    setTareaEditando(null);
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
          <div style={{ ...styles.cardIdBadge, backgroundColor: bgBadge, color: colorTxt }}>{tarea.idVisual}</div>
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
    <div style={{ ...styles.appContainer, backgroundImage: `url(${bgImage})` }}>
      {/* ========================================================= */}
      {/* INYECCIÓN DE CSS PARA BARRAS DE SCROLL PERSONALIZADAS */}
      {/* ========================================================= */}
      <style>
        {`
          ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
          }
          ::-webkit-scrollbar-track {
            background: transparent;
          }
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.15);
            border-radius: 10px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          /* Compatibilidad para Firefox */
          * {
            scrollbar-width: thin;
            scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
          }
        `}
      </style>

      <div style={styles.blurOverlay}></div>
      
      <header style={styles.header}>
        <button onClick={() => navigate('/panel')} style={styles.backBtn}>VOLVER</button>
        <img src="/uma-logo.png" alt="Logo" style={styles.logo} />
        <div style={styles.profileCircle}>{inicialUsuario}</div>
      </header>

      <div style={styles.actionBar}>
        <div style={styles.controlGroup}>
          <span style={styles.label}>Filtro:</span>
          <CustomSelect style={{ width: 160 }} value={filtroGlobalTipo} onChange={setFiltroGlobalTipo} options={optionsTipo} />
        </div>
        <div style={styles.controlGroup}>
          <span style={styles.label}>Orden:</span>
          <CustomSelect style={{ width: 160 }} value={ordenGlobal} onChange={setOrdenGlobal} options={optionsOrden} />
        </div>
      </div>

      <div style={styles.board}>
        {COLUMNAS.map(col => {
          let tasks = tareas.filter(t => t.estado === col || (col === 'Pendiente' && t.estado === 'Abierto') || (col === 'Completado' && t.estado === 'Cerrado'));
          const f = controlesColumnas[col].tipo === 'Global' ? filtroGlobalTipo : controlesColumnas[col].tipo;
          if (f !== 'Todos') tasks = tasks.filter(t => t.tipo === f);
          const o = controlesColumnas[col].orden === 'Global' ? ordenGlobal : controlesColumnas[col].orden;
          tasks.sort((a, b) => {
            if (o === 'A-Z') return a.texto.localeCompare(b.texto);
            if (o === 'Destacados') return a.estrellada === b.estrellada ? 0 : a.estrellada ? -1 : 1;
            return o === 'Antiguo' ? a.fechaCreacion - b.fechaCreacion : b.fechaCreacion - a.fechaCreacion;
          });

          return (
            <div key={col} style={styles.column} onDragOver={handleDragOver} onDrop={(e) => handleDropOnColumn(e, col)}>
              <div style={styles.columnHeader}>
                <div style={styles.columnHeaderTop}>
                  <h3 style={styles.columnTitle}>{col}</h3>
                  <div style={styles.count}>{tasks.length}</div>
                </div>
                <div style={styles.columnControls}>
                  <CustomSelect variant="mini" value={controlesColumnas[col].tipo} onChange={(v) => setControlesColumnas({...controlesColumnas, [col]: {...controlesColumnas[col], tipo: v}})} options={[{value:'Global', label:'Filtro: Global'}, ...optionsTipo.slice(1)]} />
                  <CustomSelect variant="mini" value={controlesColumnas[col].orden} onChange={(v) => setControlesColumnas({...controlesColumnas, [col]: {...controlesColumnas[col], orden: v}})} options={[{value:'Global', label:'Orden: Global'}, ...optionsOrden]} />
                </div>
              </div>
              <div style={styles.cardList}>{tasks.map(t => renderCard(t))}</div>
              <div style={styles.addBtn} onClick={() => abrirModalNuevaTarea(col)}>+ Agregar tarjeta</div>
            </div>
          );
        })}
      </div>

      {/* MODAL EDITAR (ESTILO GLASS) */}
      {tareaEditando && (
        <div style={styles.modalOverlay}>
          <div style={styles.glassModal}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin:0, fontSize:18 }}>{tareaEditando.esNueva ? 'Nueva Tarea' : tareaEditando.idVisual}</h2>
              <button style={styles.closeBtn} onClick={() => setTareaEditando(null)}>✖</button>
            </div>
            <div style={styles.modalBody}>
              <div style={styles.modalMain}>
                <label style={styles.modalLabel}>Tarea</label>
                <textarea style={styles.glassTextarea} value={tareaEditando.texto} onChange={(e) => setTareaEditando({...tareaEditando, texto: e.target.value})} autoFocus />
              </div>
              <div style={styles.modalSide}>
                <label style={styles.modalLabel}>Estado</label>
                <CustomSelect value={tareaEditando.estado} onChange={(v) => setTareaEditando({...tareaEditando, estado: v})} options={COLUMNAS.map(c=>({value:c, label:c}))} />
                <label style={styles.modalLabel}>Tipo</label>
                <CustomSelect value={tareaEditando.tipo} onChange={(v) => setTareaEditando({...tareaEditando, tipo: v})} options={optionsTipo.slice(1)} />
                <div style={styles.modalActions}>
                  {!tareaEditando.esNueva && <button style={styles.btnDanger} onClick={() => setConfirmacionEliminar({id: tareaEditando.idBaseDatos})}>Eliminar</button>}
                  <button style={styles.btnPrimary} onClick={guardarTarea}>Guardar</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {menuContextual.visible && (
        <div style={{ ...styles.contextMenu, top: menuContextual.y, left: menuContextual.x }}>
          <div style={styles.contextItem} onClick={(e) => toggleEstrella(e, menuContextual.tarea)}>
            {menuContextual.tarea.estrellada ? '☆ Quitar Favorito' : '★ Destacar'}
          </div>
          <div style={{ height:1, background:'rgba(255,255,255,0.1)', margin:'4px 0' }} />
          <div style={{ ...styles.contextItem, color: '#f87171' }} onClick={() => setConfirmacionEliminar({ id: menuContextual.tarea.idBaseDatos })}>🗑 Eliminar</div>
        </div>
      )}

      {confirmacionEliminar && (
        <div style={styles.modalOverlay}>
          <div style={styles.alertBox}>
            <h3 style={{ marginTop:0, color:'#f87171' }}>¿Eliminar?</h3>
            <p style={{ opacity:0.8, fontSize:14 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
              <button style={styles.btnGhost} onClick={() => setConfirmacionEliminar(null)}>Cancelar</button>
              <button style={styles.btnDanger} onClick={ejecutarEliminacion}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =================================================================
// ESTILOS GLASSMOPRHISM V2 (CON TARJETAS OSCURAS Y LEGIBLES)
// =================================================================
const styles = {
  appContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden', color: '#FFF', fontFamily: 'Inter, sans-serif' },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 11, 30, 0.5)', backdropFilter: 'blur(12px)', zIndex: 0 },
  
  header: { height: '70px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  logo: { height: '35px', width: 'auto' },
  backBtn: { backgroundColor: '#FFF', color: '#362FD9', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px' },
  profileCircle: { width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#1AACAC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },

  actionBar: { position: 'relative', zIndex: 5, padding: '15px 40px', display: 'flex', gap: '30px', backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  controlGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  label: { fontSize: '12px', fontWeight: 'bold', opacity: 0.7 },

  board: { flex: 1, display: 'flex', padding: '20px 40px', gap: '20px', overflowX: 'auto', position: 'relative', zIndex: 1, alignItems: 'flex-start' },
  
  column: { flex: '1 1 320px', minWidth: '320px', height: '100%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  columnHeader: { padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  columnHeaderTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' },
  columnTitle: { margin: 0, fontSize: '14px', fontWeight: '800', letterSpacing: '1px', textTransform: 'uppercase', color: '#1AACAC' },
  count: { backgroundColor: 'rgba(255,255,255,0.1)', padding: '2px 10px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold' },
  columnControls: { display: 'flex', gap: '8px' },

  cardList: { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' },
  
  // TARJETAS CORREGIDAS (Más oscuras para mejor legibilidad)
  card: { backgroundColor: 'rgba(15, 17, 43, 0.85)', backdropFilter: 'blur(8px)', padding: '16px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.15)', cursor: 'grab', transition: 'transform 0.2s, box-shadow 0.2s', boxShadow: '0 4px 10px rgba(0,0,0,0.3)' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' },
  cardIdBadge: { padding: '3px 8px', borderRadius: '8px', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace' },
  cardHeaderRight: { display: 'flex', alignItems: 'center', gap: '10px' },
  typeTag: { fontSize: '9px', fontWeight: '800', padding: '2px 6px', borderRadius: '5px', border: '1px solid' },
  star: { fontSize: '16px', cursor: 'pointer' },
  
  // TEXTO CORREGIDO (Blanco puro y más grueso)
  cardTitle: { fontSize: '13px', color: '#FFFFFF', fontWeight: '600', lineHeight: '1.5', opacity: 0.9, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  
  addBtn: { margin: '10px 20px 20px', padding: '10px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', border: '1px dashed rgba(255,255,255,0.2)' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  glassModal: { backgroundColor: 'rgba(30, 30, 50, 0.8)', width: '90%', maxWidth: '700px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', display: 'flex', flexDirection: 'column', gap: '20px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
  modalBody: { display: 'flex', gap: '30px', flexWrap: 'wrap' },
  modalMain: { flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '10px' },
  modalSide: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '15px' },
  glassTextarea: { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '15px', color: '#FFF', fontSize: '14px', outline: 'none', minHeight: '180px', resize: 'none' },
  modalLabel: { fontSize: '11px', fontWeight: 'bold', opacity: 0.5, textTransform: 'uppercase' },
  modalActions: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  btnPrimary: { backgroundColor: '#1AACAC', color: '#FFF', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  btnDanger: { backgroundColor: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid #f87171', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' },
  closeBtn: { background: 'none', border: 'none', color: '#FFF', fontSize: '18px', cursor: 'pointer' },

  customSelectTrigger: { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '10px 15px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  customSelectTriggerMini: { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flex: 1 },
  customSelectMenu: { position: 'absolute', top: '105%', left: 0, right: 0, backgroundColor: '#1e1e32', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 10px 20px rgba(0,0,0,0.4)' },
  customSelectItem: { padding: '10px 15px', fontSize: '12px', cursor: 'pointer' },

  contextMenu: { position: 'absolute', backgroundColor: '#1e1e32', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '5px 0', zIndex: 3000, minWidth: '160px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  contextItem: { padding: '10px 15px', fontSize: '12px', cursor: 'pointer' },
  alertBox: { backgroundColor: '#1e1e32', padding: '30px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' },
  btnGhost: { background: 'none', border: 'none', color: '#FFF', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }
};

export default Tareas;