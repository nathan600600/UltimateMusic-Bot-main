const { EmbedBuilder } = require('discord.js');
const shiva = require('../shiva');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        if (interaction.isChatInputCommand()) {
            const command = client.slashCommands.get(interaction.commandName);
            
            if (!command) {
                return interaction.reply({
                    content: 'Cette commande n\'est pas disponible !',
                    ephemeral: true
                });
            }

            if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
                const embed = new EmbedBuilder()
                    .setDescription('❌ Système principal hors ligne - Commandes indisponibles')
                    .setColor('#FF0000');
                return interaction.reply({ embeds: [embed], ephemeral: true }).catch(() => {});
            }

            if (!command.securityToken || command.securityToken !== shiva.SECURITY_TOKEN) {
                
                const securityEmbed = new EmbedBuilder()
                    .setDescription('❌ Commande bloquée - Validation de sécurité requise')
                    .setColor('#FF6600');
                
                return interaction.reply({ embeds: [securityEmbed], ephemeral: true }).catch(() => {});
            }

            try {
                await command.execute(interaction, client);

                if (!interaction.shivaValidated || !interaction.securityToken || interaction.securityToken !== shiva.SECURITY_TOKEN) {
                  
                    const warningEmbed = new EmbedBuilder()
                        .setDescription('⚠️ Anomalie de sécurité détectée - Exécution de la commande enregistrée')
                        .setColor('#FF6600');
                    
                    if (!interaction.replied && !interaction.deferred) {
                        await interaction.reply({ embeds: [warningEmbed], ephemeral: true }).catch(() => {});
                    }
                    return;
                }

            } catch (error) {
                console.error('Erreur lors de l\'exécution de la commande slash :', error);
                
                if (error.message.includes('shiva') || error.message.includes('validateCore')) {
                    const securityEmbed = new EmbedBuilder()
                        .setDescription('❌ Modules de sécurité du système hors ligne - Commandes indisponibles')
                        .setColor('#FF0000');
                    
                    const reply = { embeds: [securityEmbed], ephemeral: true };
                    
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp(reply).catch(() => {});
                    } else {
                        await interaction.reply(reply).catch(() => {});
                    }
                    return;
                }
                
                const reply = {
                    content: 'Une erreur est survenue lors de l\'exécution de cette commande !',
                    ephemeral: true
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(reply);
                } else {
                    await interaction.reply(reply);
                }
            }
        }
        
        else if (interaction.isButton()) {
            await handleSecureMusicButton(interaction, client);
        }
    }
};

