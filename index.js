require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const https = require('https');
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
const CHECK_INTERVAL = 3 * 60 * 1000; // فحص كل 3 دقائق

let isLive = false;

// ─── فحص حالة البث عبر صفحة التيك توك ───────────────────────────────────────
function checkIfLive() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'www.tiktok.com',
      path: `/@${TIKTOK_USERNAME}/live`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // إذا الصفحة تحتوي على "LIVE" أو "liveRoomInfo" يعني شغال بث
        const live = data.includes('"statusCode":0') || 
                     data.includes('liveRoomInfo') ||
                     data.includes('"status":2');
        resolve(live);
      });
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

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

// ─── حلقة المراقبة ───────────────────────────────────────────────────────────
async function monitor() {
  try {
    const liveNow = await checkIfLive();

    if (liveNow && !isLive) {
      // بدأ البث
      isLive = true;
      console.log(`🔴 @${TIKTOK_USERNAME} فاك بث!`);
      await sendLiveNotification();
    } else if (!liveNow && isLive) {
      // انتهى البث
      isLive = false;
      console.log(`⚫ @${TIKTOK_USERNAME} أنهى البث`);
    } else {
      console.log(`🔍 فحص... البث: ${isLive ? 'شغال' : 'أوفلاين'}`);
    }
  } catch (err) {
    console.error('خطأ في المراقبة:', err.message);
  }
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

  // فحص فوري ثم كل 3 دقائق
  monitor();
  setInterval(monitor, CHECK_INTERVAL);
});

// HTTP Server
http.createServer((req, res) => {
  res.writeHead(200);
  res.end('OK');
}).listen(process.env.PORT || 3000, '0.0.0.0');

client.login(process.env.DISCORD_TOKEN);
