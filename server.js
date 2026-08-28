import Fastify from 'fastify'
import { Pool } from 'pg'
import cors from '@fastify/cors'

const sql = new Pool({
    user: "postgres",
    password: "senai",
    host: "localhost",
    port: 5432,
    database: "almoxarifado"
})

const servidor = Fastify()

servidor.register(cors, {
    origin: '*'
})


// LOGIN
servidor.post('/login', async (request, reply) => {

    const body = request.body

    if (!body || !body.email || !body.senha) {
        return reply.status(400).send({
            message: "email e senha obrigatórios"
        })
    }

    const resultado = await sql.query(
        `SELECT id_usuario, nome, email, usuario
         FROM usuarios
         WHERE email = $1 AND senha = $2`,
        [body.email, body.senha]
    )

    if (resultado.rows.length === 0) {
        return reply.status(401).send({
            message: "Usuário ou senha inválidos",
            login: false
        })
    }

    return reply.status(200).send({
        message: "Login realizado com sucesso",
        login: true,
        usuario: resultado.rows[0]
    })
})


// LISTAR USUÁRIOS
servidor.get('/usuarios', async () => {

    const resultado = await sql.query(
        `SELECT id_usuario, nome, email, usuario
         FROM usuarios`
    )

    return resultado.rows
})


// CADASTRAR USUÁRIO
servidor.post('/usuarios', async (request, reply) => {

    const body = request.body

    if (!body || !body.nome || !body.email || !body.usuario || !body.senha) {
        return reply.status(400).send({
            message: "nome, email, usuario e senha obrigatórios"
        })
    }

    const resultado = await sql.query(
        `INSERT INTO usuarios
        (nome, email, usuario, senha)
        VALUES ($1, $2, $3, $4)
        RETURNING id_usuario, nome, email, usuario`,
        [
            body.nome,
            body.email,
            body.usuario,
            body.senha
        ]
    )

    return reply.status(201).send({
        message: "USUÁRIO CRIADO",
        usuario: resultado.rows[0]
    })
})


// LISTAR PRODUTOS
servidor.get('/produtos', async (request) => {

    const busca = request.query.busca

    let resultado

    if (busca) {

        resultado = await sql.query(
            `SELECT *
             FROM produtos
             WHERE nome ILIKE $1
             ORDER BY nome ASC`,
            [`%${busca}%`]
        )

    } else {

        resultado = await sql.query(
            `SELECT *
             FROM produtos
             ORDER BY nome ASC`
        )
    }

    return resultado.rows
})


// BUSCAR PRODUTO
servidor.get('/produtos/:id', async (request, reply) => {

    const id = request.params.id

    const resultado = await sql.query(
        `SELECT *
         FROM produtos
         WHERE id_produto = $1`,
        [id]
    )

    if (resultado.rows.length === 0) {
        return reply.status(404).send({
            message: "produto não encontrado"
        })
    }

    return resultado.rows[0]
})


