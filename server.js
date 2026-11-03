const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'livros.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Tipos MIME para servir ficheiros estáticos
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon'
};

// Funções utilitárias de leitura e escrita no ficheiro
function lerLivros() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
      fs.writeFileSync(DATA_FILE, '[]');
      return [];
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error('Erro ao ler livros:', err);
    return [];
  }
}

function salvarLivros(livros) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(livros, null, 2), 'utf-8');
}

// Utilitário para ler o corpo da requisição POST/PUT
function obterCorpoRequisicao(req) {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', chunk => {
      corpo += chunk.toString();
    });
    req.on('end', () => {
      try {
        const dados = corpo ? JSON.parse(corpo) : {};
        resolve(dados);
      } catch (e) {
        reject(new Error('JSON mal formatado.'));
      }
    });
    req.on('error', err => reject(err));
  });
}

// Resposta JSON padronizada
function enviarJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

// Servidor principal
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Lidar com CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- ROTAS DA API REST (/api/livros) ---
  if (pathname.startsWith('/api/livros')) {
    const segmentos = pathname.split('/').filter(Boolean); // ['api', 'livros', ?id]
    const id = segmentos[2];
    const livros = lerLivros();

    // 1. GET /api/livros -> Listar todos os livros
    if (pathname === '/api/livros' && method === 'GET') {
      return enviarJSON(res, 200, livros);
    }

    // 2. GET /api/livros/:id -> Consultar um livro
    if (id && method === 'GET') {
      const livro = livros.find(l => l.id.toString() === id.toString());
      if (!livro) {
        return enviarJSON(res, 404, { erro: 'Livro não encontrado.' });
      }
      return enviarJSON(res, 200, livro);
    }

    // 3. POST /api/livros -> Cadastrar um livro
    if (pathname === '/api/livros' && method === 'POST') {
      try {
        const dados = await obterCorpoRequisicao(req);
        const { titulo, autor, isbn, anoPublicacao, genero, status, capaUrl } = dados;

        // Validações
        if (!titulo || !autor || !anoPublicacao || !genero || !status) {
          return enviarJSON(res, 400, { erro: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        const statusPermitidos = ['Quero ler', 'Lendo', 'Concluído'];
        if (!statusPermitidos.includes(status)) {
          return enviarJSON(res, 400, { erro: 'Status inválido. Escolha entre: Quero ler, Lendo ou Concluído.' });
        }

        if (isNaN(Number(anoPublicacao))) {
          return enviarJSON(res, 400, { erro: 'Ano de publicação deve ser um número válido.' });
        }

        // Validação de ISBN duplicado (se informado)
        if (isbn && isbn.trim() !== '') {
          const isbnExistente = livros.some(l => l.isbn && l.isbn.trim() === isbn.trim());
          if (isbnExistente) {
            return enviarJSON(res, 409, { erro: 'O ISBN informado já se encontra registado.' });
          }
        }

        const novoLivro = {
          id: Date.now().toString(), // ID gerado automaticamente
          titulo: titulo.trim(),
          autor: autor.trim(),
          isbn: isbn ? isbn.trim() : '',
          anoPublicacao: Number(anoPublicacao),
          genero: genero.trim(),
          status: status,
          capaUrl: capaUrl || ''
        };

        livros.push(novoLivro);
        salvarLivros(livros);
        return enviarJSON(res, 201, novoLivro);
      } catch (err) {
        return enviarJSON(res, 400, { erro: err.message || 'Erro ao processar requisição.' });
      }
    }

    // 4. PUT /api/livros/:id -> Atualizar um livro
    if (id && method === 'PUT') {
      try {
        const dados = await obterCorpoRequisicao(req);
        const indice = livros.findIndex(l => l.id.toString() === id.toString());

        if (indice === -1) {
          return enviarJSON(res, 404, { erro: 'Livro não encontrado.' });
        }

        const { titulo, autor, isbn, anoPublicacao, genero, status, capaUrl } = dados;

        if (!titulo || !autor || !anoPublicacao || !genero || !status) {
          return enviarJSON(res, 400, { erro: 'Todos os campos obrigatórios devem ser preenchidos.' });
        }

        const statusPermitidos = ['Quero ler', 'Lendo', 'Concluído'];
        if (!statusPermitidos.includes(status)) {
          return enviarJSON(res, 400, { erro: 'Status inválido. Escolha entre: Quero ler, Lendo ou Concluído.' });
        }

        if (isNaN(Number(anoPublicacao))) {
          return enviarJSON(res, 400, { erro: 'Ano de publicação deve ser um valor numérico.' });
        }

        // Validação de ISBN duplicado em outro livro
        if (isbn && isbn.trim() !== '') {
          const isbnDuplicado = livros.some(l => l.id.toString() !== id.toString() && l.isbn && l.isbn.trim() === isbn.trim());
          if (isbnDuplicado) {
            return enviarJSON(res, 409, { erro: 'Este ISBN já está associado a outro livro.' });
          }
        }

        livros[indice] = {
          ...livros[indice],
          titulo: titulo.trim(),
          autor: autor.trim(),
          isbn: isbn ? isbn.trim() : '',
          anoPublicacao: Number(anoPublicacao),
          genero: genero.trim(),
          status: status,
          capaUrl: capaUrl || livros[indice].capaUrl || ''
        };

        salvarLivros(livros);
        return enviarJSON(res, 200, livros[indice]);
      } catch (err) {
        return enviarJSON(res, 400, { erro: err.message || 'Erro ao atualizar livro.' });
      }
    }

    // 5. DELETE /api/livros/:id -> Excluir um livro
    if (id && method === 'DELETE') {
      const indice = livros.findIndex(l => l.id.toString() === id.toString());
      if (indice === -1) {
        return enviarJSON(res, 404, { erro: 'Livro não encontrado.' });
      }

      const [livroRemovido] = livros.splice(indice, 1);
      salvarLivros(livros);
      return enviarJSON(res, 200, { mensagem: 'Livro excluído com sucesso.', livro: livroRemovido });
    }

    return enviarJSON(res, 404, { erro: 'Rota da API inexistente.' });
  }

  // --- SERVIR FICHEIROS ESTÁTICOS (FRONT-END) ---
  let caminhoFicheiro = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const extname = String(path.extname(caminhoFicheiro)).toLowerCase();
  const contentType = MIME_TYPES[extname] || 'application/octet-stream';

  fs.readFile(caminhoFicheiro, (err, conteudo) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 - Ficheiro não encontrado.');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 - Erro interno do servidor.');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(conteudo, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Servidor a executar em: http://localhost:${PORT}`);
});