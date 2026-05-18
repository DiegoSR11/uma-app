// src/App.jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Panel from './pages/Panel';
import Tareas from './pages/Tareas'; 

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/panel" element={<Panel />} />
        <Route path="/tareas" element={<Tareas />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;