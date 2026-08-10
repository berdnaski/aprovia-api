# AprovAI — Sistema de Gestão de Compras e Aprovações

> Documento de requisitos. Base para a modelagem de Casos de Uso (UML), modelo de dados e planejamento de sprints.

## Objetivo

Centralizar e automatizar o fluxo de pedidos de compras de uma empresa, garantindo que todo gasto seja roteado automaticamente pelas regras de aprovação e orçamento do financeiro, sem burocracia para o funcionário e sem depender de consultoria externa para mudar as regras.

---

## Atores do Sistema

| Ator | Descrição | Escopo de acesso |
|---|---|---|
| **Visitante** | Pessoa não autenticada. Pode se cadastrar, aceitar convite ou recuperar senha. | Público |
| **Solicitante** | Funcionário que cria pedidos de compra. | Apenas os próprios pedidos |
| **Aprovador / Gestor** | Responsável por um ou mais Centros de Custo; decide sobre pedidos dentro da sua alçada. | Próprios pedidos + pendências + CCs que gerencia |
| **Admin Financeiro** | Configura orçamentos, matriz de alçadas, hierarquia e usuários da organização. | Toda a organização |
| **SuperAdmin (Plataforma)** | Operador do SaaS. Gerencia organizações, planos e assinaturas. | Todas as organizações (dados de gestão, não operacionais) |
| **Sistema (Agendador)** | Ator não-humano. Dispara lembretes, escalonamentos, relatórios mensais e virada de período orçamentário. | — |
---

## Problemas Identificados

- Compras pedidas por WhatsApp ou e-mail solto, gerando perda de histórico e falta de visibilidade sobre o status do pedido.
- Gestores aprovam gastos sem enxergar o saldo em tempo real do Centro de Custo, descobrindo o estouro de budget só no fim do mês.
- Mudar um limite de alçada ou aprovador exige pagar horas de consultoria externa e esperar semanas no ERP tradicional.
- Solicitações paradas por dias sem transbordo automático ou mecanismo de substituição para gestores ausentes.
- Compras aprovadas para CNPJs inaptos ou baixados, gerando retrabalho no Contas a Pagar e risco de multas com a Receita Federal.
- Perda de tempo preenchendo dados de fornecedores e propostas que poderiam ser validados e extraídos automaticamente.

---

## Requisitos Funcionais

### Módulo 1 — Conta, Autenticação e Acesso

- **RF01** — O sistema deve permitir que um visitante crie uma conta informando nome, e-mail corporativo e senha (auto-cadastro), tornando-se automaticamente Admin Financeiro da organização que criar.
- **RF02** — O sistema deve enviar um e-mail de verificação após o cadastro e exigir a confirmação do endereço antes de liberar o uso das funcionalidades operacionais.
- **RF03** — O sistema deve permitir login por e-mail e senha, emitindo credenciais de sessão (access token + refresh token) com renovação automática.
- **RF04** — O sistema deve permitir login federado via Google (OAuth 2.0), vinculando a conta ao mesmo e-mail já cadastrado quando existir.
- **RF05** — O sistema deve oferecer recuperação de senha ("Esqueci minha senha") via e-mail com token temporário de redefinição.
- **RF06** — O sistema deve permitir a alteração de senha por usuário autenticado, exigindo confirmação por e-mail.
- **RF07** — O sistema deve permitir o encerramento de sessão (logout), invalidando as credenciais ativas.
- **RF08** — O sistema deve exigir o aceite dos Termos de Uso e da Política de Privacidade no primeiro acesso, registrando data e hora do aceite.
- **RF09** — O sistema deve permitir que o usuário logado visualize e edite os dados do seu próprio perfil (nome, foto, telefone).
- **RF10** — O sistema deve permitir que o usuário solicite a exclusão da sua conta, em conformidade com a LGPD.

### Módulo 2 — Onboarding e Configuração Inicial da Organização

> Fluxo guiado em etapas, executado uma única vez por organização logo após o auto-cadastro (RF01). Estados: `CONTA → EMPRESA → EQUIPE → REVISÃO → CONCLUÍDO`.

- **RF11** — O sistema deve conduzir o novo Admin Financeiro por um assistente de configuração inicial em etapas, permitindo retomar de onde parou caso abandone o processo.
- **RF12** — O sistema deve permitir o cadastro dos dados da Organização (CNPJ, Razão Social, Nome Fantasia, segmento e porte), criando o tenant da conta empresarial.
- **RF13** — O sistema deve validar o CNPJ da Organização junto à API de dados públicos, pré-preenchendo Razão Social e endereço.
- **RF14** — O sistema deve permitir, durante o onboarding, o cadastro dos primeiros Centros de Custo e seus respectivos gestores.
- **RF15** — O sistema deve permitir, durante o onboarding, o convite em lote dos primeiros membros da equipe (e-mail + role).
- **RF16** — O sistema deve oferecer uma tela de revisão final do onboarding, exibindo o que foi configurado e o que ficou pendente antes de concluir.
- **RF17** — O sistema deve provisionar uma matriz de alçadas padrão sugerida ao concluir o onboarding, editável a qualquer momento pelo Admin Financeiro.

