// src/pages/Perfil.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';

const Perfil = () => {
  const navigate = useNavigate();
  const [bgImage, setBgImage] = useState('');
  const [usuario, setUsuario] = useState(null);
  
  // Estados para la edición del nombre
  const [nombreEdit, setNombreEdit] = useState('');
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    // Mismo sistema de fondos dinámicos del Panel
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    setBgImage(fondos[Math.floor(Math.random() * fondos.length)]);
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUsuario(user);
        // Por defecto, mostramos el displayName, o la primera parte del correo si no hay nombre
        setNombreEdit(user.displayName || user.email.split('@')[0]);
      } else {
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const guardarNombre = async () => {
    if (!nombreEdit.trim() || !usuario) return;
    setGuardando(true);
    try {
      // Actualizamos el perfil interno de Firebase Auth
      await updateProfile(usuario, { displayName: nombreEdit });
      setEditando(false);
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
    }
    setGuardando(false);
  };

  if (!usuario) return null; // Evita parpadeos mientras carga

  const inicial = nombreEdit.charAt(0).toUpperCase();

  return (
    <div style={{ ...styles.appContainer, backgroundImage: `url(${bgImage})` }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-fade { animation: fadeUp 0.4s ease both; }
        
        /* Responsividad para móviles */
        @media (max-width: 600px) {
          .perfil-card { width: 100% !important; padding: 30px 20px !important; border-radius: 20px !important; }
          .header-perfil { padding: 0 24px !important; }
          .main-perfil { padding: 20px !important; }
        }
      `}</style>

      {/* Fondo con blur */}
      <div style={styles.blurOverlay} />

      {/* Header Minimalista */}
      <header className="anim-fade header-perfil" style={styles.header}>
        <button onClick={() => navigate('/panel')} style={styles.backBtn}>
          ← Volver al Panel
        </button>
        <div style={styles.logoArea}>
          <div style={styles.logoDot} />
          <span style={styles.logoText}>UMA</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="main-perfil" style={styles.main}>
        <div className="anim-fade perfil-card" style={styles.card}>
          
          {/* Avatar Grande */}
          <div style={styles.avatarContainer}>
            <div style={styles.avatar}>{inicial}</div>
            <div style={styles.onlineBadge}></div>
          </div>

          <h2 style={styles.cardTitle}>Mi Identidad</h2>

          {/* Campo: Correo (Solo lectura) */}
          <div style={styles.infoGroup}>
            <label style={styles.label}>CORREO ELECTRÓNICO</label>
            <div style={styles.readOnlyField}>{usuario.email}</div>
          </div>

          {/* Campo: Nombre (Editable) */}
          <div style={styles.infoGroup}>
            <label style={styles.label}>NOMBRE DE USUARIO</label>
            {editando ? (
              <input
                type="text"
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                style={styles.input}
                placeholder="Escribe tu nombre..."
                autoFocus
              />
            ) : (
              <div style={styles.readOnlyField}>
                {usuario.displayName || usuario.email.split('@')[0]}
              </div>
            )}
          </div>

          {/* Botones de Acción */}
          <div style={styles.actions}>
            {editando ? (
              <>
                <button onClick={() => setEditando(false)} style={styles.cancelBtn}>
                  Cancelar
                </button>
                <button onClick={guardarNombre} disabled={guardando} style={styles.saveBtn}>
                  {guardando ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </>
            ) : (
              <button onClick={() => setEditando(true)} style={styles.editBtn}>
                Editar Nombre
              </button>
            )}
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
  appContainer: { minHeight: '100vh', width: '100%', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflowY: 'auto', color: '#FFF', fontFamily: "'Inter', sans-serif" },
  blurOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(10, 11, 30, 0.65)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', zIndex: 0 },
  
  // Header
  header: { height: '72px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 48px', position: 'relative', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.06)' },
  backBtn: { background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.15)', padding: '7px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' },
  logoArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoDot: { width: '10px', height: '10px', borderRadius: '50%', background: '#1AACAC' },
  logoText: { fontSize: '18px', fontWeight: '800', letterSpacing: '-0.3px' },

  // Main & Card
  main: { position: 'relative', zIndex: 1, padding: '60px 20px', display: 'flex', justifyContent: 'center' },
  card: { width: '400px', background: 'rgba(255,255,255,0.05)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.07)', padding: '40px', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  
  // Avatar
  avatarContainer: { position: 'relative', marginBottom: '20px' },
  avatar: { width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(26,172,172,0.15)', border: '2px solid rgba(26,172,172,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '32px', color: '#1AACAC' },
  onlineBadge: { width: '16px', height: '16px', borderRadius: '50%', background: '#22c55e', border: '3px solid #141527', position: 'absolute', bottom: '2px', right: '2px' },
  
  cardTitle: { fontSize: '24px', fontWeight: '800', margin: '0 0 30px 0', letterSpacing: '-0.5px' },

  // Formularios
  infoGroup: { width: '100%', marginBottom: '20px' },
  label: { display: 'block', fontSize: '10px', fontWeight: '800', opacity: 0.4, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' },
  readOnlyField: { width: '100%', padding: '12px 16px', background: 'rgba(0,0,0,0.2)', borderRadius: '12px', fontSize: '15px', fontWeight: '500', color: 'rgba(255,255,255,0.7)', border: '1px solid rgba(255,255,255,0.05)', boxSizing: 'border-box' },
  input: { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '15px', fontWeight: '600', color: '#FFF', border: '1px solid #1AACAC', outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s' },

  // Botones
  actions: { width: '100%', display: 'flex', gap: '10px', marginTop: '10px' },
  editBtn: { width: '100%', padding: '12px', background: 'rgba(26,172,172,0.15)', color: '#1AACAC', border: '1px solid rgba(26,172,172,0.4)', borderRadius: '12px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' },
  cancelBtn: { flex: 1, padding: '12px', background: 'transparent', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '12px', fontWeight: '600', cursor: 'pointer' },
  saveBtn: { flex: 1, padding: '12px', background: '#1AACAC', color: '#FFF', border: 'none', borderRadius: '12px', fontWeight: '700', cursor: 'pointer' },
};

export default Perfil;