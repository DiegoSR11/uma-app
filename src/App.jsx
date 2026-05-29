// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Panel from './pages/Panel';
import Tareas from './pages/Tareas'; 
import Notas from './pages/Notas';
import Amigos from './pages/Amigos';
import Perfil from './pages/Perfil';
import Espacios from './pages/Espacios';
import Entorno from './pages/Entorno';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/tareas" element={<Tareas />} />
        <Route path="/notas" element={<Notas />} />
        <Route path="/amigos" element={<Amigos />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/espacios" element={<Espacios />} />
        <Route path="/espacio/:id" element={<Entorno />} />
        {/* Estas páginas jalarán el id de la URL para filtrar tareas/notas automáticamente de ese espacio */}
        <Route path="/espacio/:id/kanban" element={<Tareas />} />
        <Route path="/espacio/:id/escritorio" element={<Notas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;