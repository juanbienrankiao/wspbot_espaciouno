const { barberos, servicios, horario } = require('./barberos');
const { agregarCita, horasOcupadas, citasDeCliente, cancelarCita } = require('./agenda');
 
const sesiones = {};
 
// Números de WhatsApp de los barberos (sin + y con @c.us)
const telefonosBarberos = {
  'Luis':  '56991872433@c.us',
  'Joako': '56939328016@c.us',
};
 
let clienteWhatsapp = null;
 
function setCliente(c) { clienteWhatsapp = c; }
 
function getSesion(phone) {
  if (!sesiones[phone]) sesiones[phone] = { paso: 'bienvenida' };
  return sesiones[phone];
}
 
function resetSesion(phone) {
  sesiones[phone] = { paso: 'menu' };
}
 
function proximosDias() {
  const dias = [];
  const hoy = new Date();
  let d = new Date(hoy);
  d.setDate(d.getDate() + 1);
  while (dias.length < 6) {
    if (horario.diasSemana.includes(d.getDay())) {
      const yyyy = d.getFullYear();
      const mm   = String(d.getMonth() + 1).padStart(2, '0');
      const dd   = String(d.getDate()).padStart(2, '0');
      const nombres = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
      dias.push({ fecha: `${yyyy}-${mm}-${dd}`, label: `${nombres[d.getDay()]} ${dd}/${mm}` });
    }
    d.setDate(d.getDate() + 1);
  }
  return dias;
}
 
function horasDisponibles(barberoId, fecha) {
  const ocupadas = horasOcupadas(barberoId, fecha);
  const horas = [];
  for (let h = horario.inicio; h < horario.fin; h++) {
    for (let m of ['00', '30']) {
      const hora = `${String(h).padStart(2,'0')}:${m}`;
      if (!ocupadas.includes(hora)) horas.push(hora);
    }
  }
  return horas;
}
 
function formatPeso(n) {
  return '$' + n.toLocaleString('es-CL');
}
 
async function notificarBarbero(barberoNombre, mensaje) {
  const tel = telefonosBarberos[barberoNombre];
  if (!tel || !clienteWhatsapp) return;
  try {
    await clienteWhatsapp.sendMessage(tel, mensaje);
    console.log(`🔔 Notificación enviada a ${barberoNombre}`);
  } catch (e) {
    console.error(`Error notificando a ${barberoNombre}:`, e.message);
  }
}
 
