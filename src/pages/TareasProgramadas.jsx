// src/pages/TareasProgramadas.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, auth } from '../firebase';
import { collection, addDoc, onSnapshot, query, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';

const TareasProgramadas = () => {
  const navigate = useNavigate();

  const [tareas, setTareas] = useState([]);
  const [tareaEditando, setTareaEditando] = useState(null); 
  const [confirmacionEliminar, setConfirmacionEliminar] = useState(null);

  // Conexión a la colección especial "tareas_programadas"
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        const tareasRef = collection(db, 'tareas_programadas');
        const q = query(tareasRef, orderBy('fechaCreacion', 'desc'));

        const unsubscribeFirestore = onSnapshot(q, (snapshot) => {
          const tareasDesdeFirebase = snapshot.docs.map((doc) => ({
            idBaseDatos: doc.id,
            ...doc.data()
          }));
          setTareas(tareasDesdeFirebase);
        });
        return () => unsubscribeFirestore();
      } else {
        setTareas([]);
      }
    });
    return () => unsubscribeAuth();
  }, []);

  const abrirModalNuevaTarea = () => {
    setTareaEditando({
      esNueva: true,
      texto: '',
      descripcion: '',
      estado: 'Abierto', // Fijo por regla de negocio
      etiqueta: 'Sin Etiqueta',
      periodicidad: 'Diario', // Nuevo campo
      hora: '08:00', // Nuevo campo
      subtareas: [],
    });
  };

  const abrirModalEditarTarea = (tarea) => {
    setTareaEditando({ 
      ...tarea, 
      esNueva: false,
      subtareas: tarea.subtareas || [] 
    });
  };

  const cerrarModal = () => setTareaEditando(null);

  const guardarTarea = async (e) => {
    e.preventDefault();
    if (!tareaEditando.texto.trim()) return; 

    try {
      if (tareaEditando.esNueva) {
        // Prefijo #P para programadas
        const numeroId = String(tareas.length + 1).padStart(8, '0');
        await addDoc(collection(db, 'tareas_programadas'), {
          idVisual: `#P${numeroId}`,
          texto: tareaEditando.texto,
          descripcion: tareaEditando.descripcion,
          estado: 'Abierto', // Siempre Abierto
          etiqueta: tareaEditando.etiqueta,
          periodicidad: tareaEditando.periodicidad,
          hora: tareaEditando.hora,
          subtareas: tareaEditando.subtareas,
          color: '#FF0000', // El color identificador de las programadas
          fechaCreacion: new Date()
        });
      } else {
        const tareaRef = doc(db, 'tareas_programadas', tareaEditando.idBaseDatos);
        await updateDoc(tareaRef, {
          texto: tareaEditando.texto,
          descripcion: tareaEditando.descripcion,
          etiqueta: tareaEditando.etiqueta,
          periodicidad: tareaEditando.periodicidad,
          hora: tareaEditando.hora,
          subtareas: tareaEditando.subtareas,
        });
      }
      cerrarModal();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  // Funciones de subtareas simplificadas (sin validación de estado cerrado porque siempre es abierto)
  const agregarSubtarea = () => {
    const nuevaSubtarea = { id: Date.now(), texto: '', completada: false };
    setTareaEditando({ ...tareaEditando, subtareas: [...tareaEditando.subtareas, nuevaSubtarea] });
  };
  const actualizarSubtarea = (id, nuevoTexto) => {
    const act = tareaEditando.subtareas.map(st => st.id === id ? { ...st, texto: nuevoTexto } : st);
    setTareaEditando({ ...tareaEditando, subtareas: act });
  };
  const toggleSubtareaCompletada = (id) => {
    const act = tareaEditando.subtareas.map(st => st.id === id ? { ...st, completada: !st.completada } : st);
    setTareaEditando({ ...tareaEditando, subtareas: act });
  };
  const solicitarEliminarSubtarea = (id) => setConfirmacionEliminar({ tipo: 'subtarea', id: id, nombre: 'esta subtarea' });
  const solicitarEliminarTarea = () => setConfirmacionEliminar({ tipo: 'tarea', id: tareaEditando.idBaseDatos, nombre: tareaEditando.texto });

  const ejecutarEliminacion = async () => {
    if (confirmacionEliminar.tipo === 'tarea') {
      await deleteDoc(doc(db, 'tareas_programadas', confirmacionEliminar.id));
      cerrarModal();
    } else {
      const act = tareaEditando.subtareas.filter(st => st.id !== confirmacionEliminar.id);
      setTareaEditando({ ...tareaEditando, subtareas: act });
    }
    setConfirmacionEliminar(null);
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <button onClick={() => navigate('/panel')} style={styles.backBtn}>← Volver al Panel</button>
        <div style={styles.headerTitle}>Gestor de Tareas Programadas</div>
        <div style={{ width: '80px' }}></div>
      </header>

      <main style={styles.mainContent}>
        <div style={styles.actionBar}>
          <button onClick={() => navigate('/tareas')} style={{...styles.addBtn, backgroundColor: '#362FD9'}}>
            📝 Ir a Tareas Normales
          </button>
          <button style={styles.addBtn} onClick={abrirModalNuevaTarea}>
            + Configurar Nueva Rutina
          </button>
        </div>

        {tareas.length === 0 ? (
          <div style={styles.emptyState}>
            <h3 style={styles.emptyTitle}>Aún no tienes rutinas programadas</h3>
          </div>
        ) : (
          <div style={styles.tareasContainer}>
            {tareas.map((tarea) => (
              <div key={tarea.idBaseDatos} style={styles.cardWrapper} onClick={() => abrirModalEditarTarea(tarea)}>
                <div style={styles.idTabList}>{tarea.idVisual}</div>
                <div style={{ ...styles.coloredBorderList, backgroundColor: tarea.color }}>
                  <div style={styles.taskTextBoxList}>
                    <div style={{color: '#FF0000', fontSize: '12px', marginBottom: '5px'}}>
                      ↻ {tarea.periodicidad} - ⏰ {tarea.hora}
                    </div>
                    {tarea.texto}
                  </div>
                  <div style={styles.statusPillList}>Automático</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      
      {tareaEditando && (
        <div style={styles.modalOverlay}>
          <div style={styles.editModalContainer}>
            <div style={styles.modalIdTab}>
              {tareaEditando.esNueva ? '#NUEVA_PROGRAMADA' : tareaEditando.idVisual}
            </div>

            
            <div style={{...styles.editModalContent, backgroundColor: '#FF0000'}}>
              
              <div style={styles.dateHeaderContainer}>
                <div style={styles.datePill}>Configuración de Generación Automática</div>
              </div>

              <input style={styles.blackInput} placeholder="Título de la tarea a generar" value={tareaEditando.texto} onChange={(e) => setTareaEditando({...tareaEditando, texto: e.target.value})} />
              <textarea style={styles.blackTextarea} placeholder="Descripción..." value={tareaEditando.descripcion} onChange={(e) => setTareaEditando({...tareaEditando, descripcion: e.target.value})} />

              
              <div style={styles.scheduleRow}>
                <div style={styles.scheduleGroup}>
                  <label style={styles.whiteLabel}>Periodicidad:</label>
                  <select style={styles.blackSelect} value={tareaEditando.periodicidad} onChange={(e) => setTareaEditando({...tareaEditando, periodicidad: e.target.value})}>
                    <option value="Diario">Diario</option>
                    <option value="Semanal">Semanal</option>
                    <option value="Mensual">Mensual</option>
                    <option value="Anual">Anual</option>
                  </select>
                </div>
                <div style={styles.scheduleGroup}>
                  <label style={styles.whiteLabel}>Hora de creación:</label>
                  <input type="time" style={styles.blackSelect} value={tareaEditando.hora} onChange={(e) => setTareaEditando({...tareaEditando, hora: e.target.value})} />
                </div>
              </div>

              <div style={styles.subtasksContainer}>
                {tareaEditando.subtareas.map((st) => (
                  <div key={st.id} style={styles.subtaskRow}>
                    <input style={styles.subtaskInput} value={st.texto} onChange={(e) => actualizarSubtarea(st.id, e.target.value)} placeholder="Subtarea..." />
                    <button style={styles.iconBtn} onClick={() => solicitarEliminarSubtarea(st.id)}>✖</button>
                    <input type="checkbox" style={styles.subtaskCheckbox} checked={st.completada} onChange={() => toggleSubtareaCompletada(st.id)} />
                  </div>
                ))}
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end'}}>
                <button style={{...styles.blackActionBtn, width: 'auto', padding: '10px 20px', fontSize: '14px'}} onClick={agregarSubtarea}>
                  Agregar Sub Tarea +
                </button>
              </div>

              <div style={styles.bottomControlsRow}>
                <select style={styles.blackSelect} value={tareaEditando.etiqueta} onChange={(e) => setTareaEditando({...tareaEditando, etiqueta: e.target.value})}>
                  <option value="Sin Etiqueta">Sin Etiqueta</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Importante">Importante</option>
                </select>
                
                <div style={{...styles.blackSelect, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888'}}>
                  Estado Bloqueado (Abierto)
                </div>
              </div>

              <div style={styles.actionButtonsRow}>
                <button style={styles.blackActionBtn} onClick={tareaEditando.esNueva ? cerrarModal : solicitarEliminarTarea}>
                  {tareaEditando.esNueva ? 'Cancelar' : 'Eliminar'}
                </button>
                <button style={styles.blackActionBtn} onClick={guardarTarea}>Guardar Rutina</button>
              </div>
              <button style={styles.closeFloatBtn} onClick={cerrarModal}>X</button>
            </div>
          </div>
        </div>
      )}

      
      {confirmacionEliminar && (
        <div style={{...styles.modalOverlay, zIndex: 2000}}>
          <div style={styles.confirmModalContent}>
            <div style={styles.warningIconCircle}>!</div>
            <h2 style={styles.confirmTitle}>
              ¿Eliminar {confirmacionEliminar.tipo === 'tarea' ? 'rutina' : 'subtarea'} <span style={{color: '#F44336'}}>{confirmacionEliminar.nombre}</span>?
            </h2>
            <div style={styles.confirmActions}>
              <button style={styles.confirmDeleteBtn} onClick={ejecutarEliminacion}>🗑 Eliminar</button>
              <button style={styles.confirmCancelBtn} onClick={() => setConfirmacionEliminar(null)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ESTILOS
const styles = {
  container: { minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' },
  header: { backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', padding: '15px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { backgroundColor: 'transparent', color: 'var(--color-white)', border: 'none', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold' },
  headerTitle: { fontSize: '20px', fontWeight: 'bold' },
  mainContent: { padding: '40px' },
  actionBar: { backgroundColor: 'var(--color-white)', padding: '15px 30px', borderRadius: '15px', marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  addBtn: { backgroundColor: 'var(--color-secondary)', color: 'var(--color-white)', border: 'none', padding: '10px 20px', borderRadius: '20px', fontWeight: 'bold', cursor: 'pointer' },
  emptyState: { textAlign: 'center', marginTop: '60px' },
  emptyTitle: { color: 'var(--color-primary)', fontSize: '24px' },
  tareasContainer: { display: 'flex', flexWrap: 'wrap', gap: '40px', justifyContent: 'center' },
  cardWrapper: { position: 'relative', width: '280px', marginTop: '25px', cursor: 'pointer' },
  idTabList: { position: 'absolute', top: '-25px', left: '0', backgroundColor: '#000', color: '#FFF', padding: '5px 15px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', fontSize: '12px', fontFamily: 'monospace', zIndex: 2 },
  coloredBorderList: { padding: '12px', borderRadius: '25px', borderTopLeftRadius: '0', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'transform 0.2s' },
  taskTextBoxList: { backgroundColor: '#000', color: '#FFF', padding: '20px', borderRadius: '15px', minHeight: '80px', fontSize: '15px' },
  statusPillList: { backgroundColor: '#000', color: '#FFF', padding: '8px', borderRadius: '20px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' },
  
  // Modales
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  editModalContainer: { position: 'relative', width: '90%', maxWidth: '600px', marginTop: '30px' },
  modalIdTab: { position: 'absolute', top: '-25px', left: '0', backgroundColor: '#000', color: '#FFF', padding: '5px 20px', borderTopLeftRadius: '10px', borderTopRightRadius: '10px', fontSize: '14px', fontFamily: 'monospace', zIndex: 2 },
  editModalContent: { borderRadius: '20px', borderTopLeftRadius: '0', padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px', position: 'relative' },
  dateHeaderContainer: { display: 'flex', justifyContent: 'center', marginBottom: '10px' },
  datePill: { backgroundColor: '#000', color: '#FFF', padding: '8px 20px', borderRadius: '5px', fontSize: '14px', fontWeight: 'bold' },
  blackInput: { backgroundColor: '#000', color: '#FFF', border: 'none', padding: '15px', borderRadius: '5px', fontSize: '16px', outline: 'none', width: '100%', boxSizing: 'border-box' },
  blackTextarea: { backgroundColor: '#000', color: '#FFF', border: 'none', padding: '15px', borderRadius: '5px', fontSize: '14px', outline: 'none', width: '100%', minHeight: '80px', boxSizing: 'border-box', resize: 'vertical' },
  
  scheduleRow: { display: 'flex', gap: '15px', backgroundColor: '#B71C1C', padding: '15px', borderRadius: '10px' },
  scheduleGroup: { display: 'flex', flexDirection: 'column', flex: 1, gap: '5px' },
  whiteLabel: { color: '#FFF', fontSize: '12px', fontWeight: 'bold' },

  subtasksContainer: { display: 'flex', flexDirection: 'column', gap: '10px' },
  subtaskRow: { backgroundColor: '#000', display: 'flex', alignItems: 'center', padding: '10px', borderRadius: '5px' },
  subtaskInput: { flex: 1, backgroundColor: 'transparent', color: '#FFF', border: 'none', outline: 'none', fontSize: '14px' },
  iconBtn: { backgroundColor: 'transparent', color: '#FFF', border: 'none', cursor: 'pointer', fontSize: '16px', padding: '0 10px' },
  subtaskCheckbox: { width: '18px', height: '18px', cursor: 'pointer' },
  bottomControlsRow: { display: 'flex', gap: '15px' },
  blackSelect: { flex: 1, backgroundColor: '#000', color: '#FFF', border: 'none', padding: '15px', borderRadius: '10px', fontSize: '14px', outline: 'none', cursor: 'pointer' },
  actionButtonsRow: { display: 'flex', gap: '15px', marginTop: '10px' },
  blackActionBtn: { flex: 1, backgroundColor: '#000', color: '#FFF', border: 'none', padding: '15px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  closeFloatBtn: { position: 'absolute', top: '10px', right: '10px', backgroundColor: 'transparent', color: '#FFF', border: 'none', fontSize: '20px', fontWeight: 'bold', cursor: 'pointer' },
  
  confirmModalContent: { backgroundColor: '#FFF', borderRadius: '20px', padding: '40px 30px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' },
  warningIconCircle: { backgroundColor: '#FFEBEE', color: '#F44336', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px', fontWeight: 'bold', marginBottom: '20px' },
  confirmTitle: { margin: '0 0 10px 0', fontSize: '18px', color: '#333' },
  confirmActions: { display: 'flex', gap: '15px', width: '100%', marginTop: '20px' },
  confirmDeleteBtn: { flex: 1, backgroundColor: '#F44336', color: '#FFF', border: 'none', padding: '12px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' },
  confirmCancelBtn: { flex: 1, backgroundColor: '#F5F5F5', color: '#666', border: 'none', padding: '12px', borderRadius: '20px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }
};

export default TareasProgramadas;