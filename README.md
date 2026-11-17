# PrintLab — monitoramento de impressoras 3D

Projeto acadêmico de CRUD web para acompanhar impressoras e trabalhos de impressão 3D. A interface permite cadastrar, listar, editar e excluir impressões, filtrar por status e pesquisar pelo nome da impressora ou do trabalho. O custo estimado é calculado com base nos gramas de filamento e no preço por quilo.

## Abrir o projeto

O projeto não precisa de instalação de pacotes. Para testar no computador, sirva esta pasta por um servidor local, como a extensão **Live Server** do VS Code, e abra o endereço indicado por ela. Como o app usa módulos JavaScript, não abra o arquivo `index.html` diretamente com `file://`.

Sem configuração do Firebase, o PrintLab inicia em **modo local** e guarda os dados no navegador. Os cinco registros de exemplo permitem explorar a interface. Para compartilhar dados entre navegadores, configure o Firebase seguindo os passos abaixo.

## Conectar ao Firebase / Firestore

1. Acesse o [Firebase Console](https://console.firebase.google.com/) com uma conta Google e crie um projeto.
2. Na página do projeto, clique no ícone da Web **`</>`** para registrar um app Web. Dê um nome ao app, por exemplo `PrintLab`, e conclua o cadastro.
3. O objeto `firebaseConfig` do app Web **Projeto FSG** já foi colocado em `firebase-config.js`. Se usar outro projeto Firebase, substitua os campos pelos valores exibidos em **Configurações do projeto → Geral → Seus apps → app Web**.
4. No menu do Firebase, abra **Firestore Database → Criar banco de dados** e conclua a criação.
5. Abra **Authentication → Primeiros passos → Sign-in method**, habilite o provedor **Anônimo** e salve. O app usa esse login para que as regras do Firestore possam exigir uma sessão autenticada.
6. Em **Firestore Database → Regras**, substitua o conteúdo pelas regras de `firestore.rules` e clique em **Publicar**.
7. Atualize o app servido pelo Live Server. O indicador no menu lateral deve mostrar **Firebase conectado**. Se a coleção `printers` estiver vazia, o app cria cinco registros iniciais no Firestore automaticamente.

> O `firebaseConfig` identifica o app Web e é usado no navegador. Não coloque neste projeto um arquivo de conta de serviço, chave privada ou credencial de administrador. As regras deste trabalho permitem acesso a qualquer usuário autenticado anonimamente; isso atende à demonstração acadêmica, mas não restringe os dados a uma única pessoa.

## Publicar no GitHub Pages

1. Crie um repositório público no GitHub e envie os arquivos desta pasta mantendo `index.html` na raiz.
2. No GitHub, abra **Settings → Pages**.
3. Em **Build and deployment**, escolha **Deploy from a branch**, selecione `main` e a pasta `/ (root)`, e salve.
4. Quando o endereço do GitHub Pages aparecer, copie apenas o domínio, sem `https://` e sem o caminho do repositório. Exemplo: em `https://usuario.github.io/printlab/`, o domínio é `usuario.github.io`.
5. No Firebase, abra **Authentication → Configurações → Domínios autorizados → Adicionar domínio** e cadastre esse domínio do GitHub Pages. O Firebase Authentication valida se o domínio do site está autorizado.
6. Abra o endereço publicado. O indicador deve mostrar **Firebase conectado** e, se a coleção `printers` estiver vazia, os cinco exemplos aparecerão no painel.

O site é estático e não precisa de etapa de build. Os módulos Firebase vêm do CDN oficial, então o navegador precisa de conexão com a internet.

Antes de enviar, confirme que `firebase-config.js` contém a configuração do app Web que tu registraste. Esses valores são públicos por natureza em apps Web Firebase; a proteção do banco é feita pelas regras do Firestore e pela autenticação.

## Dados salvos

Cada documento da coleção `printers` contém o nome da impressora, trabalho/peça, material, status, tempo estimado, gramas de filamento, preço por quilo, progresso e datas de criação/atualização. O custo em reais é calculado no app: `gramas × preço por quilo ÷ 1.000`.

Documentação oficial: [publicar um site do GitHub Pages a partir de um branch](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site), [domínios autorizados no Firebase Authentication](https://firebase.google.com/docs/auth/faq-and-troubleshooting#general), [adicionar Firebase a um app Web](https://firebase.google.com/docs/web/setup), [login anônimo](https://firebase.google.com/docs/auth/web/anonymous-auth) e [regras de segurança do Firestore](https://firebase.google.com/docs/firestore/security/get-started).

