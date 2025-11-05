const fs = require('fs');
const path = require('path');

const maintenanceFile = path.join(__dirname, '../maintenance.json');

function isMaintenanceMode() {
    try {
        if (!fs.existsSync(maintenanceFile)) return false;
        const data = JSON.parse(fs.readFileSync(maintenanceFile, 'utf8'));
        return data.enabled === true;
    } catch {
        return false;
    }
}

// ✅ Version fixée du checkMaintenance
async function checkMaintenance(interactionOrMessage) {
    const maintenance = isMaintenanceMode();
    if (!maintenance) return false; // Ne rien faire si maintenance désactivée

    const admins = (process.env.ADMINS || '').split(',').map(x => x.trim());
    const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
    const isAdmin = admins.includes(userId);

    if (isAdmin) return false; // les admins passent quand même

    const msg = '🛠️ Le bot est actuellement en maintenance. Réessaie plus tard !';

    if (interactionOrMessage.isRepliable?.()) {
        await interactionOrMessage.reply({ content: msg, ephemeral: true }).catch(() => {});
    } else if (interactionOrMessage.reply) {
        await interactionOrMessage.reply(msg).catch(() => {});
    }

    return true; // Seulement maintenant on renvoie true
}

module.exports = { checkMaintenance, isMaintenanceMode };
