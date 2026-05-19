// src/pages/Notas.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc, where } from 'firebase/firestore';

const CATEGORIAS = ['Todos', 'Prompt', 'Fórmula Excel', 'Idea', 'Código', 'General'];

const Notas = () => {
  const navigate = useNavigate();

  // --- ESTADOS DE DATOS ---
  const [notas, setNotas] = useState([]);
  const [notaEditando, setNotaEditando] = useState(null);
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(null);
  const [bgImage, setBgImage] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');
  const [textoCopiadoId, setTextoCopiadoId] = useState(null); // Feedback visual al copiar

  useEffect(() => {
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    setBgImage(fondos[Math.floor(Math.random() * fondos.length)]);
  }, []);

  // --- LECTURA PRIVADA DE NOTAS ---
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const notasRef = collection(db, 'notas');
        const q = query(
          notasRef,
          where('userId', '==', user.uid),
          orderBy('fechaCreacion', 'desc')
        );

        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          setNotas(snapshot.docs.map(d => ({ idBaseDatos: d.id, ...d.data() })));
        }, (error) => {
          console.error("Error al traer notas:", error.message);
        });

        return () => unsubscribeFirestore();
      } else {
        setNotas([]);
        navigate('/login');
      }
    });
    return () => unsubscribeAuth();
  }, [navigate]);

  // --- ACCIONES ---
  const abrirNuevaNota = () => {
    setNotaEditando({ esNueva: true, titulo: '', contenido: '', categoria: 'General' });
  };

  const abrirEditarNota = (nota) => {
    setNotaEditando({ ...nota, esNueva: false });
  };

  const guardarNota = async (e) => {
    e.preventDefault();
    if (!notaEditando.titulo.trim() || !notaEditando.contenido.trim()) return;

    try {
      if (notaEditando.esNueva) {
        await addDoc(collection(db, 'notas'), {
          titulo: notaEditando.titulo,
          contenido: notaEditando.contenido,
          categoria: notaEditando.categoria,
          fechaCreacion: new Date(),
          userId: auth.currentUser.uid
        });
      } else {
        await updateDoc(doc(db, 'notas', notaEditando.idBaseDatos), {
          titulo: notaEditando.titulo,
          contenido: notaEditando.contenido,
          categoria: notaEditando.categoria
        });
      }
      setNotaEditando(null);
    } catch (error) {
      console.error("Error al guardar nota:", error);
    }
  };

  const eliminarNota = async () => {
    await deleteDoc(doc(db, 'notas', confirmacionEliminar.id));
    setConfirmacionEliminar(null);
    setNotaEditando(null);
  };

  // --- FUNCIÓN DE COPIADO AL PORTAPAPELES ---
  const copiarAlPortapapeles = (e, nota) => {
    e.stopPropagation(); // Evita abrir el modal al presionar copiar
    navigator.clipboard.writeText(nota.contenido);
    setTextoCopiadoId(nota.idBaseDatos);
    setTimeout(() => setTextoCopiadoId(null), 2000); // Reset del mensaje de copiado
  };

  // Filtrado lógico
  const notasFiltradas = filtroCategoria === 'Todos' 
    ? notas 
    : notas.filter(n => n.categoria === filtroCategoria);

  return (
    <div style={{ ...styles.appContainer, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.overlay}></div>

      {/* HEADER COHERENTE CON TUS TAREAS */}
      <header style={styles.header}>
        <button onClick={() => navigate('/panel')} style={styles.backBtn}>VOLVER</button>
        <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
        <button onClick={abrirNuevaNota} style={styles.addNotaHeaderBtn}>+ NUEVA NOTA</button>
      </header>

      {/* BARRA DE FILTROS DE CATEGORÍAS */}
      <div style={styles.filterBar}>
        {CATEGORIAS.map(cat => (
          <button
            key={cat}
            onClick={() => setFiltroCategoria(cat)}
            style={{
              ...styles.filterTab,
              backgroundColor: filtroCategoria === cat ? 'var(--color-primary)' : 'transparent',
              color: filtroCategoria === cat ? '#FFFFFF' : '#5E6C84',
              fontWeight: filtroCategoria === cat ? 'bold' : '500'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* CUADRÍCULA (GRID) DE NOTAS */}
      <div style={styles.gridContainer}>
        {notasFiltradas.length === 0 ? (
          <div style={styles.emptyState}>No tienes notas guardadas en esta categoría.</div>
        ) : (
          notasFiltradas.map(nota => (
            <div key={nota.idBaseDatos} style={styles.noteCard} onClick={() => abrirEditarNota(nota)}>
              <div style={styles.cardHeader}>
                <span style={styles.categoryBadge}>{nota.categoria}</span>
                <button 
                  onClick={(e) => copiarAlPortapapeles(e, nota)} 
                  style={{
                    ...styles.copyBtn,
                    backgroundColor: textoCopiadoId === nota.idBaseDatos ? '#E3FCEF' : '#FAFBFC',
                    color: textoCopiadoId === nota.idBaseDatos ? '#006644' : 'var(--color-primary)'
                  }}
                >
                  {textoCopiadoId === nota.idBaseDatos ? '¡Copiado! ✓' : 'Copiar'}
                </button>
              </div>
              <h4 style={styles.cardTitle}>{nota.titulo}</h4>
              <p style={styles.cardBodyText}>{nota.contenido}</p>
            </div>
          ))
        )}
      </div>

      {/* MODAL DE EDICIÓN / DETALLE */}
      {notaEditando && (
        <div style={styles.modalOverlay}>
          <div style={styles.modernModal}>
            <div style={styles.modalHeader}>
              <h2>{notaEditando.esNueva ? 'Crear Apunte / Nota' : 'Detalle de Nota'}</h2>
              <button style={styles.closeBtn} onClick={() => setNotaEditando(null)}>✖</button>
            </div>
            <form onSubmit={guardarNota} style={styles.modalForm}>
              <div style={styles.modalBody}>
                <div style={styles.mainCol}>
                  <label style={styles.label}>Título</label>
                  <input
                    style={styles.inputModern}
                    value={notaEditando.titulo}
                    onChange={(e) => setNotaEditando({ ...notaEditando, titulo: e.target.value })}
                    placeholder="Ej: Prompt para resumir PDF / Fórmula BuscarV"
                    autoFocus
                    required
                  />
                  <label style={styles.label}>Contenido</label>
                  <textarea
                    style={styles.textareaModern}
                    value={notaEditando.contenido}
                    onChange={(e) => setNotaEditando({ ...notaEditando, contenido: e.target.value })}
                    placeholder="Pega el prompt, la fórmula o el texto aquí..."
                    required
                  />
                </div>
                <div style={styles.sideCol}>
                  <label style={styles.label}>Categoría</label>
                  <select
                    style={styles.selectModern}
                    value={notaEditando.categoria}
                    onChange={(e) => setNotaEditando({ ...notaEditando, categoria: e.target.value })}
                  >
                    {CATEGORIAS.filter(c => c !== 'Todos').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <div style={styles.sideActions}>
                    {!notaEditando.esNueva && (
                      <button 
                        type="button" 
                        style={styles.actionBtnDanger} 
                        onClick={() => setConfirmacionEliminar({ id: notaEditando.idBaseDatos })}
                      >
                        Eliminar
                      </button>
                    )}
                    <button type="submit" style={styles.actionBtnPrimary}>Guardar Nota</button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ALERTA DE ELIMINACIÓN */}
      {confirmacionEliminar && (
        <div style={{ ...styles.modalOverlay, zIndex: 2000 }}>
          <div style={styles.alertModal}>
            <h3 style={{ marginTop: 0, color: '#eb5a46' }}>¿Eliminar Nota?</h3>
            <p style={{ color: '#5E6C84', fontSize: '14px' }}>Esta acción no se puede deshacer.</p>
            <div style={styles.alertActions}>
              <button style={styles.cancelBtn} onClick={() => setConfirmacionEliminar(null)}>Cancelar</button>
              <button style={styles.actionBtnDanger} onClick={eliminarNota}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ESTILOS DE NOTAS ---
const styles = {
  appContainer: { height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden' },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(235, 236, 240, 0.7)', backdropFilter: 'blur(3px)', zIndex: 0 },
  header: { backgroundColor: 'var(--color-primary)', padding: '12px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 2, boxShadow: '0 2px 10px rgba(0,0,0,0.15)' },
  logoImage: { height: '40px', width: 'auto' },
  backBtn: { backgroundColor: '#FFFFFF', color: 'var(--color-primary)', border: 'none', padding: '8px 20px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', textTransform: 'uppercase' },
  addNotaHeaderBtn: { backgroundColor: 'var(--color-tertiary)', color: '#FFFFFF', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold' },
  
  // Barra de navegación por categorías
  filterBar: { backgroundColor: 'rgba(255,255,255,0.9)', padding: '10px 30px', display: 'flex', gap: '10px', position: 'relative', zIndex: 1, borderBottom: '1px solid #DFE1E6', overflowX: 'auto' },
  filterTab: { border: 'none', padding: '6px 16px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', transition: 'all 0.2s' },

  // Grid Layout de las tarjetas de Notas
  gridContainer: { flex: 1, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '30px', overflowY: 'auto', position: 'relative', zIndex: 1, contentVisibility: 'auto' },
  emptyState: { gridColumn: '1/-1', textAlign: 'center', color: '#5E6C84', paddingTop: '40px', fontSize: '15px', fontWeight: '500' },
  
  // Tarjetas estables
  noteCard: { backgroundColor: '#FFFFFF', borderRadius: '8px', padding: '16px', border: '1px solid #ebecf0', boxShadow: '0 2px 5px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', height: '180px', boxSizing: 'border-box', transition: 'transform 0.15s' },
  cardHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  categoryBadge: { fontSize: '10px', fontWeight: 'bold', backgroundColor: '#EAE6FF', color: '#403294', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' },
  copyBtn: { border: '1px solid #DFE1E6', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' },
  cardTitle: { margin: 0, fontSize: '14px', fontWeight: 'bold', color: '#172B4D', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  cardBodyText: { margin: 0, fontSize: '12px', color: '#5E6C84', lineHeight: '1.5', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', textOverflow: 'ellipsis' },

  // Modales
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(9, 30, 66, 0.54)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  modernModal: { backgroundColor: '#FFFFFF', borderRadius: '8px', width: '100%', maxWidth: '700px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', padding: '32px', color: '#172B4D', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' },
  closeBtn: { background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#7A869A' },
  modalForm: { display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' },
  modalBody: { display: 'flex', gap: '30px', flex: 1 },
  mainCol: { flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' },
  sideCol: { flex: 1, display: 'flex', flexDirection: 'column', gap: '16px' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#5E6C84' },
  inputModern: { backgroundColor: '#FAFBFC', border: '2px solid #DFE1E6', padding: '12px', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  textareaModern: { flex: 1, minHeight: '200px', backgroundColor: '#FAFBFC', border: '2px solid #DFE1E6', padding: '16px', borderRadius: '6px', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', color: '#172B4D', resize: 'none', fontFamily: 'monospace', lineHeight: '1.5', overflowY: 'auto' },
  selectModern: { backgroundColor: '#FAFBFC', border: '2px solid #DFE1E6', padding: '10px', borderRadius: '6px', fontSize: '14px', cursor: 'pointer', width: '100%', outline: 'none', fontWeight: '600' },
  sideActions: { display: 'flex', flexDirection: 'column', gap: '12px', marginTop: 'auto' },
  actionBtnPrimary: { backgroundColor: 'var(--color-tertiary)', color: '#FFF', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  actionBtnDanger: { backgroundColor: '#FFEBE6', color: '#DE350B', border: 'none', padding: '10px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' },
  alertModal: { backgroundColor: '#FFFFFF', padding: '32px', borderRadius: '8px', width: '360px', textAlign: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' },
  alertActions: { display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' },
  cancelBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#5E6C84', padding: '10px 16px', fontWeight: '600', fontSize: '13px' }
};

export default Notas;