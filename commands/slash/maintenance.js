const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const shiva = require('../../shiva'); // intégré à Shiva

// 🧿 Token de sécurité partagé avec le core Shiva
const COMMAND_SECURITY_TOKEN = shiva?.SECURITY_TOKEN;

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

  // ✅ Signature Shiva (nécessaire pour passer la vérification)
  securityToken: COMMAND_SECURITY_TOKEN,

  async execute(interaction, client) {
    // === 🔒 Vérification du système Shiva ===
    if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
      const embed = new EmbedBuilder()
        .setDescription('❌ Système principal hors ligne - Commande indisponible')
        .setColor('#FF0000');
      return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }

    // ✅ Marquage de validation pour Shiva
    interaction.shivaValidated = true;
    interaction.securityToken = COMMAND_SECURITY_TOKEN;

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
      }).catch(() => {});
    }
  }
};