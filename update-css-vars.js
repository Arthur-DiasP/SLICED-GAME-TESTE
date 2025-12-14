// Script para padronizar nomes de variáveis CSS
const fs = require('fs');
const path = require('path');

// Mapeamento de nomes de variáveis antigas para novas
const varMap = {
    '--spfc-vermelho': '--primary-color',
    '--spfc-vermelho-escuro': '--primary-dark',
    '--spfc-branco': '--text-primary',
    '--spfc-preto': '--dark-bg',
    'var(--spfc-vermelho)': 'var(--primary-color)',
    'var(--spfc-vermelho-escuro)': 'var(--primary-dark)',
    'var(--spfc-branco)': 'var(--text-primary)',
    'var(--spfc-preto)': 'var(--dark-bg)',
};

function replaceInFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;

        for (const [oldVar, newVar] of Object.entries(varMap)) {
            if (content.includes(oldVar)) {
                content = content.replace(new RegExp(oldVar.replace(/[()]/g, '\\$&'), 'g'), newVar);
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

const rootDir = process.cwd();
console.log('🚀 Padronizando nomes de variáveis CSS...\n');
const filesModified = processDirectory(rootDir);
console.log(`\n✨ Concluído! ${filesModified} arquivos foram modificados.`);