### Módulo 3 — Gestão de Pessoas e Governança

- **RF18** — O sistema deve atribuir e permitir alterar as roles de acesso dos usuários da organização: Solicitante, Aprovador/Gestor e Admin Financeiro.
- **RF19** — O sistema deve permitir que o Admin Financeiro convide novos usuários por e-mail, definindo role, Centro de Custo padrão e líder direto.
- **RF20** — O sistema deve permitir que o usuário convidado acesse um link seguro, defina sua senha e complete seu cadastro, ingressando na organização (Aceite de Convite).
- **RF21** — O sistema deve permitir ao Admin Financeiro listar, reenviar, revogar e acompanhar o status dos convites emitidos (Pendente, Aceito, Expirado, Revogado).
- **RF22** — O sistema deve permitir ao Admin Financeiro editar informações de usuários existentes ou inativar seus acessos à organização.
- **RF23** — O sistema deve permitir definir a árvore de liderança (quem reporta a quem) para o roteamento vertical.
- **RF24** — O sistema deve permitir que um aprovador defina um substituto temporário, com intervalo de datas, para receber e despachar pendências durante sua ausência.
- **RF25** — O sistema deve bloquear a inativação de um usuário que seja gestor de Centro de Custo ou aprovador com pendências em aberto, exigindo a transferência prévia das suas responsabilidades.

### Módulo 4 — Centros de Custo e Orçamento

- **RF26** — O sistema deve permitir criar, editar e inativar Centros de Custo.
- **RF27** — O sistema deve permitir definir o gestor responsável e a hierarquia entre Centros de Custo (CC pai / CC filho).
- **RF28** — O sistema deve permitir vincular usuários a um ou mais Centros de Custo.
- **RF29** — O sistema deve permitir atribuir um orçamento a cada Centro de Custo, delimitado por período (Mensal, Trimestral ou Anual).
- **RF30** — O sistema deve permitir editar o valor do orçamento de um período em andamento, registrando o autor e o motivo da alteração.
- **RF31** — O sistema deve abrir automaticamente o novo período orçamentário na virada do calendário, replicando o valor do período anterior.
- **RF32** — O sistema deve exibir um painel de consumo orçamentário por Centro de Custo, apresentando Orçamento, Comprometido, Disponível e percentual de uso.
- **RF33** — O sistema deve notificar o gestor e o Admin Financeiro quando o consumo de um Centro de Custo atingir os limiares de 80% e 100% do orçamento do período.

### Módulo 5 — Matriz de Alçadas e Regras de Aprovação

- **RF34** — O sistema deve oferecer uma interface para configurar faixas de valor e vincular quais roles/usuários têm poder de decisão em cada faixa.
- **RF35** — O sistema deve permitir definir regras de alçada específicas por Centro de Custo ou por categoria de compra, sobrepondo-se à matriz global da organização.
- **RF36** — O sistema deve permitir configurar aprovação conjunta (dupla assinatura) a partir de um valor crítico definido pela organização.
- **RF37** — O sistema deve oferecer um simulador que, dado um valor, um Centro de Custo e um solicitante, exiba a rota de aprovação resultante antes de salvar as regras.
- **RF38** — O sistema deve versionar as alterações da matriz de alçadas, mantendo o histórico de quem alterou, quando e qual era a configuração anterior.

### Módulo 6 — Cadastro de Fornecedores e Categorias

- **RF39** — O sistema deve consultar automaticamente uma API de dados públicos (BrasilAPI) ao digitar o CNPJ do fornecedor, para auto-completar Razão Social, Nome Fantasia e Endereço, e verificar a Situação Cadastral.
- **RF40** — O sistema deve salvar os fornecedores validados via CNPJ em uma base centralizada da organização, evitando reconsultar a API a cada uso e permitindo a seleção de fornecedores já cadastrados no intake.
- **RF41** — O sistema deve permitir ao Admin Financeiro consultar, editar, bloquear e revalidar fornecedores da base.
- **RF42** — O sistema deve revalidar periodicamente a situação cadastral dos fornecedores ativos, sinalizando os que deixaram de estar aptos.
- **RF43** — O sistema deve permitir ao Admin Financeiro gerenciar as categorias de compra da organização (criar, editar, inativar).
- **RF44** — O sistema deve permitir configurar, por categoria, quais campos adicionais são exibidos e quais são obrigatórios no formulário de pedido.

### Módulo 7 — Entrada e Acompanhamento de Pedidos

