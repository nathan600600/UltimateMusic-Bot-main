// ...existing code...
const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Server = require('../../models/Server');
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
        .setName('disable-central')
        .setDescription('Desactiver le centrale de musique')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
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

        await interaction.deferReply({ ephemeral: true });

        const guildId = interaction.guild.id;

        try {
            const serverConfig = await Server.findById(guildId);
            
            if (!serverConfig?.centralSetup?.enabled) {
                return interaction.editReply({
                    content: '❌ Le systeme de centrale de musique n\'est actuellement pas installé!',
                    ephemeral: true
                });
            }

            try {
                const channel = await client.channels.fetch(serverConfig.centralSetup.channelId);
                const message = await channel.messages.fetch(serverConfig.centralSetup.embedId);
                await message.delete();
            } catch (error) {
                console.log('Central embed already deleted or inaccessible');
            }

            await Server.findByIdAndUpdate(guildId, {
                'centralSetup.enabled': false,
                'centralSetup.channelId': null,
                'centralSetup.embedId': null
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Systeme De Centrale De Musique Désactivé')
                .setDescription('Le centrale de musique a été supprimé et l\'embed enlevé')
                .setColor(0xFF6B6B)
                .setFooter({ text: 'Tu peux le réactiver a n\'importe quel moment avec la commande /setup-central' });

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error disabling central system:', error);
            
            await interaction.editReply({
                content: '❌ Une erreur est survenue durant la suppresion du centrale de musique!',
                ephemeral: true
            });
        }
    }
};
// ...existing code...