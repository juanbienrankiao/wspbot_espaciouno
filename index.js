require('dotenv').config();
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode                = require('qrcode-terminal');
const { procesarMensaje, setCliente, getTelefonosBarberos } = require('./bot/flow');
 
console.log('🚀 Iniciando bot de Espacio Uno...');
 
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    executablePath: 'C:\\Users\\antho\\.cache\\puppeteer\\chrome\\win64-148.0.7778.167\\chrome-win64\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  },
});
 
client.on('qr', (qr) => {
  console.log('\n📱 Escanea este QR con tu WhatsApp:');
  qrcode.generate(qr, { small: true });
});
 
client.on('ready', () => {
  setCliente(client);
  console.log('\n✅ Bot conectado y listo!\n');
});
 
client.on('disconnected', (reason) => {
  console.log('❌ Bot desconectado:', reason);
});
 
client.on('message', async (msg) => {
  if (msg.isGroupMsg || msg.from === 'status@broadcast') return;
  if (msg.fromMe) return;
 
  const phone = msg.from;
 
  // Ignorar mensajes que vengan de los números de los barberos
  const telefonosBarberos = getTelefonosBarberos();
  if (Object.values(telefonosBarberos).includes(phone)) {
    console.log(`⏭ Mensaje ignorado de barbero [${phone}]`);
    return;
  }
 
  const texto = msg.body;
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
 