const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('confession')
    .setDescription('Envoie anonymement une confession dans le salon dédié.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Ta confession')
        .setRequired(true)
    ),

  async execute(interaction) {
    
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
    });

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
        name: `📨 Nouvelle confession anonyme`, // Nom du fil
        autoArchiveDuration: 1440, // 24h (peut être 60, 1440, 4320, 10080)
        reason: 'Discussion sur une confession anonyme',
      });

    } catch (error) {
      console.error(error);
      await interaction.followUp({
        content: '⚠️ Une erreur est survenue lors de l’envoi de la confession.',
        ephemeral: true,
      });
    }
  },
};

