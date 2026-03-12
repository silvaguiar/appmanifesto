// ============================================
// Backend Proxy Server for Focus NFe API
// ============================================
// This server proxies requests to Focus NFe API
// to avoid CORS and protect the API token.

import express from 'express';
import cors from 'cors';
const app = express();
const PORT = 3456;

app.use(cors());
app.use(express.json());

// Focus NFe base URLs
const FOCUS_URLS = {
    homologacao: 'https://homologacao.focusnfe.com.br',
    producao: 'https://api.focusnfe.com.br'
};

// Proxy middleware
async function proxyToFocus(req, res) {
    const token = req.headers['x-focus-token'];
    const ambiente = req.headers['x-focus-ambiente'] || 'homologacao';

    if (!token) {
        return res.status(400).json({ error: 'Token da API não informado' });
    }

    const baseUrl = FOCUS_URLS[ambiente] || FOCUS_URLS.homologacao;
    // Obter o sufixo da rota original para enviar à Focus NFe
    let apiPath = req.query.path || '';
    if (!apiPath && req.params.path) {
        // Pega do path do wildcard do Express (*path)
        apiPath = '/' + req.params.path;
    }
    
    // Ouve no format: /v2/empresas
    const targetUrl = `${baseUrl}${apiPath}`;
    console.log(`[PROXY] Roteando para: ${targetUrl}`);

    try {
        const fetchOptions = {
            method: req.method,
            headers: {
                'Authorization': 'Basic ' + Buffer.from(token + ':').toString('base64'),
                'Content-Type': 'application/json',
                'Accept': '*/*'
            }
        };

        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
            fetchOptions.body = JSON.stringify(req.body);
            console.log('\n[PAYLOAD ENVIADO]', JSON.stringify(req.body, null, 2));
            import('fs').then(fs => fs.writeFileSync('payload.json', JSON.stringify(req.body, null, 2)));
        }

        if (req.method === 'DELETE' && req.body && Object.keys(req.body).length > 0) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        const contentType = response.headers.get('content-type') || '';

        // Encaminha o content-type original da Focus NFe
        res.set('Content-Type', contentType || 'application/octet-stream');

        if (contentType.includes('application/json')) {
            const data = await response.json();
            if (!response.ok) {
                console.error(`[FOCUS ERRO ${response.status}]`, JSON.stringify(data));
            }
            res.status(response.status).json(data);
        } else if (contentType.includes('application/pdf') || contentType.includes('application/octet-stream')) {
            // PDF (DAMDFE) — encaminha como stream binário
            const buffer = await response.arrayBuffer();
            res.status(response.status).send(Buffer.from(buffer));
        } else if (contentType.includes('application/xml') || contentType.includes('text/xml')) {
            // XML do MDF-e
            const text = await response.text();
            res.status(response.status).send(text);
        } else {
            const text = await response.text();
            res.status(response.status).send(text);
        }
    } catch (err) {
        console.error('Proxy error:', err.message);
        res.status(500).json({
            error: 'Erro ao comunicar com Focus NFe',
            details: err.message
        });
    }
}

// Routes - proxy all /api/focus requests to Focus NFe
app.all(['/api/focus', '/api/focus/*path'], proxyToFocus);

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`\n  🚀 Proxy Focus NFe rodando em http://localhost:${PORT}`);
    console.log(`  📡 Pronto para comunicar com a SEFAZ\n`);
});

