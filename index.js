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

// ─── الإعدادات ────────────────────────────────────────────────────────────────
const TIKTOK_USERNAME = 'i2kq';
const CHANNEL_ID = '1487857865929527378';
const CHECK_INTERVAL = 60_000; // فحص كل دقيقة

let isLive = false;
let notificationSent = false;
let tiktokConnection = null;

// ─── دالة مراقبة التيك توك ────────────────────────────────────────────────────
async function startMonitoring() {
  console.log(`🔍 جاري مراقبة حساب @${TIKTOK_USERNAME} على تيك توك...`);

  async function checkLive() {
    try {
      if (tiktokConnection) {
        tiktokConnection.disconnect();
        tiktokConnection = null;
      }

      tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME);

      tiktokConnection.connect()
        .then(state => {
          if (!isLive && !notificationSent) {
            isLive = true;
            notificationSent = true;
            console.log(`🔴 @${TIKTOK_USERNAME} فاك بث!`);
            sendLiveNotification(state);
          } else if (!isLive) {
            isLive = true;
          }
        })
        .catch(() => {
          if (isLive) {
            isLive = false;
            notificationSent = false; // reset عشان البث الجديد
            console.log(`⚫ @${TIKTOK_USERNAME} أنهى البث`);
          }
        });

    } catch (err) {
      console.error('خطأ في الفحص:', err.message);
    }
  }

  // فحص فوري عند التشغيل
  await checkLive();

  // فحص كل دقيقة
  setInterval(checkLive, CHECK_INTERVAL);
}

// ─── إرسال إشعار البث ────────────────────────────────────────────────────────
async function sendLiveNotification(state) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel) return console.error('❌ ما لقيت الروم!');

    await channel.send(
      `@everyone 🔴 **${TIKTOK_USERNAME}** فاك بث على تيك توك الحين!\n` +
      `🎥 شوف البث: https://www.tiktok.com/@${TIKTOK_USERNAME}/live`
    );

    console.log('✅ تم إرسال إشعار البث!');
  } catch (err) {
    console.error('خطأ في إرسال الإشعار:', err.message);
  }
}

// ─── أوامر الديسكورد ──────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith('!')) return;

  const isAdmin = message.member?.permissions.has('Administrator');
  if (!isAdmin) return;

  const command = message.content.slice(1).trim().toLowerCase();

  // !livestatus — حالة البث الحالية
  if (command === 'livestatus') {
    message.reply(
      isLive
        ? `🔴 @${TIKTOK_USERNAME} شغال بث الحين!`
        : `⚫ @${TIKTOK_USERNAME} مو ببث حالياً`
    );
  }

  // !testnotify — تجربة الإشعار (للأدمن فقط)
  if (command === 'testnotify') {
    await sendLiveNotification({});
    message.reply('✅ تم إرسال إشعار تجريبي!');
  }
});

// ─── تشغيل البوت ─────────────────────────────────────────────────────────────
client.once('ready', async () => {
  console.log(`✅ البوت شغال كـ ${client.user.tag}`);
  client.user.setActivity(`@${TIKTOK_USERNAME} على تيك توك`, { type: 3 });
  await startMonitoring();
});

// HTTP Server عشان Railway/Render
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('OK');
}).listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`🌐 HTTP Server شغال على port ${process.env.PORT || 3000}`);
});

client.login(process.env.DISCORD_TOKEN);
