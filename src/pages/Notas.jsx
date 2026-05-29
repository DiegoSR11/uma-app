// src/pages/Notas.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, where, writeBatch } from 'firebase/firestore';

// Colores Primarios y Secundarios
const COLORES = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#f97316', '#a855f7', '#06b6d4', '#ec4899']; 

// Íconos fijos
const SVGS = {
  carpeta: <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg>,
  nota: <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>,
  web: <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
};

const Notas = () => {
  const navigate = useNavigate();
  const { id } = useParams(); 

  const [items, setItems] = useState([]); 
  const [nombreEntorno, setNombreEntorno] = useState('');
  const [currentFolder, setCurrentFolder] = useState(null); 
  
  // Modales y Estados
  const [selectedItem, setSelectedItem] = useState(null); 
  const [modalConfig, setModalConfig] = useState(null); 
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(null);
  const [alertaGlobal, setAlertaGlobal] = useState(null); 
  const [menuContextual, setMenuContextual] = useState({ visible: false, x: 0, y: 0, item: null });
  const [menuEscritorio, setMenuEscritorio] = useState({ visible: false, x: 0, y: 0 });
  
  const [toastMensaje, setToastMensaje] = useState(null);
  
  // Editor de Notas
  const [notaActiva, setNotaActiva] = useState(null); 
  const [notaModificada, setNotaModificada] = useState(false);
  const [alertaCierre, setAlertaCierre] = useState(false);
  const editorRef = useRef(null); 
  
  // Drag & Drop
  const [draggedId, setDraggedId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null);

  const inicialUsuario = auth.currentUser?.displayName ? auth.currentUser.displayName.charAt(0).toUpperCase() : (auth.currentUser?.email ? auth.currentUser.email.charAt(0).toUpperCase() : 'U');

  useEffect(() => {
    const handleClickOutside = () => { 
      setMenuContextual({ visible: false, x: 0, y: 0, item: null }); 
      setMenuEscritorio({ visible: false, x: 0, y: 0 });
      setSelectedItem(null); 
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('scroll', handleClickOutside, true);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('scroll', handleClickOutside, true);
    };
  }, []);

  useEffect(() => {
    if (id) {
      const unsub = onSnapshot(doc(db, 'espacios', id), (docSnap) => {
        if (docSnap.exists()) setNombreEntorno(docSnap.data().nombre);
      });
      return () => unsub();
    }
  }, [id]);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        let q = id 
          ? query(collection(db, 'notas'), where('espacioId', '==', id))
          : query(collection(db, 'notas'), where('userId', '==', user.uid));

        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          let fetchedItems = snapshot.docs.map(d => ({ idBaseDatos: d.id, ...d.data() }));
          if (!id) fetchedItems = fetchedItems.filter(d => !d.espacioId);

          fetchedItems.sort((a, b) => {
            const ordenA = a.orden !== undefined ? a.orden : Infinity;
            const ordenB = b.orden !== undefined ? b.orden : Infinity;
            if (ordenA !== ordenB) return ordenA - ordenB;
            return (a.fechaCreacion || 0) - (b.fechaCreacion || 0);
          });
          setItems(fetchedItems);
        });
        return () => unsubscribeFirestore();
      } else { navigate('/login'); }
    });
    return () => unsubscribeAuth();
  }, [id, navigate]);

  useEffect(() => {
    if (notaActiva && editorRef.current && !notaModificada) {
      editorRef.current.innerHTML = notaActiva.contenido || '';
    }
  }, [notaActiva, notaModificada]);

  const breadcrumbs = [];
  let curr = currentFolder;
  while (curr) {
    const folder = items.find(i => i.idBaseDatos === curr);
    if (folder) { breadcrumbs.unshift(folder); curr = folder.parentId; } else break;
  }
  const itemsEnVista = items.filter(item => item.parentId === currentFolder);

  const mostrarNotificacion = (msg) => {
    setToastMensaje(msg);
    setTimeout(() => setToastMensaje(null), 2000);
  };

  // ==========================================
  // LÓGICA DE INTERACCIÓN Y MENÚS CONTEXTUALES
  // ==========================================
  const handleItemDoubleClick = (e, item) => {
    e.stopPropagation();
    if (item.tipoItem === 'carpeta') { setCurrentFolder(item.idBaseDatos); setSelectedItem(null); } 
    else if (item.tipoItem === 'nota') { setNotaActiva({ ...item }); setNotaModificada(false); } 
    else if (item.tipoItem === 'link') { window.open(item.url, '_blank'); }
  };

  const handleContextMenu = (e, item) => { 
    e.preventDefault(); e.stopPropagation(); 
    setSelectedItem(item.idBaseDatos); 

    const menuWidth = 160;
    const menuHeight = 150;
    let x = e.pageX;
    let y = e.pageY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setMenuContextual({ visible: true, x, y, item }); 
    setMenuEscritorio({ visible: false, x: 0, y: 0 });
  };

  const handleDesktopContextMenu = (e) => {
    e.preventDefault();
    const menuWidth = 160;
    const menuHeight = 130;
    let x = e.pageX;
    let y = e.pageY;
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setMenuEscritorio({ visible: true, x, y });
    setMenuContextual({ visible: false, x: 0, y: 0, item: null });
  };

  // ==========================================
  // ARRASTRAR Y SOLTAR
  // ==========================================
  const handleDragStart = (e, id) => { 
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, target) => {
    e.preventDefault();
    if (dragTarget !== target) setDragTarget(target);
  };

  const handleDropToReorder = async (e, targetId) => {
    e.preventDefault(); e.stopPropagation();
    setDragTarget(null);
    if(!draggedId || draggedId === targetId) return;

    const newOrder = [...itemsEnVista];
    const draggedIdx = newOrder.findIndex(i => i.idBaseDatos === draggedId);
    const targetIdx = newOrder.findIndex(i => i.idBaseDatos === targetId);
    if(draggedIdx === -1 || targetIdx === -1) return;

    const [moved] = newOrder.splice(draggedIdx, 1);
    const adjustedTargetIdx = draggedIdx < targetIdx ? targetIdx - 1 : targetIdx;
    newOrder.splice(adjustedTargetIdx, 0, moved);

    const batch = writeBatch(db);
    newOrder.forEach((it, idx) => {
      batch.update(doc(db, 'notas', it.idBaseDatos), { orden: idx });
    });
    await batch.commit();
  };

  const handleDropOnFolder = async (e, targetFolderId) => {
    e.preventDefault(); e.stopPropagation(); setDragTarget(null);
    if (!draggedId || draggedId === targetFolderId) return;

    // Verificar profundidad de carpetas
    if (targetFolderId !== null) {
      const draggedItem = items.find(i => i.idBaseDatos === draggedId);
      if (draggedItem?.tipoItem === 'carpeta') {
        let parentCheckId = targetFolderId;
        while (parentCheckId) {
          if (parentCheckId === draggedId) return; 
          const parentFolder = items.find(i => i.idBaseDatos === parentCheckId);
          parentCheckId = parentFolder ? parentFolder.parentId : null;
        }
        // Función simplificada de profundidad
        let depth = 0; let curr = targetFolderId;
        while(curr) { depth++; const f = items.find(i=>i.idBaseDatos === curr); curr = f?.parentId; }
        if (depth >= 2) { 
          setAlertaGlobal({ titulo: 'Límite de niveles', mensaje: 'Límite de 2 niveles alcanzado al guardar carpetas dentro de carpetas.' });
          return; 
        }
      }
    }
    
    try { 
      await updateDoc(doc(db, 'notas', draggedId), { parentId: targetFolderId }); 
    } catch (error) { console.error(error); }
  };

  const handleDropOnDesktopEnd = async (e) => {
    e.preventDefault(); e.stopPropagation(); setDragTarget(null);
    if(!draggedId) return;
    
    const newOrder = [...itemsEnVista];
    const draggedIdx = newOrder.findIndex(i => i.idBaseDatos === draggedId);
    if(draggedIdx === -1) return;
    
    const [moved] = newOrder.splice(draggedIdx, 1);
    newOrder.push(moved);

    const batch = writeBatch(db);
    newOrder.forEach((it, idx) => {
        batch.update(doc(db, 'notas', it.idBaseDatos), { orden: idx });
    });
    await batch.commit();
  };

  // ==========================================
  // MODALES (CREAR / CONFIGURAR)
  // ==========================================
  const abrirNuevaCarpeta = () => setModalConfig({ esNueva: true, tipoItem: 'carpeta', titulo: '', color: COLORES[0] });
  const abrirNuevaNota = () => setModalConfig({ esNueva: true, tipoItem: 'nota', titulo: '', color: COLORES[1] });
  const abrirNuevoEnlace = () => setModalConfig({ esNueva: true, tipoItem: 'link', titulo: '', url: '', color: COLORES[2] });

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    if (!modalConfig.titulo.trim()) return;
    
    try {
      const datosAguardar = {
        titulo: modalConfig.titulo, 
        tipoItem: modalConfig.tipoItem, 
        color: modalConfig.color
      };

      if (modalConfig.tipoItem === 'link') {
        let finalUrl = modalConfig.url.trim();
        if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl;
        datosAguardar.url = finalUrl;
      }

      if (modalConfig.esNueva) {
        datosAguardar.parentId = currentFolder; 
        datosAguardar.fechaCreacion = Date.now(); 
        datosAguardar.orden = itemsEnVista.length > 0 ? Math.max(...itemsEnVista.map(i => i.orden || 0)) + 1 : 0; 
        datosAguardar.userId = auth.currentUser.uid;
        datosAguardar.espacioId = id || null;
        datosAguardar.contenido = ''; 
        await addDoc(collection(db, 'notas'), datosAguardar);
      } else { 
        await updateDoc(doc(db, 'notas', modalConfig.idBaseDatos), datosAguardar); 
      }
      setModalConfig(null);
    } catch (error) { console.error(error); }
  };

  // ==========================================
  // EDITOR DE NOTAS (TEXTO ENRIQUECIDO)
  // ==========================================
  const formatText = (command) => {
    document.execCommand(command, false, null);
    editorRef.current.focus();
    setNotaModificada(true);
  };

  const copiarTextoLimpio = (htmlContent) => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = htmlContent;
    navigator.clipboard.writeText(tempDiv.textContent || tempDiv.innerText || "");
    mostrarNotificacion('Copiado al portapapeles ✓');
  };

  const guardarNotaEditada = async (cerrarModal = false) => {
    if (!notaActiva || !editorRef.current) return;
    const nuevoContenido = editorRef.current.innerHTML;
    try {
      await updateDoc(doc(db, 'notas', notaActiva.idBaseDatos), {
        titulo: notaActiva.titulo,
        contenido: nuevoContenido
      });
      setNotaModificada(false);
      setAlertaCierre(false);
      
      if (cerrarModal) {
        setNotaActiva(null);
      } else {
        mostrarNotificacion('Guardado ✓');
      }
    } catch (error) { console.error(error); }
  };

  const descartarYSalir = () => {
    setNotaModificada(false);
    setAlertaCierre(false);
    setNotaActiva(null);
  };

  const handleCerrarEditor = () => {
    if (notaModificada) {
      setAlertaCierre(true);
    } else {
      setNotaActiva(null);
    }
  };

  const ejecutarEliminacion = async () => { 
    await deleteDoc(doc(db, 'notas', confirmacionEliminar)); 
    setConfirmacionEliminar(null); 
  };

  return (
    <div style={styles.appContainer} onClick={() => setSelectedItem(null)}>
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        @keyframes popIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>

      {/* TOAST NOTIFICACIÓN DISCRETA (Derecha) */}
      {toastMensaje && (
        <div style={styles.toast}>{toastMensaje}</div>
      )}

      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button onClick={() => id ? navigate(`/espacio/${id}`) : navigate('/panel')} style={styles.backBtn}>Volver</button>
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
          <span style={styles.headerTitle}>Escritorio</span>
        </div>
        
        <div style={styles.headerRight}>
          <div style={styles.profileCircle} onClick={() => navigate('/perfil')} title="Ver perfil">
            {inicialUsuario}
          </div>
        </div>
      </header>

      {/* BREADCRUMBS Y BOTONES SUPERIORES */}
      <div style={styles.topBar}>
        <div style={styles.breadcrumbs}>
          {/* Botón Escritorio como DropZone para sacar cosas de carpetas */}
          <span 
            style={{...styles.crumbBtn, ...(dragTarget === 'root' ? styles.crumbHover : {})}} 
            onClick={() => setCurrentFolder(null)}
            onDragOver={(e) => handleDragOver(e, 'root')}
            onDragLeave={() => setDragTarget(null)}
            onDrop={(e) => handleDropOnFolder(e, null)}
          >
            Escritorio
          </span>
          {breadcrumbs.map(folder => (
            <span key={folder.idBaseDatos} style={styles.crumbTrail}>
              <span style={styles.crumbSeparator}>/</span>
              {/* Botones de carpetas con sus colores y como DropZone */}
              <span 
                style={{
                  ...styles.crumbBtn, 
                  color: folder.color, 
                  border: `1px solid ${folder.color}`,
                  ...(dragTarget === folder.idBaseDatos ? styles.crumbHover : {})
                }} 
                onClick={() => setCurrentFolder(folder.idBaseDatos)}
                onDragOver={(e) => handleDragOver(e, folder.idBaseDatos)}
                onDragLeave={() => setDragTarget(null)}
                onDrop={(e) => handleDropOnFolder(e, folder.idBaseDatos)}
              >
                {folder.titulo}
              </span>
            </span>
          ))}
        </div>
        <div style={styles.actionButtons}>
          <button onClick={abrirNuevaCarpeta} style={styles.neutralBtn}>Nueva Carpeta</button>
          <button onClick={abrirNuevaNota} style={styles.neutralBtn}>Nueva Nota</button>
          <button onClick={abrirNuevoEnlace} style={styles.neutralBtn}>Nuevo Enlace</button>
        </div>
      </div>

      {/* REJILLA DEL ESCRITORIO */}
      <div 
        style={styles.desktopArea} 
        onDragOver={(e) => e.preventDefault()} 
        onDrop={handleDropOnDesktopEnd}
        onContextMenu={handleDesktopContextMenu}
      >
        {itemsEnVista.length === 0 ? (
          <div style={styles.emptyState}>No hay elementos. Crea una carpeta, nota o enlace aquí.</div>
        ) : (
          itemsEnVista.map(item => {
            const isSelected = selectedItem === item.idBaseDatos;
            const isReorderTarget = dragTarget === `reorder-${item.idBaseDatos}`;
            const isFolderTarget = dragTarget === `folder-${item.idBaseDatos}`;
            const iconSvg = item.tipoItem === 'carpeta' ? SVGS.carpeta : (item.tipoItem === 'link' ? SVGS.web : SVGS.nota);
            
            return (
              <div key={item.idBaseDatos} style={styles.gridItemWrap}>
                
                {/* ZONA DROP PARA REORDENAR COLA */}
                <div 
                  style={{ position: 'absolute', left: '-15px', top: 0, bottom: 0, width: '30px', zIndex: 10, cursor: 'col-resize' }}
                  onDragOver={(e) => handleDragOver(e, `reorder-${item.idBaseDatos}`)}
                  onDragLeave={() => setDragTarget(null)}
                  onDrop={(e) => handleDropToReorder(e, item.idBaseDatos)}
                >
                  {isReorderTarget && <div style={{ width: '4px', height: '100%', background: '#FFF', margin: '0 auto', borderRadius: '4px' }} />}
                </div>

                {/* EL ÍCONO */}
                <div 
                  style={{ 
                    ...styles.iconWrapper, 
                    backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'transparent',
                    border: isFolderTarget ? '1px dashed #FFF' : (isSelected ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'),
                    transform: isFolderTarget ? 'scale(1.05)' : 'scale(1)',
                  }}
                  draggable 
                  onDragStart={(e) => handleDragStart(e, item.idBaseDatos)}
                  onDragOver={(e) => { if(item.tipoItem === 'carpeta') handleDragOver(e, `folder-${item.idBaseDatos}`); }}
                  onDrop={(e) => { if(item.tipoItem === 'carpeta') handleDropOnFolder(e, item.idBaseDatos); }}
                  onDragLeave={() => setDragTarget(null)}
                  onClick={(e) => handleItemClick(e, item)} 
                  onDoubleClick={(e) => handleItemDoubleClick(e, item)} 
                  onContextMenu={(e) => handleContextMenu(e, item)}
                >
                  <div style={{ ...styles.iconVisual, color: item.color }}>
                    {iconSvg}
                  </div>
                  <div style={styles.iconText}>{item.titulo}</div>
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MENÚ CONTEXTUAL ITEM */}
      {menuContextual.visible && (
        <div style={{ ...styles.contextMenu, top: menuContextual.y, left: menuContextual.x }}>
          <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); handleItemDoubleClick(e, menuContextual.item); setMenuContextual({ visible: false }); }}>Abrir</div>
          <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); setModalConfig({ ...menuContextual.item, esNueva: false }); setMenuContextual({ visible: false }); }}>Configurar</div>
          {menuContextual.item.tipoItem === 'nota' && (
            <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); copiarTextoLimpio(menuContextual.item.contenido); setMenuContextual({ visible: false }); }}>Copiar Contenido</div>
          )}
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <div style={{ ...styles.contextItem, color: '#f87171' }} onClick={(e) => { e.stopPropagation(); setConfirmacionEliminar(menuContextual.item.idBaseDatos); setMenuContextual({ visible: false }); }}>Eliminar</div>
        </div>
      )}

      {/* MENÚ CONTEXTUAL ESCRITORIO VACÍO */}
      {menuEscritorio.visible && (
        <div style={{ ...styles.contextMenu, top: menuEscritorio.y, left: menuEscritorio.x }}>
          <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); abrirNuevaCarpeta(); setMenuEscritorio({ visible: false }); }}>Nueva Carpeta</div>
          <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); abrirNuevaNota(); setMenuEscritorio({ visible: false }); }}>Nueva Nota</div>
          <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); abrirNuevoEnlace(); setMenuEscritorio({ visible: false }); }}>Nuevo Enlace</div>
        </div>
      )}

      {/* MODAL: EDITOR DE NOTA ENRIQUECIDO */}
      {notaActiva && (
        <div style={styles.modalOverlay}>
          <div style={styles.richTextModal} onClick={e => e.stopPropagation()}>
            
            <div style={styles.rtHeader}>
              <input 
                value={notaActiva.titulo} 
                onChange={e => { setNotaActiva({...notaActiva, titulo: e.target.value}); setNotaModificada(true); }} 
                style={styles.rtTitleInput} 
                placeholder="Título de la nota..."
              />
              <button style={styles.closeBtn} onClick={handleCerrarEditor}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={styles.rtToolbar}>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button type="button" onClick={() => formatText('bold')} style={styles.rtBtn}><b>B</b></button>
                <button type="button" onClick={() => formatText('italic')} style={styles.rtBtn}><i>I</i></button>
                <button type="button" onClick={() => formatText('underline')} style={styles.rtBtn}><u>U</u></button>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => copiarTextoLimpio(editorRef.current?.innerHTML || '')} style={styles.neutralBtn}>Copiar Texto</button>
                <button type="button" onClick={() => guardarNotaEditada(false)} style={styles.neutralBtn}>Guardar</button>
              </div>
            </div>

            <div 
              ref={editorRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              style={styles.rtContentArea}
              onInput={() => setNotaModificada(true)}
              placeholder="Escribe tu nota aquí..."
            />
          </div>
        </div>
      )}

      {/* WARNING: CIERRE SIN GUARDAR (ESTILO WORD) */}
      {alertaCierre && (
        <div style={{ ...styles.modalOverlay, zIndex: 3500 }}>
          <div style={styles.alertBox}>
            <h2 style={{ margin: '0 0 10px 0', color:'#FFF', fontSize: '20px' }}>¿Guardar los cambios en la nota?</h2>
            <p style={{ margin: '0 0 25px 0', color: 'rgba(255,255,255,0.7)', fontSize: '14px' }}>Si cierras sin guardar, perderás las modificaciones recientes.</p>
            <div style={{ display:'flex', gap: '10px', justifyContent:'center' }}>
              <button style={styles.btnGhost} onClick={() => setAlertaCierre(false)}>Seguir editando</button>
              <button style={styles.btnGhost} onClick={descartarYSalir}>No guardar</button>
              <button style={styles.btnPrimaryFilled} onClick={() => guardarNotaEditada(true)}>Guardar y salir</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAR / CREAR */}
      {modalConfig && (
        <div style={styles.modalOverlay}>
          <div style={styles.glassModalMini}>
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: '800' }}>
                {modalConfig.esNueva 
                  ? (modalConfig.tipoItem === 'carpeta' ? 'Nueva carpeta' : modalConfig.tipoItem === 'nota' ? 'Nueva nota' : 'Nuevo enlace') 
                  : 'Configurar'}
              </h2>
              <button style={styles.closeBtn} onClick={() => setModalConfig(null)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <form onSubmit={guardarConfiguracion} style={styles.modalForm}>
              <div style={styles.modalBody}>
                <label style={styles.modalLabel}>Nombre / Título</label>
                <input style={styles.glassInput} value={modalConfig.titulo} onChange={(e) => setModalConfig({ ...modalConfig, titulo: e.target.value })} placeholder="Ej: Universidad, etc." autoFocus required />
                
                {modalConfig.tipoItem === 'link' && (
                  <>
                    <label style={{...styles.modalLabel, marginTop: '15px'}}>URL del Enlace</label>
                    <input style={styles.glassInput} value={modalConfig.url} onChange={(e) => setModalConfig({ ...modalConfig, url: e.target.value })} placeholder="www.ejemplo.com" required />
                  </>
                )}

                <label style={{...styles.modalLabel, marginTop: '15px'}}>Color del Ícono</label>
                <div style={styles.colorPicker}>
                  {COLORES.map(c => (
                    <div key={c} onClick={() => setModalConfig({...modalConfig, color: c})} style={{ ...styles.colorCircle, backgroundColor: c, border: modalConfig.color === c ? '2px solid #FFF' : '2px solid transparent' }} />
                  ))}
                </div>
                
                <div style={styles.modalActions}>
                  <button type="submit" style={styles.btnPrimaryFilled}>Guardar Cambios</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GLOBAL DE ALERTAS SIMÉTRICO */}
      {alertaGlobal && (
        <div style={{ ...styles.modalOverlay, zIndex: 3500 }}>
          <div style={styles.alertBox}>
            <h2 style={{ margin: '0 0 10px 0', color:'#f87171', fontSize: '20px' }}>{alertaGlobal.titulo}</h2>
            <p style={{ margin: '0 0 25px 0', color: 'rgba(255,255,255,0.8)', fontSize: '15px' }}>{alertaGlobal.mensaje}</p>
            <div style={{ display:'flex', gap: '15px', justifyContent:'center' }}>
              <button style={styles.btnPrimaryFilled} onClick={() => setAlertaGlobal(null)}>Aceptar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINAR */}
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
// ESTILOS: REJILLA SIMÉTRICA, WYSIWYG Y MODO OSCURO
// =================================================================
const styles = {
  appContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundColor: '#000000', overflow: 'hidden', color: '#FFF', fontFamily: 'Inter, sans-serif', userSelect: 'none' },
  
  header: { height: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.08)', backgroundColor: '#000000', flexShrink: 0 },
  headerLeft: { flex: 1, display: 'flex', justifyContent: 'flex-start' },
  backBtn: { background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.1)', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer', transition: '0.2s' },
  logoArea: { flex: 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' },
  logoImage: { height: '32px', width: 'auto', objectFit: 'contain' },
  headerDivider: { color: 'rgba(255,255,255,0.2)', fontSize: '24px', fontWeight: '300' },
  headerTitle: { fontSize: '22px', fontWeight: '800', color: '#FFF', letterSpacing: '-0.5px' },
  headerRight: { flex: 1, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' },
  profileCircle: { width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#1AACAC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', cursor: 'pointer' },
  
  topBar: { position: 'relative', zIndex: 5, padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 },
  
  breadcrumbs: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px' },
  crumbBtn: { cursor: 'pointer', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#FFF', padding: '6px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', transition: '0.2s', display: 'flex', alignItems: 'center' },
  crumbHover: { background: 'rgba(255,255,255,0.15)', transform: 'scale(1.05)' },
  crumbTrail: { display: 'flex', alignItems: 'center', gap: '8px' },
  crumbSeparator: { color: 'rgba(255,255,255,0.3)' },
  
  actionButtons: { display: 'flex', gap: '10px' },
  neutralBtn: { background: 'rgba(255,255,255,0.05)', color: '#FFF', border: '1px solid rgba(255,255,255,0.15)', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  
  // REJILLA DEL ESCRITORIO SIMÉTRICA (Auto-fill y minmax)
  desktopArea: { flex: 1, padding: '30px 40px', position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gridAutoRows: 'min-content', gap: '20px', alignContent: 'start', overflowY: 'auto' },
  gridItemWrap: { position: 'relative', display: 'flex', justifyContent: 'center' },
  emptyState: { width: '100%', gridColumn: '1 / -1', textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '40px', fontSize: '14px' },
  
  iconWrapper: { width: '100%', padding: '10px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'grab', transition: '0.2s' },
  iconVisual: { display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))' },
  iconText: { fontSize: '12px', color: '#FFF', textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)', fontWeight: '600', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' },
  
  contextMenu: { position: 'absolute', backgroundColor: 'rgba(20, 20, 35, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 0', zIndex: 3000, minWidth: '160px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', animation: 'popIn 0.15s ease' },
  contextItem: { padding: '10px 15px', fontSize: '13px', cursor: 'pointer', color: '#FFF', fontWeight: '500', transition: '0.2s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } },
  
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  
  // TOAST NOTIFICACIÓN NEUTRA DERECHA
  toast: { position: 'fixed', bottom: '40px', right: '40px', background: 'rgba(20, 22, 30, 0.95)', color: '#FFF', padding: '12px 24px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', fontWeight: '600', fontSize: '14px', zIndex: 9999, boxShadow: '0 4px 15px rgba(0,0,0,0.5)', animation: 'popIn 0.3s ease' },

  // MODAL DE LECTURA / WYSIWYG
  richTextModal: { backgroundColor: '#111', width: '90%', maxWidth: '850px', height: '80vh', borderRadius: '16px', border: '1px solid #333', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.9)', animation: 'popIn 0.2s ease', overflow: 'hidden' },
  rtHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 30px', borderBottom: '1px solid #222', backgroundColor: '#000' },
  rtTitleInput: { background: 'transparent', border: 'none', color: '#FFF', fontSize: '24px', fontWeight: '800', outline: 'none', width: '100%', flex: 1, marginRight: '20px', fontFamily: 'inherit' },
  rtToolbar: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', borderBottom: '1px solid #222', backgroundColor: '#0a0a0a' },
  rtBtn: { background: '#222', border: '1px solid #444', color: '#FFF', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', transition: '0.2s', fontWeight: 'bold' },
  rtContentArea: { flex: 1, padding: '40px', overflowY: 'auto', color: '#EEE', fontSize: '16px', lineHeight: '1.8', outline: 'none' },

  // MODAL DE CONFIGURAR / CREAR
  glassModalMini: { backgroundColor: '#111', width: '90%', maxWidth: '400px', borderRadius: '16px', border: '1px solid #333', padding: '30px', boxShadow: '0 25px 50px rgba(0,0,0,0.9)', animation: 'popIn 0.2s ease' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '25px' },
  closeBtn: { background: 'none', border: 'none', color: '#FFF', opacity: 0.6, cursor: 'pointer', transition: '0.2s', padding: 0 },
  modalForm: { display: 'flex', flexDirection: 'column' },
  modalBody: { display: 'flex', flexDirection: 'column' },
  modalLabel: { fontSize: '11px', fontWeight: 'bold', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' },
  glassInput: { backgroundColor: '#000', border: '1px solid #333', padding: '12px 15px', borderRadius: '8px', color: '#FFF', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  colorPicker: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' },
  colorCircle: { width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', transition: 'transform 0.1s' },
  modalActions: { display: 'flex', flexDirection: 'column', marginTop: '30px' },
  
  btnPrimaryFilled: { backgroundColor: '#FFF', color: '#000', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '13px', transition: '0.2s' },
  btnGhost: { background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: '0.2s' },
  
  // MODAL ALERTA SIMÉTRICO
  alertBox: { backgroundColor: '#111', padding: '30px', borderRadius: '16px', border: '1px solid #333', textAlign: 'center', minWidth: '320px', boxShadow: '0 20px 50px rgba(0,0,0,0.9)', animation: 'popIn 0.2s ease' },
  btnCancelAlert: { flex: 1, background: 'transparent', border: '1px solid #444', color: '#FFF', padding: '12px 15px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '700' },
  btnDangerAlert: { flex: 1, backgroundColor: '#f87171', color: '#000', border: 'none', padding: '12px 15px', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }
};

export default Notas;