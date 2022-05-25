"use strict";

const { v4 } = require("uuid");
const AWS = require("aws-sdk");
// const env = require("dotenv");

const dynamoDbOfflineOptions = {
  region: "localhost",
  endpoint: "http://localhost:8000",
};

const params = {
  TableName: process.env.PACIENTES_TABLE,
};

const isOffline = () => process.env.IS_OFFLINE;

const dynamoDb = isOffline
  ? new AWS.DynamoDB.DocumentClient(dynamoDbOfflineOptions)
  : new AWS.DynamoDB.DocumentClient();

module.exports.listarPacientes = async (event) => {
  try {
    const queryString = {
      limit: 5,
      ...event.queryStringParameters,
    };

    const { limit, next } = queryString;

    let localParams = { ...params, Limit: limit };

    if (next) {
      localParams.ExclusiveStartKey = {
        paciente_id: next,
      };
    }

    let data = await dynamoDb.scan(localParams).promise();

    let nextToken =
      data.LastEvaluatedKey !== undefined
        ? data.LastEvaluatedKey.paciente_id
        : null;

    return {
      statusCode: 200,
      body: JSON.stringify({ items: data.Items, next_token: nextToken }),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode ? error.statusCode : 500,
      body: JSON.stringify({
        error: error.name ? error.name : "Ocorreu um erro",
        message: error.message ? error.message : "Erro desconhecido",
      }),
    };
  }
};

module.exports.obterPaciente = async (event) => {
  try {
    const { pacienteId } = event.pathParameters;
    const data = await dynamoDb
      .get({
        ...params,
        Key: {
          paciente_id: pacienteId,
        },
      })
      .promise();

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Paciente não encontrado" }, null, 2),
      };
    }

    const paciente = data.Item;

    return {
      statusCode: 200,
      body: JSON.stringify(paciente, null, 2),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode ? error.statusCode : 500,
      body: JSON.stringify({
        error: error.name ? error.name : "Ocorreu um erro",
        message: error.message ? error.message : "Erro desconhecido",
      }),
    };
  }
};

module.exports.cadastrarPaciente = async (event) => {
  try {
    const timestamp = new Date().getTime();

    const dados = JSON.parse(event.body);

    const paciente = {
      ...dados,
      paciente_id: v4(),
      criado_em: timestamp,
      atualizado_em: timestamp,
    };

    await dynamoDb
      .put({
        TableName: "PACIENTES",
        Item: paciente,
      })
      .promise();

    return {
      statusCode: 201,
      body: JSON.stringify(paciente),
    };
  } catch (error) {
    return {
      statusCode: error.statusCode ? error.statusCode : 500,
      body: JSON.stringify({
        error: error.name ? error.name : "Ocorreu um erro",
        message: error.message ? error.message : "Erro desconhecido",
      }),
    };
  }
};

module.exports.atualizarPaciente = async (event) => {
  const { pacienteId } = event.pathParameters;
  try {
    const dados = JSON.parse(event.body);
    const timestamp = new Date().getTime();

    await dynamoDb
      .update({
        ...params,
        Key: {
          paciente_id: pacienteId,
        },
        UpdateExpression:
          "set nome = :nome, atualizado_em = :atualizado_em, " +
          "data_nascimento = :dt, telefone = :telefone, " +
          "email = :email",
        // Condition Expression garante que o paciente exista antes de atualizar
        // Impede a criação de um novo paciente se não houver um paciente com o id informado
        ConditionExpression: "attribute_exists(paciente_id)",
        ExpressionAttributeValues: {
          ":nome": dados.nome,
          ":atualizado_em": timestamp,
          ":dt": dados.data_nascimento,
          ":telefone": dados.telefone,
          ":email": dados.email,
        },
      })
      .promise();

    return {
      statusCode: 204,
    };
  } catch (error) {
    let err = error.name ? error.name : "Ocorreu um erro";
    let message = error.message ? error.message : "Erro desconhecido";
    let statusCode = error.statusCode ? error.statusCode : 500;

    if (err === "ConditionalCheckFailedException") {
      err = "Paciente não encontrado";
      message = `Recurso com o id informado (${pacienteId}) não existe e não pode ser atualizado`;
      statusCode = 404;
    }

    return {
      statusCode,
      body: JSON.stringify({
        error: err,
        message,
      }),
    };
  }
};

module.exports.excluirPaciente = async (event) => {
  const { pacienteId } = event.pathParameters;

  try {
    const dados = JSON.parse(event.body);
    const timestamp = new Date().getTime();

    await dynamoDb
      .delete({
        ...params,
        Key: {
          paciente_id: pacienteId,
        },
        // Condition Expression garante que o paciente exista antes de atualizar
        // Impede a criação de um novo paciente se não houver um paciente com o id informado
        ConditionExpression: "attribute_exists(paciente_id)",
      })
      .promise();

    return {
      statusCode: 204,
    };
  } catch (error) {
    let err = error.name ? error.name : "Ocorreu um erro";
    let message = error.message ? error.message : "Erro desconhecido";
    let statusCode = error.statusCode ? error.statusCode : 500;

    if (err === "ConditionalCheckFailedException") {
      err = "Paciente não encontrado";
      message = `Recurso com o id informado (${pacienteId}) não existe e não pode ser atualizado`;
      statusCode = 404;
    }

    return {
      statusCode,
      body: JSON.stringify({
        error: err,
        message,
      }),
    };
  }
};
