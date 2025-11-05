const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
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
        .setName('join')
        .setDescription('Rejoins ton salon vocal'),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ System core offline - Command unavailable')
                .setColor('#FF0000');
            return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
        }

        interaction.shivaValidated = true;
        interaction.securityToken = COMMAND_SECURITY_TOKEN;

        // Vérification du mode maintenance si l'utilitaire existe
        if (typeof checkMaintenance === 'function') {
            if (await checkMaintenance(interaction)) return;
        }

        await interaction.deferReply();

        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);

        try {
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id,
                interaction.user.id,
                interaction.member.voice?.channelId
            );

            if (!conditions.userInVoice) {
                const embed = new EmbedBuilder().setDescription('❌ Tu as besoin d\'etre dans un salon vocal!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            if (conditions.hasActivePlayer && conditions.sameVoiceChannel) {
                const embed = new EmbedBuilder().setDescription('✅ Je suis deja dans ton salon vocal!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const PlayerHandler = require('../../utils/player');
            const playerHandler = new PlayerHandler(client);

            await playerHandler.createPlayer(
                interaction.guild.id,
                interaction.member.voice.channelId,
                interaction.channel.id
            );

            const embed = new EmbedBuilder().setDescription(`✅ J\'ai bien rejoin le salon vocal **${interaction.member.voice.channel.name}**!`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Join command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ Une erreur s\'est produite lorsque j\'ai essayer de rejoindre ton salon vocal!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};