const fs = require('fs');
const path = require('path');
const configPath = path.join(__dirname, '../config.json');

function checkMaintenance(interaction) {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  
  if (config.maintenance === true) {
    interaction.reply({
      content: '🛠️ Le bot est en maintenance. Réessaie plus tard.',
      ephemeral: true
    });
    return true;
  }

  return false;
}

module.exports = checkMaintenance;