- **RF45** — O sistema deve permitir ao Solicitante criar uma requisição de compra informando título, descrição, categoria, Centro de Custo, fornecedor, valor e urgência.
- **RF46** — O sistema deve exibir campos dinâmicos de acordo com a categoria selecionada (ex: Software → nº de licenças e utilidade; Serviço → anexo de proposta), conforme configurado em RF44.
- **RF47** — O sistema deve permitir anexar documentos (PDF/Imagem) à requisição.
- **RF48** — O sistema deve permitir extrair automaticamente, a partir de um documento anexado ou de texto livre, os campos Fornecedor, Valor Total, Categoria e Condição de Pagamento, apresentando-os para conferência e edição do Solicitante antes da submissão.
- **RF49** — O sistema deve emitir um alerta na tela caso exista um pedido similar ativo (mesmo CNPJ + valor aproximado) criado nos últimos 30 dias pelo mesmo solicitante.
- **RF50** — O sistema deve permitir que o Solicitante salve um pedido em estado Rascunho (manual ou automaticamente durante o preenchimento) para continuar a edição e submeter em outro momento.
- **RF51** — O sistema deve permitir que o Solicitante visualize, edite e exclua seus rascunhos não submetidos.
- **RF52** — O sistema deve permitir que o Solicitante submeta o rascunho, disparando o cálculo da rota de aprovação.
- **RF53** — O sistema deve exibir ao Solicitante uma linha do tempo mostrando o status atual e exatamente em qual etapa ou com qual aprovador o pedido está parado.
- **RF54** — O sistema deve permitir que o Solicitante cancele sua requisição antes que ela seja totalmente aprovada, liberando qualquer reserva de orçamento efetuada.
- **RF55** — O sistema deve permitir que o Solicitante duplique um pedido já existente como base para uma nova requisição.
- **RF56** — O sistema deve fornecer uma listagem filtrada contendo apenas as requisições criadas pelo próprio usuário logado (Painel do Solicitante).
- **RF57** — O sistema deve fornecer uma listagem filtrada contendo apenas as requisições aguardando a aprovação do gestor logado ou do seu substituto temporário (Central de Pendências do Aprovador).
- **RF58** — O sistema deve permitir ao gestor consultar o histórico e status de todas as requisições vinculadas aos Centros de Custo sob sua gestão.
- **RF59** — O sistema deve permitir ao Admin Financeiro visualizar, filtrar e auditar a totalidade das requisições de todos os Centros de Custo da organização.

### Módulo 8 — Motor de Roteamento e Aprovação

- **RF60** — O sistema deve calcular automaticamente a rota de aprovação do pedido cruzando o valor solicitado, o Centro de Custo, a alçada do gestor imediato e a árvore de hierarquia.
- **RF61** — O sistema deve apresentar ao aprovador, no momento da decisão: Orçamento Total do Período, Valor Comprometido e Saldo Disponível do Centro de Custo.
- **RF62** — O sistema deve permitir ao aprovador autorizar ou recusar a solicitação, exigindo justificativa obrigatória no caso de rejeição.
- **RF63** — O sistema deve permitir ao aprovador solicitar informações complementares ao Solicitante, devolvendo o pedido para ajuste sem rejeitá-lo definitivamente.
- **RF64** — O sistema deve permitir aprovar um pedido que excede o saldo disponível do Centro de Custo, exigindo justificativa formal para registrar a exceção (Aprovação com Ressalva).
- **RF65** — O sistema deve enviar ao aprovador um e-mail com o resumo do pedido e botões de ação ("Aprovar" | "Rejeitar") funcionais através de token seguro de uso único, sem necessidade de login na plataforma.
- **RF66** — O sistema deve enviar lembretes automáticos ao aprovador de pedidos parados, conforme a política de SLA configurada pela organização.
- **RF67** — O sistema deve escalonar automaticamente ao superior hierárquico o pedido que permanecer sem decisão além do prazo de SLA configurado, notificando o aprovador original e o Admin Financeiro.
- **RF68** — O sistema deve permitir que o Admin Financeiro reatribua manualmente um pedido parado para outro aprovador válido da mesma alçada, caso o aprovador original esteja incomunicável.
- **RF69** — O sistema deve permitir ao Admin Financeiro configurar os prazos de SLA (horas para lembrete e horas para escalonamento) da organização.
- **RF70** — O sistema deve notificar o Solicitante a cada mudança de status da sua requisição.

### Módulo 9 — Notificações

- **RF71** — O sistema deve manter uma central de notificações no aplicativo, com estado de lida/não lida e link direto para o recurso relacionado.
- **RF72** — O sistema deve entregar notificações em tempo real ao usuário conectado, sem necessidade de recarregar a página.
- **RF73** — O sistema deve permitir que o usuário configure quais eventos deseja receber por e-mail.
- **RF74** — O sistema deve enviar notificações por e-mail para: convite recebido, pedido aguardando aprovação, decisão sobre pedido próprio, lembrete de SLA e alerta de orçamento.

### Módulo 10 — Relatórios, Métricas e Auditoria

- **RF75** — O sistema deve exibir métricas consolidadas: total de pedidos aprovados/rejeitados/pendentes, consumo de orçamento por Centro de Custo, gargalos no fluxo de aprovação e pedidos repetidos.
- **RF76** — O sistema deve exibir o tempo médio de aprovação por aprovador e por Centro de Custo.
- **RF77** — O sistema deve montar um relatório mensal consolidado e enviá-lo por e-mail ao gestor de cada Centro de Custo.
- **RF78** — O sistema deve permitir exportar as requisições filtradas em formato CSV/XLSX para conciliação com o Contas a Pagar.
- **RF79** — O sistema deve gravar um histórico imutável de todas as interações (quem solicitou, quem aprovou/rejeitou, data/hora, IP, valor, saldo no momento e justificativas).
- **RF80** — O sistema deve oferecer ao Admin Financeiro uma tela de consulta da trilha de auditoria, com filtros por usuário, tipo de evento e período.

