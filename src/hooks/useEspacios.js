// src/hooks/useEspacios.js
import { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc, serverTimestamp, deleteDoc } from 'firebase/firestore';

export const useEspacios = () => {
  const [espacios, setEspacios] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(collection(db, 'espacios'), where('miembros', 'array-contains', user.uid));
    
    const unsub = onSnapshot(q, (snapshot) => {
      setEspacios(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      setCargando(false);
    });

    return () => unsub();
  }, []);

const crearEspacio = async (formulario) => {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    await addDoc(collection(db, 'espacios'), {
      nombre: formulario.nombre, // Sacamos el nombre del objeto
      descripcion: formulario.descripcion || '', // Sacamos la descripción
      tipo: formulario.tipo || 'publicacion', // Sacamos el tipo
      creador: user.uid,
      miembros: [user.uid],
      modulosActivos: [], // Se configuran luego adentro del entorno
      archivado: false,
      linkVista: crypto.randomUUID(),
      fechaCreacion: serverTimestamp()
    });
  };

  const actualizarEspacio = async (id, formulario) => {
    const modulosActivos = Object.keys(formulario.modulos).filter(k => formulario.modulos[k]);
    
    await updateDoc(doc(db, 'espacios', id), {
      nombre: formulario.nombre,
      tipo: formulario.tipo,
      modulosActivos: modulosActivos
    });
  };

const toggleArchivoEspacio = async (id, estadoActual) => {
    await updateDoc(doc(db, 'espacios', id), { archivado: !estadoActual });
  };

  const eliminarEspacio = async (id) => {
    await deleteDoc(doc(db, 'espacios', id));
  };

  return { espacios, cargando, crearEspacio, actualizarEspacio, toggleArchivoEspacio, eliminarEspacio };
};