// CADASTRAR PRODUTO
servidor.post('/produtos', async (request, reply) => {

    const body = request.body

    if (!body || !body.nome) {
        return reply.status(400).send({
            message: "nome do produto obrigatório"
        })
    }

    const resultado = await sql.query(
        `INSERT INTO produtos
        (
            nome,
            descricao,
            tamanho,
            peso,
            caracteristicas,
            quantidade_estoque,
            estoque_minimo
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
            body.nome,
            body.descricao,
            body.tamanho,
            body.peso,
            body.caracteristicas,
            body.quantidade_estoque ?? 0,
            body.estoque_minimo ?? 0
        ]
    )

    return reply.status(201).send({
        message: "PRODUTO CRIADO",
        produto: resultado.rows[0]
    })
})


// EDITAR PRODUTO
servidor.put('/produtos/:id', async (request, reply) => {

    const body = request.body
    const id = request.params.id

    const produto = await sql.query(
        `SELECT * FROM produtos
         WHERE id_produto = $1`,
        [id]
    )

    if (produto.rows.length === 0) {
        return reply.status(404).send({
            message: "produto não encontrado"
        })
    }

    await sql.query(
        `UPDATE produtos
         SET nome = $1,
             descricao = $2,
             tamanho = $3,
             peso = $4,
             caracteristicas = $5,
             quantidade_estoque = $6,
             estoque_minimo = $7
         WHERE id_produto = $8`,
        [
            body.nome,
            body.descricao,
            body.tamanho,
            body.peso,
            body.caracteristicas,
            body.quantidade_estoque,
            body.estoque_minimo,
            id
        ]
    )

    return reply.status(200).send({
        message: "PRODUTO ATUALIZADO"
    })
})


// DELETAR PRODUTO
servidor.delete('/produtos/:id', async (request, reply) => {

    const id = request.params.id

    const produto = await sql.query(
        `SELECT * FROM produtos
         WHERE id_produto = $1`,
        [id]
    )

    if (produto.rows.length === 0) {
        return reply.status(404).send({
            message: "produto não encontrado"
        })
    }

    await sql.query(
        `DELETE FROM produtos
         WHERE id_produto = $1`,
        [id]
    )

    return reply.status(200).send({
        message: "PRODUTO DELETADO"
    })
})


// MOVIMENTAÇÃO
servidor.post('/movimentacoes', async (request, reply) => {

    const body = request.body

    if (
        !body ||
        !body.id_produto ||
        !body.id_usuario ||
        !body.tipo ||
        !body.quantidade
    ) {
        return reply.status(400).send({
            message: "produto, usuário, tipo e quantidade obrigatórios"
        })
    }

    if (body.tipo !== 'entrada' && body.tipo !== 'saida') {
        return reply.status(400).send({
            message: "tipo deve ser entrada ou saida"
        })
    }

    const produto = await sql.query(
        `SELECT * FROM produtos
         WHERE id_produto = $1`,
        [body.id_produto]
    )

    if (produto.rows.length === 0) {
        return reply.status(404).send({
            message: "produto não encontrado"
        })
    }

    const estoqueAtual = produto.rows[0].quantidade_estoque

    if (
        body.tipo === 'saida' &&
        body.quantidade > estoqueAtual
    ) {
        return reply.status(400).send({
            message: "quantidade maior que o estoque disponível"
        })
    }

    await sql.query(
        `INSERT INTO movimentacoes_estoque
        (id_produto, id_usuario, tipo, quantidade)
        VALUES ($1, $2, $3, $4)`,
        [
            body.id_produto,
            body.id_usuario,
            body.tipo,
            body.quantidade
        ]
    )

    if (body.tipo === 'entrada') {

        await sql.query(
            `UPDATE produtos
             SET quantidade_estoque =
                 quantidade_estoque + $1
             WHERE id_produto = $2`,
            [body.quantidade, body.id_produto]
        )

    } else {

        await sql.query(
            `UPDATE produtos
             SET quantidade_estoque =
                 quantidade_estoque - $1
             WHERE id_produto = $2`,
            [body.quantidade, body.id_produto]
        )
    }

    const atualizado = await sql.query(
        `SELECT *
         FROM produtos
         WHERE id_produto = $1`,
        [body.id_produto]
    )

    const produtoAtualizado = atualizado.rows[0]

    if (
        produtoAtualizado.quantidade_estoque <
        produtoAtualizado.estoque_minimo
    ) {
        return reply.status(201).send({
            message: "MOVIMENTAÇÃO REGISTRADA",
            alerta: "ESTOQUE ABAIXO DO MÍNIMO",
            produto: produtoAtualizado
        })
    }

    return reply.status(201).send({
        message: "MOVIMENTAÇÃO REGISTRADA",
        produto: produtoAtualizado
    })
})


// HISTÓRICO
servidor.get('/movimentacoes', async () => {

    const resultado = await sql.query(
        `SELECT
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
             ON m.id_usuario = u.id_usuario
         ORDER BY m.data_movimentacao DESC`
    )

    return resultado.rows
})


// INICIAR SERVIDOR
servidor.listen({
    port: 3000
})