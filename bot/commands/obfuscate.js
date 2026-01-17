const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    StringSelectMenuBuilder,
    AttachmentBuilder
} = require('discord.js');
const axios = require('axios');
const FormData = require('form-data');

// Store pending obfuscations
const pendingJobs = new Map();

const API_URL = process.env.API_URL || 'http://localhost:3000';

const PRESETS = {
    performance: { name: 'Performance', emoji: '⚡', color: 0x00FF00 },
    balanced: { name: 'Balanced', emoji: '⚖️', color: 0x3498DB },
    maxSecurity: { name: 'Max Security', emoji: '🔒', color: 0xFF0000 },
    manual: { name: 'Manual', emoji: '🔧', color: 0x9B59B6 }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('obfuscate')
        .setDescription('Obfuscate a Lua script')
        .addAttachmentOption(option =>
            option.setName('file')
                .setDescription('Upload a .lua or .luau file')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('preset')
                .setDescription('Obfuscation preset')
                .setRequired(false)
                .addChoices(
                    { name: '⚡ Performance - Fast & Light', value: 'performance' },
                    { name: '⚖️ Balanced - Recommended', value: 'balanced' },
                    { name: '🔒 Max Security - Maximum Protection', value: 'maxSecurity' },
                    { name: '🔧 Manual - Custom Settings', value: 'manual' }
                )
        ),
    
    async execute(interaction) {
        const file = interaction.options.getAttachment('file');
        const preset = interaction.options.getString('preset') || 'balanced';
        
        // Validate file
        if (!file.name.endsWith('.lua') && !file.name.endsWith('.luau')) {
            return interaction.reply({
                embeds: [createErrorEmbed('Invalid file type. Please upload a .lua or .luau file.')],
                ephemeral: true
            });
        }
        
        // Check file size (max 500KB)
        if (file.size > 500 * 1024) {
            return interaction.reply({
                embeds: [createErrorEmbed('File too large. Maximum size is 500KB.')],
                ephemeral: true
            });
        }
        
        // Show loading message
        await interaction.deferReply();
        
        try {
            // Download file content
            const response = await axios.get(file.url);
            const sourceCode = response.data;
            
            // Create loading embed
            const loadingEmbed = new EmbedBuilder()
                .setColor(0xFFA500)
                .setTitle('🔄 Processing...')
                .setDescription(`Obfuscating \`${file.name}\` with **${PRESETS[preset].emoji} ${PRESETS[preset].name}** preset...`)
                .addFields(
                    { name: '📁 File', value: file.name, inline: true },
                    { name: '📊 Size', value: formatBytes(file.size), inline: true },
                    { name: '⚙️ Preset', value: `${PRESETS[preset].emoji} ${PRESETS[preset].name}`, inline: true }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [loadingEmbed] });
            
            // Call API
            const apiResponse = await axios.post(`${API_URL}/api/obfuscate`, {
                code: sourceCode,
                fileName: file.name,
                preset: preset
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 30000
            });
            
            const result = apiResponse.data;
            
            if (!result.success) {
                throw new Error(result.error || 'Unknown error occurred');
            }
            
            // Create success embed
            const successEmbed = createSuccessEmbed(result, file.name, preset);
            
            // Create file attachment
            const obfuscatedBuffer = Buffer.from(result.code, 'utf-8');
            const obfuscatedFileName = file.name.replace(/\.(lua|luau)$/, '_obfuscated.$1');
            const attachment = new AttachmentBuilder(obfuscatedBuffer, { name: obfuscatedFileName });
            
            // Create action buttons
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId(`reobfuscate_${result.jobId}`)
                        .setLabel('Re-Obfuscate')
                        .setEmoji('🔄')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId(`info_${result.jobId}`)
                        .setLabel('View Details')
                        .setEmoji('📋')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            // Store job data for re-obfuscation
            pendingJobs.set(result.jobId, {
                sourceCode,
                fileName: file.name,
                preset,
                userId: interaction.user.id
            });
            
            // Clean up old jobs after 10 minutes
            setTimeout(() => pendingJobs.delete(result.jobId), 10 * 60 * 1000);
            
            await interaction.editReply({
                embeds: [successEmbed],
                files: [attachment],
                components: [buttons]
            });
            
        } catch (error) {
            console.error('Obfuscation error:', error);
            
            const errorEmbed = createErrorEmbed(
                error.response?.data?.error || error.message || 'An unexpected error occurred'
            );
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
    
    // Handle button interactions
    async handleButton(interaction) {
        const [action, jobId] = interaction.customId.split('_');
        
        if (action === 'reobfuscate') {
            const jobData = pendingJobs.get(jobId);
            
            if (!jobData) {
                return interaction.reply({
                    embeds: [createErrorEmbed('Session expired. Please run the command again.')],
                    ephemeral: true
                });
            }
            
            // Show preset selector
            const selectMenu = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId(`preset_select_${jobId}`)
                        .setPlaceholder('Select a preset...')
                        .addOptions([
                            {
                                label: 'Performance',
                                description: 'Fast & Light - Minimal obfuscation',
                                value: 'performance',
                                emoji: '⚡'
                            },
                            {
                                label: 'Balanced',
                                description: 'Recommended - Good protection',
                                value: 'balanced',
                                emoji: '⚖️'
                            },
                            {
                                label: 'Max Security',
                                description: 'Maximum protection',
                                value: 'maxSecurity',
                                emoji: '🔒'
                            }
                        ])
                );
            
            await interaction.reply({
                content: 'Select a preset for re-obfuscation:',
                components: [selectMenu],
                ephemeral: true
            });
        }
        else if (action === 'info') {
            const jobData = pendingJobs.get(jobId);
            
            const infoEmbed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('📋 Obfuscation Details')
                .setDescription('Phase 1 transforms applied to your script.')
                .addFields(
                    { 
                        name: '🔤 Variable Renaming', 
                        value: 'All local variables renamed to hex format (_0x####)', 
                        inline: false 
                    },
                    { 
                        name: '🔐 String Encoding', 
                        value: 'Strings encoded using Base64/XOR encryption', 
                        inline: false 
                    },
                    { 
                        name: '🧹 Comment Removal', 
                        value: 'All comments removed from source', 
                        inline: false 
                    },
                    { 
                        name: '📦 Whitespace Minify', 
                        value: 'Unnecessary whitespace removed', 
                        inline: false 
                    }
                )
                .setFooter({ text: `Job ID: ${jobId}` })
                .setTimestamp();
            
            await interaction.reply({
                embeds: [infoEmbed],
                ephemeral: true
            });
        }
    },
    
    // Handle select menu interactions
    async handleSelect(interaction) {
        if (!interaction.customId.startsWith('preset_select_')) return;
        
        const jobId = interaction.customId.replace('preset_select_', '');
        const newPreset = interaction.values[0];
        const jobData = pendingJobs.get(jobId);
        
        if (!jobData) {
            return interaction.update({
                content: 'Session expired. Please run the command again.',
                components: [],
                embeds: []
            });
        }
        
        await interaction.update({
            content: `🔄 Re-obfuscating with **${PRESETS[newPreset].emoji} ${PRESETS[newPreset].name}**...`,
            components: []
        });
        
        try {
            const apiResponse = await axios.post(`${API_URL}/api/obfuscate`, {
                code: jobData.sourceCode,
                fileName: jobData.fileName,
                preset: newPreset
            });
            
            const result = apiResponse.data;
            
            if (!result.success) {
                throw new Error(result.error);
            }
            
            const successEmbed = createSuccessEmbed(result, jobData.fileName, newPreset);
            
            const obfuscatedBuffer = Buffer.from(result.code, 'utf-8');
            const obfuscatedFileName = jobData.fileName.replace(/\.(lua|luau)$/, '_obfuscated.$1');
            const attachment = new AttachmentBuilder(obfuscatedBuffer, { name: obfuscatedFileName });
            
            await interaction.followUp({
                embeds: [successEmbed],
                files: [attachment]
            });
            
        } catch (error) {
            await interaction.followUp({
                embeds: [createErrorEmbed(error.message)],
                ephemeral: true
            });
        }
    }
};

