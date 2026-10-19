# Site de molduras · COREN-AM 2026

O projeto está pronto para publicar na Netlify. As três artes originais e os dois panfletos estão incluídos. O editor funciona no próprio navegador; o contador compartilhado e o mural usam Netlify Functions e Netlify Blobs.

## Publicar pela Netlify

1. Extraia o ZIP. Coloque o conteúdo da pasta `coren-am` em um repositório seu no GitHub, GitLab ou Bitbucket. Não inclua `node_modules`.
2. Na Netlify, importe esse repositório para um novo projeto.
3. Mantenha a pasta base na raiz do projeto, comando de build `npm run build`, diretório de publicação `site` e funções em `netlify/functions`. O arquivo `netlify.toml` já define esses valores e Node 22.
4. Publique. As funções usam o armazenamento `coren-am-campanha-2026`, criado automaticamente no primeiro uso dentro do seu site Netlify. Nenhuma chave precisa aparecer no código do navegador.
5. Abra a URL HTTPS publicada. Teste uma foto, confira o contador e retire sua foto de teste do mural.

**Enviar apenas a pasta `site` por arrastar e soltar não publica o contador e o mural.** Use a importação do repositório ou a CLI para publicar também as funções.

### Alternativa pelo terminal

Com Node.js 22 ou superior, abra um terminal na pasta extraída `coren-am`:

```sh
npm ci
npm test
npx netlify-cli login
npx netlify-cli deploy --build --prod
```

Escolha sua conta e crie ou vincule o site correto. O último comando publica em produção. O processo de login e escolha da conta é feito por você. Custos e limites de uso seguem seu plano Netlify.

## Usar localmente

```sh
npm run dev
```

Abra `http://127.0.0.1:4173`. A prévia local possui contador e mural separados da produção, gravados em um arquivo temporário do sistema. Não precisa conectar uma conta para testar. Pare com Ctrl+C. Abrir `index.html` diretamente como arquivo não reproduz as funções de servidor.

## Comportamento entregue

- Chapa 2: enfermeiros, Quadro I. Chapa 1: técnicos e auxiliares, Quadros II e III. A opção conjunta destaca 2 → 1 como sequência de apoio da campanha, preservando as categorias.
- Textos e composição das chapas extraídos visualmente dos dois panfletos enviados; há links para os PDFs completos. As propostas são apresentadas como propostas da campanha.
- Editor fixo de 320 × 320 pixels CSS em todos os dispositivos, conforme o pedido de não alterar a área das molduras. A página reorganiza suas colunas no celular. Exportação sempre em 1000 × 1000 pixels, sem deformar as artes.
- Seleção de foto, arraste, gesto com dois dedos, zoom de 30% a 300%, botões direcionais, setas do teclado e reinício do ajuste.
- JPG, PNG e WebP aceitos. HEIC depende do suporte do navegador; o site informa quando não consegue abrir. Fotos até 35 MB são reduzidas internamente para controlar o uso de memória.
- A moldura escolhida é lembrada no aparelho. A foto original não é enviada ao servidor.
- O mural automático vem ativado e explicado ao lado do botão de download. A pessoa pode desmarcar antes de baixar. Somente a foto final reduzida é publicada; o PNG baixado mantém a resolução completa.
- São exibidas as 36 publicações mais recentes. As anteriores permanecem armazenadas. A própria pessoa pode retirar uma publicação visível usando o navegador onde a publicou. Limpar os dados do navegador remove a chave local de retirada.
- O contador representa ações de download e compartilhamento, não pessoas, votos nem confirmação de salvamento na galeria. A mesma imagem preparada não é contada duas vezes ao repetir o botão. Novos ajustes, outra chapa ou nova sessão podem gerar outra contagem. Os totais persistem entre visitantes e novas publicações do mesmo site Netlify.
- Falhas de rede não impedem o download. O site informa quando não conseguiu atualizar o contador ou publicar a foto; repetir o download tenta registrar novamente sem duplicação.

## Salvar no Android, iPhone e computador

“Baixar minha moldura” oferece um PNG para download. “Salvar no celular / compartilhar” usa o compartilhamento nativo quando o navegador oferece suporte a arquivos.

No iPhone, a pessoa escolhe “Salvar Imagem” quando essa opção estiver disponível. No Android, pode usar Downloads ou um aplicativo de fotos. Sem suporte ao compartilhamento, o site mostra a imagem para tocar e segurar e um link para baixar.

**Um site não consegue gravar silenciosamente na galeria de todos os aparelhos.** O sistema e o navegador controlam a confirmação e o destino. Essa limitação está explicada no site. As opções nativas devem ser verificadas em um iPhone e um Android reais após publicar em HTTPS.

## Administração do mural

No painel da Netlify, em variáveis de ambiente, defina opcionalmente `MURAL_ADMIN_TOKEN` com um segredo longo e exclusivo disponível para Functions, e publique novamente. Não coloque esse segredo em arquivos públicos nem no JavaScript do site.

Para retirar uma imagem sem a chave do autor, use uma ferramenta de API autenticada:

- Método: `DELETE`
- Endereço: `https://SEU-SITE/.netlify/functions/campaign`
- Cabeçalhos: `Content-Type: application/json` e `Authorization: Bearer SEU_SEGREDO`
- Corpo: `{"id":"IDENTIFICADOR_DA_PUBLICACAO"}`

Os IDs das 36 publicações visíveis estão na resposta GET desse mesmo endereço. Para publicações antigas, consulte o armazenamento Blobs no painel Netlify. Excluir uma foto mantém o registro de download. Não há painel administrativo público.

As requisições têm limite de tamanho, validação de tipo, restrição de origem e limite configurado de 60 requisições por IP/domínio por minuto. O mural aceita publicação imediata, sem aprovação prévia; acompanhe as imagens e remova conteúdo indevido quando necessário. O contador não é uma ferramenta antifraude. Para campanhas com grande volume, a listagem dos eventos pode ser substituída por um banco com agregação.

## Arquivos e personalização

- `site/index.html`: estrutura e textos gerais.
- `site/style.css`: cores, espaçamentos e layout.
- `site/app.js`: dados das chapas, editor, download e mural.
- `site/assets/`: molduras originais, panfletos e ícone do site.
- `netlify/functions/campaign.mjs`: entrada da função e limite de requisições.
- `netlify/lib/service.mjs`: contador, persistência, validação e remoção.
- `tests/service.test.mjs`: testes do serviço, incluindo concorrência e repetição após falha.

## Verificação realizada

Build e sete testes de serviço aprovados. Fluxos de upload, zoom, setas, três exportações, identificação da chapa, deduplicação, mural, download privado, retirada e alternativa de compartilhamento verificados em Chromium. Layout conferido em 360, 390, 768 e 1440 pixels, mantendo o editor fixo. Exportações conferidas visualmente. Dependências verificadas sem vulnerabilidades conhecidas na consulta realizada.

A aplicação ainda não foi publicada em sua conta Netlify. Armazenamento real, rate limiting na infraestrutura e opções nativas dos celulares dependem da publicação e devem ser conferidos nesse ambiente.

## Referências técnicas

- [Netlify Blobs](https://docs.netlify.com/build/data-and-storage/netlify-blobs/)
- [Configuração de Netlify Functions](https://docs.netlify.com/build/functions/configuration/)
- [Limites de requisições](https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/)
- [Compartilhamento de arquivos no navegador](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