### Módulo 11 — Planos, Assinatura e Administração da Plataforma

- **RF81** — O sistema deve associar cada organização a um plano comercial, com limites de membros, volume de requisições e armazenamento.
- **RF82** — O sistema deve liberar ou bloquear funcionalidades conforme os recursos contratados no plano da organização.
- **RF83** — O sistema deve bloquear a ação e informar o usuário quando um limite do plano for atingido (ex: convidar membro além do limite contratado), orientando o upgrade.
- **RF84** — O sistema deve permitir ao SuperAdmin criar organizações, atribuir e alterar planos, e conceder exceções pontuais de funcionalidade a uma organização específica.
- **RF85** — O sistema deve permitir ao SuperAdmin listar e auditar organizações, usuários e assinaturas da plataforma.
- **RF86** — O sistema deve exibir ao Admin Financeiro o plano vigente, o consumo atual dos limites e a data de renovação.

---

## Requisitos Não Funcionais

### Módulo A — Segurança & Conformidade (LGPD & RBAC)

- **RNF01** — Os links de aprovação por 1 clique via e-mail (RF65) devem utilizar tokens JWT assinados, de uso único, com expiração automática em 7 dias ou no consumo, sem exigir sessão aberta no sistema.
- **RNF02** — Todos os dados em trânsito devem trafegar sobre HTTPS/TLS 1.3 ou superior. Dados sensíveis em repouso no PostgreSQL (credenciais, justificativas de ressalva e dados cadastrais de fornecedores obtidos via RF39) devem utilizar criptografia AES-256.
- **RNF03** — A arquitetura da API (NestJS) e o modelo do Prisma ORM devem implementar segregação lógica estrita entre organizações. Toda consulta ao banco deve obrigatoriamente filtrar pelo `company_id` do tenant ativo, impedindo acesso cruzado entre organizações.
- **RNF04** — Endpoints críticos de autenticação, criação de rascunhos e enriquecimento de CNPJ (RF39) devem possuir proteção contra força bruta, DoS e injeção, através de rate limiting e sanitização rigorosa de entradas (`class-validator` no NestJS).
- **RNF05** — Senhas devem ser armazenadas exclusivamente com hash de algoritmo resistente a força bruta (bcrypt ou Argon2), jamais em texto plano ou criptografia reversível.
- **RNF06** — Tokens de sessão devem ser transportados em cookies `HttpOnly` + `Secure` + `SameSite`, com access token de curta duração e refresh token rotacionado a cada uso.
- **RNF07** — Em conformidade com a LGPD, a exclusão de conta solicitada pelo titular (RF10) deve anonimizar os dados pessoais em até 30 dias, preservando os registros financeiros e de auditoria de forma pseudonimizada, conforme a obrigação legal de guarda fiscal.
- **RNF08** — Toda autorização deve ser verificada no backend a cada requisição. A ocultação de elementos na interface não constitui controle de acesso.

### Módulo B — Desempenho, Escalabilidade & Latência

- **RNF09** — O cálculo da rota determinística de aprovação (RF60) e o cruzamento de orçamento/saldo (RF61) devem responder em menos de 300 ms no percentil 95 (P95).
- **RNF10** — A página acessada pelo aprovador via link de e-mail (RF65) deve iniciar a renderização útil (First Contentful Paint) em menos de 1,5 segundo em conexões 4G móveis.
- **RNF11** — Todas as listagens filtradas e paginadas (RF56–RF59) devem fazer uso otimizado de índices no PostgreSQL (`company_id`, `cost_center_id`, `status`, `created_at`), respondendo em menos de 200 ms.
- **RNF12** — Tarefas de longa duração (envio de e-mail, extração por IA, geração de relatório, revalidação de CNPJ) devem ser executadas de forma assíncrona por fila, sem bloquear a resposta HTTP ao usuário.

### Módulo C — Arquitetura, Resiliência & Fallback

- **RNF13** — A funcionalidade de intake assistido por IA (RF48) deve ser completamente assíncrona e isolada do fluxo principal. Falhas, indisponibilidade ou latência excessiva do provedor de LLM não podem indisponibilizar o sistema; em caso de erro, a aplicação deve realizar fallback transparente para o formulário manual.
- **RNF14** — A integração com a API de dados públicos (RF39 — BrasilAPI) deve possuir timeout máximo de 3 segundos. Em caso de falha ou expiração, o sistema deve permitir o preenchimento manual, registrando o fornecedor como pendente de validação assíncrona, sem interromper a criação do pedido.
- **RNF15** — Toda a lógica da matriz de alçadas, transbordo em cascata (RF60) e checagem de substitutos temporários (RF24) deve ser executada por algoritmo 100% determinístico codificado no backend, garantindo auditabilidade sem inferências probabilísticas.
- **RNF16** — Nenhum valor sugerido por IA pode ser submetido sem confirmação humana explícita. A extração automática (RF48) apenas pré-preenche campos editáveis.
- **RNF17** — Operações que alteram saldo de orçamento e status de pedido devem ser transacionais e idempotentes, garantindo que uma reentrega de requisição ou clique duplicado não gere dupla dedução.
- **RNF18** — O backend deve seguir Clean Architecture com separação estrita entre `application` (casos de uso), `domain` (entidades e contratos) e `infrastructure` (Prisma, controllers), permitindo a substituição de provedores externos sem reescrita de regra de negócio.

