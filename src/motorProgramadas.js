// src/motorProgramadas.js
import { collection, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from './firebase';

export const verificarYGenerarTareas = async () => {
  console.log("🤖 Motor iniciado: Verificando tareas programadas...");

  try {
    // 1. Obtenemos todas las tareas programadas y las normales (para saber el número de ID)
    const programadasSnap = await getDocs(collection(db, 'tareas_programadas'));
    const tareasNormalesSnap = await getDocs(collection(db, 'tareas'));
    let cantidadTareasActuales = tareasNormalesSnap.size;

    const hoy = new Date(); // Fecha y hora en este exacto momento

    // 2. Revisamos cada tarea programada una por una
    for (const documento of programadasSnap.docs) {
      const tareaProg = { idBaseDatos: documento.id, ...documento.data() };
      
      // Separar la hora elegida (ej. "08:30" -> horas: 8, minutos: 30)
      const [horaStr, minStr] = tareaProg.hora.split(':');
      const horaProgramadaHoy = new Date(
        hoy.getFullYear(), 
        hoy.getMonth(), 
        hoy.getDate(), 
        parseInt(horaStr), 
        parseInt(minStr)
      );

      // Si la hora actual es MAYOR o IGUAL a la hora programada, evaluamos si toca generarla
      if (hoy >= horaProgramadaHoy) {
        
        // Revisamos cuándo fue la última vez que este robot generó esta tarea
        const ultimaGen = tareaProg.ultimaGeneracion ? tareaProg.ultimaGeneracion.toDate() : null;
        let necesitaGenerar = false;

        // Si nunca se ha generado en la vida, la generamos
        if (!ultimaGen) {
          necesitaGenerar = true;
        } else {
          // Lógica de Periodicidad
          if (tareaProg.periodicidad === 'Diario') {
            // Genera si la última generación NO fue el día de hoy
            if (ultimaGen.getDate() !== hoy.getDate() || ultimaGen.getMonth() !== hoy.getMonth()) {
              necesitaGenerar = true;
            }
          } else if (tareaProg.periodicidad === 'Semanal') {
            // Calcula si han pasado 7 o más días
            const diferenciaDias = (hoy - ultimaGen) / (1000 * 60 * 60 * 24);
            if (diferenciaDias >= 7) necesitaGenerar = true;
          } else if (tareaProg.periodicidad === 'Mensual') {
            // Genera si estamos en un mes distinto
            if (ultimaGen.getMonth() !== hoy.getMonth() || ultimaGen.getFullYear() !== hoy.getFullYear()) {
              necesitaGenerar = true;
            }
          } else if (tareaProg.periodicidad === 'Anual') {
            // Genera si estamos en un año distinto
            if (ultimaGen.getFullYear() !== hoy.getFullYear()) {
              necesitaGenerar = true;
            }
          }
        }

        // 3. Si pasó las pruebas, CREAMOS LA TAREA NORMAL
        if (necesitaGenerar) {
          console.log(`✨ Generando nueva tarea a partir de: ${tareaProg.texto}`);
          
          cantidadTareasActuales++;
          const numeroId = String(cantidadTareasActuales).padStart(8, '0');
          const idVisualG = `#G${numeroId}`;

          // Guardamos en la colección de tareas normales
          await addDoc(collection(db, 'tareas'), {
            idVisual: idVisualG,
            texto: tareaProg.texto,
            descripcion: tareaProg.descripcion || '',
            estado: 'Abierto', // Siempre nace como abierta
            etiqueta: tareaProg.etiqueta,
            subtareas: tareaProg.subtareas || [],
            color: '#FFFF00', // Las tareas abiertas normales son amarillas según tu diseño
            fechaCreacion: new Date()
          });

          // 4. Actualizamos la tarea programada para decirle "Ya te generé hoy, no me molestes más por ahora"
          const tareaProgRef = doc(db, 'tareas_programadas', tareaProg.idBaseDatos);
          await updateDoc(tareaProgRef, {
            ultimaGeneracion: new Date()
          });
        }
      }
    }
    console.log("🤖 Motor finalizado: Verificación completa.");

  } catch (error) {
    console.error("Error en el motor automático:", error);
  }
};