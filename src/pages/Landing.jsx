// src/pages/Landing.jsx
// 1. Importamos 'useState' de React para darle "memoria" a nuestro componente
import { useState } from 'react';
import { Link } from 'react-router-dom';

const Landing = () => {
  // 2. Creamos nuestras variables de estado (memoria)
  const [isHovered, setIsHovered] = useState(false);
  const [isClicked, setIsClicked] = useState(false);

  // 3. Creamos un estilo dinámico para el logo gigante.
  const logoGiganteStyle = {
    ...styles.heroLogoAdorno, 
    cursor: 'pointer', 
    transition: 'transform 0.2s ease-in-out', 
    transform: isClicked ? 'scale(0.95)' : isHovered ? 'scale(1.05)' : 'scale(1)',
    border: '6px solid var(--color-white)', 
    borderRadius: '65px', 
    backgroundColor: 'var(--color-white)', 
  };

  return (
    <div style={styles.container}>
      
      {/* Encabezado / Navegación */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <img src="/uma-logo-fondo.png" alt="Logo UMA" style={styles.logoImage} />
        </div>
        <nav>
          <Link to="/login" style={styles.loginBtn}>Iniciar Sesión</Link>
        </nav>
      </header>

      {/* Sección Principal (Hero) */}
      <section style={styles.hero}>
        <div style={styles.heroText}>
          <h1 style={styles.title}>Domina tu tiempo,<br/>libera tu mente.</h1>
          
          {/* ---> CAMBIO AQUI: Nueva descripción principal más completa <--- */}
          <p style={styles.subtitle}>
            UMA es tu espacio personal inteligente. Registra tareas simples y cotidianas, 
            programa recordatorios, visualiza tu organización o colabora en entornos compartidos. 
            Todo diseñado para facilitar desde tu día a día hasta proyectos de larga duración, 
            sin estrés.
          </p>
          
          <Link to="/login" style={styles.ctaBtn}>Empezar a organizar gratis</Link>
        </div>
        <div style={styles.heroVisual}>
          
          {/* Aplicamos los eventos a nuestra imagen PNG */}
          <img 
            src="/uma-logo-fondo.png" 
            alt="UMA App" 
            style={logoGiganteStyle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseDown={() => setIsClicked(true)}
            onMouseUp={() => setIsClicked(false)}
            onTouchEnd={() => setIsClicked(false)}
          />

        </div>
      </section>

      {/* Sección "Sobre el Creador" */}
      <section style={styles.aboutSection}>
        <div style={styles.aboutCard}>
          <div style={styles.photoContainer}>
            <img src="/foto-diego.jpeg" alt="Diego Sapaico Ramirez" style={styles.photo} />
          </div>
          <div style={styles.aboutInfo}>
            <h2 style={styles.aboutHeading}>Conoce al Creador</h2>
            <h3 style={styles.name}>Diego Sapaico Ramirez</h3>
            <p style={styles.degree}>Bachiller en Ingeniería de Sistemas de Información</p>
            
            {/* ---> CAMBIO AQUI: Nueva descripción del creador adaptada <--- */}
            <p style={styles.description}>
              "Desarrollé UMA con un propósito claro: crear una herramienta definitiva y muy versátil. 
              Ya sea para anotar recordatorios rápidos, organizar tu rutina diaria o gestionar 
              proyectos complejos en equipo, quiero ayudarte a mantener el enfoque, la organización visual 
              y la paz mental para que el día a día no te abrume."
            </p>
            
            <a 
              href="https://www.linkedin.com/in/diego-alberto-sapaico-ramirez-191082244/" 
              target="_blank" 
              rel="noopener noreferrer" 
              style={styles.linkedinBtn}
            >
              Conectar en LinkedIn
            </a>
          </div>
        </div>
      </section>

      {/* Pie de página */}
      <footer style={styles.footer}>
        <p>© 2026 UMA App. Diseñado y desarrollado por Diego Sapaico Ramirez.</p>
      </footer>

    </div>
  );
};

// Estilos (Se mantienen exactamente igual a tu versión anterior)
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: 'var(--color-bg)', 
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '15px 50px',
    backgroundColor: 'var(--color-white)',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
    zIndex: 10,
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  logoImage: {
    height: '40px', 
  },
  loginBtn: {
    color: 'var(--color-primary)', 
    fontWeight: 'bold',
    border: '2px solid var(--color-primary)',
    padding: '8px 24px',
    borderRadius: '25px',
    transition: 'all 0.3s',
    textDecoration: 'none',
  },
  hero: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '80px 50px',
    backgroundColor: 'var(--color-primary)', 
    color: 'var(--color-white)',
    flexWrap: 'wrap',
  },
  heroText: {
    flex: 1,
    minWidth: '300px',
    paddingRight: '40px',
  },
  title: {
    fontSize: '52px',
    lineHeight: '1.1',
    marginBottom: '20px',
  },
  subtitle: {
    fontSize: '20px',
    color: '#D0D0FF', 
    marginBottom: '40px',
    maxWidth: '500px',
    lineHeight: '1.5',
  },
  ctaBtn: {
    backgroundColor: 'var(--color-secondary)', 
    color: 'var(--color-white)',
    padding: '16px 40px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '30px',
    boxShadow: '0 6px 15px rgba(26, 172, 172, 0.4)', 
    textDecoration: 'none',
    display: 'inline-block',
  },
  heroVisual: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: '300px',
    marginTop: '20px',
  },
  heroLogoAdorno: {
    width: '100%',
    maxWidth: '400px',
    borderRadius: '20px',
    boxShadow: '0 20px 40px rgba(0,0,0,0.3)', 
  },
  aboutSection: {
    padding: '80px 20px',
    display: 'flex',
    justifyContent: 'center',
  },
  aboutCard: {
    display: 'flex',
    backgroundColor: 'var(--color-white)',
    borderRadius: '20px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    maxWidth: '900px',
    width: '100%',
    flexWrap: 'wrap',
  },
  photoContainer: {
    flex: '1',
    minWidth: '300px',
    backgroundColor: 'var(--color-tertiary)', 
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photo: {
    width: '100%',
    height: '100%',
    objectFit: 'cover', 
    minHeight: '300px',
  },
  aboutInfo: {
    flex: '2',
    padding: '40px',
    minWidth: '300px',
  },
  aboutHeading: {
    color: 'var(--color-secondary)', 
    fontSize: '16px',
    textTransform: 'uppercase',
    letterSpacing: '2px',
    marginBottom: '10px',
  },
  name: {
    color: 'var(--color-primary)', 
    fontSize: '32px',
    marginBottom: '5px',
  },
  degree: {
    color: '#666',
    fontWeight: 'bold',
    marginBottom: '20px',
  },
  description: {
    color: '#444',
    fontSize: '16px',
    lineHeight: '1.6',
    fontStyle: 'italic',
    marginBottom: '30px',
  },
  linkedinBtn: {
    backgroundColor: '#0A66C2', 
    color: 'var(--color-white)',
    padding: '12px 24px',
    borderRadius: '8px',
    fontWeight: 'bold',
    textDecoration: 'none',
    display: 'inline-block',
  },
  footer: {
    backgroundColor: '#222',
    color: '#888',
    textAlign: 'center',
    padding: '20px',
    fontSize: '14px',
    marginTop: 'auto', 
  }
};

export default Landing;