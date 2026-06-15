-- Adicionar tabela de certificações ao banco de dados existente

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

-- Inserir dados iniciais para certificações
INSERT INTO certificacoes (colaborador_id, nome, tipo, instituicao, data_obtencao, data_vencimento, url_credencial, observacoes) VALUES
(1, 'AWS Solutions Architect Associate', 'AWS', 'Amazon Web Services', '2023-06-15', '2026-06-15', 'https://aws.amazon.com/certification/', 'Certificação em arquitetura de soluções AWS'),
(2, 'Certified Scrum Master', 'Scrum', 'Scrum Alliance', '2023-09-20', NULL, 'https://scrumalliance.org', 'Metodologia ágil Scrum'),
(1, 'Senior Developer Certification', 'Certificação Senior', 'Senior Sistemas', '2023-12-01', '2025-12-01', 'https://senior.com.br', 'Certificação oficial Senior')
ON CONFLICT DO NOTHING;
