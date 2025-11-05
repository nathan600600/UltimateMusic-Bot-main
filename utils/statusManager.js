const { ActivityType } = require('discord.js');
const fs = require('fs');
const path = require('path');

class StatusManager {
    constructor(client) {
        this.client = client;
        this.currentInterval = null;
        this.isPlaying = false;
        this.voiceChannelData = new Map();

        // === Maintenance system ===
        this.maintenancePath = path.join(__dirname, '../maintenance.json');
        this.maintenanceState = this.loadMaintenanceState();
    }

    // Load maintenance.json
    loadMaintenanceState() {
        try {
            if (fs.existsSync(this.maintenancePath)) {
                return JSON.parse(fs.readFileSync(this.maintenancePath, 'utf8'));
            }
            return { enabled: false };
        } catch (err) {
            console.error('❌ Erreur lors du chargement du mode maintenance :', err);
            return { enabled: false };
        }
    }

    // Save maintenance.json
    saveMaintenanceState(state) {
        try {
            fs.writeFileSync(this.maintenancePath, JSON.stringify({ enabled: state }, null, 2));
            this.maintenanceState.enabled = state;
        } catch (err) {
            console.error('❌ Erreur lors de la sauvegarde du mode maintenance :', err);
        }
    }

    // Update global status (called on bot startup)
    async updateGlobalStatus() {
        if (this.maintenanceState.enabled) {
            await this.setMaintenanceStatus();
        } else {
            await this.setDefaultStatus();
        }
    }

    // 🛠️ Maintenance mode
    async setMaintenanceStatus() {
        this.stopCurrentStatus();
        this.isPlaying = false;
        await this.client.user.setPresence({
            activities: [{ name: '🛠️ En maintenance', type: ActivityType.Playing }],
            status: 'idle'
        });
        console.log('🛠️ Mode maintenance actif');
    }

    // ✅ Normal mode
    async setDefaultStatus() {
        this.stopCurrentStatus();
        this.isPlaying = false;
        const defaultActivity = `🎵 Prêt pour la musique !`;
        await this.client.user.setPresence({
            activities: [{ name: defaultActivity, type: ActivityType.Watching }],
            status: 'online'
        });
        console.log(`✅ Statut réinitialisé : ${defaultActivity}`);
    }

    // Called after music events or updates
    async updateStatusAndVoice(guildId) {
        try {
            if (this.maintenanceState.enabled) {
                await this.setMaintenanceStatus();
                return;
            }

            const playerInfo = this.client.playerHandler.getPlayerInfo(guildId);
            if (playerInfo && playerInfo.playing) {
                await this.setPlayingStatus(playerInfo.title);
                await this.setVoiceChannelStatus(guildId, playerInfo.title);
            } else {
                await this.setDefaultStatus();
                await this.clearVoiceChannelStatus(guildId);
            }
        } catch (error) {
            console.error('❌ Erreur lors de la mise à jour du statut et du canal vocal :', error);
        }
    }

    async setPlayingStatus(trackTitle) {
        if (this.maintenanceState.enabled) return;
        this.stopCurrentStatus();
        this.isPlaying = true;
        const activity = `🎵 ${trackTitle}`;

        await this.client.user.setPresence({
            activities: [{ name: activity, type: ActivityType.Listening }],
            status: 'online'
        });

        this.currentInterval = setInterval(async () => {
            if (this.isPlaying && !this.maintenanceState.enabled) {
                await this.client.user.setPresence({
                    activities: [{ name: activity, type: ActivityType.Listening }],
                    status: 'online'
                });
            }
        }, 30000);
    }

    stopCurrentStatus() {
        if (this.currentInterval) {
            clearInterval(this.currentInterval);
            this.currentInterval = null;
        }
    }

    // All your original methods below are kept intact ↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓↓
    async setVoiceChannelStatus(guildId, trackTitle) {
        try {
            if (this.maintenanceState.enabled) return;
            const player = this.client.riffy.players.get(guildId);
            if (!player || !player.voiceChannel) return;
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;
            const voiceChannel = guild.channels.cache.get(player.voiceChannel);
            if (!voiceChannel) return;

            if (!this.voiceChannelData.has(voiceChannel.id)) {
                this.voiceChannelData.set(voiceChannel.id, {
                    originalName: voiceChannel.name,
                    originalTopic: voiceChannel.topic
                });
            }

            const botMember = guild.members.me;
            const permissions = voiceChannel.permissionsFor(botMember);
            if (!permissions?.has('ManageChannels')) return;

            const statusText = `🎵 ${trackTitle}`;
            let success = await this.createVoiceStatusAPI(voiceChannel.id, statusText);
            if (!success) success = await this.createChannelTopic(voiceChannel, trackTitle);
            if (!success) await this.createChannelName(voiceChannel, trackTitle);
        } catch (error) {
            console.error(`❌ Échec de la création du statut du canal vocal : ${error.message}`);
        }
    }

