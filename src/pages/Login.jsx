// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// Asegúrate de importar 'db' desde tu firebase.js
import { auth, googleProvider, db } from '../firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup,
  updateProfile // Importante para guardar el nombre en Auth
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore'; // Importante para guardar en la Base de Datos

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [bgImage, setBgImage] = useState('');
  const [isLoading, setIsLoading] = useState(false); // Nuevo estado de carga

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('PE'); 
  
  const [errorMensaje, setErrorMensaje] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    const indiceAleatorio = Math.floor(Math.random() * fondos.length);
    setBgImage(fondos[indiceAleatorio]);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMensaje('');
    setIsLoading(true);

    try {
      if (isRegistering) {
        // --- LÓGICA DE REGISTRO ---
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // 1. Actualizamos el nombre en Firebase Auth
        await updateProfile(user, { displayName: name });

        // 2. Guardamos al usuario en la BD (VITAL para el buscador de amigos)
        await setDoc(doc(db, "usuarios", user.uid), {
          uid: user.uid,
          email: user.email.toLowerCase(),
          displayName: name,
          birthDate: birthDate,
          country: country,
          fechaRegistro: new Date().toISOString()
        });
        
        navigate('/panel'); 
      } else {
        // --- LÓGICA DE INGRESO NORMAL ---
        await signInWithEmailAndPassword(auth, email, password);
        navigate('/panel');
      }
    } catch (error) {
      console.error("Error en la autenticación:", error.message);
      if (error.code === 'auth/email-already-in-use') {
        setErrorMensaje('Este correo ya está registrado.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setErrorMensaje('Correo o contraseña incorrectos.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMensaje('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setErrorMensaje('Ocurrió un error. Inténtalo de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMensaje('');
    setIsLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      // Asegurarnos de que el usuario de Google también exista en nuestra colección 'usuarios'
      // Usamos { merge: true } para que, si ya existe, no borre sus datos anteriores (como fecha de nacimiento)
      await setDoc(doc(db, "usuarios", user.uid), {
        uid: user.uid,
        email: user.email.toLowerCase(),
        displayName: user.displayName || user.email.split('@')[0],
      }, { merge: true });
      
      navigate('/panel');
    } catch (error) {
      console.error("Error al iniciar con Google:", error.message);
      setErrorMensaje('No se pudo iniciar sesión con Google.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.card}>
        
        <div style={styles.header}>
          <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
          <h2 style={styles.title}>{isRegistering ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
        </div>

        {errorMensaje && (
          <div style={styles.errorBox}>
            {errorMensaje}
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegistering && (
            <>
              <div style={styles.row}>
                <input 
                  type="text" 
                  placeholder="Tu Nombre" 
                  style={{ ...styles.input, width: '55%' }}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <input 
                  type="date" 
                  style={{ ...styles.input, width: '40%' }}
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  required
                  title="Fecha de Nacimiento"
                />
              </div>
              <select 
                style={styles.input}
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                <option value="PE">🇵🇪 Perú</option>
                <option value="CO">🇨🇴 Colombia</option>
                <option value="MX">🇲🇽 México</option>
                <option value="AR">🇦🇷 Argentina</option>
                <option value="CL">🇨🇱 Chile</option>
              </select>
            </>
          )}

          <input 
            type="email" 
            placeholder="tu@correo.com" 
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input 
            type="password" 
            placeholder="Contraseña" 
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" style={{ ...styles.submitBtn, opacity: isLoading ? 0.7 : 1 }} disabled={isLoading}>
            {isLoading ? 'Cargando...' : (isRegistering ? 'Registrarse en UMA' : 'Entrar a UMA')}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>o</span>
          <span style={styles.dividerLine}></span>
        </div>

        <button type="button" style={{ ...styles.googleBtn, opacity: isLoading ? 0.7 : 1 }} onClick={handleGoogleLogin} disabled={isLoading}>
          <img src="/google.png" alt="Google" style={styles.googleIcon} />
        </button>

        <div style={styles.toggleText}>
          {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
          <span 
            style={styles.toggleLink} 
            onClick={() => {
              if(!isLoading){
                setIsRegistering(!isRegistering);
                setErrorMensaje('');
              }
            }}
          >
            {isRegistering ? ' Inicia Sesión' : ' Regístrate aquí'}
          </span>
        </div>

        <div style={styles.footer}>
          <Link to="/" style={styles.backLink}>← Volver al inicio</Link>
        </div>

      </div>
    </div>
  );
};

// ==========================================
// ESTILOS (Tus estilos exactos)
// ==========================================
const styles = {
  container: { height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: 'var(--color-bg)' },
  card: { backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '20px 30px', borderRadius: '15px', boxShadow: '0 15px 30px rgba(0,0,0,0.3)', width: '100%', maxWidth: '360px', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  header: { textAlign: 'center', marginBottom: '10px' },
  logoImage: { height: '65px', marginBottom: '5px' },
  title: { color: 'var(--color-primary)', fontSize: '18px', margin: 0 },
  errorBox: { backgroundColor: '#ffebee', color: '#c62828', padding: '8px 12px', borderRadius: '6px', fontSize: '13px', width: '100%', boxSizing: 'border-box', marginBottom: '10px', textAlign: 'center', border: '1px solid #ffcdd2' },
  form: { width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' },
  row: { display: 'flex', justifyContent: 'space-between', width: '100%' },
  input: { padding: '8px 12px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' },
  submitBtn: { backgroundColor: 'var(--color-primary)', color: 'var(--color-white)', border: 'none', padding: '10px', borderRadius: '6px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', transition: 'background-color 0.3s' },
  divider: { display: 'flex', alignItems: 'center', width: '100%', margin: '10px 0' },
  dividerLine: { flex: 1, height: '1px', backgroundColor: '#ddd' },
  dividerText: { padding: '0 10px', color: '#888', fontSize: '12px' },
  googleBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', backgroundColor: 'var(--color-white)', color: '#444', border: '1px solid #ccc', padding: '6px', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.3s' },
  googleIcon: { height: '24px', width: 'auto', objectFit: 'contain' },
  toggleText: { marginTop: '15px', fontSize: '13px', color: '#666' },
  toggleLink: { color: 'var(--color-secondary)', fontWeight: 'bold', cursor: 'pointer' },
  footer: { marginTop: '10px' },
  backLink: { color: '#999', textDecoration: 'none', fontSize: '12px' }
};

export default Login;