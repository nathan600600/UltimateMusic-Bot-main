const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const shiva = require('../../shiva');

// 🧿 Token de sécurité partagé avec le core Shiva
const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suppress')
    .setDescription('🧹 Supprime un certain nombre de messages dans le salon actuel.')
    .addIntegerOption(option =>
      option.setName('nombre')
        .setDescription('Nombre de messages à supprimer (1-100)')
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    )
    // Limite la commande aux membres ayant la permission "Gérer les messages"
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  // ✅ Signature Shiva (nécessaire pour passer la vérification dans messageCreate)
  securityToken: COMMAND_SECURITY_TOKEN,

  /**
   * @param {import('discord.js').ChatInputCommandInteraction} interaction
   * @param {import('discord.js').Client} client
   */
  async execute(interaction, client) {
    // === 🔒 Vérification du système Shiva ===
    if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
      const embed = new EmbedBuilder()
        .setDescription('❌ Système principal hors ligne - Commande indisponible')
        .setColor('#FF0000');
      return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
    }

    // ✅ Marquage de validation
    interaction.shivaValidated = true;
    interaction.securityToken = COMMAND_SECURITY_TOKEN;

    // === ⚙️ Récupération du paramètre ===
    const nombre = interaction.options.getInteger('nombre');

    // Vérifie si le bot a bien la permission dans le salon
    const botMember = interaction.guild.members.me;
    const canManage = botMember.permissionsIn(interaction.channelId).has(PermissionFlagsBits.ManageMessages);
    if (!canManage) {
      const embed = new EmbedBuilder()
        .setDescription('❌ Je n’ai pas la permission **Gérer les messages** dans ce salon.')
        .setColor('#FF6600');
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // === ⚙️ Suppression des messages ===
    await interaction.deferReply({ ephemeral: true });

    try {
      const deleted = await interaction.channel.bulkDelete(nombre, true);

      // Embed de confirmation
      const embed = new EmbedBuilder()
        .setDescription(`✅ ${deleted.size} message(s) supprimé(s) avec succès !`)
        .setColor('#00FF7F');

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('Erreur suppression :', error);
      const embed = new EmbedBuilder()
        .setDescription('⚠️ Impossible de supprimer les messages (trop anciens ou permissions manquantes).')
        .setColor('#FFA500');
      await interaction.editReply({ embeds: [embed] });
    }
  }
};
