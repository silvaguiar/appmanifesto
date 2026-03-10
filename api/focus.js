export default async function handler(req, res) {
  // Configuração rígida de CORS exigida pela Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Focus-Token, X-Focus-Ambiente'
  );

  // Tratamento de preflight requistion do navegador (CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Direcionamento do ambiente Focus (producao X homologacao)
  const env = req.headers['x-focus-ambiente'] === 'producao' ? 'api' : 'homologacao';
  const targetHost = `https://${env}.focusnfe.com.br`;

  // Pegamos o caminho destino enviado via Query Param (?path=/v2/mdfe...)
  const apiPath = req.query.path || '';
  if (!apiPath) {
    return res.status(400).json({ error: 'Faltando o parâmetro path na URL' });
  }

  const url = `${targetHost}${apiPath}`;
  const token = req.headers['x-focus-token'];

  const options = {
    method: req.method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = 'Basic ' + Buffer.from(token + ':').toString('base64');
  }

  // Se houver corpo, o Vercel Serverless já faz parse JSON em req.body
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
    options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  }

  try {
    const response = await fetch(url, options);
    
    // Ler o retorno como texto para prevenir erro em PDFs/HTMLs perdidos, e aí processar JSON
    const textData = await response.text();
    let data;
    try {
      data = JSON.parse(textData);
    } catch {
      data = { content: textData }; // Se falhar no parse, envolvemos num object JSON seguro
    }

    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Erro de gateway na Proxy Vercel: ' + error.message });
  }
}
