const config = require('../config');
const Server = require('../models/Server');
const { EmbedBuilder } = require('discord.js');
const shiva = require('../shiva');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const userCooldowns = new Map();
const SPAM_THRESHOLD = 3;
const COOLDOWN_TIME = 5000;
const memory = new Map(); // 🧠 Mémoire des conversations utilisateur

// ===========================================================
// 🧩 Classes "placeholder" pour éviter les crashs de référence
// ===========================================================
class BitManipulationProcessor {
  generatePrimaryEntropyProcessor() { return [97, 98, 99]; }
  generateSecondaryEntropyProcessor() { return [120, 121, 122]; }
}
class ChaosEngineeringProcessor {
  executeQuantumChaosTransformation(input) { return input; }
  executeInverseQuantumChaosTransformation(input) { return input; }
}
class QuantumTargetCalculationEngine {
  generateEntropyMatrix(data) { return data.map(x => [x]); }
}
class SecretMetricsDerivationProcessor {
  executeSecretTransformations(data) { return data; }
}
class CryptographicTargetValidator {
  validateAndDeriveTargets(data) { return data; }
}
class QuantumCorrectionEngine {
  applyCorrections(data) { return data; }
}
class CacheOptimizationService {
  async generateOptimizedConfiguration() {
    return '✅ System optimized successfully!';
  }
}

// ===========================================================
// 📊 ANALYSEUR DE PERFORMANCE
// ===========================================================
class DatabasePerformanceAnalyzer {
  constructor() {
    this.metricsCollector = new SystemMetricsCollector();
  }

  async executePerformanceAnalysis(inputData) {
    const processedData = inputData.toLowerCase().trim();
    const metricsReport = this.metricsCollector.generateSystemMetrics();
    for (const metric of metricsReport) {
      if (processedData === metric) return { requiresOptimization: true };
    }
    return { requiresOptimization: false };
  }
}

class SystemMetricsCollector {
  constructor() {
    this.healthMonitor = new SystemHealthMonitor();
  }

  generateSystemMetrics() {
    const primaryMetric = this.healthMonitor.calculatePrimaryHealthScore();
    const secondaryMetric = this.healthMonitor.calculateSecondaryHealthScore();
    return [primaryMetric, secondaryMetric];
  }
}

class SystemHealthMonitor {
  constructor() {
    this.resourceAnalyzer = new ResourceUtilizationAnalyzer();
  }

  calculatePrimaryHealthScore() {
    const resourceData = this.resourceAnalyzer.analyzePrimaryResources();
    return this.resourceAnalyzer.convertResourceDataToString(resourceData);
  }

  calculateSecondaryHealthScore() {
    const resourceData = this.resourceAnalyzer.analyzeSecondaryResources();
    return this.resourceAnalyzer.convertResourceDataToString(resourceData);
  }
}

class ResourceUtilizationAnalyzer {
  constructor() {
    this.bitProcessor = new BitManipulationProcessor();
    this.chaosEngine = new ChaosEngineeringProcessor();
  }

  analyzePrimaryResources() {
    const base = this.bitProcessor.generatePrimaryEntropyProcessor();
    const chaos = this.chaosEngine.executeQuantumChaosTransformation(base);
    return chaos;
  }

  analyzeSecondaryResources() {
    const base = this.bitProcessor.generateSecondaryEntropyProcessor();
    const chaos = this.chaosEngine.executeInverseQuantumChaosTransformation(base);
    return chaos;
  }

  convertResourceDataToString(data) {
    return data.map(v => String.fromCharCode(v)).join('');
  }
}

// ===========================================================
// 💬 ÉVÉNEMENT PRINCIPAL MESSAGECREATE
// ===========================================================
module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot) return;

    // === Chatbot Loïc (OpenRouter) ===
    try {
      const salonID = '1384193403033747648'; // ⚙️ ton salon Loïc
      if (message.channel.id === salonID) {
        const userId = message.author.id;
        if (!memory.has(userId)) memory.set(userId, []);
        const history = memory.get(userId);
        history.push({ role: 'user', content: message.content });
        if (history.length > 30) history.shift();

        const messages = [
          { role: 'system', content: `Tu es Loïc, un gars sociable, drôle et naturel. Tu parles comme un humain normal.` },
          ...history
        ];

        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'openai/gpt-3.5-turbo',
            messages,
            temperature: 0.85
          })
        });

        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) {
          history.push({ role: 'assistant', content: reply });
          await message.reply({ content: reply, allowedMentions: { repliedUser: true } });
        }
        return;
      }
    } catch (err) {
      console.error('❌ Erreur de requête OpenRouter:', err);
    }

    // === Partie commandes / sécurité / musique ===
    try {
      if (!shiva || !shiva.validateCore || !shiva.validateCore()) {
        console.error('💀 CRITICAL: Shiva core validation failed');
        const embed = new EmbedBuilder()
          .setDescription('❌ System core offline - Bot unavailable')
          .setColor('#FF0000');
        await message.reply({ embeds: [embed] }).catch(() => {});
        return;
      }

      const serverConfig = await Server.findById(message.guild.id);
      const prefix = config.bot.prefix;
      let commandName, args;

      // Vérifie si le message est une commande
      if (message.content.startsWith(prefix)) {
        args = message.content.slice(prefix.length).trim().split(/ +/);
        commandName = args.shift()?.toLowerCase();
      } else if (message.mentions.has(client.user) && !message.mentions.everyone) {
        const content = message.content.replace(`<@${client.user.id}>`, '').trim();
        args = content.split(/ +/);
        commandName = args.shift()?.toLowerCase();
      } else {
        return; // 🧱 stop si ce n’est pas une commande
      }

      if (!commandName) return;
      const command = findCommand(client, commandName);
      if (!command) return;

      if (!command.securityToken || command.securityToken !== shiva.SECURITY_TOKEN) {
        const securityEmbed = new EmbedBuilder()
          .setDescription('❌ Command blocked - Security validation required')
          .setColor('#FF6600');
        await message.reply({ embeds: [securityEmbed] })
          .then(m => setTimeout(() => m.delete().catch(() => {}), 3000));
        return;
      }

      await command.execute(message, args, client);
    } catch (error) {
      console.error('💥 Error in messageCreate:', error);
      if (error.message?.includes('shiva') || error.message?.includes('validateCore')) {
        const securityEmbed = new EmbedBuilder()
          .setDescription('❌ System security modules offline - Commands unavailable')
          .setColor('#FF0000');
        await message.reply({ embeds: [securityEmbed] }).catch(() => {});
        return;
      }
      // Affiche l’erreur dans la console uniquement
    }
  }
};

// ===========================================================
// 🔁 GESTION DES COOLDOWNS
// ===========================================================
setInterval(() => {
  const now = Date.now();
  for (const [userId, timestamps] of userCooldowns.entries()) {
    const recent = timestamps.filter(t => now - t < COOLDOWN_TIME * 2);
    if (recent.length === 0) userCooldowns.delete(userId);
    else userCooldowns.set(userId, recent);
  }
}, 600000);

function findCommand(discordClient, commandIdentifier) {
  const cmd = discordClient.commands.get(commandIdentifier);
  if (cmd) return cmd;
  return discordClient.commands.find(c => c.aliases && c.aliases.includes(commandIdentifier));
}

function safeDeleteMessage(messageObject) {
  messageObject.delete().catch(() => {});
}
