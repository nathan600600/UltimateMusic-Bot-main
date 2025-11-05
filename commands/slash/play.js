const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const shiva = require('../../shiva');
const { checkMaintenance } = require('../../utils/maintenance'); // <-- ajouté

const COMMAND_SECURITY_TOKEN = shiva.SECURITY_TOKEN;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Joue une chanson ou ajoute à la file d\'attente')
        .addStringOption(option =>
            option.setName('query')
                .setDescription('Nom de la chanson, URL ou requête de recherche')
                .setRequired(true)
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

        // ✅ Vérification du mode maintenance (si utilitaire présent)
        if (typeof checkMaintenance === 'function') {
            if (await checkMaintenance(interaction)) return;
        }

        await interaction.deferReply();

        const ConditionChecker = require('../../utils/checks');
        const PlayerHandler = require('../../utils/player');
        const ErrorHandler = require('../../utils/errorHandler');
        
        // input = la chaîne fournie par l'utilisateur (args.join(' ') ou option)
        const isUrl = /^(https?:\/\/|www\.)\S+$/i.test(input);
        const query = isUrl ? input : `ytsearch:${input}`;

        try {
            const checker = new ConditionChecker(client);
            const conditions = await checker.checkMusicConditions(
                interaction.guild.id, 
                interaction.user.id, 
                interaction.member.voice?.channelId
            );

            const errorMsg = checker.getErrorMessage(conditions, 'play');
            if (errorMsg) {
                const embed = new EmbedBuilder().setDescription(errorMsg);
                return interaction.editReply({ embeds: [embed] })
                    .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
            }

            const playerHandler = new PlayerHandler(client);
            const player = await playerHandler.createPlayer(
                interaction.guild.id,
                interaction.member.voice.channelId,
                interaction.channel.id
            );

            // Exemple générique : si tu utilises une lib qui expose player.search/load
            // (adapte selon ton player : player.search(), manager.search(), player.node.load(), etc.)
            const res = await player.search(query, { requester: interaction.user }).catch(() => null);
            if (!res || res.loadType === 'NO_MATCHES') {
                return interaction.editReply({ content: '❌ Aucun résultat trouvé pour ta requête.' });
            }

            if (res.loadType === 'TRACK_LOADED' || res.loadType === 'SEARCH_RESULT') {
                const track = res.tracks[0];
                player.queue.add(track);
                // play if not already playing...
                return interaction.editReply({ content: `✅ Ajouté : **${track.title}**` });
            }

            if (res.loadType === 'PLAYLIST_LOADED') {
                // ajouter playlist
                player.queue.add(...res.tracks);
                return interaction.editReply({ content: `✅ Playlist ajoutée : **${res.playlist.name}**` });
            }

        } catch (error) {
            console.error('Erreur commande slash play :', error);
            ErrorHandler.handle(error, 'commande slash play');
            const embed = new EmbedBuilder().setDescription('❌ Une erreur est survenue lors de la lecture de la musique !');
            return interaction.editReply({ embeds: [embed] })
                .then(() => setTimeout(() => interaction.deleteReply().catch(() => {}), 3000));
        }
    }
};