const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const Server = require('../../models/Server');
const CentralEmbedHandler = require('../../utils/centralEmbed');
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
        .setName('setup-central')
        .setDescription('Configurer le système musical central dans ce salon')
        .addChannelOption(option =>
            option.setName('voice-channel')
                .setDescription('Salon vocal pour la musique (optionnel)')
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(false))
        .addRoleOption(option =>
            option.setName('allowed-role')
                .setDescription('Rôle autorisé à utiliser le système central (optionnel)')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
    securityToken: COMMAND_SECURITY_TOKEN,

    async execute(interaction, client) {
        if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
            const embed = new EmbedBuilder()
                .setDescription('❌ Système principal hors ligne - Commande indisponible')
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
        const channelId = interaction.channel.id;
        const voiceChannel = interaction.options.getChannel('voice-channel');
        const allowedRole = interaction.options.getRole('allowed-role');

        try {
            let serverConfig = await Server.findById(guildId);
            
            if (serverConfig?.centralSetup?.enabled) {
                return interaction.editReply({
                    content: '❌ Le système musical central est déjà configuré ! Utilisez `/disable-central` pour réinitialiser.',
                    ephemeral: true
                });
            }

            const botMember = interaction.guild.members.me;
            const channel = interaction.channel;
            
            if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks', 'ManageMessages'])) {
                return interaction.editReply({
                    content: '❌ J\'ai besoin des permissions `Envoyer des messages`, `Intégrer des liens` et `Gérer les messages` dans ce salon !',
                    ephemeral: true
                });
            }

            const centralHandler = new CentralEmbedHandler(client);
            const embedMessage = await centralHandler.createCentralEmbed(channelId, guildId);
            
            if (!embedMessage) {
                return interaction.editReply({
                    content: '❌ Impossible de créer l\'intégration centrale !',
                    ephemeral: true
                });
            }

            const setupData = {
                _id: guildId,
                centralSetup: {
                    enabled: true,
                    channelId: channelId,
                    embedId: embedMessage.id,
                    vcChannelId: voiceChannel?.id || null,
                    allowedRoles: allowedRole ? [allowedRole.id] : [],
                    deleteMessages: true
                }
            };

            await Server.findByIdAndUpdate(guildId, setupData, { 
                upsert: true, 
                new: true 
            });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Système musical central configuré !')
                .setDescription(`Le contrôle musical central a été configuré dans <#${channelId}>`)
                .addFields(
                    { name: '📍 Salon', value: `<#${channelId}>`, inline: true },
                    { name: '🔊 Salon vocal', value: voiceChannel ? `<#${voiceChannel.id}>` : 'Non défini', inline: true },
                    { name: '👥 Rôle autorisé', value: allowedRole ? `<@&${allowedRole.id}>` : 'Tout le monde', inline: true }
                )
                .setColor(0x00FF00)
                .setFooter({ text: 'Les utilisateurs peuvent maintenant taper le nom d\'une chanson dans le salon pour jouer de la musique !' });

            await interaction.editReply({ embeds: [successEmbed] });

            setTimeout(async () => {
                try {
                    const usageEmbed = new EmbedBuilder()
                        .setTitle('🎵 Système musical central actif !')
                        .setDescription(
                            '• Tapez n\'importe quel **nom de chanson** pour jouer de la musique\n' +
                            '• Les liens (YouTube, Spotify) sont pris en charge\n' +
                            '• Les autres messages seront supprimés automatiquement\n' +
                            '• Utilisez les commandes normales (`!play`, `/play`) dans les autres salons\n\n' +
                            '⚠️ Ce message sera supprimé automatiquement dans 10 secondes !'
                        )
                        .setColor(0x1DB954)
                        .setFooter({ text: 'Profitez de votre musique !' });
            
                    const msg = await channel.send({ embeds: [usageEmbed] });
            
                    // Suppression après 10 secondes
                    setTimeout(() => {
                        msg.delete().catch(() => {});
                    }, 10000);
            
                } catch (error) {
                    console.error('Erreur lors de l\'envoi des instructions d\'utilisation :', error);
                }
            }, 2000);
            

        } catch (error) {
            console.error('Erreur lors de la configuration du système central :', error);
            
            await interaction.editReply({
                content: '❌ Une erreur est survenue lors de la configuration du système musical central !',
                ephemeral: true
            });
        }
    }
};