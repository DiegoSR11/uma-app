// src/pages/Notas.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';
import { IconoDinamico, IconoEstrella, NOMBRES_ICONOS } from '../components/Iconos';

// NUEVO: Importamos el polyfill para Drag & Drop en celulares
import { polyfill } from 'mobile-drag-drop';
import 'mobile-drag-drop/default.css'; // Estilos necesarios para el parche visual táctil

const CATEGORIAS = ['General', 'Prompt', 'Fórmula Excel', 'Idea', 'Código'];
const COLORES = ['#cbd5e1', '#60a5fa', '#34d399', '#fbbf24', '#f87171', '#c084fc']; 

const Notas = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]); 
  const [currentFolder, setCurrentFolder] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null); 
  const [modalItem, setModalItem] = useState(null); 
  const [menuContextual, setMenuContextual] = useState({ visible: false, x: 0, y: 0, item: null });
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(null);
  const [bgImage, setBgImage] = useState('');
  const [textoCopiadoId, setTextoCopiadoId] = useState(null);
  const [dragTarget, setDragTarget] = useState(null); 

  const inicialUsuario = auth.currentUser?.email ? auth.currentUser.email.charAt(0).toUpperCase() : 'U';

  // NUEVO: Inicializar el Polyfill táctil al cargar la página
  useEffect(() => {
    polyfill({
      holdToDrag: 300 // (Opcional) Tienes que mantener presionado el ícono 300ms en el celular para arrastrarlo (evita arrastres accidentales al hacer scroll)
    });
    // Evitar que la pantalla haga scroll mientas arrastras en iOS
    window.addEventListener('touchmove', function() {}, { passive: false });
  }, []);

  useEffect(() => {
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    setBgImage(fondos[Math.floor(Math.random() * fondos.length)]);
    const handleClickOutside = () => { setMenuContextual({ visible: false, x: 0, y: 0, item: null }); setSelectedItem(null); };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const q = query(collection(db, 'notas'), where('userId', '==', user.uid));
        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          const fetchedItems = snapshot.docs.map(d => ({ 
            idBaseDatos: d.id, ...d.data(),
            tipoItem: d.data().tipoItem || 'nota',
            parentId: d.data().parentId || null,
            color: d.data().color || COLORES[0],
            icono: d.data().tipoItem === 'carpeta' ? 'carpeta' : (d.data().icono || 'nota'),
            destacado: d.data().destacado || false
          }));
          fetchedItems.sort((a, b) => (b.fechaCreacion || 0) - (a.fechaCreacion || 0));
          fetchedItems.sort((a, b) => (a.destacado === b.destacado ? 0 : a.destacado ? -1 : 1));
          setItems(fetchedItems);
        });
        return () => unsubscribeFirestore();
      } else { navigate('/login'); }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  const getBreadcrumbs = () => {
    const path = []; let currentId = currentFolder;
    while (currentId) {
      const folder = items.find(i => i.idBaseDatos === currentId);
      if (folder) { path.unshift(folder); currentId = folder.parentId; } else break;
    }
    return path;
  };
  
  const breadcrumbs = getBreadcrumbs();
  const currentDepth = breadcrumbs.length; 
  const itemsEnVista = items.filter(item => item.parentId === currentFolder);

  const getFolderDepth = (folderId) => {
    let depth = 0; let currentId = folderId;
    while (currentId) { depth++; const f = items.find(i => i.idBaseDatos === currentId); currentId = f ? f.parentId : null; }
    return depth;
  };
  const getMaxSubfolderDepth = (folderId) => {
    const children = items.filter(i => i.parentId === folderId && i.tipoItem === 'carpeta');
    if (children.length === 0) return 0;
    return 1 + Math.max(...children.map(c => getMaxSubfolderDepth(c.idBaseDatos)));
  };

  const handleItemClick = (e, item) => { e.stopPropagation(); setSelectedItem(item.idBaseDatos); setMenuContextual({ visible: false, x: 0, y: 0, item: null }); };
  const handleItemDoubleClick = (e, item) => {
    e.stopPropagation();
    if (item.tipoItem === 'carpeta') { setCurrentFolder(item.idBaseDatos); setSelectedItem(null); } 
    else if (item.tipoItem === 'nota') { setModalItem({ ...item, esNueva: false }); } 
    else if (item.tipoItem === 'link') { window.open(item.url, '_blank'); }
  };

  const handleDragStart = (e, id) => { e.dataTransfer.setData('itemId', id); e.stopPropagation(); };
  const handleDrop = async (e, targetFolderId) => {
    e.preventDefault(); e.stopPropagation(); setDragTarget(null);
    const draggedId = e.dataTransfer.getData('itemId');
    if (!draggedId || draggedId === targetFolderId) return;

    const draggedItem = items.find(i => i.idBaseDatos === draggedId);
    if (draggedItem.tipoItem === 'carpeta') {
      let parentCheckId = targetFolderId;
      while (parentCheckId) {
        if (parentCheckId === draggedId) return; 
        const parentFolder = items.find(i => i.idBaseDatos === parentCheckId);
        parentCheckId = parentFolder ? parentFolder.parentId : null;
      }
      if ((targetFolderId ? getFolderDepth(targetFolderId) : 0) + 1 + getMaxSubfolderDepth(draggedId) > 2) { alert('Límite de 2 niveles alcanzado.'); return; }
    }
    try { await updateDoc(doc(db, 'notas', draggedId), { parentId: targetFolderId }); } catch (error) { console.error(error); }
  };

  const abrirNuevaCarpeta = () => setModalItem({ esNueva: true, tipoItem: 'carpeta', titulo: '', color: COLORES[0], icono: 'carpeta', destacado: false });
  const abrirNuevaNota = () => setModalItem({ esNueva: true, tipoItem: 'nota', titulo: '', contenido: '', categoria: 'General', color: COLORES[0], icono: 'nota', destacado: false });
  const abrirNuevoEnlace = () => setModalItem({ esNueva: true, tipoItem: 'link', titulo: '', url: '', color: COLORES[0], icono: 'web', destacado: false });

  const guardarElemento = async (e) => {
    e.preventDefault();
    if (!modalItem.titulo.trim()) return;
    try {
      const datosAguardar = {
        titulo: modalItem.titulo, tipoItem: modalItem.tipoItem, color: modalItem.color, icono: modalItem.icono, destacado: modalItem.destacado
      };
      if (modalItem.tipoItem === 'nota') { datosAguardar.contenido = modalItem.contenido; datosAguardar.categoria = modalItem.categoria; } 
      else if (modalItem.tipoItem === 'link') {
        let finalUrl = modalItem.url.trim();
        if (finalUrl && !finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) finalUrl = 'https://' + finalUrl;
        datosAguardar.url = finalUrl;
      }

      if (modalItem.esNueva) {
        datosAguardar.parentId = currentFolder; datosAguardar.fechaCreacion = Date.now(); datosAguardar.userId = auth.currentUser.uid;
        await addDoc(collection(db, 'notas'), datosAguardar);
      } else { await updateDoc(doc(db, 'notas', modalItem.idBaseDatos), datosAguardar); }
      setModalItem(null);
    } catch (error) { console.error(error); }
  };

  const ejecutarEliminacion = async () => { await deleteDoc(doc(db, 'notas', confirmacionEliminar.id)); setConfirmacionEliminar(null); };
  const handleContextMenu = (e, item) => { e.preventDefault(); e.stopPropagation(); setSelectedItem(item.idBaseDatos); setMenuContextual({ visible: true, x: e.pageX, y: e.pageY, item }); };
  const copiarAlPortapapeles = (texto, id) => { navigator.clipboard.writeText(texto); setTextoCopiadoId(id); setTimeout(() => setTextoCopiadoId(null), 2000); };

  return (
    <div style={{ ...styles.appContainer, backgroundImage: `url(${bgImage})` }}>
      {/* NUEVO: Bloque CSS con Media Queries para pantallas de celular */}
      <style>{`
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(255, 255, 255, 0.3); }
        * { scrollbar-width: thin; scrollbar-color: rgba(255, 255, 255, 0.15) transparent; }
        ::placeholder { color: rgba(255,255,255,0.3); }

        @media (max-width: 768px) {
          .header-responsive { padding: 0 15px !important; }
          .hide-on-mobile { display: none !important; }
          .topbar-responsive { flex-direction: column; align-items: flex-start !important; gap: 15px; padding: 15px !important; }
          .desktop-responsive { padding: 15px !important; justify-content: center; }
          .icon-responsive { width: 85px !important; }
          .modal-box-responsive { width: 95% !important; padding: 20px !important; max-height: 90vh; overflow-y: auto; }
          .modal-body-responsive { flex-direction: column !important; gap: 15px !important; }
          .col-responsive { width: 100% !important; flex: none !important; }
        }
      `}</style>

      <div style={styles.blurOverlay}></div>

      <header style={styles.header} className="header-responsive">
        <button onClick={() => navigate('/panel')} style={styles.backBtn}>
          <span className="hide-on-mobile">VOLVER AL PANEL</span>
          <span style={{ display: 'none' }} className="show-on-mobile">← VOLVER</span>
        </button>
        <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
        <div style={styles.headerRight}><div style={styles.profileCircle}>{inicialUsuario}</div></div>
      </header>

      <div style={styles.topBar} className="topbar-responsive">
        <div style={styles.breadcrumbs}>
          <span style={{ ...styles.crumbBtn, backgroundColor: dragTarget === null ? 'rgba(255,255,255,0.1)' : 'transparent' }} onClick={() => setCurrentFolder(null)} onDragOver={(e) => { e.preventDefault(); setDragTarget(null); }} onDrop={(e) => handleDrop(e, null)}>Escritorio</span>
          {breadcrumbs.map(folder => (
            <span key={folder.idBaseDatos} style={styles.crumbTrail}>
              <span style={styles.crumbSeparator}>/</span>
              <span style={{ ...styles.crumbBtn, backgroundColor: dragTarget === folder.idBaseDatos ? 'rgba(255,255,255,0.1)' : 'transparent' }} onClick={() => setCurrentFolder(folder.idBaseDatos)} onDragOver={(e) => { e.preventDefault(); setDragTarget(folder.idBaseDatos); }} onDrop={(e) => handleDrop(e, folder.idBaseDatos)}>{folder.titulo}</span>
            </span>
          ))}
        </div>
        <div style={styles.actionButtons}>
          {currentDepth < 2 && <button onClick={abrirNuevaCarpeta} style={styles.addFolderBtn}>+ Carpeta</button>}
          <button onClick={abrirNuevaNota} style={styles.addNoteBtn}>+ Nota</button>
          <button onClick={abrirNuevoEnlace} style={styles.addLinkBtn}>+ Link</button>
        </div>
      </div>

      <div style={styles.desktopArea} className="desktop-responsive" onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, currentFolder)}>
        {itemsEnVista.length === 0 ? (
          <div style={styles.emptyState}>No hay elementos. Crea una carpeta, nota o enlace aquí.</div>
        ) : (
          itemsEnVista.map(item => {
            const isSelected = selectedItem === item.idBaseDatos;
            const isTarget = dragTarget === item.idBaseDatos;
            const colorEstrella = item.color === '#fbbf24' ? '#000000' : '#fbbf24';
            
            return (
              <div 
                key={item.idBaseDatos} 
                className="icon-responsive"
                style={{ ...styles.iconWrapper, backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : (isTarget ? 'rgba(255,255,255,0.1)' : 'transparent'), border: isTarget ? '1px dashed #1AACAC' : (isSelected ? '1px solid rgba(255,255,255,0.3)' : '1px solid transparent'), touchAction: 'none' }} // touchAction none ayuda a dispositivos móviles
                draggable 
                onDragStart={(e) => handleDragStart(e, item.idBaseDatos)}
                onDragOver={(e) => { if (item.tipoItem === 'carpeta') { e.preventDefault(); e.stopPropagation(); setDragTarget(item.idBaseDatos); } }}
                onDragLeave={() => setDragTarget(null)} onDrop={(e) => { if (item.tipoItem === 'carpeta') handleDrop(e, item.idBaseDatos); }}
                onClick={(e) => handleItemClick(e, item)} onDoubleClick={(e) => handleItemDoubleClick(e, item)} onContextMenu={(e) => handleContextMenu(e, item)}
              >
                <div style={styles.iconVisual}>
                  <IconoDinamico nombre={item.icono} color={item.color} />
                  {item.destacado && (
                    <div style={styles.centeredStar}>
                      <IconoEstrella color={colorEstrella} size={20} />
                    </div>
                  )}
                </div>

                <div style={styles.iconText}>{item.titulo}</div>
                {item.tipoItem === 'nota' && textoCopiadoId === item.idBaseDatos && <div style={styles.copiedBadge}>¡Copiado!</div>}
              </div>
            );
          })
        )}
      </div>

      {menuContextual.visible && (
        <div style={{ ...styles.contextMenu, top: menuContextual.y, left: menuContextual.x }}>
          <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); handleItemDoubleClick(e, menuContextual.item); setMenuContextual({ visible: false }); }}>Abrir</div>
          <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); setModalItem({ ...menuContextual.item, esNueva: false }); setMenuContextual({ visible: false }); }}>Configurar</div>
          {menuContextual.item.tipoItem === 'nota' && <div style={styles.contextItem} onClick={(e) => { e.stopPropagation(); copiarAlPortapapeles(menuContextual.item.contenido, menuContextual.item.idBaseDatos); setMenuContextual({ visible: false }); }}>Copiar Contenido</div>}
          <div style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />
          <div style={{ ...styles.contextItem, color: '#f87171' }} onClick={(e) => { e.stopPropagation(); setConfirmacionEliminar({ id: menuContextual.item.idBaseDatos, nombre: menuContextual.item.titulo }); setMenuContextual({ visible: false }); }}>Eliminar</div>
        </div>
      )}

      {modalItem && (
        <div style={styles.modalOverlay}>
          <div style={modalItem.tipoItem === 'nota' ? styles.glassModal : styles.glassModalMini} className="modal-box-responsive">
            <div style={styles.modalHeader}>
              <h2 style={{ margin: 0, fontSize: 18 }}>{modalItem.esNueva ? `Nuevo(a) ${modalItem.tipoItem}` : 'Configurar'}</h2>
              <button style={styles.closeBtn} onClick={() => setModalItem(null)}>✖</button>
            </div>
            
            <form onSubmit={guardarElemento} style={styles.modalForm}>
              <div style={styles.modalBody} className="modal-body-responsive">
                <div style={styles.mainCol} className="col-responsive">
                  <label style={styles.modalLabel}>Nombre / Título</label>
                  <input style={styles.glassInput} value={modalItem.titulo} onChange={(e) => setModalItem({ ...modalItem, titulo: e.target.value })} placeholder="Ej: Universidad, etc." autoFocus required />
                  
                  {modalItem.tipoItem === 'nota' && (
                    <>
                      <label style={styles.modalLabel}>Contenido</label>
                      <textarea style={styles.glassTextarea} value={modalItem.contenido} onChange={(e) => setModalItem({ ...modalItem, contenido: e.target.value })} placeholder="Escribe el texto aquí..." required />
                    </>
                  )}
                  {modalItem.tipoItem === 'link' && (
                    <>
                      <label style={styles.modalLabel}>URL del Enlace</label>
                      <input style={styles.glassInput} value={modalItem.url} onChange={(e) => setModalItem({ ...modalItem, url: e.target.value })} placeholder="www.ejemplo.com" required />
                    </>
                  )}
                </div>

                <div style={styles.sideCol} className="col-responsive">
                  {modalItem.tipoItem !== 'carpeta' && (
                    <>
                      <label style={styles.modalLabel}>Cambiar Ícono</label>
                      <div style={styles.iconPickerGrid}>
                        {NOMBRES_ICONOS.filter(n => n !== 'carpeta').map(nombre => (
                          <div 
                            key={nombre} 
                            onClick={() => setModalItem({...modalItem, icono: nombre})}
                            style={{ ...styles.iconOption, backgroundColor: modalItem.icono === nombre ? 'rgba(255,255,255,0.2)' : 'transparent', border: modalItem.icono === nombre ? '1px solid #FFF' : '1px solid transparent' }}
                          >
                            <IconoDinamico nombre={nombre} color="#FFF" size={24} />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <label style={{...styles.modalLabel, marginTop: modalItem.tipoItem !== 'carpeta' ? '10px' : '0'}}>Color</label>
                  <div style={styles.colorPicker}>
                    {COLORES.map(c => (
                      <div key={c} onClick={() => setModalItem({...modalItem, color: c})} style={{ ...styles.colorCircle, backgroundColor: c, border: modalItem.color === c ? '2px solid #FFF' : '2px solid transparent' }} />
                    ))}
                  </div>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '15px', color: '#fbbf24', fontWeight: 'bold', fontSize: '14px' }}>
                    <input type="checkbox" checked={modalItem.destacado} onChange={(e) => setModalItem({...modalItem, destacado: e.target.checked})} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                    ⭐ Marcar como Destacado
                  </label>

                  {modalItem.tipoItem === 'nota' && (
                    <>
                      <label style={{...styles.modalLabel, marginTop: '15px'}}>Categoría</label>
                      <select style={styles.glassSelect} value={modalItem.categoria} onChange={(e) => setModalItem({ ...modalItem, categoria: e.target.value })}>
                        {CATEGORIAS.map(c => <option key={c} value={c} style={{ backgroundColor: '#1e1e32' }}>{c}</option>)}
                      </select>
                    </>
                  )}
                  
                  <div style={styles.modalActions}>
                    <button type="submit" style={styles.btnPrimary}>Guardar Cambios</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmacionEliminar && (
        <div style={{ ...styles.modalOverlay, zIndex: 3000 }}>
          <div style={styles.glassModalMini} className="modal-box-responsive">
            <h3 style={{ marginTop: 0, color: '#f87171' }}>¿Eliminar {confirmacionEliminar.nombre}?</h3>
            <p style={{ opacity: 0.8, fontSize: 14 }}>Esta acción no se puede deshacer.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
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
// ESTILOS ESCRITORIO WINDOWS PRO
// =================================================================
const styles = {
  appContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundSize: 'cover', backgroundPosition: 'center', overflow: 'hidden', color: '#FFF', fontFamily: 'Inter, sans-serif', userSelect: 'none' },
  blurOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10, 11, 30, 0.4)', backdropFilter: 'blur(8px)', zIndex: 0 },
  header: { height: '70px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.1)' },
  logoImage: { height: '35px', width: 'auto' },
  backBtn: { backgroundColor: '#FFF', color: '#362FD9', border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '11px', fontWeight: '800', cursor: 'pointer', letterSpacing: '1px' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '15px' },
  profileCircle: { width: '35px', height: '35px', borderRadius: '50%', backgroundColor: '#1AACAC', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  topBar: { position: 'relative', zIndex: 5, padding: '15px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', borderBottom: '1px solid rgba(255,255,255,0.05)' },
  breadcrumbs: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: '600', letterSpacing: '0.5px', flexWrap: 'wrap' },
  crumbBtn: { cursor: 'pointer', color: '#cbd5e1', transition: '0.2s', padding: '4px 8px', borderRadius: '6px', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } },
  crumbTrail: { display: 'flex', alignItems: 'center', gap: '8px' },
  crumbSeparator: { color: 'rgba(255,255,255,0.3)' },
  actionButtons: { display: 'flex', gap: '10px', flexWrap: 'wrap' },
  addFolderBtn: { backgroundColor: 'transparent', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.3)', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  addNoteBtn: { backgroundColor: '#362FD9', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  addLinkBtn: { backgroundColor: '#1AACAC', color: '#FFF', border: 'none', padding: '8px 16px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', transition: '0.2s' },
  desktopArea: { flex: 1, padding: '30px', position: 'relative', zIndex: 1, display: 'flex', flexWrap: 'wrap', alignContent: 'flex-start', gap: '20px', overflowY: 'auto' },
  emptyState: { width: '100%', textAlign: 'center', color: 'rgba(255,255,255,0.5)', marginTop: '40px', fontSize: '14px' },
  iconWrapper: { width: '100px', padding: '10px', borderRadius: '8px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', cursor: 'pointer', transition: 'background-color 0.1s', position: 'relative' },
  iconVisual: { display: 'flex', alignItems: 'center', justifyContent: 'center', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.4))', position: 'relative' },
  centeredStar: { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', display: 'flex', pointerEvents: 'none' },
  iconText: { fontSize: '12px', color: '#FFF', textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,0.8)', fontWeight: '500', lineHeight: '1.3', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word', marginTop: '4px' },
  copiedBadge: { position: 'absolute', top: '-5px', backgroundColor: '#4ade80', color: '#000', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  contextMenu: { position: 'absolute', backgroundColor: 'rgba(20, 20, 35, 0.95)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '5px 0', zIndex: 3000, minWidth: '160px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' },
  contextItem: { padding: '8px 15px', fontSize: '13px', cursor: 'pointer', color: '#cbd5e1', fontWeight: '500', transition: 'background 0.1s', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF' } },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 },
  glassModal: { backgroundColor: 'rgba(30, 30, 50, 0.95)', width: '90%', maxWidth: '800px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', padding: '30px', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
  glassModalMini: { backgroundColor: 'rgba(30, 30, 50, 0.95)', width: '90%', maxWidth: '450px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', padding: '25px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', color: '#cbd5e1', fontSize: '18px', cursor: 'pointer' },
  modalForm: { display: 'flex', flexDirection: 'column', flex: 1 },
  modalBody: { display: 'flex', gap: '30px', flexWrap: 'wrap' },
  mainCol: { flex: '2 1 200px', display: 'flex', flexDirection: 'column', gap: '15px' },
  sideCol: { flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '15px' },
  modalLabel: { fontSize: '11px', fontWeight: 'bold', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '-8px' },
  glassInput: { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px 15px', borderRadius: '12px', color: '#FFF', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  glassTextarea: { flex: 1, minHeight: '180px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px', color: '#FFF', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'none', fontFamily: 'monospace', lineHeight: '1.6' },
  glassSelect: { backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', color: '#FFF', fontSize: '13px', cursor: 'pointer', width: '100%', outline: 'none', fontWeight: '600' },
  iconPickerGrid: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '5px' },
  iconOption: { padding: '8px', borderRadius: '8px', cursor: 'pointer', transition: '0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  colorPicker: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '5px' },
  colorCircle: { width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', transition: 'transform 0.1s' },
  modalActions: { marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px' },
  btnPrimary: { backgroundColor: '#1AACAC', color: '#FFF', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  btnDanger: { backgroundColor: 'rgba(248, 113, 113, 0.1)', color: '#f87171', border: '1px solid #f87171', padding: '10px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' },
  btnGhost: { background: 'none', border: 'none', color: '#FFF', padding: '10px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', transition: '0.2s' }
};

export default Notas;