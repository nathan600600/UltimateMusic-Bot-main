const fs = require('fs');
const path = require('path');

const maintenanceFile = path.join(__dirname, '../maintenance.json');

// Fonction pour lire l’état du mode maintenance
function isMaintenanceMode() {
    try {
        if (!fs.existsSync(maintenanceFile)) return false;
        const data = JSON.parse(fs.readFileSync(maintenanceFile, 'utf8'));
        return data.enabled === true;
    } catch (err) {
        console.error('❌ Erreur lecture maintenance.json :', err);
        return false;
    }
}

// Fonction pour bloquer l’exécution si maintenance
async function checkMaintenance(interactionOrMessage) {
    const inMaintenance = isMaintenanceMode();
    if (!inMaintenance) return false; // autorisé

    // Vérifie si c’est un admin (facultatif)
    const adminIds = (process.env.ADMINS || '').split(',').map(x => x.trim());
    const userId = interactionOrMessage.user?.id || interactionOrMessage.author?.id;
    const isAdmin = adminIds.includes(userId);

    if (isAdmin) return false; // les admins peuvent passer

    const content = '🛠️ Le bot est actuellement en maintenance. Réessaie plus tard !';

    if (interactionOrMessage.isRepliable?.()) {
        await interactionOrMessage.reply({ content, ephemeral: true }).catch(() => {});
    } else if (interactionOrMessage.reply) {
        await interactionOrMessage.reply(content).catch(() => {});
    }

    return true; // bloqué
}

// Fonction pour activer ou désactiver la maintenance (optionnel)
function setMaintenance(state) {
    fs.writeFileSync(maintenanceFile, JSON.stringify({ enabled: !!state }, null, 2));
}

module.exports = { checkMaintenance, isMaintenanceMode, setMaintenance };
