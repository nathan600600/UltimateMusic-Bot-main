const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Server = require('../../models/Server');
const shiva = require('../../shiva');
const { checkMaintenance } = require('../../utils/maintenance');

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Changer le mode autoplay')
        .addBooleanOption(option =>
            option.setName('enabled')
                .setDescription('Activer ou desactiver l\'autoplay')
                .setRequired(true)
        ),
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

        // ✅ Vérification du mode maintenance (si utilitaire présent)
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

            const canUse = await checker.canUseMusic(interaction.guild.id, interaction.user.id);
            if (!canUse) {
                const embed = new EmbedBuilder().setDescription('❌ Tu as besoin des permissions de DJ pour faire ceci!');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const enabled = interaction.options.getBoolean('enabled');

            await Server.findByIdAndUpdate(interaction.guild.id, {
                'settings.autoplay': enabled
            }, { upsert: true });

            if (conditions.hasActivePlayer) {
                const player = conditions.player;
                player.setAutoplay = enabled;
            }

            const embed = new EmbedBuilder().setDescription(`🎲 Autoplay **${enabled ? 'activé' : 'desactivé'}**`);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));

        } catch (error) {
            console.error('Autoplay command error:', error);
            const embed = new EmbedBuilder().setDescription('❌ Une erreur s\'est produite lors du changement de l\'autoplay!');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};
