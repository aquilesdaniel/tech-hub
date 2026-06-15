# Sistema de Controle de Salgados e Biblioteca

Sistema completo para gerenciamento de dívidas de salgados e biblioteca empresarial, desenvolvido com Next.js e banco de dados Neon (PostgreSQL).

## Funcionalidades

### Módulo de Salgados
- ✅ Lista de devedores com filtros e pesquisa
- ✅ Marcar pagamentos e liberar day-offs automaticamente
- ✅ Adicionar novas dívidas
- ✅ Dashboard com estatísticas

### Módulo de Biblioteca
- ✅ Catálogo completo de livros
- ✅ Sistema de empréstimo e devolução
- ✅ Histórico de empréstimos
- ✅ Gerenciamento de colaboradores
- ✅ Adicionar novos livros

### Painel Administrativo
- ✅ Gerenciamento completo de colaboradores
- ✅ Organização por setores
- ✅ Sistema de autenticação com roles
- ✅ CRUD completo para todas as entidades

## Configuração

### 1. Instalar dependências
\`\`\`bash
npm install
\`\`\`

### 2. Configurar banco de dados Neon
1. Crie uma conta no [Neon](https://neon.tech)
2. Crie um novo projeto
3. Copie a string de conexão DATABASE_URL
4. Configure a variável de ambiente no seu projeto

### 3. Executar scripts de criação das tabelas
Execute os scripts SQL no console do Neon:
1. `scripts/create-tables.sql` - Criar estrutura das tabelas
2. `scripts/seed-data.sql` - Inserir dados iniciais

### 4. Iniciar o projeto
\`\`\`bash
npm run dev
\`\`\`

### 5. Acessar o sistema
- Frontend: http://localhost:3000
- Login: admin@empresa.com / 123456 (admin)
- Login: joao@empresa.com / 123456 (usuário)

## Estrutura do Banco de Dados

### Tabelas Principais
- **colaboradores** - Dados dos funcionários e usuários do sistema
- **setores** - Organização departamental
- **livros** - Catálogo da biblioteca
- **emprestimos** - Controle de empréstimos de livros
- **dividas** - Dívidas de salgados
- **day_offs** - Folgas liberadas automaticamente

## API Endpoints

### Colaboradores
- `GET /api/colaboradores` - Listar colaboradores
- `POST /api/colaboradores` - Criar colaborador
- `PUT /api/colaboradores/[id]` - Atualizar colaborador
- `PATCH /api/colaboradores/[id]` - Atualização parcial
- `DELETE /api/colaboradores/[id]` - Inativar colaborador

### Setores
- `GET /api/setores` - Listar setores
- `POST /api/setores` - Criar setor
- `PUT /api/setores/[id]` - Atualizar setor
- `DELETE /api/setores/[id]` - Excluir setor

### Livros
- `GET /api/livros` - Listar livros
- `POST /api/livros` - Adicionar livro
- `PUT /api/livros/[id]` - Atualizar livro
- `PATCH /api/livros/[id]` - Atualização parcial
- `DELETE /api/livros/[id]` - Excluir livro

### Empréstimos
- `GET /api/emprestimos` - Listar empréstimos
- `POST /api/emprestimos` - Criar empréstimo
- `PATCH /api/emprestimos/[id]` - Devolver livro

### Dívidas
- `GET /api/dividas` - Listar dívidas
- `POST /api/dividas` - Criar dívida
- `PATCH /api/dividas/[id]` - Marcar como paga

### Day-offs
- `GET /api/day-offs` - Listar day-offs
- `POST /api/day-offs` - Criar day-off
- `PATCH /api/day-offs/[id]` - Marcar como usado

### Autenticação
- `POST /api/auth/login` - Fazer login

## Tecnologias Utilizadas

- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Neon Database** - PostgreSQL serverless
- **Tailwind CSS** - Estilização
- **shadcn/ui** - Componentes de UI
- **Lucide React** - Ícones

## Funcionalidades Detalhadas

### Sistema de Autenticação
- Login com email e senha
- Controle de acesso por roles (admin/user)
- Proteção de rotas sensíveis
- Sessão persistente no localStorage

### Dashboard Responsivo
- Visão geral do sistema
- Estatísticas em tempo real
- Navegação intuitiva
- Adaptado para mobile e desktop

### Controle de Salgados
- **Lista de Devedores**: Visualização clara de todas as dívidas pendentes
- **Filtros Avançados**: Busca por nome, item ou motivo
- **Pagamento Automático**: Marcar como pago e liberar day-off
- **Nova Dívida**: Formulário completo para registrar dívidas
- **Relatórios**: Estatísticas detalhadas

### Biblioteca Completa
- **Catálogo Digital**: Visualização de todos os livros com capas
- **Sistema de Empréstimo**: Controle completo com prazos
- **Devoluções Simples**: Processo otimizado de devolução
- **Histórico Completo**: Registro de todos os empréstimos
- **Gerenciamento**: Adicionar e editar livros

### Painel Administrativo
- **Gestão de Colaboradores**: CRUD completo
- **Organização por Setores**: Estrutura departamental
- **Controle de Status**: Ativar/inativar usuários
- **Relatórios Gerenciais**: Visão completa da empresa

## Segurança

- Validação de dados no frontend e backend
- Sanitização de inputs SQL
- Controle de acesso baseado em roles
- Transações de banco de dados para operações críticas
- Tratamento de erros robusto

## Performance

- Server Components para melhor performance
- Queries otimizadas com índices
- Revalidação automática de cache
- Carregamento lazy de componentes
- Responsividade total

## Próximos Passos

Para expandir o sistema, considere:
- Criptografia real de senhas com bcrypt
- Sistema de notificações por email
- Relatórios em PDF
- Dashboard com gráficos avançados
- API de integração externa
- Sistema de backup automático
- Logs de auditoria
- Testes automatizados
