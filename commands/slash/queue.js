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
        .setName('queue')
        .setDescription('Affiche la file d\'attente musicale')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Numéro de page de la file d\'attente')
                .setMinValue(1)
                .setRequired(false)
        ),
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

        await interaction.deferReply();

        const ConditionChecker = require('../../utils/checks');
        const checker = new ConditionChecker(client);

        try {
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id,
                interaction.user.id,
                interaction.member.voice?.channelId
            );

            if (!conditions.hasActivePlayer) {
                const embed = new EmbedBuilder().setDescription('❌ Aucune musique n\'est en cours de lecture !');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const player = conditions.player;
            const queue = player.queue;
            const currentTrack = player.current;

            if (!currentTrack && queue.size === 0) {
                const embed = new EmbedBuilder().setDescription('📜 La file d\'attente est vide !');
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const page = interaction.options.getInteger('page') || 1;
            const songsPerPage = 15;
            const startIndex = (page - 1) * songsPerPage;
            const endIndex = startIndex + songsPerPage;
            const totalPages = Math.ceil(queue.size / songsPerPage);

            let description = '';

            if (currentTrack) {
                const duration = formatDuration(currentTrack.info.length);
                description += `🎵 **En cours de lecture**\n**${currentTrack.info.title}**\nPar : ${currentTrack.info.author}\nDurée : ${duration}\nDemandé par : <@${currentTrack.info.requester.id}>\n\n`;
            }

            if (queue.size > 0) {
                const queueTracks = Array.from(queue).slice(startIndex, endIndex);
                if (queueTracks.length > 0) {
                    description += `📋 **À venir (${queue.size} musiques)**\n`;
                    description += queueTracks.map((track, index) => {
                        const position = startIndex + index + 1;
                        const duration = formatDuration(track.info.length);
                        return `\`${position}.\` **${track.info.title}** \`[${duration}]\`\nDemandé par : <@${track.info.requester.id}>`;
                    }).join('\n\n');
                }

                if (totalPages > 1) {
                    description += `\n\nPage ${page}/${totalPages}`;
                } else {
                    description += `\n\nTotal : ${queue.size} musiques dans la file d'attente`;
                }
            }

            const embed = new EmbedBuilder().setDescription(description);
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 10000));

        } catch (error) {
            console.error('Erreur commande queue :', error);
            const embed = new EmbedBuilder().setDescription('❌ Une erreur est survenue lors de la récupération de la file d\'attente !');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};

function formatDuration(duration) {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60000);
    const seconds = Math.floor((duration % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}