// Script para substituir cores vermelhas por verdes em todos os arquivos HTML
// Este script deve ser executado no diretório raiz do projeto

const fs = require('fs');
const path = require('path');

// Mapeamento de cores vermelhas para verdes
const colorMap = {
    '#DC143C': '#00ff88',
    '#8B0000': '#00cc6e',
    '#E30613': '#00ff88',
    '#FF1744': '#0dff9a',
    'rgba(220, 20, 60': 'rgba(0, 255, 136',
    'rgba(139, 0, 0': 'rgba(0, 204, 110',
    'rgba(227, 6, 19': 'rgba(0, 255, 136',
    '--spfc-vermelho: #DC143C': '--primary-color: #00ff88',
    '--spfc-vermelho-escuro: #8B0000': '--primary-dark: #00cc6e',
    'var(--spfc-vermelho)': 'var(--primary-color)',
    'var(--spfc-vermelho-escuro)': 'var(--primary-dark)',
};

// Mapeamento de textos
const textMap = {
    'SPFC': 'SLICED',
    'SÃO PAULO FC': 'SLICED',
    'São Paulo FC': 'SLICED',
    'LOGO-SPFC.png': 'LOGO-SLICED.png',
    'spfc@gmail.com': 'sliced@gmail.com',
};

function replaceInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        // Substituir cores
        for (const [oldColor, newColor] of Object.entries(colorMap)) {
            if (content.includes(oldColor)) {
                content = content.replace(new RegExp(oldColor.replace(/[()]/g, '\\$&'), 'g'), newColor);
                modified = true;
            }
        }

        // Substituir textos
        for (const [oldText, newText] of Object.entries(textMap)) {
            if (content.includes(oldText)) {
                content = content.replace(new RegExp(oldText, 'g'), newText);
                modified = true;
            }
        }

        if (modified) {
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ Atualizado: ${filePath}`);
            return true;
        }
        return false;
    } catch (error) {
        console.error(`❌ Erro ao processar ${filePath}:`, error.message);
        return false;
    }
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    let count = 0;

    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            count += processDirectory(filePath);
        } else if (file.endsWith('.html') || file.endsWith('.css')) {
            if (replaceInFile(filePath)) {
                count++;
            }
        }
    });

    return count;
}

// Executar
const rootDir = process.cwd();
console.log('🚀 Iniciando substituição de cores e textos...\n');
const filesModified = processDirectory(rootDir);
console.log(`\n✨ Concluído! ${filesModified} arquivos foram modificados.`);