### Módulo D — Usabilidade, Acessibilidade & Interface

- **RNF19** — Embora o painel de administração (RF26, RF34, RF59) seja otimizado para desktop, todas as telas operacionais do Solicitante (RF53) e as interfaces de aprovação por link (RF65) devem possuir layout responsivo (Mobile-First), sem rolagem horizontal em smartphones.
- **RNF20** — A interface deve fornecer retorno visual em tempo real para todas as interações (estados de carregamento, pré-visualização das extrações de IA, alertas de duplicidade RF49) e mensagens de erro amigáveis, sem expor stack traces do servidor.
- **RNF21** — As interfaces devem atender ao nível AA da WCAG 2.1 quanto a contraste de cores, navegação por teclado e rótulos acessíveis em formulários.
- **RNF22** — Toda a interface, mensagens do sistema e e-mails transacionais devem estar em português do Brasil, com valores monetários em Real (R$) e datas no formato DD/MM/AAAA.
- **RNF23** — Valores monetários devem ser armazenados em centavos, como número inteiro, eliminando erros de arredondamento de ponto flutuante.

### Módulo E — Disponibilidade, Auditoria & Manutenibilidade

- **RNF24** — A infraestrutura deve ser projetada para uma meta de disponibilidade (uptime) de 99,5% durante o horário comercial (08:00 às 20:00, horário de Brasília), com reinício automático de containers em caso de falha.
- **RNF25** — O banco de dados de histórico e auditoria (RF79) deve ser *append-only*. Registros da trilha de auditoria não devem possuir rotas de alteração (UPDATE) ou remoção (DELETE) expostas na API para nenhum perfil de usuário.
- **RNF26** — Exclusões de entidades de negócio (usuários, centros de custo, pedidos, fornecedores) devem ser lógicas (*soft delete*), preservando a integridade referencial do histórico.
- **RNF27** — O sistema deve possuir rotina automatizada de backup diário do banco de dados, com retenção mínima de 30 dias e procedimento de restauração testado.
- **RNF28** — O sistema deve registrar logs estruturados de erros e eventos de negócio, correlacionáveis por identificador de requisição, para diagnóstico em produção.

---

## Regras de Negócio

### Módulo A — Conta, Convites e Acesso

- **RN01** — Um endereço de e-mail é único na plataforma. O mesmo usuário pode pertencer a mais de uma organização, mas mantém uma única credencial de acesso.
- **RN02** — O usuário que cria a organização pelo auto-cadastro (RF01) recebe automaticamente a role de Admin Financeiro daquela organização.
- **RN03** — Toda organização deve possuir, em todos os momentos, ao menos um usuário ativo com a role de Admin Financeiro. O sistema deve impedir a inativação ou rebaixamento do último Admin Financeiro.
- **RN04** — O link de convite enviado por e-mail expira em 72 horas. Após expirar, o Admin Financeiro deve reemitir o convite pelo painel.
- **RN05** — Um convite só pode ser aceito pelo endereço de e-mail para o qual foi emitido, e apenas uma vez. O aceite invalida o token imediatamente.
- **RN06** — Convites com status Pendente podem ser revogados pelo Admin Financeiro a qualquer momento, invalidando o link enviado.
- **RN07** — Enquanto o e-mail não for verificado (RF02), o usuário pode acessar o sistema apenas em modo leitura, sem submeter requisições nem executar aprovações.
- **RN08** — A inativação de um usuário preserva integralmente seu histórico de requisições e decisões. Nenhum registro é removido.

### Módulo B — Onboarding

- **RN09** — Uma organização só é considerada operacional após a conclusão do onboarding, exigindo no mínimo: dados da empresa válidos, um Centro de Custo com gestor definido e uma matriz de alçadas ativa.
- **RN10** — Antes da conclusão do onboarding, a criação de requisições de compra fica bloqueada para todos os membros da organização.
- **RN11** — O onboarding pode ser interrompido e retomado. O progresso é persistido por etapa, e nenhuma etapa concluída é perdida.
- **RN12** — O CNPJ da organização é único na plataforma. Não é permitido registrar duas organizações com o mesmo CNPJ.

### Módulo C — Governança, Centros de Custo e Orçamento

