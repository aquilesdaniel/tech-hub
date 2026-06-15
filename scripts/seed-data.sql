-- Inserir dados iniciais para o sistema

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

-- Nota: As senhas são '123456' criptografadas com bcrypt