async function procesarMensaje(phone, texto, msg) {
  const sesion = getSesion(phone);
  const txt = texto.trim();
  const txtLower = txt.toLowerCase();
 
  // Cancelar cita activa
  if (txtLower === 'cancelar cita' && !['bienvenida'].includes(sesion.paso)) {
    const citas = citasDeCliente(phone);
    if (!citas.length) return '📭 No tienes citas agendadas para cancelar.';
    sesion.paso = 'cancelar_elegir';
    sesion.citasParaCancelar = citas;
    return '🗑 *¿Cuál cita quieres cancelar?*\n\n' + citas.map((c, i) =>
      `*${i+1}.* ${c.fecha} a las ${c.hora}\n   👤 ${c.barberoNombre} · ✂️ ${c.servicioNombre}`
    ).join('\n\n') + '\n\nEscribe el número o *menu* para volver.';
  }
 
  // Comandos globales
  if (['cancelar', 'salir', 'menu', 'inicio'].includes(txtLower) && !['bienvenida'].includes(sesion.paso)) {
    resetSesion(phone);
    return menuPrincipal();
  }
 
  switch (sesion.paso) {
 
    // ── BIENVENIDA (primera vez) ──────────────────────────────────────────────
 
    case 'bienvenida': {
      sesion.paso = 'menu';
      return (
        `✂️ *¡Bienvenido a Espacio Uno!* 💈\n\n` +
        `Lunes a Sábado · 10:00 - 19:00\n` +
        `📍 Calle Comercio 1710, Coihueco, Ñuble\n` +
        `📸 Instagram: *@espacio.unoo*\n\n` +
        menuPrincipal()
      );
    }
 
    // ── CANCELAR CITA ─────────────────────────────────────────────────────────
 
    case 'cancelar_elegir': {
      const idx = parseInt(txtLower) - 1;
      if (isNaN(idx) || !sesion.citasParaCancelar[idx]) {
        return '❌ Número no válido. Escribe el número de la cita o *menu* para volver.';
      }
      sesion.citaACancelar = sesion.citasParaCancelar[idx];
      sesion.paso = 'cancelar_pedir_nombre';
      const c = sesion.citaACancelar;
      return `⚠️ Vas a cancelar:\n\n📅 ${c.fecha} a las ${c.hora}\n👤 ${c.barberoNombre}\n✂️ ${c.servicioNombre}\n\n¿A nombre de quién está la cita?`;
    }
 
    case 'cancelar_pedir_nombre': {
      if (!txt || txt.length < 2) return '👤 Por favor escribe el nombre del cliente.';
      sesion.nombreCancelacion = txt.replace(/\b\w/g, l => l.toUpperCase());
      sesion.paso = 'cancelar_pedir_telefono';
      return `¿Y el teléfono de contacto? _(ej: 912345678)_`;
    }
 
    case 'cancelar_pedir_telefono': {
      const numLimpio = txt.replace(/[\s\-().+]/g, '');
      if (!/^\d{7,12}$/.test(numLimpio)) {
        return '📱 Por favor escribe un número válido.\nEjemplo: *912345678*';
      }
      sesion.telefonoCancelacion = numLimpio.startsWith('56') ? '+' + numLimpio : '+56' + numLimpio;
      sesion.paso = 'cancelar_confirmar';
      const c = sesion.citaACancelar;
      return (
        `⚠️ ¿Confirmas cancelar esta cita?\n\n` +
        `📅 ${c.fecha} a las ${c.hora}\n` +
        `👤 ${c.barberoNombre}\n` +
        `✂️ ${c.servicioNombre}\n` +
        `🙋 ${sesion.nombreCancelacion} · 📱 ${sesion.telefonoCancelacion}\n\n` +
        `*1* · Sí, cancelar\n*2* · No, volver`
      );
    }
 
    case 'cancelar_confirmar': {
      if (txtLower === '1' || txtLower === 'si' || txtLower === 'sí') {
        const c = sesion.citaACancelar;
        cancelarCita(phone, c.fecha, c.hora);
        const nombre = sesion.nombreCancelacion;
        const tel    = sesion.telefonoCancelacion;
        resetSesion(phone);
        await notificarBarbero(c.barberoNombre,
          `❌ *Cita cancelada*\n\n` +
          `📅 ${c.fecha} a las ${c.hora}\n` +
          `✂️ ${c.servicioNombre}\n` +
          `👤 Cliente: ${nombre}\n` +
          `📱 Teléfono: ${tel}`
        );
        return `✅ Cita cancelada correctamente.\n\nEscribe *menu* si necesitas algo más.`;
      }
      resetSesion(phone);
      return '👍 Cancelación descartada.\n\n' + menuPrincipal();
    }
 
    // ── MENÚ PRINCIPAL ────────────────────────────────────────────────────────
 
    case 'menu': {
      if (txtLower === '1' || txtLower.includes('reservar')) {
        sesion.paso = 'elegir_servicio';
        return menuServicios();
      }
      if (txtLower === '2' || txtLower.includes('cita')) {
        const citas = citasDeCliente(phone);
        if (!citas.length) return '📭 No tienes citas agendadas.\n\nEscribe *1* para reservar o *menu* para volver.';
        return '📋 *Tus próximas citas:*\n\n' + citas.map((c, i) =>
          `*${i+1}.* ${c.fecha} a las ${c.hora}\n   👤 ${c.barberoNombre}\n   ✂️ ${c.servicioNombre}\n   💰 ${formatPeso(c.precio)}`
        ).join('\n\n') + '\n\nEscribe *cancelar cita* para cancelar una cita o *menu* para volver.';
      }
      if (txtLower === '3' || txtLower.includes('direcci')) {
        await msg.reply('📍 *Espacio Uno*\nCalle Comercio 1710, Coihueco, Ñuble\nLunes a Sábado · 10:00 - 19:00\n📸 Instagram: @espacio.unoo\n\nEscribe *menu* para volver.');
        await msg.reply(new (require('whatsapp-web.js').Location)(-36.6298639, -71.8310783, 'Espacio Uno\nCalle Comercio 1710, Coihueco, Ñuble'));
        return null;
      }
      return menuPrincipal();
    }
 
    // ── FLUJO DE RESERVA ──────────────────────────────────────────────────────
 
    case 'elegir_servicio': {
      const idx = parseInt(txtLower) - 1;
      if (isNaN(idx) || !servicios[idx]) return menuServicios('❌ Opción no válida. Elige un número del 1 al ' + servicios.length);
      sesion.servicio = servicios[idx];
      sesion.paso = 'elegir_barbero';
      return menuBarberos();
    }
 
    case 'elegir_barbero': {
      const idx = parseInt(txtLower) - 1;
      if (isNaN(idx) || !barberos[idx]) return menuBarberos('❌ Opción no válida.');
      sesion.barbero = barberos[idx];
      sesion.paso = 'elegir_dia';
      sesion.dias = proximosDias();
      return menuDias(sesion.dias);
    }
 
    case 'elegir_dia': {
      const idx = parseInt(txtLower) - 1;
      if (isNaN(idx) || !sesion.dias[idx]) return menuDias(sesion.dias, '❌ Elige un número del 1 al ' + sesion.dias.length);
      sesion.diaSeleccionado = sesion.dias[idx];
      const horas = horasDisponibles(sesion.barbero.id, sesion.diaSeleccionado.fecha);
      if (!horas.length) {
        return `😔 No hay horas disponibles con ${sesion.barbero.nombre} ese día.\n\nElige otro día:\n\n` + menuDias(sesion.dias);
      }
      sesion.horas = horas;
      sesion.paso = 'elegir_hora';
      return menuHoras(horas, sesion.diaSeleccionado);
    }
 
    case 'elegir_hora': {
      const idx = parseInt(txtLower) - 1;
      if (isNaN(idx) || !sesion.horas[idx]) return menuHoras(sesion.horas, sesion.diaSeleccionado, '❌ Elige un número válido.');
      sesion.hora = sesion.horas[idx];
      // Pedir nombre del cliente antes de confirmar
      sesion.paso = 'reserva_pedir_nombre';
      return `¿A nombre de quién es la cita?`;
    }
 
    case 'reserva_pedir_nombre': {
      if (!txt || txt.length < 2) return '👤 Por favor escribe el nombre del cliente.';
      sesion.nombre = txt.replace(/\b\w/g, l => l.toUpperCase());
      sesion.paso = 'reserva_pedir_telefono';
      return `¿Y el teléfono de contacto? _(ej: 912345678)_`;
    }
 
    case 'reserva_pedir_telefono': {
      const numLimpio = txt.replace(/[\s\-().+]/g, '');
      if (!/^\d{7,12}$/.test(numLimpio)) {
        return '📱 Por favor escribe un número válido.\nEjemplo: *912345678*';
      }
      sesion.telefono = numLimpio.startsWith('56') ? '+' + numLimpio : '+56' + numLimpio;
      sesion.paso = 'confirmar';
      return resumen(sesion);
    }
 
    case 'confirmar': {
      if (txtLower === '1' || txtLower.includes('confirm') || txtLower === 'si' || txtLower === 'sí') {
        agregarCita({
          phone,
          fecha:          sesion.diaSeleccionado.fecha,
          hora:           sesion.hora,
          barberoId:      sesion.barbero.id,
          barberoNombre:  sesion.barbero.nombre,
          servicioId:     sesion.servicio.id,
          servicioNombre: sesion.servicio.nombre,
          precio:         sesion.servicio.precio,
          creadoEn:       new Date().toISOString(),
        });
        const confirmacion =
          `✅ *¡Cita reservada!*\n\n` +
          `📋 ${sesion.servicio.nombre}\n` +
          `👤 ${sesion.barbero.emoji} ${sesion.barbero.nombre}\n` +
          `📅 ${sesion.diaSeleccionado.label} a las ${sesion.hora}\n` +
          `💰 ${formatPeso(sesion.servicio.precio)}\n\n` +
          `Te esperamos en Espacio Uno 💈\n` +
          `Escribe *menu* si necesitas algo más.`;
 
        await notificarBarbero(sesion.barbero.nombre,
          `💈 *Nueva cita agendada*\n\n` +
          `📋 ${sesion.servicio.nombre}\n` +
          `📅 ${sesion.diaSeleccionado.label} a las ${sesion.hora}\n` +
          `💰 ${formatPeso(sesion.servicio.precio)}\n` +
          `👤 Cliente: ${sesion.nombre}\n` +
          `📱 Teléfono: ${sesion.telefono}`
        );
 
        resetSesion(phone);
        return confirmacion;
      }
      if (txtLower === '2' || txtLower.includes('cancel')) {
        resetSesion(phone);
        return '❌ Reserva cancelada.\n\n' + menuPrincipal();
      }
      return resumen(sesion, '⚠️ Responde *1* para confirmar o *2* para cancelar.');
    }
 
    default:
      resetSesion(phone);
      return menuPrincipal();
  }
}
 
