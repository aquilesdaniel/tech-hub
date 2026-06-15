-- Criação das tabelas para o sistema de controle de salgados e biblioteca
-- Executar este script no banco de dados Neon

-- Tabela de setores
CREATE TABLE IF NOT EXISTS setores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de colaboradores
CREATE TABLE IF NOT EXISTS colaboradores (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  senha VARCHAR(255),
  tipo VARCHAR(20) DEFAULT 'user',
  departamento VARCHAR(100) NOT NULL,
  cargo VARCHAR(100),
  data_admissao DATE,
  status VARCHAR(20) DEFAULT 'ativo',
  setor_id INTEGER REFERENCES setores(id),
  admin_permanente BOOLEAN DEFAULT FALSE,
  admin_temporario_ate DATE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de livros
CREATE TABLE IF NOT EXISTS livros (
  id SERIAL PRIMARY KEY,
  titulo VARCHAR(200) NOT NULL,
  autor VARCHAR(100) NOT NULL,
  genero VARCHAR(50),
  isbn VARCHAR(20),
  disponivel BOOLEAN DEFAULT TRUE,
  capa VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de empréstimos
CREATE TABLE IF NOT EXISTS emprestimos (
  id SERIAL PRIMARY KEY,
  livro_id INTEGER NOT NULL REFERENCES livros(id),
  colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
  data_emprestimo DATE NOT NULL,
  data_prevista_devolucao DATE NOT NULL,
  data_real_devolucao DATE,
  status VARCHAR(20) DEFAULT 'emprestado',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de dívidas de salgados
CREATE TABLE IF NOT EXISTS dividas (
  id SERIAL PRIMARY KEY,
  colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
  item VARCHAR(100) NOT NULL,
  motivo TEXT,
  data_inicio DATE NOT NULL,
  valor DECIMAL(10, 2) NOT NULL,
  pago BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de day-offs
CREATE TABLE IF NOT EXISTS day_offs (
  id SERIAL PRIMARY KEY,
  colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
  motivo VARCHAR(100) NOT NULL,
  data_liberacao DATE NOT NULL,
  usado BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de certificações
CREATE TABLE IF NOT EXISTS certificacoes (
  id SERIAL PRIMARY KEY,
  colaborador_id INTEGER NOT NULL REFERENCES colaboradores(id),
  nome VARCHAR(200) NOT NULL,
  tipo VARCHAR(100) NOT NULL,
  instituicao VARCHAR(200) NOT NULL,
  data_obtencao DATE NOT NULL,
  data_vencimento DATE,
  url_credencial TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir dados iniciais para setores
INSERT INTO setores (nome, descricao) VALUES
('TI', 'Setor de Tecnologia da Informação'),
('RH', 'Recursos Humanos'),
('Vendas', 'Equipe de Vendas'),
('Marketing', 'Equipe de Marketing'),
('Financeiro', 'Setor Financeiro')
ON CONFLICT DO NOTHING;

-- Inserir dados iniciais para colaboradores (admin e usuários comuns)
INSERT INTO colaboradores (nome, email, senha, tipo, departamento, cargo, data_admissao, status, setor_id) VALUES
('Administrador', 'admin@empresa.com', '$2a$10$8KVj1X1VPZFJGQRmfgmQXOQC3ztYnzJh9GnN.fHV0QghDLzUPDU1.', 'admin', 'TI', 'Administrador de Sistemas', '2023-01-01', 'ativo', 1),
('João Silva', 'joao@empresa.com', '$2a$10$8KVj1X1VPZFJGQRmfgmQXOQC3ztYnzJh9GnN.fHV0QghDLzUPDU1.', 'user', 'Vendas', 'Vendedor', '2023-02-15', 'ativo', 3),
('Maria Santos', 'maria@empresa.com', '$2a$10$8KVj1X1VPZFJGQRmfgmQXOQC3ztYnzJh9GnN.fHV0QghDLzUPDU1.', 'user', 'RH', 'Analista de RH', '2023-03-10', 'ativo', 2)
ON CONFLICT (email) DO NOTHING;

-- Inserir dados iniciais para livros
INSERT INTO livros (titulo, autor, genero, isbn, disponivel, capa) VALUES
('Clean Code', 'Robert C. Martin', 'Tecnologia', '978-0132350884', TRUE, '/placeholder.svg?height=200&width=150'),
('O Alquimista', 'Paulo Coelho', 'Ficção', '978-8576651239', TRUE, '/placeholder.svg?height=200&width=150'),
('Sapiens', 'Yuval Noah Harari', 'História', '978-8535926224', TRUE, '/placeholder.svg?height=200&width=150')
ON CONFLICT DO NOTHING;

-- Inserir dados iniciais para dívidas
INSERT INTO dividas (colaborador_id, item, motivo, data_inicio, valor, pago) VALUES
(2, 'Coxinha', 'Esqueceu de pagar', '2024-01-15', 3.50, FALSE),
(3, 'Pão de Queijo', 'Pagamento atrasado', '2024-01-10', 2.00, FALSE)
ON CONFLICT DO NOTHING;

-- Inserir dados iniciais para certificações
INSERT INTO certificacoes (colaborador_id, nome, tipo, instituicao, data_obtencao, data_vencimento, url_credencial, observacoes) VALUES
(1, 'AWS Solutions Architect Associate', 'AWS', 'Amazon Web Services', '2023-06-15', '2026-06-15', 'https://aws.amazon.com/certification/', 'Certificação em arquitetura de soluções AWS'),
(2, 'Certified Scrum Master', 'Scrum', 'Scrum Alliance', '2023-09-20', NULL, 'https://scrumalliance.org', 'Metodologia ágil Scrum'),
(1, 'Senior Developer Certification', 'Certificação Senior', 'Senior Sistemas', '2023-12-01', '2025-12-01', 'https://senior.com.br', 'Certificação oficial Senior')
ON CONFLICT DO NOTHING;

-- Nota: As senhas são '123456' criptografadas com bcrypt
