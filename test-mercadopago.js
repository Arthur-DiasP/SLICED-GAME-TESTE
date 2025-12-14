// Script de Teste - Integração Mercado Pago
// Execute este arquivo com: node test-mercadopago.js

const dotenv = require('dotenv');
const { MercadoPagoConfig, Payment } = require('mercadopago');

// Carrega variáveis de ambiente
dotenv.config();

const MERCADO_PAGO_ACCESS_TOKEN = process.env.MERCADO_PAGO_ACCESS_TOKEN;

console.log('🧪 Iniciando teste de integração com Mercado Pago...\n');

if (!MERCADO_PAGO_ACCESS_TOKEN) {
    console.error('❌ ERRO: Token do Mercado Pago não encontrado no arquivo .env');
    console.log('📝 Adicione a variável MERCADO_PAGO_ACCESS_TOKEN ao arquivo .env');
    process.exit(1);
}

console.log('✅ Token encontrado:', MERCADO_PAGO_ACCESS_TOKEN.substring(0, 20) + '...');

// Configurar cliente
const client = new MercadoPagoConfig({
    accessToken: MERCADO_PAGO_ACCESS_TOKEN,
    options: {
        timeout: 5000
    }
});

const paymentClient = new Payment(client);

console.log('✅ Cliente Mercado Pago configurado com sucesso\n');

// Teste de criação de pagamento PIX
async function testCreatePixPayment() {
    console.log('🔵 Testando criação de pagamento PIX...\n');

    const paymentData = {
        transaction_amount: 10.00,
        description: 'Teste de Pagamento PIX - SLICED',
        payment_method_id: 'pix',
        payer: {
            email: 'teste@email.com',
            first_name: 'João',
            last_name: 'Teste',
            identification: {
                type: 'CPF',
                number: '12345678909' // CPF de teste
            }
        }
    };

    try {
        console.log('📤 Enviando requisição para Mercado Pago...');
        const payment = await paymentClient.create({ body: paymentData });

        console.log('\n✅ SUCESSO! Pagamento criado com sucesso!\n');
        console.log('📋 Detalhes do Pagamento:');
        console.log('   - ID:', payment.id);
        console.log('   - Status:', payment.status);
        console.log('   - Valor:', payment.transaction_amount);
        console.log('   - Descrição:', payment.description);

        if (payment.point_of_interaction?.transaction_data) {
            const qrCode = payment.point_of_interaction.transaction_data.qr_code;
            const qrCodeBase64 = payment.point_of_interaction.transaction_data.qr_code_base64;

            console.log('\n💳 Dados PIX:');
            console.log('   - QR Code (Copia e Cola):', qrCode ? qrCode.substring(0, 50) + '...' : 'N/A');
            console.log('   - QR Code Base64:', qrCodeBase64 ? 'Disponível ✅' : 'Não disponível ❌');
        } else {
            console.log('\n⚠️  ATENÇÃO: Dados de QR Code não disponíveis na resposta');
        }

        console.log('\n🎉 Teste concluído com sucesso!');
        return true;

    } catch (error) {
        console.error('\n❌ ERRO ao criar pagamento:');
        console.error('   - Mensagem:', error.message);
        
        if (error.cause) {
            console.error('   - Causa:', JSON.stringify(error.cause, null, 2));
        }
        
        if (error.response?.data) {
            console.error('   - Resposta da API:', JSON.stringify(error.response.data, null, 2));
        }

        return false;
    }
}

// Executar teste
testCreatePixPayment()
    .then((success) => {
        if (success) {
            console.log('\n✅ Todos os testes passaram!');
            process.exit(0);
        } else {
            console.log('\n❌ Teste falhou. Verifique as mensagens de erro acima.');
            process.exit(1);
        }
    })
    .catch((error) => {
        console.error('\n❌ Erro inesperado:', error);
        process.exit(1);
    });
