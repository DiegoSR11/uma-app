// src/pages/Espacios.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useEspacios } from '../hooks/useEspacios';

const ICONS = {
  publicacion: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),

  dual: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),

  group: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),

  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),

  link: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),

  settings: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  ),

  archive: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="21 8 21 21 3 21 3 8"></polyline>
      <rect x="1" y="3" width="22" height="5"></rect>
      <line x1="10" y1="12" x2="14" y2="12"></line>
    </svg>
  )
};

const CustomSelect = ({ value, onChange, options, style }) => {
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption =
    options.find((o) => o.value === value) || options[0];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        zIndex: isOpen ? 9999 : 1,
        ...style
      }}
      tabIndex={0}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setIsOpen(false);
        }
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={styles.customSelectTrigger}
      >
        <span>{selectedOption.label}</span>
        <span style={{ fontSize: '10px', opacity: 0.6 }}>
          {isOpen ? '▲' : '▼'}
        </span>
      </div>

      {isOpen && (
        <div style={styles.customSelectMenu}>
          {options.map((opt) => (
            <div
              key={opt.value}
              style={{
                ...styles.customSelectItem,
                backgroundColor:
                  value === opt.value
                    ? 'rgba(255,255,255,0.1)'
                    : 'transparent',
                fontWeight: value === opt.value ? 'bold' : 'normal'
              }}
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Espacios = () => {
  const navigate = useNavigate();

  const {
    espacios,
    crearEspacio,
    actualizarEspacio,
    toggleArchivoEspacio,
    eliminarEspacio
  } = useEspacios();

  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [viendoArchivados, setViendoArchivados] = useState(false);
  const [mensajeCopiado, setMensajeCopiado] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [modoEdicion, setModoEdicion] = useState(false);

  const [espacioIdActual, setEspacioIdActual] = useState(null);

  const [formulario, setFormulario] = useState({
    nombre: '',
    descripcion: '',
    tipo: 'publicacion',
    archivado: false,
    modulos: {
      kanban: false,
      escritorio: false
    }
  });

  const abrirModalNuevo = () => {
    setModoEdicion(false);

    setEspacioIdActual(null);

    setFormulario({
      nombre: '',
      descripcion: '',
      tipo: 'publicacion',
      archivado: false,
      modulos: {
        kanban: false,
        escritorio: false
      }
    });

    setModalVisible(true);
  };

  const abrirModalEdicion = (e, espacio) => {
    e.stopPropagation();

    setModoEdicion(true);

    setEspacioIdActual(espacio.id);

    setFormulario({
      nombre: espacio.nombre || '',
      descripcion: espacio.descripcion || '',
      tipo: espacio.tipo || 'publicacion',
      archivado: espacio.archivado || false,

      modulos: {
        kanban:
          espacio.modulosActivos?.includes('kanban') || false,

        escritorio:
          espacio.modulosActivos?.includes('escritorio') || false
      }
    });

    setModalVisible(true);
  };


  const handleCrear = async (e) => {
    e.preventDefault();
    // Le pasamos el objeto 'formulario' directamente al hook
    await crearEspacio(formulario);
    setModalVisible(false);
  };

  
  const handleGuardarEspacio = async (e) => {
    e.preventDefault();

    if (modoEdicion) {
      await actualizarEspacio(espacioIdActual, formulario);
    } else {
      await crearEspacio(formulario);
    }

    setModalVisible(false);
  };

  const handleEliminar = async () => {
    if (
      window.confirm(
        '¿Estás seguro de eliminar este entorno?'
      )
    ) {
      await eliminarEspacio(espacioIdActual);
      setModalVisible(false);
    }
  };

  const handleToggleArchivo = async () => {
    await toggleArchivoEspacio(
      espacioIdActual,
      formulario.archivado
    );

    setModalVisible(false);
  };

  const copiarLinkVista = (e, linkUnico) => {
    e.stopPropagation();

    const linkCompleto = `${window.location.origin}/vista/${linkUnico}`;

    navigator.clipboard.writeText(linkCompleto);

    setMensajeCopiado(true);

    setTimeout(() => {
      setMensajeCopiado(false);
    }, 2000);
  };

  const inicialUsuario = auth.currentUser?.displayName
    ? auth.currentUser.displayName.charAt(0).toUpperCase()
    : 'U';

  let espaciosFiltrados = espacios.filter((e) =>
    viendoArchivados ? e.archivado : !e.archivado
  );

  if (filtroTipo !== 'todos') {
    espaciosFiltrados = espaciosFiltrados.filter(
      (e) => e.tipo === filtroTipo
    );
  }

  const opcionesFiltro = [
    { value: 'todos', label: 'Todos los tipos' },
    { value: 'publicacion', label: 'Publicaciones' },
    { value: 'duo', label: 'Dúos' },
    { value: 'grupo', label: 'Grupos' }
  ];

  return (
    <div style={styles.appContainer}>
      <style>{`
        @keyframes popIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .custom-scroll::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scroll::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scroll::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.15);
          border-radius: 10px;
        }
      `}</style>

      {mensajeCopiado && (
        <div style={styles.toast}>
          Link de vista copiado ✓
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <button
            onClick={() => navigate('/panel')}
            style={styles.backBtn}
          >
            Volver
          </button>
        </div>

        <div style={styles.logoArea}>
          <img
            src="/uma-logo.png"
            alt="Logo UMA"
            style={styles.logoImage}
          />

          <span style={styles.headerDivider}>|</span>

          <span style={styles.headerTitle}>
            Entornos
          </span>
        </div>

        <div style={styles.headerRight}>
          <div
            style={styles.profileCircle}
            onClick={() => navigate('/perfil')}
          >
            {inicialUsuario}
          </div>
        </div>
      </header>

      <div style={styles.actionBar}>
        <div style={styles.controlGroup}>
          <span style={styles.label}>Filtro:</span>

          <CustomSelect
            value={filtroTipo}
            onChange={setFiltroTipo}
            options={opcionesFiltro}
            style={{ width: '160px' }}
          />

          <button
            onClick={() =>
              setViendoArchivados(!viendoArchivados)
            }
            style={
              viendoArchivados
                ? styles.btnActive
                : styles.neutralBtn
            }
          >
            {ICONS.archive}

            {viendoArchivados
              ? ' Ocultar Archivados'
              : ' Ver Archivados'}
          </button>
        </div>

        <button
          onClick={abrirModalNuevo}
          style={styles.createBtn}
        >
          {ICONS.plus}
          Nuevo Espacio
        </button>
      </div>

      <main
        className="custom-scroll"
        style={styles.main}
      >
        <div style={styles.grid}>
          {espaciosFiltrados.length === 0 ? (
            <div style={styles.empty}>
              {viendoArchivados
                ? 'No tienes espacios archivados.'
                : 'No se encontraron entornos activos.'}
            </div>
          ) : (
            espaciosFiltrados.map((esp) => {
              let badgeColor = '#FFF';
              let badgeText = '';
              let badgeIcon = null;

              if (esp.tipo === 'publicacion') {
                badgeColor = '#c084fc';
                badgeText = 'Publicación';
                badgeIcon = ICONS.publicacion;
              } else if (esp.tipo === 'duo') {
                badgeColor = '#1AACAC';
                badgeText = 'Dúo';
                badgeIcon = ICONS.dual;
              } else if (esp.tipo === 'grupo') {
                badgeColor = '#fbbf24';
                badgeText = 'Grupo';
                badgeIcon = ICONS.group;
              }

              return (
                <div
                  key={esp.id}
                  style={{
                    ...styles.card,
                    opacity: esp.archivado ? 0.6 : 1
                  }}
                  onClick={() =>
                    navigate(`/espacio/${esp.id}`)
                  }
                >
                  <div style={styles.cardHeader}>
                    <span
                      style={{
                        ...styles.badge,
                        color: badgeColor,
                        borderColor: badgeColor
                      }}
                    >
                      {badgeIcon}
                      {badgeText}
                    </span>

                    <button
                      onClick={(e) =>
                        abrirModalEdicion(e, esp)
                      }
                      style={styles.settingsBtn}
                    >
                      {ICONS.settings}
                    </button>
                  </div>

                  <h3 style={styles.cardTitle}>
                    {esp.nombre}

                    {esp.archivado && (
                      <span
                        style={{
                          fontSize: '12px',
                          color: '#f87171'
                        }}
                      >
                        {' '}
                        (Archivado)
                      </span>
                    )}
                  </h3>

                  <div style={styles.cardFooter}>
                    <span style={styles.membersCount}>
                      {esp.tipo === 'publicacion'
                        ? 'Vista global habilitada'
                        : `${esp.miembros?.length || 1} Miembros`}
                    </span>

                    <button
                      onClick={(e) =>
                        copiarLinkVista(
                          e,
                          esp.linkVista
                        )
                      }
                      style={styles.linkBtn}
                    >
                      {ICONS.link}
                      Link
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {modalVisible && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>
              {modoEdicion
                ? 'Editar entorno'
                : 'Crear nuevo entorno'}
            </h3>

            <form
              onSubmit={handleGuardarEspacio}
              style={styles.modalForm}
            >
              <label style={styles.modalLabel}>
                Nombre del entorno
              </label>

              <input
                autoFocus
                required
                style={styles.input}
                placeholder="Ej: Proyecto Final..."
                value={formulario.nombre}
                onChange={(e) =>
                  setFormulario({
                    ...formulario,
                    nombre: e.target.value
                  })
                }
              />

              <div style={styles.modalActions}>
                {modoEdicion && (
                  <>
                    <button
                      type="button"
                      onClick={handleToggleArchivo}
                      style={styles.btnGhost}
                    >
                      {formulario.archivado
                        ? 'Desarchivar'
                        : 'Archivar'}
                    </button>

                    <button
                      type="button"
                      onClick={handleEliminar}
                      style={styles.btnDanger}
                    >
                      Eliminar
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() =>
                    setModalVisible(false)
                  }
                  style={styles.btnGhost}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  style={styles.btnPrimary}
                >
                  {modoEdicion
                    ? 'Guardar'
                    : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  appContainer: {
    height: '100vh',
    width: '100vw',
    backgroundColor: '#000',
    overflow: 'hidden',
    color: '#FFF',
    fontFamily: "'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column'
  },

  header: {
    height: '72px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 48px',
    borderBottom: '1px solid rgba(255,255,255,0.08)'
  },

  headerLeft: {
    flex: 1
  },

  headerRight: {
    flex: 1,
    display: 'flex',
    justifyContent: 'flex-end'
  },

  logoArea: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '12px'
  },

  logoImage: {
    height: '32px'
  },

  headerDivider: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: '24px'
  },

  headerTitle: {
    fontSize: '26px',
    fontWeight: '800'
  },

  profileCircle: {
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    backgroundColor: '#1AACAC',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    cursor: 'pointer'
  },

  backBtn: {
    background: 'rgba(255,255,255,0.05)',
    color: '#FFF',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer'
  },

  actionBar: {
    padding: '15px 48px',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: '1px solid rgba(255,255,255,0.05)'
  },

  controlGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },

  label: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)'
  },

  neutralBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.05)',
    color: '#FFF',
    border: '1px solid rgba(255,255,255,0.15)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer'
  },

  btnActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255,255,255,0.15)',
    color: '#FFF',
    border: '1px solid #FFF',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer'
  },

  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#FFF',
    color: '#000',
    border: 'none',
    padding: '8px 20px',
    borderRadius: '8px',
    fontWeight: '700',
    cursor: 'pointer'
  },

  customSelectTrigger: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '8px 15px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between'
  },

  customSelectMenu: {
    position: 'absolute',
    top: '105%',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(30,32,50,0.95)',
    borderRadius: '10px',
    overflow: 'hidden'
  },

  customSelectItem: {
    padding: '10px 15px',
    cursor: 'pointer'
  },

  main: {
    padding: '30px 48px',
    overflowY: 'auto'
  },

  grid: {
    display: 'grid',
    gridTemplateColumns:
      'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },

  card: {
    background: 'rgba(20,22,40,0.6)',
    borderRadius: '20px',
    padding: '24px',
    border: '1px solid rgba(255,255,255,0.08)',
    cursor: 'pointer'
  },

  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px'
  },

  badge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '8px',
    border: '1px solid'
  },

  settingsBtn: {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#FFF',
    borderRadius: '6px',
    cursor: 'pointer',
    padding: '6px',
    display: 'flex',
    alignItems: 'center'
  },

  cardTitle: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 20px 0'
  },

  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    paddingTop: '15px'
  },

  membersCount: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.5)'
  },

  linkBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#FFF',
    padding: '6px 12px',
    borderRadius: '8px',
    cursor: 'pointer'
  },

  empty: {
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    padding: '40px 0',
    gridColumn: '1 / -1'
  },

  toast: {
    position: 'fixed',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: '#1AACAC',
    color: '#FFF',
    padding: '12px 24px',
    borderRadius: '30px',
    fontWeight: '700',
    zIndex: 2000
  },

  modalOverlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },

  modalBox: {
    background: 'rgba(20,22,35,0.95)',
    borderRadius: '20px',
    padding: '30px',
    width: '90%',
    maxWidth: '550px'
  },

  modalTitle: {
    marginBottom: '20px',
    fontSize: '22px'
  },

  modalForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },

  modalLabel: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)'
  },

  input: {
    background: 'rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '12px 16px',
    borderRadius: '10px',
    color: '#FFF',
    fontSize: '14px',
    outline: 'none'
  },

  modalActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px'
  },

  btnPrimary: {
    flex: 1,
    background: '#FFF',
    color: '#000',
    border: 'none',
    padding: '12px',
    borderRadius: '10px',
    fontWeight: '700',
    cursor: 'pointer'
  },

  btnGhost: {
    flex: 1,
    background: 'transparent',
    color: '#FFF',
    border: '1px solid rgba(255,255,255,0.2)',
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer'
  },

  btnDanger: {
    flex: 1,
    background: 'rgba(248,113,113,0.1)',
    color: '#f87171',
    border: '1px solid rgba(248,113,113,0.3)',
    padding: '12px',
    borderRadius: '10px',
    cursor: 'pointer'
  }
};

export default Espacios;