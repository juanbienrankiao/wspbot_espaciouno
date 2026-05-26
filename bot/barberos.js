const barberos = [
  { id: 1, nombre: 'Joako', emoji: '💈' },
  { id: 2, nombre: 'Luis',  emoji: '✂️' },
];

const servicios = [
  { id: 1, nombre: 'Corte de pelo clásico',           precio: 7000,  duracion: 30 },
  { id: 2, nombre: 'Degradado',                        precio: 9000,  duracion: 40 },
  { id: 3, nombre: 'Degradado + cejas',                precio: 10000, duracion: 50 },
  { id: 4, nombre: 'Degradado + cejas + barba',        precio: 15000, duracion: 60 },
];

const horario = {
  inicio: 10,
  fin: 19,
  diasSemana: [1, 2, 3, 4, 5, 6], // 0=domingo, 6=sábado
};

module.exports = { barberos, servicios, horario };
