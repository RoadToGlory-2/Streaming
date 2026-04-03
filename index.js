require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const { WebcastPushConnection } = require('tiktok-live-connector');
const http = require('http');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const TIKTOK_USERNAME = 'i2kq';
const CHANNEL_ID = '1487857865929527378';

let isLive = false;
let isConnecting = false;

// ─── إرسال إشعار البث ────────────────────────────────────────────────────────
async function sendLiveNotification() {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return;
    await channel.send(
      `@everyone 🔴 **${TIKTOK_USERNAME}** فاك بث على تيك توك الحين!\n` +
      `🎥 شوف البث: https://www.tiktok.com/@${TIKTOK_USERNAME}/live`
    );
    console.log('✅ تم إرسال إشعار البث!');
  } catch (err) {
    console.error('خطأ في إرسال الإشعار:', err.message);
  }
}

// ─── مراقبة التيك توك ─────────────────────────────────────────────────────────
function startMonitoring() {
  if (isConnecting) return;
  isConnecting = true;

  const connection = new WebcastPushConnection(TIKTOK_USERNAME);

  connection.connect()
    .then(() => {
      isConnecting = false;
      if (!isLive) {
        isLive = true;
        console.log(`🔴 @${TIKTOK_USERNAME} فاك بث!`);
        sendLiveNotification();
      }
    })
    .catch(() => {
      isConnecting = false;
      isLive = false;
      setTimeout(startMonitoring, 120_000);
    });

  connection.on('streamEnd', () => {
    console.log(`⚫ @${TIKTOK_USERNAME} أنهى البث`);
    isLive = false;
    isConnecting = false;
    setTimeout(startMonitoring, 120_000);
  });

  connection.on('disconnected', () => {
    isLive = false;
    isConnecting = false;
    setTimeout(startMonitoring, 120_000);
  });
}

// ─── أوامر الديسكورد (للأدمن فقط) ───────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;
  if (!message.member?.permissions.has('Administrator')) return;

  const command = message.content.slice(1).trim().toLowerCase();

  if (command === 'livestatus') {
    message.reply(isLive
      ? `🔴 @${TIKTOK_USERNAME} شغال بث الحين!`
      : `⚫ @${TIKTOK_USERNAME} مو ببث حالياً`
    );
  }

  if (command === 'testnotify') {
    await sendLiveNotification();
    message.reply('✅ تم إرسال إشعار تجريبي!');
  }
});

// ─── تشغيل البوت ─────────────────────────────────────────────────────────────
client.once('clientReady', () => {
  console.log(`✅ البوت شغال كـ ${client.user.tag}`);
  client.user.setActivity(`@${TIKTOK_USERNAME} على تيك توك`, { type: 3 });
  startMonitoring();
});

// HTTP Server
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(process.env.PORT || 3000, '0.0.0.0');

client.login(process.env.DISCORD_TOKEN);