function menuPrincipal() {
  return (
    `✂️ *Espacio Uno*\n` +
    `Lunes a Sábado · 10:00 - 19:00\n\n` +
    `¿En qué te ayudo?\n\n` +
    `*1* · 📅 Reservar una cita\n` +
    `*2* · 🗓 Ver mis citas\n` +
    `*3* · 📍 Dirección y horario\n\n` +
    `_Escribe *cancelar cita* para cancelar una reserva_`
  );
}
 
function menuServicios(error = '') {
  const lista = servicios.map((s, i) =>
    `*${i+1}* · ${s.nombre} — ${formatPeso(s.precio)}`
  ).join('\n');
  return (error ? error + '\n\n' : '') +
    `✂️ *Elige tu servicio:*\n\n${lista}`;
}
 
function menuBarberos(error = '') {
  const lista = barberos.map((b, i) =>
    `*${i+1}* · ${b.emoji} ${b.nombre}`
  ).join('\n');
  return (error ? error + '\n\n' : '') +
    `👤 *Elige tu barbero:*\n\n${lista}`;
}
 
function menuDias(dias, error = '') {
  const lista = dias.map((d, i) => `*${i+1}* · ${d.label}`).join('\n');
  return (error ? error + '\n\n' : '') +
    `📅 *Elige el día:*\n\n${lista}`;
}
 
function menuHoras(horas, dia, error = '') {
  const cols = [];
  for (let i = 0; i < horas.length; i += 4) {
    cols.push(horas.slice(i, i+4).map((h, j) => `*${i+j+1}* ${h}`).join('   '));
  }
  return (error ? error + '\n\n' : '') +
    `🕐 *Horas disponibles — ${dia.label}:*\n\n${cols.join('\n')}`;
}
 
function resumen(sesion, error = '') {
  return (error ? error + '\n\n' : '') +
    `📋 *Resumen de tu cita:*\n\n` +
    `✂️ ${sesion.servicio.nombre}\n` +
    `👤 ${sesion.barbero.emoji} ${sesion.barbero.nombre}\n` +
    `📅 ${sesion.diaSeleccionado.label} · ${sesion.hora}\n` +
    `💰 ${formatPeso(sesion.servicio.precio)}\n` +
    `🙋 ${sesion.nombre} · 📱 ${sesion.telefono}\n\n` +
    `*1* · ✅ Confirmar\n` +
    `*2* · ❌ Cancelar`;
}
 
function getTelefonosBarberos() { return telefonosBarberos; }
 
module.exports = { procesarMensaje, setCliente, getTelefonosBarberos };
 