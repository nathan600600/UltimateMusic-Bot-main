const fs = require('fs');
const { SlashCommandBuilder } = require('discord.js');
const shiva = require('../../shiva'); // Ajoute cette ligne si besoin

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN; // Ajoute cette ligne si besoin

module.exports = {
  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Fait répéter un message par le bot.')
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Le message à répéter')
        .setRequired(true)
    ),
  securityToken: COMMAND_SECURITY_TOKEN, // ← Ajoute cette ligne

  async execute(interaction) {

    const message = interaction.options.getString('message', true);

    // Confirmation éphémère (visible seulement par l’utilisateur)
    await interaction.reply({ content: '✅ Message envoyé.', ephemeral: true });

    // Le bot envoie le message dans le salon
    await interaction.channel.send(message);
  },
};

