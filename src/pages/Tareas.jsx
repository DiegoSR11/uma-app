// src/pages/Tareas.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const COLUMNAS = ['Pendiente', 'En Proceso', 'Completado'];

// =================================================================
// COMPONENTE: Select Personalizado
// =================================================================
const CustomSelect = ({ value, onChange, options, variant = 'normal', style }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value) || options[0];

  return (
    <div 
      style={{ position: 'relative', width: '100%', zIndex: isOpen ? 9999 : 1, ...style }} 
      tabIndex={0} 
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setIsOpen(false);
      }}
    >
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={variant === 'mini' ? styles.customSelectTriggerMini : styles.customSelectTrigger}
      >
        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedOption.label}
        </span>
        <span style={{ fontSize: '10px', color: '#8A94A5', transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
          ▼
        </span>
      </div>
      
      {isOpen && (
        <div style={styles.customSelectMenu}>
          {options.map(opt => (
            <div 
              key={opt.value} 
              style={{
                ...styles.customSelectItem,
                backgroundColor: value === opt.value ? 'rgba(9,30,66,0.05)' : 'transparent',
                fontWeight: value === opt.value ? 'bold' : 'normal',
                color: opt.color || '#172B4D' 
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(9,30,66,0.05)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = value === opt.value ? 'rgba(9,30,66,0.05)' : 'transparent'}
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
        const tareasRef = collection(db, 'tareas');
        const q = query(tareasRef, orderBy('fechaCreacion', 'desc'));
        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          setTareas(snapshot.docs.map((d) => {
            const data = d.data();
            return { idBaseDatos: d.id, ...data, tipo: data.tipo || 'General' };
          }));
        });
        return () => unsubscribeFirestore();
      } else {
        setTareas([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const abrirModalNuevaTarea = (estadoInicial = 'Pendiente') => {
    setTareaEditando({ esNueva: true, texto: '', estado: estadoInicial, tipo: 'General', estrellada: false });
  };

  const abrirModalEditarTarea = (tarea) => {
    setTareaEditando({ ...tarea, esNueva: false });
  };

  const cerrarModal = () => setTareaEditando(null);

  const guardarTarea = async (e) => {
    e.preventDefault();
    if (!tareaEditando.texto.trim()) return; 

    let colorTipo = '#DFE1E6'; 
    if (tareaEditando.tipo === 'Trabajo') colorTipo = '#FF8B00'; 
    if (tareaEditando.tipo === 'Personal') colorTipo = '#4C9AFF'; 

    try {
      if (tareaEditando.esNueva) {
        const numeroId = String(tareas.length + 1).padStart(8, '0');
        await addDoc(collection(db, 'tareas'), {
          idVisual: `#G${numeroId}`,
          texto: tareaEditando.texto,
          estado: tareaEditando.estado,
          tipo: tareaEditando.tipo,
          colorTipo: colorTipo,
          estrellada: false,
          fechaCreacion: new Date()
        });
      } else {
        await updateDoc(doc(db, 'tareas', tareaEditando.idBaseDatos), {
          texto: tareaEditando.texto,
          estado: tareaEditando.estado,
          tipo: tareaEditando.tipo,
          colorTipo: colorTipo,
        });
      }
      cerrarModal();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  const toggleEstrella = async (e, tarea) => {
    e.stopPropagation();
    await updateDoc(doc(db, 'tareas', tarea.idBaseDatos), { estrellada: !tarea.estrellada });
    setMenuContextual({ visible: false, x: 0, y: 0, tarea: null });
  };

  const ejecutarEliminacion = async () => {
    await deleteDoc(doc(db, 'tareas', confirmacionEliminar.id));
    setConfirmacionEliminar(null);
    cerrarModal();
  };

  const handleContextMenu = (e, tarea) => {
    e.preventDefault(); e.stopPropagation();
    setMenuContextual({ visible: true, x: e.pageX, y: e.pageY, tarea });
  };

  const handleDragStart = (e, idBaseDatos) => {
    e.dataTransfer.setData('taskId', idBaseDatos);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleDragOver = (e) => { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move'; 
  };

  // Cambio de estado simple (sin agrupaciones)
  const handleDropOnColumn = async (e, nuevoEstado) => {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('taskId');
    if (!draggedId) return;
    
    const draggedTask = tareas.find(t => t.idBaseDatos === draggedId);
    if (!draggedTask || draggedTask.estado === nuevoEstado) return;

    await updateDoc(doc(db, 'tareas', draggedId), { estado: nuevoEstado });
  };

  const actualizarControlColumna = (columna, campo, valor) => {
    setControlesColumnas(prev => ({ ...prev, [columna]: { ...prev[columna], [campo]: valor } }));
  };

  const renderCard = (tarea) => {
    let bgBadge = '#F4F5F7', colorTextoBadge = '#5E6C84', bordeBadge = '#DFE1E6';
    if (tarea.estado === 'En Proceso') { bgBadge = '#FFF0B3'; colorTextoBadge = '#FF8B00'; bordeBadge = '#FFE380'; } 
    else if (tarea.estado === 'Completado') { bgBadge = '#E3FCEF'; colorTextoBadge = '#006644'; bordeBadge = '#ABF5D1'; }

    return (
      <div 
        key={tarea.idBaseDatos} 
        style={styles.cardCompact}
        onClick={() => abrirModalEditarTarea(tarea)}
        onContextMenu={(e) => handleContextMenu(e, tarea)}
        draggable
        onDragStart={(e) => handleDragStart(e, tarea.idBaseDatos)}
      >
        <div style={styles.cardHeader}>
          <div style={{...styles.cardIdBadge, backgroundColor: bgBadge, color: colorTextoBadge, borderColor: bordeBadge}}>
            {tarea.idVisual}
          </div>
          <div style={styles.cardHeaderRight}>
            <div style={{...styles.typeTagText, color: tarea.colorTipo, borderColor: tarea.colorTipo}}>
              {tarea.tipo}
            </div>
            <div 
              style={{...styles.starIcon, color: tarea.estrellada ? '#FFC400' : '#DFE1E6'}}
              onClick={(e) => toggleEstrella(e, tarea)}
            >
              {tarea.estrellada ? '★' : '☆'}
            </div>
          </div>
        </div>
        <div style={styles.cardTitle}>{tarea.texto}</div>
      </div>
    );
  };

  const opcionesTipoGlobal = [
    { value: 'Todos', label: 'Mostrar Todos' },
    { value: 'Personal', label: 'Solo Personal' },
    { value: 'Trabajo', label: 'Solo Trabajo' },
    { value: 'General', label: 'Solo General' }
  ];

  const opcionesOrdenGlobal = [
    { value: 'Reciente', label: 'Más Recientes' },
    { value: 'Antiguo', label: 'Más Antiguos' },
    { value: 'A-Z', label: 'Alfabético (A-Z)' },
    { value: 'Z-A', label: 'Alfabético (Z-A)' },
    { value: 'Destacados', label: 'Destacados Primero' }
  ];

  const opcionesTipoLocal = [
    { value: 'Global', label: 'Tipo: Global' },
    { value: 'Personal', label: 'Personal' },
    { value: 'Trabajo', label: 'Trabajo' },
    { value: 'General', label: 'General' }
  ];

  const opcionesOrdenLocal = [
    { value: 'Global', label: 'Orden: Global' },
    { value: 'Reciente', label: 'Recientes' },
    { value: 'Antiguo', label: 'Antiguos' },
    { value: 'A-Z', label: 'A - Z' },
    { value: 'Z-A', label: 'Z - A' },
    { value: 'Destacados', label: 'Destacados' }
  ];

  const opcionesEstadoModal = COLUMNAS.map(c => ({ value: c, label: c }));
  const opcionesTipoModal = [
    { value: 'General', label: 'General (Gris)', color: '#5E6C84' },
    { value: 'Personal', label: 'Personal (Azul)', color: '#4C9AFF' },
    { value: 'Trabajo', label: 'Trabajo (Naranja)', color: '#FF8B00' }
  ];

  return (
    <div style={{ ...styles.appContainer, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}></div>
      
      <header style={styles.header}>
        <button onClick={() => navigate('/panel')} style={styles.backBtn}>VOLVER</button>
        <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
        <div style={styles.headerRight}>
           <div style={styles.profileIcon}>U</div>
        </div>
      </header>

      <div style={styles.globalActionBar}>
        <div style={styles.globalControlGroup}>
          <label style={styles.globalLabel}>Filtro:</label>
          <div style={{ width: '180px' }}>
            <CustomSelect value={filtroGlobalTipo} onChange={setFiltroGlobalTipo} options={opcionesTipoGlobal} />
          </div>
        </div>
        <div style={styles.globalControlGroup}>
          <label style={styles.globalLabel}>Orden:</label>
          <div style={{ width: '180px' }}>
            <CustomSelect value={ordenGlobal} onChange={setOrdenGlobal} options={opcionesOrdenGlobal} />
          </div>
        </div>
      </div>

      <div style={styles.boardContainer}>
        {COLUMNAS.map(nombreColumna => {
          let tareasEnColumna = tareas.filter(t => t.estado === nombreColumna || (nombreColumna === 'Pendiente' && t.estado === 'Abierto') || (nombreColumna === 'Completado' && t.estado === 'Cerrado'));
          
          const filtroAplicar = controlesColumnas[nombreColumna].tipo === 'Global' ? filtroGlobalTipo : controlesColumnas[nombreColumna].tipo;
          if (filtroAplicar !== 'Todos') tareasEnColumna = tareasEnColumna.filter(t => t.tipo === filtroAplicar);

          const ordenAplicar = controlesColumnas[nombreColumna].orden === 'Global' ? ordenGlobal : controlesColumnas[nombreColumna].orden;
          tareasEnColumna.sort((a, b) => {
            if (ordenAplicar === 'A-Z') return a.texto.localeCompare(b.texto);
            if (ordenAplicar === 'Z-A') return b.texto.localeCompare(a.texto);
            if (ordenAplicar === 'Destacados') return (a.estrellada === b.estrellada) ? 0 : a.estrellada ? -1 : 1;
            if (ordenAplicar === 'Antiguo') return a.fechaCreacion - b.fechaCreacion;
            return b.fechaCreacion - a.fechaCreacion; 
          });

          return (
            <div 
              key={nombreColumna} 
              style={styles.column}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnColumn(e, nombreColumna)}
            >
              <div style={styles.columnHeader}>
                <div style={styles.columnHeaderTop}>
                  <h3 style={styles.columnTitle}>{nombreColumna}</h3>
                  <div style={styles.taskCountBadge}>{tareasEnColumna.length}</div>
                </div>
                
                <div style={styles.columnControls}>
                  <CustomSelect variant="mini" value={controlesColumnas[nombreColumna].tipo} onChange={(val) => actualizarControlColumna(nombreColumna, 'tipo', val)} options={opcionesTipoLocal} />
                  <CustomSelect variant="mini" value={controlesColumnas[nombreColumna].orden} onChange={(val) => actualizarControlColumna(nombreColumna, 'orden', val)} options={opcionesOrdenLocal} />
                </div>
              </div>

              {/* LISTA DE TARJETAS CON SCROLL INTERNO PERFECTO */}
              <div style={styles.cardList}>
                {tareasEnColumna.map(t => renderCard(t))}
              </div>

              <div style={styles.addCardBtn} onClick={() => abrirModalNuevaTarea(nombreColumna)}>
                + Agregar tarea
              </div>
            </div>
          );
        })}
      </div>

      {menuContextual.visible && (
        <div style={{...styles.contextMenu, top: menuContextual.y, left: menuContextual.x}}>
          <div style={styles.contextMenuItem} onClick={(e) => toggleEstrella(e, menuContextual.tarea)}>
            {menuContextual.tarea.estrellada ? '☆ Quitar Destacado' : '★ Destacar Tarea'}
          </div>
          <div style={styles.contextMenuDivider}></div>
          <div style={{...styles.contextMenuItem, color: '#DE350B'}} onClick={() => { 
              setConfirmacionEliminar({id: menuContextual.tarea.idBaseDatos, nombre: menuContextual.tarea.texto}); 
              setMenuContextual({visible: false, x: 0, y: 0, tarea: null}); 
            }}>
            🗑 Eliminar Tarjeta
          </div>
        </div>
      )}

      {tareaEditando && (
        <div style={styles.modalOverlay}>
          <div style={styles.modernModal}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>{tareaEditando.esNueva ? 'Nueva Tarea' : tareaEditando.idVisual}</h2>
              <button style={styles.closeBtn} onClick={cerrarModal}>✖</button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.mainCol}>
                <label style={styles.label}>Tarea</label>
                <textarea 
                  style={styles.textareaModern} 
                  value={tareaEditando.texto} 
                  onChange={(e) => setTareaEditando({...tareaEditando, texto: e.target.value})} 
                  placeholder="Escribe el detalle de la tarea aquí..."
                  autoFocus
                />
              </div>
              <div style={styles.sideCol}>
                <label style={styles.label}>ESTADO</label>
                <CustomSelect value={tareaEditando.estado} onChange={(val) => setTareaEditando({...tareaEditando, estado: val})} options={opcionesEstadoModal} style={{ zIndex: 10 }} />
                
                <label style={styles.label}>TIPO</label>
                <CustomSelect value={tareaEditando.tipo} onChange={(val) => setTareaEditando({...tareaEditando, tipo: val})} options={opcionesTipoModal} style={{ zIndex: 9 }} />
                
                <div style={styles.sideActions}>
                  {!tareaEditando.esNueva && <button style={styles.actionBtnDanger} onClick={() => setConfirmacionEliminar({id: tareaEditando.idBaseDatos, nombre: tareaEditando.texto})}>Eliminar</button>}
                  <button style={styles.actionBtnPrimary} onClick={guardarTarea}>Guardar Tarea</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmacionEliminar && (
        <div style={{...styles.modalOverlay, zIndex: 2000}}>
          <div style={styles.alertModal}>
            <h3 style={{marginTop: 0, color: '#eb5a46'}}>¿Eliminar Tarea?</h3>
            <p style={{color: '#5E6C84', fontSize: '14px'}}>Eliminar <b>{confirmacionEliminar.nombre}</b> es irreversible.</p>
            <div style={styles.alertActions}>
              <button style={styles.cancelBtn} onClick={() => setConfirmacionEliminar(null)}>Cancelar</button>
              <button style={styles.actionBtnDanger} onClick={ejecutarEliminacion}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// =================================================================
// ESTILOS (Optimizados para prevenir Scroll Global y Fuentes más Pequeñas)
// =================================================================
const customSelectArrow = `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235E6C84' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`;

const styles = {
  // BLOQUEO DE SCROLL GLOBAL: height 100vh y overflow hidden garantizan que nada escape del contenedor.
  appContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' }, 
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(235, 236, 240, 0.65)', backdropFilter: 'blur(3px)', zIndex: 0 }, 
  header: { backgroundColor: 'var(--color-primary)', padding: '12px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' },
  logoImage: { height: '40px', width: 'auto' }, 
  backBtn: { backgroundColor: '#FFFFFF', color: 'var(--color-primary)', border: 'none', padding: '8px 20px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
  headerRight: { display: 'flex', alignItems: 'center' },
  profileIcon: { width: '36px', height: '36px', borderRadius: '50%', backgroundColor: 'var(--color-tertiary)', color: 'var(--color-white)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '16px', border: '2px solid rgba(255,255,255,0.2)' },

  globalActionBar: { backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 30px', display: 'flex', gap: '20px', position: 'relative', zIndex: 10, borderBottom: '1px solid #DFE1E6', alignItems: 'center', flexWrap: 'wrap' },
  globalControlGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  globalLabel: { fontSize: '13px', fontWeight: 'bold', color: '#172B4D' },

  // TABLERO CON SCROLL HORIZONTAL
  boardContainer: { flex: 1, display: 'flex', padding: '20px 30px', gap: '25px', position: 'relative', zIndex: 1, overflowX: 'auto', overflowY: 'hidden', alignItems: 'flex-start' },
  
  // COLUMNA CON TAMAÑO MÁXIMO (Para habilitar el scroll interno)
  column: { flex: '1 1 320px', minWidth: '320px', backgroundColor: '#F4F5F7', borderRadius: '10px', display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100%', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', border: '1px solid rgba(0,0,0,0.05)', boxSizing: 'border-box' },
  columnHeader: { padding: '12px 20px', display: 'flex', flexDirection: 'column', borderBottom: '1px solid #E1E4E8' },
  columnHeaderTop: { display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '12px' },
  columnTitle: { margin: 0, fontSize: '15px', fontWeight: 'bold', color: '#172B4D', textTransform: 'uppercase', letterSpacing: '0.5px' },
  taskCountBadge: { backgroundColor: '#DFE1E6', color: '#172B4D', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' },
  columnControls: { display: 'flex', gap: '10px', width: '100%' },

  // LISTA CON SCROLL INTERNO PERFECTO
  cardList: { padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0 }, 

  // TARJETAS CON FUENTES REDUCIDAS
  cardCompact: { backgroundColor: '#FFFFFF', borderRadius: '6px', boxShadow: '0 1px 3px rgba(9,30,66,0.1)', cursor: 'grab', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid #ebecf0', transition: 'transform 0.1s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardIdBadge: { padding: '2px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace', borderStyle: 'solid', borderWidth: '1px' }, // Fuente más pequeña (10px)
  cardHeaderRight: { display: 'flex', alignItems: 'center', gap: '8px' },
  typeTagText: { fontSize: '9px', fontWeight: 'bold', padding: '2px 6px', borderRadius: '4px', border: '1px solid' }, // Fuente más pequeña (9px)
  starIcon: { fontSize: '16px', cursor: 'pointer', userSelect: 'none', transition: 'transform 0.2s' },
  
  // TÍTULO CON RECORTE Y FUENTE REDUCIDA
  cardTitle: { fontSize: '12px', color: '#172B4D', fontWeight: '500', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' }, // Fuente reducida a 12px
  
  addCardBtn: { margin: '10px 15px 15px 15px', padding: '8px', color: '#5E6C84', fontSize: '13px', cursor: 'pointer', borderRadius: '6px', fontWeight: '600', backgroundColor: 'rgba(9,30,66,0.04)', textAlign: 'center' },

  contextMenu: { position: 'absolute', backgroundColor: '#FFF', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', borderRadius: '6px', padding: '5px 0', zIndex: 3000, minWidth: '180px', border: '1px solid #DFE1E6' },
  contextMenuItem: { padding: '10px 16px', fontSize: '13px', color: '#172B4D', cursor: 'pointer', fontWeight: '600', transition: 'background 0.2s' },
  contextMenuDivider: { height: '1px', backgroundColor: '#DFE1E6', margin: '4px 0' },

  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 30, 66, 0.54)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modernModal: { backgroundColor: '#FFFFFF', borderRadius: '8px', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '32px', color: '#172B4D', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' },
  modalTitle: { margin: 0, fontSize: '20px', fontWeight: 'bold' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7A869A' },
  
  modalBody: { display: 'flex', gap: '30px', flexWrap: 'wrap', flex: 1, paddingBottom: '20px' },
  mainCol: { flex: '2 1 300px', display: 'flex', flexDirection: 'column', gap: '8px' },
  sideCol: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#5E6C84' },
  textareaModern: { flex: 1, minHeight: '150px', backgroundColor: '#FAFBFC', border: '2px solid #DFE1E6', padding: '16px', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', color: '#172B4D', resize: 'none', fontFamily: 'inherit', lineHeight: '1.5', overflowY: 'auto' },
  
  sideActions: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' },
  actionBtnPrimary: { backgroundColor: 'var(--color-tertiary)', color: '#FFF', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '13px' },
  actionBtnDanger: { backgroundColor: '#FFEBE6', color: '#DE350B', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', width: '100%', fontSize: '13px' },
  
  alertModal: { backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '8px', width: '360px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  alertActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#5E6C84', padding: '10px 16px', fontWeight: '600', fontSize: '13px' },

  customSelectTrigger: { backgroundColor: '#FAFBFC', border: '2px solid #DFE1E6', padding: '10px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: '600', color: '#172B4D', userSelect: 'none' },
  customSelectTriggerMini: { backgroundColor: '#FFFFFF', border: '1px solid #DFE1E6', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#5E6C84', userSelect: 'none' },
  customSelectMenu: { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', backgroundColor: '#FFFFFF', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', overflow: 'hidden', border: '1px solid #DFE1E6' },
  customSelectItem: { padding: '10px 12px', fontSize: '12px', cursor: 'pointer', transition: 'background-color 0.1s' }
};

export default Tareas;