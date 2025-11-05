// ...existing code...
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');

let checkMaintenance = null;
try {
  // Import conditionnel pour ne pas planter si le fichier a été supprimé
  checkMaintenance = require('../../utils/maintenance').checkMaintenance;
} catch (e) {
  checkMaintenance = null;
}

const COMMAND_SECURITY_TOKEN = shiva?.SECURITY_TOKEN;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Envoie anonymement une confession dans le salon dédié.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Ta confession')
        .setRequired(true)
    ),

  // Signature Shiva (si présente)
  securityToken: COMMAND_SECURITY_TOKEN,

  async execute(interaction) {
    // Vérification du core Shiva
    if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
      const embed = new EmbedBuilder()
        .setDescription('❌ Système principal hors ligne - Commande indisponible')
        .setColor('#FF0000');
      return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }

    // Marquage pour Shiva
    interaction.shivaValidated = true;
    interaction.securityToken = COMMAND_SECURITY_TOKEN;

    // Vérification du mode maintenance si l'utilitaire existe
    if (typeof checkMaintenance === 'function') {
      if (await checkMaintenance(interaction)) return;
    }

    const confession = interaction.options.getString('message');

    const confessionChannelId = '1383902057156579408'; // Remplace par l'ID du salon des confessions
    const channel = interaction.client.channels.cache.get(confessionChannelId);

    if (!channel) {
      return interaction.reply({ content: '❌ Le salon de confession est introuvable.', ephemeral: true });
    }

    // Confirmation éphémère pour l’utilisateur
    await interaction.reply({
      content: '✅ Ta confession a été envoyée anonymement.',
      ephemeral: true,
    }).catch(() => {});

    try {
      // Envoie du message
      const sentMessage = await channel.send({
        embeds: [{
          title: '📨 Nouvelle confession anonyme',
          description: confession,
          color: 0x2f3136,
        }],
      });

      // Création du fil (thread) sur ce message
      await sentMessage.startThread({
        name: `📨 Nouvelle confession anonyme`,
        autoArchiveDuration: 1440,
        reason: 'Discussion sur une confession anonyme',
      });

    } catch (error) {
      console.error(error);
      await interaction.followUp({
        content: '⚠️ Une erreur est survenue lors de l’envoi de la confession.',
        ephemeral: true,
      }).catch(() => {});
    }
  },
};
