# Documento de Requisitos e Plano de Testes (PRD) - Agenda da Igreja

## 1. Visão Geral
O aplicativo "Agenda da Igreja" é uma plataforma web responsiva desenvolvida para visualizar a programação da congregação, facilitar pedidos de oração, compartilhar informações e permitir que a liderança gerencie os conteúdos através de uma Área de Membros.

## 2. Casos de Uso Principais (O que você deve testar)

### 2.1. Navegação e Visualização Pública
- **Página Inicial (Hero/Capa)**:
  - [ ] Verificar se os textos personalizáveis (Subtítulo, Boas-vindas, Nome da Igreja e Descrição) estão aparecendo corretamente.
  - [ ] Confirmar se a imagem de fundo escolhida é renderizada corretamente, com um leve escurecimento (overlay) para garantir a leitura dos textos.
- **Agenda Interativa (Calendário)**:
  - [ ] Alternar entre as visualizações "Mês" e "Semana".
  - [ ] Testar a barra de busca e os botões de filtro (Todos, Cultos, Reuniões, Especiais).
  - [ ] **No celular (Mobile)**: Verificar se nomes muito grandes de eventos agora não ultrapassam a tela (quebrando a linha corretamente).
- **Formulário de Pedido de Oração**:
  - [ ] Preencher o nome e o pedido e confirmar o envio.
  - [ ] Verificar se a mensagem de agradecimento aparece após o envio.

### 2.2. Acesso à Área de Membros e Navegação Mobile
- **Login e Retorno**:
  - [ ] Fazer login clicando em "Área de Membros" no menu.
  - [ ] Verificar se, ao logar, você é mantido na página principal com as novas permissões (botões de editar liberados) conforme solicitado.
  - [ ] **Navegação Mobile**: Entrar na Área de Membros e, em seguida, usar o botão físico de "Voltar" do celular (ou fechar a seção). O app não deve fechar, e sim retornar de forma limpa para a tela inicial pública.

### 2.3. Ações de Liderança / Administrador
- **Gerenciamento de Agenda**:
  - [ ] Tentar criar um novo evento, definir horário de início e término e adicionar uma imagem (banner).
  - [ ] Editar um evento recém-criado.
  - [ ] Excluir um evento.
- **Configurações da Igreja**:
  - [ ] Abrir o painel "Dados da Igreja".
  - [ ] Modificar o logotipo.
  - [ ] Modificar os dados da Capa (Imagem de fundo e os textos de boas-vindas e do nome da comunidade).
  - [ ] Verificar que o campo de telefone/WhatsApp foi devidamente removido, como solicitado anteriormente.
  - [ ] Salvar e conferir se o site mudou imediatamente.

### 2.4. Instalação e Funcionalidade PWA
- **Instalação**:
  - [ ] Testar a opção "Adicionar à Tela Inicial" (ou instalar app) que deve aparecer no navegador, instalando-o como um aplicativo nativo no celular.