- **RN13** — Toda requisição de compra submetida deve estar obrigatoriamente vinculada a exatamente um Centro de Custo válido e ativo na organização.
- **RN14** — Todo Centro de Custo ativo deve possuir exatamente um gestor responsável, que necessariamente tem a role de Aprovador/Gestor ou Admin Financeiro.
- **RN15** — Um Centro de Custo com requisições em andamento ou orçamento vigente não pode ser excluído, apenas inativado. A inativação impede novos pedidos, mas preserva os existentes até sua conclusão.
- **RN16** — O período orçamentário adotado é o **mês fiscal**, coincidente com o mês civil. O saldo não utilizado **não acumula** para o período seguinte: o consumo é zerado e o orçamento é reaberto no primeiro dia de cada período.
- **RN17** — No momento em que um pedido é totalmente aprovado, seu valor total é deduzido imediatamente do saldo disponível do Centro de Custo no período vigente. Pedidos pendentes de aprovação não deduzem saldo, mas são exibidos separadamente como "em análise" para dar visibilidade ao aprovador.
- **RN18** — O sistema admite uma **margem de tolerância de até 5%** sobre o orçamento do período: pedidos que ultrapassem o saldo dentro dessa margem seguem o fluxo padrão de aprovação, apenas sinalizados visualmente ao aprovador.
- **RN19** — Pedidos que ultrapassem a margem de tolerância de 5% não podem ser autorizados pelo fluxo padrão: exigem obrigatoriamente Aprovação com Ressalva (com justificativa registrada) ou anuência direta de um Admin Financeiro.
- **RN20** — O esgotamento do orçamento **não bloqueia a criação** de novos pedidos. O Solicitante é alertado da indisponibilidade de saldo no momento do preenchimento, e o pedido segue para o fluxo de Aprovação com Ressalva.
- **RN21** — Alterações no valor do orçamento de um período em andamento recalculam o saldo disponível imediatamente, sem afetar pedidos já aprovados.
- **RN22** — Quaisquer alterações na Matriz de Alçadas ou na árvore hierárquica aplicam-se exclusivamente a novas requisições. Pedidos em andamento mantêm a rota determinística calculada no momento de sua submissão.

### Módulo D — Motor de Alçadas e Cascata

- **RN23** — Um usuário jamais pode aprovar a própria requisição, independentemente do seu limite de alçada ou cargo. Caso o Solicitante tenha alçada para o valor solicitado, o pedido transborda automaticamente para o seu superior hierárquico imediato.
- **RN24** — Se o valor total da compra for superior ao limite de alçada do gestor do Centro de Custo, o sistema registra a autorização do gestor e transborda automaticamente para o nível hierárquico superior (Gerente → Diretor → CFO), repetindo a subida em cadeia até alcançar um aprovador cuja alçada cubra o valor integral.
- **RN25** — Em fluxos de cascata, a aprovação final só é concedida após a autorização de todos os níveis hierárquicos intermediários. A rejeição por qualquer nível encerra imediatamente o fluxo e o pedido é marcado como Rejeitado.
- **RN26** — Acima do valor crítico configurado pela organização (RF36), a aprovação exige assinatura conjunta de dois aprovadores distintos da alçada correspondente. Nenhum dos dois pode ser o Solicitante.
- **RN27** — Caso a cadeia hierárquica se esgote sem que nenhum aprovador possua alçada suficiente para o valor, o pedido é roteado obrigatoriamente para um Admin Financeiro, que decide em última instância.
- **RN28** — O link tokenizado de ação recebido por e-mail expira em 7 dias corridos ou imediatamente após ser utilizado, o que ocorrer primeiro.
- **RN29** — Durante o período de ausência configurado por um aprovador, todas as requisições direcionadas a ele são roteadas automaticamente ao substituto indicado. A trilha de auditoria deve registrar que a ação foi efetuada pelo substituto em nome do aprovador original.
- **RN30** — O substituto temporário não pode ser o Solicitante do pedido que lhe foi delegado, nem pode delegar novamente a terceiros (vedada a subdelegação em cadeia).
- **RN31** — Um pedido pendente dispara lembrete automático ao aprovador após **24 horas úteis** sem decisão, com reforço a cada 24 horas subsequentes.
- **RN32** — Um pedido que permaneça **72 horas úteis** sem decisão escalona automaticamente para o superior hierárquico do aprovador, que passa a poder decidir em seu lugar. O aprovador original e o Admin Financeiro são notificados do escalonamento.
- **RN33** — A reatribuição manual de um pedido parado (RF68) só pode ser executada por um Admin Financeiro e deve direcionar o pedido a outro usuário com role de aprovação válida e alçada equivalente à do aprovador original.

### Módulo E — Intake, Rascunhos e Compliance de Fornecedores

