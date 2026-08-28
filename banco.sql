-- TABELA DE USUÁRIOS

CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL
);


-- TABELA DE PRODUTOS

CREATE TABLE produtos (
    id_produto SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tamanho VARCHAR(50),
    peso NUMERIC(10,2),
    caracteristicas TEXT,
    quantidade_estoque INTEGER NOT NULL CHECK (quantidade_estoque >= 0),
    estoque_minimo INTEGER NOT NULL CHECK (estoque_minimo >= 0)
);


-- TABELA DE MOVIMENTAÇÕES

CREATE TABLE movimentacoes_estoque (
    id_movimentacao SERIAL PRIMARY KEY,
    id_produto INTEGER NOT NULL REFERENCES produtos(id_produto),
    id_usuario INTEGER NOT NULL REFERENCES usuarios(id_usuario),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    quantidade INTEGER NOT NULL CHECK (quantidade > 0),
    data_movimentacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- VIEW DO HISTÓRICO

CREATE VIEW vw_historico_movimentacoes AS
SELECT
    m.id_movimentacao,
    p.nome AS produto,
    u.nome AS operador,
    u.email,
    m.tipo,
    m.quantidade,
    m.data_movimentacao
FROM movimentacoes_estoque m
INNER JOIN produtos p
    ON m.id_produto = p.id_produto
INNER JOIN usuarios u
    ON m.id_usuario = u.id_usuario;