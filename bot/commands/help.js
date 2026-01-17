const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show LuaGuard help and information'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(0x3498DB)
            .setTitle('🛡️ LuaGuard Obfuscator')
            .setDescription('Professional Lua/Luau obfuscator for Roblox scripts.')
            .addFields(
                {
                    name: '📖 Commands',
                    value: [
                        '`/obfuscate` - Obfuscate a Lua script',
                        '`/help` - Show this help message'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚙️ Presets',
                    value: [
                        '⚡ **Performance** - Minimal obfuscation, maximum speed',
                        '⚖️ **Balanced** - Good security and performance (recommended)',
                        '🔒 **Max Security** - Maximum protection',
                        '🔧 **Manual** - Custom settings'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '🔧 Phase 1 Features',
                    value: [
                        '✓ Variable Renaming (hex, short, mixed)',
                        '✓ String Encoding (Base64, Hex, XOR)',
                        '✓ Comment Removal',
                        '✓ Whitespace Minification'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '📋 Usage',
                    value: [
                        '1. Use `/obfuscate` command',
                        '2. Upload your `.lua` or `.luau` file',
                        '3. Select a preset',
                        '4. Download your protected script!'
                    ].join('\n'),
                    inline: false
                },
                {
                    name: '⚠️ Limitations',
                    value: [
                        '• Max file size: 500KB',
                        '• Supported: Lua 5.1, Luau',
                        '• Roblox API compatible'
                    ].join('\n'),
                    inline: false
                }
            )
            .setFooter({ text: 'LuaGuard v1.0.0 • Phase 1' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    }
};