// Helper functions
function createSuccessEmbed(result, fileName, preset) {
    const presetInfo = PRESETS[preset];
    
    const embed = new EmbedBuilder()
        .setColor(presetInfo.color)
        .setTitle('🛡️ LuaGuard Obfuscation Complete')
        .setDescription(`Successfully protected \`${fileName}\``)
        .addFields(
            { 
                name: '📁 File', 
                value: `\`${fileName}\``, 
                inline: true 
            },
            { 
                name: '⚙️ Preset', 
                value: `${presetInfo.emoji} ${presetInfo.name}`, 
                inline: true 
            },
            { 
                name: '⏱️ Time', 
                value: result.stats.processTime, 
                inline: true 
            },
            { 
                name: '📊 Size', 
                value: `${formatBytes(result.stats.originalSize)} → ${formatBytes(result.stats.obfuscatedSize)}`, 
                inline: true 
            },
            { 
                name: '📈 Ratio', 
                value: result.stats.compressionRatio, 
                inline: true 
            },
            { 
                name: '🔑 Job ID', 
                value: `\`${result.jobId}\``, 
                inline: true 
            }
        );
    
    // Add transforms
    let transformsText = '';
    for (const transform of result.stats.transformsApplied) {
        transformsText += `${transform.icon} **${transform.name}**\n`;
        
        // Add details
        for (const [key, value] of Object.entries(transform.details)) {
            const formattedKey = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            transformsText += `   └ ${formattedKey}: \`${value}\`\n`;
        }
    }
    
    embed.addFields({
        name: '🔧 Transforms Applied',
        value: transformsText || 'None',
        inline: false
    });
    
    embed.setFooter({ 
        text: `LuaGuard v1.0.0 • Phase 1` 
    })
    .setTimestamp();
    
    return embed;
}

function createErrorEmbed(message) {
    return new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('❌ Obfuscation Failed')
        .setDescription(message)
        .setTimestamp();
}

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