- **RN34** — O sistema deve impedir a submissão de requisições vinculadas a CNPJs cuja situação cadastral na Receita Federal seja diferente de ATIVA (BAIXADA, INAPTA, SUSPENSA ou NULA).
- **RN35** — Fornecedores cuja consulta à API pública falhou permanecem com status "pendente de validação". Requisições vinculadas a eles podem ser criadas, mas exigem validação do fornecedor antes da aprovação final.
- **RN36** — Se o sistema identificar um pedido com o mesmo CNPJ de fornecedor e valor aproximado (tolerância de ±5%) criado nos últimos 30 dias pelo mesmo Solicitante, deve emitir um aviso formal na tela de intake, exigindo confirmação explícita do usuário de que não se trata de duplicata acidental antes de permitir o envio.
- **RN37** — Pedidos em Rascunho não consomem nem reservam saldo do Centro de Custo, não notificam aprovadores e não entram no cálculo de métricas ou alertas de duplicidade.
- **RN38** — A partir do momento em que o pedido muda de Rascunho para Em Aprovação, o Solicitante não pode alterar dados estruturais (valor, fornecedor, centro de custo, itens). Para alterá-los, deve cancelar a solicitação (RF54) e criar uma nova, ou aguardar que um aprovador a devolva para ajuste (RF63).
- **RN39** — Quando um aprovador devolve o pedido para complementação (RF63), a requisição retorna ao Solicitante em estado editável e, ao ser reenviada, tem sua rota de aprovação recalculada do zero.
- **RN40** — O cancelamento de uma solicitação pelo Solicitante antes da aprovação final invalida os links de e-mail enviados aos aprovadores e libera imediatamente qualquer reserva provisória de saldo.
- **RN41** — Requisições aprovadas não podem ser canceladas pelo Solicitante. Sua reversão exige ação de um Admin Financeiro, com justificativa registrada e devolução do valor ao saldo do período vigente.
- **RN42** — Valores extraídos automaticamente por IA (RF48) nunca são submetidos sem revisão. O Solicitante deve confirmar ou corrigir cada campo pré-preenchido antes do envio.

### Módulo F — Visibilidade, Auditoria e Segurança

- **RN43** — Os dados de requisições devem respeitar a restrição de visualização por role:
  1. **Solicitante** — acessa exclusivamente as requisições de sua própria autoria.
  2. **Aprovador/Gestor** — acessa suas próprias requisições, as pendências sob sua alçada direta e o histórico dos Centros de Custo que gerencia.
  3. **Admin Financeiro** — acessa a totalidade das requisições de todos os Centros de Custo da sua organização.
  4. **SuperAdmin** — acessa dados de gestão da plataforma (organizações, planos, assinaturas), não os dados operacionais de compras das organizações.
- **RN44** — Qualquer ação de Rejeição, devolução para complementação ou Aprovação com Ressalva exige obrigatoriamente justificativa com no mínimo 10 caracteres.
- **RN45** — Todos os eventos de criação, alteração de rascunho, submissão, aprovação, rejeição, devolução, cancelamento, reatribuição, escalonamento e alteração de matriz devem ser gravados em logs imutáveis. Nenhum perfil de usuário pode editar ou apagar registros da trilha de auditoria.
- **RN46** — Usuários de uma organização jamais podem visualizar, aprovar ou acessar dados (pedidos, fornecedores, centros de custo, matrizes) de outra organização registrada na plataforma.
- **RN47** — O registro de auditoria de uma aprovação deve congelar o contexto financeiro do momento da decisão (orçamento, comprometido e saldo disponível), de modo que alterações posteriores no orçamento não distorçam a análise histórica.

### Módulo G — Planos e Limites Comerciais

- **RN48** — Cada organização possui no máximo uma assinatura ativa por vez. A troca de plano encerra a assinatura anterior e inicia uma nova.
- **RN49** — Ao atingir o limite de membros do plano, novos convites são bloqueados até que o Admin Financeiro inative um usuário existente ou faça upgrade.
- **RN50** — A ausência de assinatura ativa bloqueia as funcionalidades operacionais da organização (criação e aprovação de pedidos), preservando o acesso de leitura ao histórico e a exportação de dados.
- **RN51** — Exceções de funcionalidade concedidas pelo SuperAdmin a uma organização específica prevalecem sobre as regras do plano contratado, respeitando a data de expiração definida.

---

## Decisões Tomadas

Definições que estavam em aberto e foram resolvidas neste documento. Registradas aqui para rastreabilidade.

| Questão | Decisão | Regra |
|---|---|---|
| Orçamento esgotado bloqueia a criação de pedidos? | Não bloqueia. O Solicitante é alertado e o pedido segue para Aprovação com Ressalva. | RN20 |
| Existe margem de tolerância sem ressalva? | Sim, até 5% do orçamento do período. | RN18, RN19 |
| Qual o período orçamentário? Saldo acumula? | Mês fiscal (= mês civil). Saldo **não** acumula; zera na virada. | RN16 |
| Quando disparar lembrete de pedido parado? | 24 horas úteis, com reforço a cada 24h. | RN31 |
| Aprovador inerte: escalona ou apenas alerta? | Escalona ao superior após 72 horas úteis e notifica o Admin Financeiro. | RN32 |
| Valor crítico exige dupla aprovação? | Sim, configurável por organização. | RF36, RN26 |
| Quando disparar o relatório mensal? | 1º dia útil do mês subsequente ao período encerrado. | RF77 |

> Os parâmetros de 5% (tolerância), 24h/72h (SLA) e o valor crítico de dupla aprovação são **configuráveis por organização** (RF69, RF36). Os números acima são os valores-padrão do sistema.

