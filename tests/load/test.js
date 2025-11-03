import http from 'k6/http';
import { sleep, check } from 'k6';

// Configuração do teste
export let options = {
    vus: 100,            // 100 usuários simultâneos
    duration: '30s',     // por 30 segundos
    // Ignore as verificações de SSL/TLS (útil para localhost e ambientes de teste)
    insecureSkipTLSVerify: true, 
};

export default function () {
    // Definindo variáveis para simular autenticação (se necessário)
    let authToken = 'fake-token-xyz'; // Substituto: Capturar do login real
    let commonHeaders = {
        'Content-Type': 'application/json',
        // Adicione o token de autenticação se for um POST real:
        // 'Authorization': `Bearer ${authToken}` 
    };

    // 1️⃣ Login (Simulado, idealmente seria um POST)
    let loginRes = http.get('http://localhost:3000/login');
    check(loginRes, { 'Login: status é 200': (r) => r.status === 200 });
    sleep(Math.random() * 3 + 1); // Usuário pensa 1 a 4 segundos

    // 2️⃣ Carregar dashboard
    let dashboardRes = http.get('http://localhost:3000/dashboard');
    check(dashboardRes, { 'Dashboard: status é 200': (r) => r.status === 200 });
    sleep(Math.random() * 4 + 2); // Usuário pensa 2 a 6 segundos

    // 3️⃣ Buscar dados do usuário (ex: /api/user)
    let userRes = http.get('http://localhost:3000/robots');
    check(userRes, { 'User Data: status é 200': (r) => r.status === 200 });
    sleep(Math.random() * 2 + 1); // Usuário pensa 1 a 3 segundos

    // 4️⃣ Buscar dados do portfólio (ex: /api/portfolios)
    let portfolioRes = http.get('http://localhost:3000/portfolios');
    check(portfolioRes, { 'Portfolio Data: status é 200': (r) => r.status === 200 });
    sleep(Math.random() * 4 + 2); // Usuário pensa 2 a 6 segundos

    // 5️⃣ Criar ou salvar algo (POST)
    let portfolioPayload = JSON.stringify({
        name: `Portfolio Teste ${__VU}-${__ITER}`, // Nome exclusivo
        active: true,
        strategy_id: 'XYZ123' 
    });
    
    // Rota de POST simplificada, sem query string complexa
    let postRes = http.post('http://localhost:3000/api/save_portfolio', portfolioPayload, { headers: commonHeaders });
    
    check(postRes, { 
        'Save Portfolio: status é 200 ou 201': (r) => r.status === 200 || r.status === 201 
    });
    sleep(1); 
}