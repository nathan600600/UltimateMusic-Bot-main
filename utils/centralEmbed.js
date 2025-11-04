const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config');
const Server = require('../models/Server');

class CentralEmbedHandler {
    constructor(client) {
        this.client = client;
    }

    async createCentralEmbed(channelId, guildId) {
        try {
            const channel = await this.client.channels.fetch(channelId);
            
            const embed = new EmbedBuilder()
            .setAuthor({ name: 'Centre de contrôle musical Ultimate', iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif', url: 'https://discord.gg/xQF9f9yUEM' })
                .setDescription([
                    '',
                    '- Tape simplement un **nom de chanson** ou un **lien YouTube** pour lancer la fête !',
                    '- En version gratuite, je ne supporte que **YouTube**.',
                    '',
                    '✨ *Prêt à remplir ce salon avec de la super musique ?*'
                ].join('\n'))
                .setColor(0x9966ff) 
                .addFields(
                    {
                        name: '🎯 Exemples rapides',
                        value: [
                            '• `shape of you`',
                            '• `lofi hip hop beats`',
                            '• `https://youtu.be/dQw4w9WgXcQ`',
                            '• `imagine dragons believer`'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🚀 Fonctionnalités',
                        value: [
                            '• 🎵 Audio haute qualité',
                            '• 📜 Gestion de la file d\'attente', 
                            '• 🔁 Modes boucle & mélange',
                            '• 🎛️ Contrôle du volume',
                            '• ⚡ Recherche ultra rapide'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💡 Conseils',
                        value: [
                            '• Rejoins d\'abord un salon vocal',
                            '• Utilise des noms de chansons précis',
                            '• Essaie artiste + chanson',
                            '• Les playlists sont supportées !'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setImage('https://i.ibb.co/DDSdKy31/ezgif-8aec7517f2146d.gif')
                .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/1234567890/music_note.gif')
                .setFooter({ 
                    text: 'Ultimate Music Bot • Développé par GlaceYT !',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();
            const message = await channel.send({ embeds: [embed] });
            
            await Server.findByIdAndUpdate(guildId, {
                'centralSetup.embedId': message.id,
                'centralSetup.channelId': channelId
            });

            console.log(`✅ Intégration centrale créée dans ${guildId}`);
            return message;
        } catch (error) {
            console.error('Erreur lors de la création de l\'intégration centrale :', error);
            return null;
        }
    }

    async resetAllCentralEmbedsOnStartup() {
        try {
            const servers = await Server.find({
                'centralSetup.enabled': true,
                'centralSetup.embedId': { $exists: true, $ne: null }
            });

            let resetCount = 0;
            let errorCount = 0;

            for (const serverConfig of servers) {
                try {
                    const guild = this.client.guilds.cache.get(serverConfig._id);
                    if (!guild) {
                        console.log(`⚠️ Le bot n'est plus dans le serveur ${serverConfig._id}, nettoyage de la base de données...`);
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                        continue;
                    }

                    const channel = await this.client.channels.fetch(serverConfig.centralSetup.channelId).catch(() => null);
                    if (!channel) {
                        console.log(`⚠️ Salon central introuvable dans ${guild.name}, nettoyage...`);
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                        continue;
                    }

                    const botMember = guild.members.me;
                    if (!channel.permissionsFor(botMember).has(['SendMessages', 'EmbedLinks'])) {
                        console.log(`⚠️ Permissions manquantes dans ${guild.name}, passage...`);
                        continue;
                    }

                    const message = await channel.messages.fetch(serverConfig.centralSetup.embedId).catch(() => null);
                    if (!message) {
                        console.log(`⚠️ Intégration centrale introuvable dans ${guild.name}, création d'une nouvelle...`);
                        const newMessage = await this.createCentralEmbed(channel.id, guild.id);
                        if (newMessage) {
                            resetCount++;
                        }
                        continue;
                    }

                    await this.updateCentralEmbed(serverConfig._id, null);
                    resetCount++;

                    await new Promise(resolve => setTimeout(resolve, 100));

                } catch (error) {
                    errorCount++;
                    if (error.code === 50001 || error.code === 10003 || error.code === 50013) {
                        await Server.findByIdAndUpdate(serverConfig._id, {
                            'centralSetup.enabled': false,
                            'centralSetup.embedId': null
                        });
                    }
                }
            }

            if (resetCount > 0) {
                //console.log(`🎵 ${resetCount} intégrations centrales réinitialisées avec succès`);
            }
            if (errorCount > 0) {
                //console.log(`⚠️ ${errorCount} erreurs lors de la réinitialisation des intégrations`);
            }
            if (resetCount === 0 && errorCount === 0) {
                //console.log('ℹ️ Aucune intégration centrale à réinitialiser');
            }

        } catch (error) {
            console.error('❌ Erreur lors de la réinitialisation automatique des intégrations centrales :', error);
        }
    }

    async updateCentralEmbed(guildId, trackInfo = null) {
        try {
            const serverConfig = await Server.findById(guildId);
            if (!serverConfig?.centralSetup?.embedId) return;

            const channel = await this.client.channels.fetch(serverConfig.centralSetup.channelId);
            const message = await channel.messages.fetch(serverConfig.centralSetup.embedId);
            
            let embed, components = [];
            
            if (trackInfo) {
                const statusEmoji = trackInfo.paused ? '⏸️' : '▶️';
                const statusText = trackInfo.paused ? 'En pause' : 'Lecture en cours';
                const loopEmoji = this.getLoopEmoji(trackInfo.loop);
                const embedColor = trackInfo.paused ? 0xFFA500 : 0x9966ff;
                
                embed = new EmbedBuilder()
                    .setAuthor({ 
                        name: `${trackInfo.title}`, 
                        iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif',
                        url: 'https://discord.gg/xQF9f9yUEM' 
                    })
                    .setDescription([
                        `**🎤 Artiste :** ${trackInfo.author}`,
                        `**👤 Demandé par :** <@${trackInfo.requester.id}>`,
                        '',
                        `⏰ **Durée :** \`${this.formatDuration(trackInfo.duration)}\``,
                        `${loopEmoji} **Boucle :** \`${trackInfo.loop || 'Désactivée'}\``,
                        `🔊 **Volume :** \`${trackInfo.volume || 50}%\``,
                        '',
                        '🎶 *Tu apprécies l\'ambiance ? Tape d\'autres noms de chansons ci-dessous pour continuer la fête !*'
                    ].join('\n'))
                    .setColor(embedColor)
                    .setThumbnail(trackInfo.thumbnail || 'https://cdn.discordapp.com/emojis/896724352949706762.gif')
                    .setImage(trackInfo.paused ? null : 'https://i.ibb.co/KzbPV8jd/aaa.gif')
                    .setFooter({ 
                        text: `Ultimate Music Bot • ${statusText} • Développé par GlaceYT`,
                        iconURL: this.client.user.displayAvatarURL()
                    })
                    .setTimestamp();
            
                components = this.createAdvancedControlButtons(trackInfo);
            } else {
                embed = new EmbedBuilder()
                .setAuthor({ name: 'Centre de contrôle musical Ultimate', iconURL: 'https://cdn.discordapp.com/emojis/896724352949706762.gif', url: 'https://discord.gg/xQF9f9yUEM' })
                .setDescription([
                    '',
                    '- Tape simplement un **nom de chanson** ou un **lien YouTube** pour lancer la fête !',
                    '- En version gratuite, je ne supporte que **YouTube**.',
                    '',
                    '✨ *Prêt à remplir ce salon avec de la super musique ?*'
                ].join('\n'))
                .setColor(0x9966ff) 
                .addFields(
                    {
                        name: '🎯 Exemples rapides',
                        value: [
                            '• `shape of you`',
                            '• `lofi hip hop beats`',
                            '• `https://youtu.be/dQw4w9WgXcQ`',
                            '• `imagine dragons believer`'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '🚀 Fonctionnalités',
                        value: [
                            '• 🎵 Audio haute qualité',
                            '• 📜 Gestion de la file d\'attente', 
                            '• 🔁 Modes boucle & mélange',
                            '• 🎛️ Contrôle du volume',
                            '• ⚡ Recherche ultra rapide'
                        ].join('\n'),
                        inline: true
                    },
                    {
                        name: '💡 Conseils',
                        value: [
                            '• Rejoins d\'abord un salon vocal',
                            '• Utilise des noms de chansons précis',
                            '• Essaie artiste + chanson',
                            '• Les playlists sont supportées !'
                        ].join('\n'),
                        inline: false
                    }
                )
                .setImage('https://i.ibb.co/DDSdKy31/ezgif-8aec7517f2146d.gif')
                .setThumbnail('https://cdn.discordapp.com/attachments/1234567890/1234567890/music_note.gif')
                .setFooter({ 
                    text: 'Ultimate Music Bot • Développé par GlaceYT !',
                    iconURL: this.client.user.displayAvatarURL()
                })
                .setTimestamp();

                components = [];
            }

            await message.edit({ embeds: [embed], components });

        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'intégration centrale :', error);
        }
    }

    createAdvancedControlButtons(trackInfo) {
        if (!trackInfo) return [];

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_skip')
                    .setEmoji('⏭️')
                    .setStyle(ButtonStyle.Primary),
                    
                new ButtonBuilder()
                    .setCustomId(trackInfo.paused ? 'music_resume' : 'music_pause')
                    .setEmoji(trackInfo.paused ? '▶️' : '⏸️')
                    .setStyle(ButtonStyle.Success),
                    
                new ButtonBuilder()
                    .setCustomId('music_stop')
                    .setEmoji('🛑')
                    .setStyle(ButtonStyle.Danger),
                    
                new ButtonBuilder()
                    .setCustomId('music_queue')
                    .setEmoji('📜')
                    .setStyle(ButtonStyle.Success),
                    
                new ButtonBuilder()
                    .setLabel('\u200B\u200B Boucle \u200B')
                    .setCustomId('music_loop')
                    .setEmoji(this.getLoopEmoji(trackInfo.loop))
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('music_volume_down')
                    .setEmoji('🔉')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setCustomId('music_volume_up')
                    .setEmoji('🔊')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('music_clear')
                    .setEmoji('🗑️')
                    .setStyle(ButtonStyle.Secondary),

                new ButtonBuilder()
                    .setCustomId('music_shuffle')
                    .setEmoji('🔀')
                    .setStyle(ButtonStyle.Secondary),
                    
                new ButtonBuilder()
                    .setLabel('Support')
                    .setStyle(ButtonStyle.Link)
                    .setURL(config.bot.supportServer)
            );

        return [row1, row2];
    }

    getLoopEmoji(loopMode) {
        switch (loopMode) {
            case 'track': return '🔂';
            case 'queue': return '🔁';
            default: return '⏺️';
        }
    }

    formatDuration(duration) {
        if (!duration) return '0:00';
        
        const minutes = Math.floor(duration / 60000);
        const seconds = Math.floor((duration % 60000) / 1000);
        
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
}

module.exports = CentralEmbedHandler;