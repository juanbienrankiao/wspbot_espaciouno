
require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const { procesarMensaje, setCliente, getTelefonosBarberos } = require('./bot/flow');
 
console.log('🚀 Iniciando bot de Espacio Uno...');
 
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  },
});
 
const mensajesProcesados = new Set();
let horaDeConexion = null;
 
client.on('qr', (qr) => {
  console.log('\n📱 Escanea este QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});
 
client.on('ready', () => {
  setCliente(client);
  horaDeConexion = Math.floor(Date.now() / 1000);
  console.log('\n✅ Bot conectado y listo!\n');
});
 
client.on('disconnected', (reason) => {
  console.log('❌ Bot desconectado:', reason);
});
 
client.on('message', async (msg) => {
  if (msg.isGroupMsg || msg.from === 'status@broadcast') return;
  if (msg.fromMe) return;
 
  const texto = msg.body?.trim();
  if (!texto) return;
 
  if (horaDeConexion && msg.timestamp < horaDeConexion) return;
 
  if (mensajesProcesados.has(msg.id._serialized)) return;
  mensajesProcesados.add(msg.id._serialized);
  if (mensajesProcesados.size > 1000) mensajesProcesados.clear();
 
  const phone = msg.from;
 
  const telefonosBarberos = getTelefonosBarberos();
  if (Object.values(telefonosBarberos).includes(phone)) return;
 
  console.log(`📩 [${phone}]: ${texto}`);
 
  try {
    const respuesta = await procesarMensaje(phone, texto, msg);
    if (respuesta) {
      await msg.reply(respuesta);
      console.log(`📤 Respondido a [${phone}]`);
    }
  } catch (err) {
    console.error('Error procesando mensaje:', err);
    await msg.reply('⚠️ Hubo un error, intenta nuevamente escribiendo *menu*.');
  }
});
 
client.initialize();