---

## Matriz de Rastreabilidade — Ator × Casos de Uso

Ponto de partida para o diagrama de Casos de Uso UML. Cada linha tende a virar um caso de uso; RFs relacionados agrupam-se em `include`/`extend`.

| Ator | Casos de uso principais | RFs |
|---|---|---|
| **Visitante** | Criar conta, Verificar e-mail, Aceitar convite, Recuperar senha, Autenticar | RF01–RF05, RF20 |
| **Solicitante** | Criar/editar rascunho, Submeter requisição, Anexar documento, Extrair dados por IA, Acompanhar pedido, Cancelar pedido, Duplicar pedido | RF45–RF56 |
| **Aprovador/Gestor** | Consultar pendências, Aprovar, Rejeitar, Devolver para ajuste, Aprovar com ressalva, Aprovar por e-mail, Definir substituto, Consultar CCs geridos | RF24, RF57–RF58, RF61–RF65 |
| **Admin Financeiro** | Gerir usuários e convites, Definir hierarquia, Gerir Centros de Custo, Definir orçamento, Configurar matriz de alçadas, Simular rota, Configurar SLA, Reatribuir pedido, Auditar, Exportar, Gerir fornecedores e categorias | RF11–RF19, RF21–RF37, RF39–RF43, RF59, RF68–RF69, RF75–RF80, RF86 |
| **SuperAdmin** | Gerir organizações, Gerir planos e assinaturas, Conceder exceções, Auditar plataforma | RF84–RF85 |
| **Sistema (Agendador)** | Enviar lembrete de SLA, Escalonar pedido inerte, Abrir novo período orçamentário, Alertar consumo de orçamento, Enviar relatório mensal, Revalidar fornecedores, Expirar convites e tokens | RF31, RF33, RF42, RF66–RF67, RF77 |
| **BrasilAPI** *(externo)* | Consultar CNPJ | RF13, RF39, RF42 |
| **Provedor de LLM** *(externo)* | Extrair dados de documento | RF48 |
| **Provedor de E-mail** *(externo)* | Entregar notificação transacional | RF74 |

---

## Ciclo de Vida da Requisição

Base para o diagrama de estados (UML State Machine).

```
RASCUNHO ──submeter──► EM_APROVAÇÃO ──todos aprovaram──► APROVADO ──reverter (Admin)──► CANCELADO
    │                       │  ▲                              │
    │                       │  └──reenviar────┐               └──liquidar──► CONCLUÍDO
    │                       │                 │
    │                       ├──devolver──► EM_AJUSTE
    │                       │
    │                       ├──rejeitar──► REJEITADO
    │                       │
    │                       └──cancelar──► CANCELADO
    │
    └──excluir──► (removido)
```

| Estado | Descrição | Consome saldo? |
|---|---|---|
| **RASCUNHO** | Em preenchimento, visível apenas ao Solicitante. | Não |
| **EM_APROVAÇÃO** | Rota calculada, aguardando decisão de um ou mais aprovadores. | Não (exibido como "em análise") |
| **EM_AJUSTE** | Devolvido pelo aprovador para complementação do Solicitante. | Não |
| **APROVADO** | Todos os níveis da rota autorizaram. | Sim |
| **REJEITADO** | Recusado por algum nível da rota, com justificativa. | Não |
| **CANCELADO** | Cancelado pelo Solicitante ou revertido pelo Admin Financeiro. | Não (libera se havia consumido) |
| **CONCLUÍDO** | Compra efetivada e liquidada. Estado terminal. | Sim (histórico) |

---

## Escopo Fora desta Versão

Registrado para evitar ambiguidade na leitura dos requisitos acima.

- Integração com ERP para emissão de ordem de compra e liquidação financeira.
- Cotação com múltiplos fornecedores e comparativo de propostas dentro do pedido.
- Gestão de contratos recorrentes e renovações automáticas.
- Integração com Slack ou Microsoft Teams para aprovação via chat.
- Aplicativo móvel nativo (a interface responsiva atende o caso de uso móvel).
- Multi-moeda e operação internacional.
- Campos dinâmicos configuráveis por categoria de compra *(RF44 e RF46 descontinuados — ver nota abaixo)*.
- Versionamento histórico da matriz de alçadas *(RF38 descontinuado — a RN22 é atendida pela materialização das etapas em `approval_steps`)*.

> **Nota de escopo:** RF38, RF44 e RF46 foram removidos do escopo durante a modelagem de dados. Os campos dinâmicos exigiriam configuração por categoria sem demanda concreta; o versionamento da matriz é dispensável porque a rota de aprovação é congelada em `approval_steps` no momento da submissão.

---

## Documentos relacionados

| Documento | Conteúdo |
|---|---|
| **[data-model.md](./data-model.md)** | Modelagem física: enums, tabelas, índices e rastreabilidade Regra de Negócio × Modelo |
| **[architecture.md](./architecture.md)** | Organização do código: containers, camadas, motor de roteamento e ordem de implementação |
