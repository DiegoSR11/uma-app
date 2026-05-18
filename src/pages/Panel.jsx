// src/pages/Panel.jsx
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const Panel = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error al cerrar sesión:", error.message);
    }
  };

  const irAModuloTareas = () => {
    navigate('/tareas');
  };

  return (
    <div style={styles.container}>
      
      {/* Cabecera */}
      <header style={styles.header}>
        <div>
          <img src="/uma-logo.png" alt="UMA App" style={styles.headerLogo} />
        </div>
        <div style={styles.userSection}>
          <div style={styles.profileIcon} title="Ver datos del usuario">U</div>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Cerrar Sesión
          </button>
        </div>
      </header>

      {/* Menú Principal */}
      <main style={styles.mainContent}>
        <h2>Selecciona un Módulo</h2>
        
        <div style={styles.modulosGrid}>
          {/* Único Tarjeta activa: Módulo de Tareas */}
          <div style={styles.moduloCard} onClick={irAModuloTareas}>
            <div style={styles.moduloIcono}>📝</div>
            <h3 style={styles.moduloTitulo}>Módulo de Tareas</h3>
            <p style={styles.moduloDesc}>Gestiona tus actividades pendientes y en proceso.</p>
          </div>
        </div>
      </main>
    </div>
  );
};

// Estilos
const styles = {
  container: { minHeight: '100vh', backgroundColor: 'var(--color-bg)', display: 'flex', flexDirection: 'column' },
  header: { backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', padding: '10px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
  headerLogo: { height: '35px', display: 'block' },
  userSection: { display: 'flex', alignItems: 'center', gap: '15px' },
  profileIcon: { width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-tertiary)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '18px', cursor: 'pointer', color: 'var(--color-white)' },
  logoutBtn: { backgroundColor: 'transparent', color: 'var(--color-white)', border: '1px solid var(--color-white)', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  mainContent: { padding: '50px', textAlign: 'center' },
  modulosGrid: { display: 'flex', justifyContent: 'center', marginTop: '40px' },
  moduloCard: { backgroundColor: 'var(--color-white)', width: '250px', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 20px rgba(0,0,0,0.1)', cursor: 'pointer', transition: 'transform 0.3s, box-shadow 0.3s', borderTop: '5px solid var(--color-secondary)' },
  moduloIcono: { fontSize: '50px', marginBottom: '15px' },
  moduloTitulo: { color: 'var(--color-primary)', margin: '0 0 10px 0' },
  moduloDesc: { color: '#666', fontSize: '14px' }
};

export default Panel;