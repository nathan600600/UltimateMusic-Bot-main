const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Active ou désactive le mode maintenance du bot')
    .addBooleanOption(option =>
      option
        .setName('etat')
        .setDescription('true = active la maintenance, false = désactive')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const state = interaction.options.getBoolean('etat');
    const maintenancePath = path.join(__dirname, '../../maintenance.json');
    let maintenanceData = { enabled: false };

    try {
      // Lecture actuelle du JSON
      if (fs.existsSync(maintenancePath)) {
        maintenanceData = JSON.parse(fs.readFileSync(maintenancePath, 'utf8'));
      }

      // Mise à jour de l’état
      maintenanceData.enabled = state;
      fs.writeFileSync(maintenancePath, JSON.stringify(maintenanceData, null, 2));

      // Met à jour le statut du bot immédiatement
      if (state) {
        client.user.setPresence({
          activities: [{ name: '🛠️ En maintenance', type: 0 }],
          status: 'idle'
        });
      } else {
        client.user.setPresence({
          activities: [{ name: '✅ En ligne', type: 0 }],
          status: 'online'
        });
      }

      // Message de confirmation
      const embed = new EmbedBuilder()
        .setColor(state ? '#FFA500' : '#00FF00')
        .setTitle(state ? '🛠️ Maintenance activée' : '✅ Maintenance désactivée')
        .setDescription(
          state
            ? 'Le bot est maintenant en **mode maintenance**.\nSeuls les administrateurs peuvent utiliser les commandes.'
            : 'Le bot est **revenu en ligne** pour tout le monde.'
        )
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      console.log(
        `⚙️ Mode maintenance ${state ? 'activé' : 'désactivé'} par ${interaction.user.tag}`
      );
    } catch (err) {
      console.error('❌ Erreur lors du changement de maintenance :', err);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la modification du mode maintenance.',
        ephemeral: true
      });
    }
  }
};