    async clearVoiceChannelStatus(guildId) {
        try {
            const guild = this.client.guilds.cache.get(guildId);
            if (!guild) return;
            const botMember = guild.members.me;
            let voiceChannel = null;
            const player = this.client.riffy.players.get(guildId);
            if (player && player.voiceChannel) voiceChannel = guild.channels.cache.get(player.voiceChannel);
            if (!voiceChannel && botMember.voice.channelId)
                voiceChannel = guild.channels.cache.get(botMember.voice.channelId);
            if (!voiceChannel) {
                for (const channel of guild.channels.cache.values()) {
                    if (channel.type === 2 && this.voiceChannelData.has(channel.id)) {
                        voiceChannel = channel;
                        break;
                    }
                }
            }
            if (!voiceChannel) return;
            const permissions = voiceChannel.permissionsFor(botMember);
            if (!permissions?.has('ManageChannels')) return;

            let success = await this.deleteVoiceStatusAPI(voiceChannel.id);
            if (success) return;
            success = await this.deleteChannelTopic(voiceChannel);
            if (success) return;
            await this.deleteChannelName(voiceChannel);
        } catch (error) {
            console.error(`❌ Échec de la suppression du statut du canal vocal : ${error.message}`);
        }
    }

    async createVoiceStatusAPI(channelId, statusText) {
        try {
            await this.client.rest.put(`/channels/${channelId}/voice-status`, {
                body: { status: statusText }
            });
            console.log(`✅ Statut vocal créé : ${statusText}`);
            return true;
        } catch {
            return false;
        }
    }

    async deleteVoiceStatusAPI(channelId) {
        try {
            await this.client.rest.put(`/channels/${channelId}/voice-status`, { body: { status: null } });
            console.log(`✅ Statut vocal effacé`);
            return true;
        } catch {
            try {
                await this.client.rest.delete(`/channels/${channelId}/voice-status`);
                console.log(`✅ Statut vocal supprimé`);
                return true;
            } catch {
                return false;
            }
        }
    }

    async createChannelTopic(voiceChannel, trackTitle) {
        try {
            const topicText = `🎵 Lecture : ${trackTitle}`;
            await voiceChannel.setTopic(topicText);
            return true;
        } catch {
            return false;
        }
    }

    async deleteChannelTopic(voiceChannel) {
        try {
            const originalData = this.voiceChannelData.get(voiceChannel.id);
            const originalTopic = originalData?.originalTopic || null;
            await voiceChannel.setTopic(originalTopic);
            return true;
        } catch {
            return false;
        }
    }

    async createChannelName(voiceChannel, trackTitle) {
        try {
            const originalData = this.voiceChannelData.get(voiceChannel.id);
            const baseName = originalData?.originalName || voiceChannel.name.replace(/🎵.*$/, '').trim();
            const shortTitle = trackTitle.length > 15 ? trackTitle.substring(0, 15) + '...' : trackTitle;
            const newName = `🎵 ${baseName}`;
            if (newName !== voiceChannel.name && newName.length <= 100) {
                await voiceChannel.setName(newName);
            }
            return true;
        } catch {
            return false;
        }
    }

    async deleteChannelName(voiceChannel) {
        try {
            const originalData = this.voiceChannelData.get(voiceChannel.id);
            const originalName = originalData?.originalName;
            if (originalName && originalName !== voiceChannel.name) {
                await voiceChannel.setName(originalName);
                this.voiceChannelData.delete(voiceChannel.id);
            }
            return true;
        } catch {
            return false;
        }
    }

    async setServerCountStatus(serverCount) {
        if (!this.isPlaying) {
            await this.client.user.setPresence({
                activities: [{ name: `Je suis fonctionnel 24h/7j`, type: ActivityType.Playing }],
                status: 'online'
            });
        }
    }

    async onTrackStart(guildId) {
        await this.updateStatusAndVoice(guildId);
    }

    async onTrackEnd(guildId) {
        setTimeout(async () => {
            await this.updateStatusAndVoice(guildId);
        }, 1000);
    }

    async onPlayerDisconnect(guildId = null) {
        await this.setDefaultStatus();
        if (guildId) await this.clearVoiceChannelStatus(guildId);
        else for (const guild of this.client.guilds.cache.values()) await this.clearVoiceChannelStatus(guild.id);
    }
}

module.exports = StatusManager;
