// src/pages/Login.jsx
import { useState, useEffect } from 'react';
// 1. Importamos useNavigate para cambiar de página automáticamente tras el login
import { Link, useNavigate } from 'react-router-dom';
// 2. Importamos las herramientas de Firebase desde nuestro archivo de configuración
import { auth, googleProvider } from '../firebase';
// 3. Importamos las funciones específicas de autenticación de Firebase
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup 
} from 'firebase/auth';

const Login = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [bgImage, setBgImage] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [country, setCountry] = useState('PE'); 
  
  // Estado para mostrar mensajes de error si la contraseña está mal, el correo ya existe, etc.
  const [errorMensaje, setErrorMensaje] = useState('');

  // Herramienta para navegar (cambiar de ruta)
  const navigate = useNavigate();

  useEffect(() => {
    const fondos = ['/fondo-login-1.png', '/fondo-login-2.png', '/fondo-login-3.png'];
    const indiceAleatorio = Math.floor(Math.random() * fondos.length);
    setBgImage(fondos[indiceAleatorio]);
  }, []);

  // 4. Nueva función: Manejar el envío del formulario (Registro o Ingreso normal)
  const handleSubmit = async (e) => {
    e.preventDefault(); // Evita que la página recargue
    setErrorMensaje(''); // Limpiamos errores anteriores

    try {
      if (isRegistering) {
        // --- Lógica de REGISTRO ---
        // Firebase toma el correo y la contraseña y crea el usuario
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        console.log("¡Usuario registrado con éxito!", userCredential.user);
        
        // (En un futuro paso, guardaremos el Nombre, Fecha de Nacimiento y País en la Base de Datos)
        
        // Si todo sale bien, lo mandamos al panel principal (que crearemos luego)
        navigate('/panel'); 
      } else {
        // --- Lógica de INGRESO NORMAL ---
        // Firebase verifica que las credenciales sean correctas
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("¡Sesión iniciada con éxito!", userCredential.user);
        
        // Lo mandamos al panel principal
        navigate('/panel');
      }
    } catch (error) {
      // Si hay un error (ej. contraseña incorrecta), lo mostramos en pantalla
      console.error("Error en la autenticación:", error.message);
      
      // Traducimos los errores más comunes para que el usuario entienda
      if (error.code === 'auth/email-already-in-use') {
        setErrorMensaje('Este correo ya está registrado.');
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
        setErrorMensaje('Correo o contraseña incorrectos.');
      } else if (error.code === 'auth/weak-password') {
        setErrorMensaje('La contraseña debe tener al menos 6 caracteres.');
      } else {
        setErrorMensaje('Ocurrió un error. Inténtalo de nuevo.');
      }
    }
  };

  // 5. Nueva función: Manejar el ingreso con Google
  const handleGoogleLogin = async () => {
    setErrorMensaje('');
    try {
      // Abre la ventana emergente de Google
      const result = await signInWithPopup(auth, googleProvider);
      console.log("¡Usuario conectado con Google!", result.user);
      
      // Lo mandamos al panel principal
      navigate('/panel');
    } catch (error) {
      console.error("Error al iniciar con Google:", error.message);
      setErrorMensaje('No se pudo iniciar sesión con Google.');
    }
  };

  return (
    <div style={{ ...styles.container, backgroundImage: `url(${bgImage})` }}>
      <div style={styles.card}>
        
        <div style={styles.header}>
          <img src="/uma-logo.png" alt="Logo UMA" style={styles.logoImage} />
          <h2 style={styles.title}>{isRegistering ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
        </div>

        {/* 6. Caja para mostrar errores (solo aparece si hay un error) */}
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

          <button type="submit" style={styles.submitBtn}>
            {isRegistering ? 'Registrarse en UMA' : 'Entrar a UMA'}
          </button>
        </form>

        <div style={styles.divider}>
          <span style={styles.dividerLine}></span>
          <span style={styles.dividerText}>o</span>
          <span style={styles.dividerLine}></span>
        </div>

        {/* Cambiamos el onClick para que llame a nuestra nueva función de Google */}
        <button type="button" style={styles.googleBtn} onClick={handleGoogleLogin}>
          <img src="/google.png" alt="Google" style={styles.googleIcon} />
        </button>

        <div style={styles.toggleText}>
          {isRegistering ? '¿Ya tienes una cuenta?' : '¿No tienes cuenta?'}
          <span 
            style={styles.toggleLink} 
            onClick={() => {
              setIsRegistering(!isRegistering);
              setErrorMensaje(''); // Limpiamos errores al cambiar de vista
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

// Estilos
const styles = {
  container: {
    height: '100vh', 
    width: '100vw',  
    overflow: 'hidden', 
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundColor: 'var(--color-bg)', 
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    padding: '20px 30px', 
    borderRadius: '15px',
    boxShadow: '0 15px 30px rgba(0,0,0,0.3)',
    width: '100%',
    maxWidth: '360px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  header: {
    textAlign: 'center',
    marginBottom: '10px', 
  },
  logoImage: {
    height: '65px', 
    marginBottom: '5px',
  },
  title: {
    color: 'var(--color-primary)',
    fontSize: '18px', 
    margin: 0,
  },
  // Nuevo estilo para la cajita de errores
  errorBox: {
    backgroundColor: '#ffebee', // Rojo muy clarito
    color: '#c62828', // Rojo oscuro para el texto
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
    marginBottom: '10px',
    textAlign: 'center',
    border: '1px solid #ffcdd2',
  },
  form: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px', 
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
  },
  input: {
    padding: '8px 12px', 
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  submitBtn: {
    backgroundColor: 'var(--color-primary)',
    color: 'var(--color-white)',
    border: 'none',
    padding: '10px', 
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '5px',
    transition: 'background-color 0.3s',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    margin: '10px 0', 
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#ddd',
  },
  dividerText: {
    padding: '0 10px',
    color: '#888',
    fontSize: '12px',
  },
  googleBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'var(--color-white)',
    color: '#444',
    border: '1px solid #ccc',
    padding: '6px', 
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.3s',
  },
  googleIcon: {
    height: '24px', 
    width: 'auto',  
    objectFit: 'contain', 
  },
  toggleText: {
    marginTop: '15px', 
    fontSize: '13px',
    color: '#666',
  },
  toggleLink: {
    color: 'var(--color-secondary)',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '10px', 
  },
  backLink: {
    color: '#999',
    textDecoration: 'none',
    fontSize: '12px',
  }
};

export default Login;