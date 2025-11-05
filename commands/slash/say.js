const fs = require('fs');
const { SlashCommandBuilder } = require('discord.js');
const shiva = require('../../shiva'); // Ajoute cette ligne si besoin

let checkMaintenance = null;
try {
  checkMaintenance = require('../../utils/maintenance').checkMaintenance;
} catch (e) {
  checkMaintenance = null;
}

const COMMAND_SECURITY_TOKEN = shiva?.SECURITY_TOKEN; // Ajoute cette ligne si besoin

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

    // Vérification Shiva (si utilisée ailleurs) et maintenance
    if (shiva && shiva.validateCore && !shiva.validateCore()) {
      // Si core est présent mais invalide, prévenir
      return interaction.reply({ content: '❌ Système principal hors ligne - Commande indisponible', ephemeral: true }).catch(() => {});
    }

    interaction.shivaValidated = true;
    interaction.securityToken = COMMAND_SECURITY_TOKEN;

    // Vérification du mode maintenance si l'utilitaire existe
    if (typeof checkMaintenance === 'function') {
      if (await checkMaintenance(interaction)) return;
    }

    const message = interaction.options.getString('message', true);

    // Confirmation éphémère (visible seulement par l’utilisateur)
    await interaction.reply({ content: '✅ Message envoyé.', ephemeral: true });

    // Le bot envoie le message dans le salon
    await interaction.channel.send(message);
  },
};

