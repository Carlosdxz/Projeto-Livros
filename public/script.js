document.addEventListener('DOMContentLoaded', () => {
  // Elementos do DOM
  const form = document.getElementById('livro-form');
  const inputId = document.getElementById('livro-id');
  const inputTitulo = document.getElementById('titulo');
  const inputAutor = document.getElementById('autor');
  const inputIsbn = document.getElementById('isbn');
  const inputAno = document.getElementById('anoPublicacao');
  const inputGenero = document.getElementById('genero');
  const selectStatus = document.getElementById('status');
  const inputCapaUrl = document.getElementById('capa-url');
  
  const previewContainer = document.getElementById('preview-capa-container');
  const previewImg = document.getElementById('preview-capa');
  const formTitulo = document.getElementById('form-titulo');
  const btnSubmit = document.getElementById('btn-submit');
  const btnCancelar = document.getElementById('btn-cancelar');

  const tabelaBody = document.getElementById('tabela-livros');
  const tabelaVazia = document.getElementById('tabela-vazia');
  const filtroTitulo = document.getElementById('filtro-titulo');
  const alertaDiv = document.getElementById('mensagem-alerta');

  const inputOpenLibrary = document.getElementById('termo-openlibrary');
  const btnBuscarApi = document.getElementById('btn-buscar-api');
  const loadingApi = document.getElementById('loading-api');
  const resultadoApi = document.getElementById('resultado-api');

  let acervo = [];

  // Exibir mensagens de sucesso e erro
  function exibirAlerta(mensagem, tipo = 'sucesso') {
    alertaDiv.textContent = mensagem;
    alertaDiv.className = `alerta alerta-${tipo}`;
    alertaDiv.classList.remove('oculto');
    setTimeout(() => {
      alertaDiv.classList.add('oculto');
    }, 4500);
  }

  // Obter classe CSS de status
  function obterClasseStatus(status) {
    switch (status) {
      case 'Quero ler': return 'status-quero-ler';
      case 'Lendo': return 'status-lendo';
      case 'Concluído': return 'status-concluido';
      default: return '';
    }
  }

  // --- CRUD: Carregar Livros (GET) ---
  async function carregarLivros() {
    try {
      const res = await fetch('/api/livros');
      if (!res.ok) throw new Error('Não foi possível carregar a lista de livros.');
      acervo = await res.json();
      renderizarTabela(acervo);
    } catch (err) {
      exibirAlerta(err.message, 'erro');
    }
  }

  // Renderizar a tabela
  function renderizarTabela(lista) {
    tabelaBody.innerHTML = '';
    if (lista.length === 0) {
      tabelaVazia.classList.remove('oculto');
      return;
    }
    tabelaVazia.classList.add('oculto');

    lista.forEach(livro => {
      const tr = document.createElement('tr');
      const capaSrc = livro.capaUrl || 'https://via.placeholder.com/40x55?text=Sem+Capa';

      tr.innerHTML = `
        <td><img src="${capaSrc}" alt="${livro.titulo}" class="thumb-capa"></td>
        <td><strong>${livro.titulo}</strong></td>
        <td>${livro.autor}</td>
        <td>${livro.isbn || '-'}</td>
        <td>${livro.anoPublicacao}</td>
        <td>${livro.genero}</td>
        <td><span class="status-badge ${obterClasseStatus(livro.status)}">${livro.status}</span></td>
        <td>
          <button class="btn btn-edit" data-id="${livro.id}">Editar</button>
          <button class="btn btn-danger" data-id="${livro.id}">Excluir</button>
        </td>
      `;

      tr.querySelector('.btn-edit').addEventListener('click', () => carregarParaEdicao(livro.id));
      tr.querySelector('.btn-danger').addEventListener('click', () => excluirLivro(livro.id));

      tabelaBody.appendChild(tr);
    });
  }

  // --- CRUD: Salvar / Atualizar (POST / PUT) ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = inputId.value;
    const livroData = {
      titulo: inputTitulo.value.trim(),
      autor: inputAutor.value.trim(),
      isbn: inputIsbn.value.trim(),
      anoPublicacao: inputAno.value,
      genero: inputGenero.value.trim(),
      status: selectStatus.value,
      capaUrl: inputCapaUrl.value
    };

    const urlEndpoint = id ? `/api/livros/${id}` : '/api/livros';
    const metodoHttp = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(urlEndpoint, {
        method: metodoHttp,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(livroData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.erro || 'Ocorreu um erro no processamento.');
      }

      exibirAlerta(id ? 'Livro atualizado com sucesso!' : 'Livro registado com sucesso!');
      limparFormulario();
      carregarLivros();
    } catch (err) {
      exibirAlerta(err.message, 'erro');
    }
  });

  // --- CRUD: Carregar para Edição ---
  async function carregarParaEdicao(id) {
    try {
      const res = await fetch(`/api/livros/${id}`);
      if (!res.ok) throw new Error('Falha ao obter detalhes do livro.');
      const livro = await res.json();

      inputId.value = livro.id;
      inputTitulo.value = livro.titulo;
      inputAutor.value = livro.autor;
      inputIsbn.value = livro.isbn || '';
      inputAno.value = livro.anoPublicacao;
      inputGenero.value = livro.genero;
      selectStatus.value = livro.status;
      inputCapaUrl.value = livro.capaUrl || '';

      if (livro.capaUrl) {
        previewImg.src = livro.capaUrl;
        previewContainer.classList.remove('oculto');
      } else {
        previewContainer.classList.add('oculto');
      }

      formTitulo.textContent = 'Editar Livro';
      btnSubmit.textContent = 'Guardar Alterações';
      btnCancelar.classList.remove('oculto');
      window.scrollTo({ top: form.offsetTop, behavior: 'smooth' });
    } catch (err) {
      exibirAlerta(err.message, 'erro');
    }
  }

  // --- CRUD: Excluir com Confirmação (DELETE) ---
  async function excluirLivro(id) {
    const confirmacao = window.confirm('Tem a certeza de que deseja excluir este livro do acervo?');
    if (!confirmacao) return;

    try {
      const res = await fetch(`/api/livros/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro || 'Erro ao excluir livro.');

      exibirAlerta('Livro excluído com sucesso!');
      carregarLivros();
    } catch (err) {
      exibirAlerta(err.message, 'erro');
    }
  }

  // Limpar formulário
  btnCancelar.addEventListener('click', limparFormulario);
  function limparFormulario() {
    form.reset();
    inputId.value = '';
    inputCapaUrl.value = '';
    previewContainer.classList.add('oculto');
    formTitulo.textContent = '2. Registar Novo Livro';
    btnSubmit.textContent = 'Salvar Livro';
    btnCancelar.classList.add('oculto');
  }

  // Filtragem local por título
  filtroTitulo.addEventListener('input', (e) => {
    const termo = e.target.value.toLowerCase().trim();
    const filtrados = acervo.filter(l => l.titulo.toLowerCase().includes(termo));
    renderizarTabela(filtrados);
  });

  // --- INTEGRAÇÃO COM OPEN LIBRARY ---
  btnBuscarApi.addEventListener('click', async () => {
    const termo = inputOpenLibrary.value.trim();
    if (!termo) {
      exibirAlerta('Digite um título para consultar na Open Library.', 'erro');
      return;
    }

    loadingApi.classList.remove('oculto');
    resultadoApi.innerHTML = '';

    try {
      const urlConsulta = `https://openlibrary.org/search.json?title=${encodeURIComponent(termo)}&limit=4`;
      const res = await fetch(urlConsulta);
      if (!res.ok) throw new Error('Falha ao comunicar com a Open Library.');

      const dados = await res.json();
      loadingApi.classList.add('oculto');

      if (!dados.docs || dados.docs.length === 0) {
        resultadoApi.innerHTML = '<p style="color: var(--text-muted);">Nenhum resultado encontrado. Prossiga com o registo manual abaixo.</p>';
        return;
      }

      dados.docs.forEach(doc => {
        const titulo = doc.title || 'Título Desconhecido';
        const autor = doc.author_name ? doc.author_name[0] : 'Autor Desconhecido';
        const ano = doc.first_publish_year || '';
        const isbn = doc.isbn ? doc.isbn[0] : '';
        const coverId = doc.cover_i;
        const capaUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : '';

        const cardItem = document.createElement('div');
        cardItem.className = 'item-api';
        cardItem.innerHTML = `
          <img src="${capaUrl || 'https://via.placeholder.com/50x75?text=Capa'}" alt="Capa">
          <div class="item-api-info">
            <div>
              <strong>${titulo}</strong><br>
              <small>${autor} (${ano || 'S/D'})</small>
            </div>
            <button type="button" class="btn btn-primary" style="margin-top: 6px; padding: 4px 8px; font-size: 0.75rem;">Usar Dados</button>
          </div>
        `;

        cardItem.querySelector('button').addEventListener('click', () => {
          inputTitulo.value = titulo;
          inputAutor.value = autor;
          inputAno.value = ano;
          inputIsbn.value = isbn;
          inputCapaUrl.value = capaUrl;

          if (capaUrl) {
            previewImg.src = capaUrl;
            previewContainer.classList.remove('oculto');
          } else {
            previewContainer.classList.add('oculto');
          }

          exibirAlerta('Formulário preenchido com dados da Open Library!');
          form.scrollIntoView({ behavior: 'smooth' });
        });

        resultadoApi.appendChild(cardItem);
      });
    } catch (err) {
      loadingApi.classList.add('oculto');
      exibirAlerta('Não foi possível consultar a API externa. O registo manual está disponível.', 'erro');
    }
  });

  // Inicialização
  carregarLivros();
});