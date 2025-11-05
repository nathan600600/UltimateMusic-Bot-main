// ...existing code...
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const crypto = require('crypto');
const shiva = require('../../shiva');

let checkMaintenance = null;
try {
  checkMaintenance = require('../../utils/maintenance').checkMaintenance;
} catch (e) {
  checkMaintenance = null;
}

const COMMAND_SECURITY_TOKEN = shiva?.SECURITY_TOKEN;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('couple')
    .setDescription('Affiche le pourcentage de compatibilité entre deux personnes.')
    .addUserOption(option =>
      option.setName('personne1')
        .setDescription('Première personne')
        .setRequired(true))
    .addUserOption(option =>
      option.setName('personne2')
        .setDescription('Deuxième personne')
        .setRequired(true)),

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

    const user1 = interaction.options.getUser('personne1');
    const user2 = interaction.options.getUser('personne2');
    const author = interaction.user;

    // ✅ IDs spéciaux (à modifier avec tes vrais IDs)
    const authorID = '934810515916603472'; // Toi
    const amoureuxID = '811600559991423016'; // ID de la personne spéciale

    // 💥 Empêche de se shipper avec soi-même
    if (user1.id === user2.id) {
      return interaction.reply({
        content: "Tu ne peux pas te shipper avec toi-même ! 😅",
        ephemeral: true,
      });
    }

    let pourcentage;

    // 💖 Cas spécial : auteur + personne spécifique = 100 %
    const coupleIDs = [user1.id, user2.id];
    if (coupleIDs.includes(authorID) && coupleIDs.includes(amoureuxID)) {
      pourcentage = 100;
    } else {
      // 🎲 Génération stable du pourcentage
      const ids = [user1.id, user2.id].sort().join('');
      const hash = crypto.createHash('md5').update(ids).digest('hex');
      const number = parseInt(hash.slice(0, 8), 16);
      pourcentage = number % 101;
    }

    // 💬 Message dynamique
    let message = '';
    let color = '';

    if (pourcentage < 30) {
      message = "😢 Pas faits l’un pour l’autre... mais qui sait ?";
      color = '#ff4d4d';
    } else if (pourcentage < 60) {
      message = "🙂 Il y a un petit quelque chose... à explorer !";
      color = '#ffa64d';
    } else if (pourcentage < 85) {
      message = "💘 Une belle connexion entre vous deux !";
      color = '#66ccff';
    } else {
      message = "💞 Âmes sœurs ! Ils sont faits l’un pour l’autre, une vraie alchimie !";
      color = '#ff66cc';
    }

    const embed = new EmbedBuilder()
      .setTitle(`💖 Test de compatibilité`)
      .setDescription(`**${user1.username}** ❤️ **${user2.username}**\nCompatibilité : **${pourcentage}%**\n\n${message}`)
      .setColor(color)
      .setThumbnail('https://cdn-icons-png.flaticon.com/512/833/833472.png')
      .setFooter({ text: 'Juste pour le fun 💌' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};