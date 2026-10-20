# Publicar o site de molduras na Vercel

Esta versão usa apenas a nova moldura conjunta das chapas 2 e 1, os panfletos, o editor e os downloads. O contador e o mural foram adaptados para Vercel Functions + Vercel Blob privado. Não depende da conta Netlify.

## 1. Atualizar o GitHub

1. Extraia `site-coren-am-vercel.zip`.
2. Abra a pasta `coren-am-vercel`.
3. No repositório `moldurascoren`, use **Add file → Upload files**.
4. Envie todo o conteúdo de dentro da pasta, substituindo os arquivos anteriores, e confirme em **Commit changes**.

Na raiz do repositório devem aparecer `vercel.json`, `package.json`, `package-lock.json` e as pastas `api`, `lib`, `site`, `scripts` e `tests`. Não envie a pasta externa como uma subpasta. Não envie `node_modules`.

Se restarem o `netlify.toml` e a pasta `netlify` da versão anterior, eles não são usados por esta versão Vercel. Você pode removê-los depois para organizar o repositório.

## 2. Importar na Vercel

1. Entre em [vercel.com](https://vercel.com) com sua conta.
2. Selecione **Add New → Project** e importe o repositório GitHub `moldurascoren`.
3. Use as configurações abaixo:

| Campo | Valor |
|---|---|
| Framework Preset | Other |
| Root Directory | `./` (raiz do repositório) |
| Build Command | `npm run build` |
| Output Directory | `site` |
| Install Command | Automático (`npm install`) |
| Node.js | 22.x |

O `vercel.json` já contém a configuração do build e das funções. Clique em **Deploy**.

A primeira publicação abre o site e permite criar e baixar as molduras. Para ativar o contador e o mural, conclua o passo 3.

## 3. Ativar o contador e o mural

1. Dentro do projeto, abra **Storage → Create Storage → Blob**.
2. Escolha acesso **Private**. O armazenamento precisa ser privado porque também guarda dados internos para controlar a retirada das fotos.
3. Dê um nome, por exemplo `moldurascoren`, e crie o armazenamento.
4. Conecte esse Blob ao projeto e ao ambiente **Production**. Você também pode conectar Preview para testar: os registros de Preview ficam em uma pasta diferente dos de produção.
5. Deixe os nomes padrão das variáveis que a Vercel cria. A biblioteca usa a conexão automática (`BLOB_STORE_ID` com autenticação OIDC) ou a variável `BLOB_READ_WRITE_TOKEN` quando aplicável. Não copie credenciais para o código nem para o GitHub.
6. Volte a **Deployments**, abra o menu da última publicação e selecione **Redeploy** para aplicar a conexão/variáveis ao site.
7. Abra a URL `.vercel.app` e confira se o contador mostra `0`, em vez de “contador indisponível”. Faça um teste de download e publicação, depois retire a foto de teste do mural.

O armazenamento é privado; o mural continua visível aos visitantes porque a função entrega somente as miniaturas autorizadas, sem as informações internas de remoção.

Referências: [criar e conectar Vercel Blob](https://vercel.com/docs/vercel-blob/using-blob-sdk), [armazenamento privado](https://vercel.com/docs/vercel-blob/private-storage), [Vercel Functions em Node.js](https://vercel.com/docs/functions/runtimes/node-js).

## O que está incluído

- Molduras originais das chapas 2, 1 e conjunta 2 + 1.
- Informações e integrantes a partir dos panfletos, com links para os PDFs completos.
- Área de edição fixa em 320 × 320 pixels CSS; exportação PNG de 1080 × 1080.
- Arraste, gesto com dois dedos, zoom, botões e teclado para mover a foto.
- Contador geral e por moldura, com identificação da imagem preparada para evitar duplicação nas tentativas repetidas.
- Mural ativado por padrão, com aviso claro, possibilidade de desmarcar e retirada da própria foto pelo navegador que a publicou.
- As 24 publicações mais recentes aparecem no mural. As anteriores permanecem armazenadas.
- Fotos originais permanecem no aparelho. Somente a imagem final reduzida é enviada quando a opção do mural está ativada.
- Os downloads funcionam mesmo quando o armazenamento não está conectado ou está indisponível; a página informa quando contador/mural não puderam ser atualizados.

O contador registra ações de download e compartilhamento, não eleitores, votos ou confirmação de salvamento na galeria. Uma nova edição ou sessão pode gerar outra contagem. A quantidade é calculada a partir dos eventos armazenados; para volumes muito grandes, considere migrar as agregações para um banco de dados.

## Celulares

O site oferece download e compartilhamento nativo. No iPhone, procure “Salvar Imagem”; no Android, use o download ou um aplicativo de fotos oferecido pelo sistema. Há uma alternativa para tocar e segurar a imagem quando não houver compartilhamento de arquivos.

O navegador e o sistema controlam o destino e a confirmação. Não é possível garantir gravação silenciosa na galeria. HEIC depende do navegador; JPG, PNG ou WebP são as alternativas indicadas se a foto não abrir.

## Administração

Opcionalmente, adicione `MURAL_ADMIN_TOKEN` em **Settings → Environment Variables**, para Production, com um segredo exclusivo. Faça um redeploy. Não exponha o segredo no navegador.

Uma ferramenta de API pode retirar uma foto com:

- `DELETE https://SEU-SITE.vercel.app/api/campaign`
- Cabeçalhos `Content-Type: application/json` e `Authorization: Bearer SEU_SEGREDO`
- Corpo `{"id":"ID_DA_PUBLICACAO"}`

Os IDs visíveis estão na resposta GET de `/api/campaign`; publicações antigas podem ser consultadas em Storage. A retirada preserva a contagem histórica. A publicação no mural é imediata, sem revisão prévia. Acompanhe o mural e as métricas de uso do projeto. Para limites por IP, configure a proteção da rota `/api/campaign` no Firewall da Vercel conforme os recursos da sua conta; a regra específica da Netlify não se aplica aqui.

## Testar no computador

Com Node 22:

```sh
npm ci
npm test
npm run build
npm run dev
```

Abra `http://127.0.0.1:4173`. A prévia utiliza dados locais, separados da Vercel. Pare com Ctrl+C.

## Estado da entrega

Projeto adaptado e validado localmente, com testes do serviço e do adaptador de armazenamento. A integração Blob foi testada com um substituto em memória, sem acessar uma conta sua. O editor foi verificado no navegador. Dependências sem vulnerabilidades conhecidas na consulta realizada.

A publicação, a conexão ao Blob e a verificação em dispositivos Android/iPhone reais ainda dependem do seu ambiente. Custos, limites e elegibilidade do plano são definidos pela Vercel; não há garantia de uso gratuito ilimitado.