async function handleSecureMusicButton(interaction, client) {
    if (interaction.customId === 'music_support') return;
    
    const ConditionChecker = require('../utils/checks');
    const checker = new ConditionChecker(client);
    
    try {
        const conditions = await checker.checkMusicConditions(
            interaction.guild.id,
            interaction.user.id,
            interaction.member.voice?.channelId,
            true 
        );

        if (!conditions.hasActivePlayer) {
            return interaction.reply({
                content: '❌ Aucune musique n\'est en cours de lecture !',
                ephemeral: true
            });
        }

        if (!conditions.userInVoice) {
            return interaction.reply({
                content: '❌ Vous devez être dans un salon vocal pour contrôler la musique !',
                ephemeral: true
            });
        }

        if (!conditions.sameVoiceChannel) {
            const botChannelName = interaction.guild.channels.cache.get(conditions.botVoiceChannel)?.name || 'Inconnu';
            return interaction.reply({
                content: `❌ Vous devez être dans le salon vocal **${botChannelName}** pour contrôler la musique !`,
                ephemeral: true
            });
        }

        const canUseMusic = await checker.canUseMusic(interaction.guild.id, interaction.user.id);
        if (!canUseMusic) {
            return interaction.reply({
                content: '❌ Vous devez avoir les permissions DJ pour contrôler la musique !',
                ephemeral: true
            });
        }

        const player = conditions.player;
        const action = interaction.customId.replace('music_', '');
        const CentralEmbedHandler = require('../utils/centralEmbed');
        const centralHandler = new CentralEmbedHandler(client);
        
        switch (action) {
            case 'pause':
                player.pause(true);
                await interaction.reply({
                    content: '⏸️ Musique mise en pause',
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'resume':
                player.pause(false);
                await interaction.reply({
                    content: '▶️ Musique reprise',
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'skip':
                const currentTrack = player.current?.info?.title || 'Inconnu';
                player.stop();
                await interaction.reply({
                    content: `⏭️ Passé : \`${currentTrack}\``,
                    ephemeral: true
                });
                break;
                
            case 'stop':
                player.destroy();
                await interaction.reply({
                    content: '🛑 Musique arrêtée et déconnecté',
                    ephemeral: true
                });
                break;
                
            case 'clear':
                const clearedCount = player.queue.size;
                player.queue.clear();
                await interaction.reply({
                    content: `🗑️ ${clearedCount} musiques retirées de la file d'attente`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'loop':
                const currentLoop = player.loop || 'none';
                let newLoop;
                
                switch (currentLoop) {
                    case 'none': newLoop = 'track'; break;
                    case 'track': newLoop = 'queue'; break;
                    case 'queue': newLoop = 'none'; break;
                    default: newLoop = 'track';
                }
                
                player.setLoop(newLoop);
                const loopEmojis = { none: '➡️', track: '🔂', queue: '🔁' };
                await interaction.reply({
                    content: `${loopEmojis[newLoop]} Mode de boucle : **${newLoop}**`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'volume_up':
                const newVolumeUp = Math.min(player.volume + 10, 100);
                player.setVolume(newVolumeUp);
                await interaction.reply({
                    content: `🔊 Volume augmenté à ${newVolumeUp}%`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'volume_down':
                const newVolumeDown = Math.max(player.volume - 10, 1);
                player.setVolume(newVolumeDown);
                await interaction.reply({
                    content: `🔉 Volume diminué à ${newVolumeDown}%`,
                    ephemeral: true
                });
                await updateCentralEmbed();
                break;
                
            case 'queue':
                if (player.queue.size === 0) {
                    return interaction.reply({
                        content: '📜 La file d\'attente est vide',
                        ephemeral: true
                    });
                }
                
                const queueList = player.queue.map((track, index) => 
                    `\`${index + 1}.\` ${track.info.title.substring(0, 40)}${track.info.title.length > 40 ? '...' : ''}`
                ).slice(0, 10).join('\n');
                
                const moreText = player.queue.size > 10 ? `\n... et ${player.queue.size - 10} musiques supplémentaires` : '';
                
                await interaction.reply({
                    content: `📜 **File d'attente (${player.queue.size} musiques)**\n${queueList}${moreText}`,
                    ephemeral: true
                });
                break;
                
            case 'shuffle':
                if (player.queue.size === 0) {
                    return interaction.reply({
                        content: '❌ La file d\'attente est vide, rien à mélanger !',
                        ephemeral: true
                    });
                }
                
                player.queue.shuffle();
                await interaction.reply({
                    content: `🔀 ${player.queue.size} musiques mélangées dans la file d'attente`,
                    ephemeral: true
                });
                break;
                
            default:
                await interaction.reply({
                    content: '❌ Action de bouton inconnue',
                    ephemeral: true
                });
        }

        async function updateCentralEmbed() {
            if (player && player.current) {
                const playerInfo = {
                    title: player.current.info.title,
                    author: player.current.info.author,
                    duration: player.current.info.length,
                    thumbnail: player.current.info.thumbnail,
                    requester: player.current.info.requester,
                    paused: player.paused,
                    volume: player.volume,
                    loop: player.loop,
                    queueLength: player.queue.size
                };
                await centralHandler.updateCentralEmbed(interaction.guild.id, playerInfo);
            }
        }

    } catch (error) {
        console.error('Erreur lors du traitement du bouton musique sécurisé :', error);
        await interaction.reply({
            content: '❌ Une erreur est survenue lors du traitement de votre demande',
            ephemeral: true
        }).catch(() => {});
    }
}