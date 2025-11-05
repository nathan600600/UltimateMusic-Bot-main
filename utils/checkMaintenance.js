const fs = require('fs');
const path = require('path');

const maintenanceFile = path.join(__dirname, '../maintenance.json');

function isMaintenanceEnabled() {
  try {
    if (!fs.existsSync(maintenanceFile)) return false;
    const data = JSON.parse(fs.readFileSync(maintenanceFile, 'utf8'));
    return data.enabled === true;
  } catch {
    return false;
  }
}

async function checkMaintenance(message) {
  // Vérifie le fichier JSON
  const maintenance = isMaintenanceEnabled();
  if (!maintenance) return false; // <-- IMPORTANT : ne bloque pas si désactivé

  // Vérifie si utilisateur est admin (facultatif)
  const admins = (process.env.ADMINS || '').split(',').map(x => x.trim());
  const userId = message.author?.id;
  if (admins.includes(userId)) return false;

  // Envoie le message de maintenance
  const content = '🛠️ Loïc est actuellement en maintenance. Réessaie plus tard !';
  try {
    const recent = await message.channel.messages.fetch({ limit: 8 });
    const duplicate = recent.find(m => m.author.id === message.client.user.id && m.content === content);
    if (!duplicate) await message.reply(content).catch(() => {});
  } catch {
    await message.reply(content).catch(() => {});
  }

  return true; // <-- Seulement maintenant on renvoie true
}

module.exports = { checkMaintenance, isMaintenanceEnabled };
