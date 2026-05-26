const fs   = require('fs');
const path = require('path');

const ARCHIVO = path.join(__dirname, '..', 'citas.json');

function cargarCitas() {
  if (!fs.existsSync(ARCHIVO)) return [];
  return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
}

function guardarCitas(citas) {
  fs.writeFileSync(ARCHIVO, JSON.stringify(citas, null, 2));
}

function agregarCita(cita) {
  const citas = cargarCitas();
  citas.push(cita);
  guardarCitas(citas);
}

function citasDelBarbero(barberoId, fecha) {
  return cargarCitas().filter(
    c => c.barberoId === barberoId && c.fecha === fecha
  );
}

function horasOcupadas(barberoId, fecha) {
  return citasDelBarbero(barberoId, fecha).map(c => c.hora);
}

function cancelarCita(phone, fecha, hora) {
  const citas = cargarCitas().filter(
    c => !(c.phone === phone && c.fecha === fecha && c.hora === hora)
  );
  guardarCitas(citas);
}

function citasDeCliente(phone) {
  const hoy = new Date();
  return cargarCitas().filter(c => {
    const fechaCita = new Date(c.fecha + 'T' + c.hora);
    return c.phone === phone && fechaCita >= hoy;
  });
}

module.exports = { agregarCita, horasOcupadas, citasDeCliente, cancelarCita };
