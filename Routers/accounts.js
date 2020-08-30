import express from "express";
import { clientModel } from "../models/clientModels.js";

const router = express.Router();

async function ObtemSaldo(agencia, conta) {
  return await clientModel.findOne(
    {
      $and: [{ agencia: agencia }, { conta: conta }],
    },
    { _id: 0, balance: 1 }
  );
}

async function ObtemSaldoPorConta(conta) {
  return await clientModel.findOne(
    {
      conta: conta,
    },
    { _id: 0 }
  );
}

async function AtualizaSaldo(agencia, conta, balance) {
  return await clientModel.updateOne(
    { $and: [{ agencia: agencia }, { conta: conta }] },
    { $set: { balance: balance } }
  );
}

//REALIZA DEPOSITO EM CONTA
router.put("/deposito", async (req, res, next) => {
  try {
    let account = req.body;

    if (!account.agencia || !account.conta || account.balance == null) {
      throw new Error("Agencia, conta e saldo devem ser informados");
    }

    let { agencia, conta, balance } = account;

    let balanceToUpdate = await ObtemSaldo(agencia, conta);

    balance += balanceToUpdate.balance;

    await AtualizaSaldo(agencia, conta, balance);

    logger.info(`PUT /account/ - Saldo atualizado: ${balance}`);
    res.send(JSON.stringify({ saldo_atualizado: balance }));
  } catch (error) {
    next(error);
  }
});

//REALIZA SAQUE EM CONTA COM TARIFA DE $1
router.put("/saque", async (req, res, next) => {
  try {
    let account = req.body;

    if (!account.agencia || !account.conta || account.balance == null) {
      throw new Error("Agencia, conta e saldo devem ser informados");
    }

    let { agencia, conta, balance } = account;

    let balanceToUpdate = await ObtemSaldo(agencia, conta);

    if (balance > balanceToUpdate.balance) {
      throw new Error("Saldo insuficiente");
    }

    balance = balanceToUpdate.balance - 1 - balance; //subtrai valor de saque considerando tarifa de 1

    await AtualizaSaldo(agencia, conta, balance);

    logger.info(`PUT /account/ - Saldo atualizado: ${balance}`);
    res.send(JSON.stringify({ saldo_atualizado: balance }));
  } catch (error) {
    next(error);
  }
});

//OBTEM O SALDO EM CONTA
router.get("/balance", async (req, res, next) => {
  try {
    let account = req.body;

    const { agencia, conta } = account;

    if (!agencia || !conta) {
      throw new Error("Agencia e conta devem ser informados");
    }

    account = await ObtemSaldo(agencia, conta);

    logger.info(`GET /account/balance ${JSON.stringify(account)}`);
    res.send(account);
  } catch (error) {
    next(error);
  }
});

//DELETA UMA CONTA E RETORNA O NUMERO DE CONTAS ATIVAS PARA AGENCIA
router.delete("/", async (req, res, next) => {
  try {
    let account = req.body;
    const { agencia, conta } = account;
    if (!agencia || !conta) {
      throw new Error("Agencia e conta deve ser informados");
    }

    account = await clientModel.deleteOne({
      $and: [{ agencia: agencia }, { conta: conta }],
    });

    if (!account || account.deletedCount == 0) {
      logger.error("Agencia e conta não encontrados");
      throw new Error("Agencia e conta não encontrados");
    } else {
      const qtd = await clientModel.countDocuments({ agencia: agencia });
      logger.info(`DELETE /account/ - ${JSON.stringify(req.body)}`);
      res.send(JSON.stringify({ contas_ativas: qtd }));
    }
  } catch (error) {
    next(error);
  }
});

router.put("/transferencia", async (req, res, next) => {
  try {
    let account = req.body;

    let { conta_origem, conta_destino, valor } = account;

    if (!conta_origem || !conta_destino || valor == null) {
      throw new Error(
        "Agencia e conta de origem e destino devem ser informados"
      );
    }

    const account_a = await ObtemSaldoPorConta(conta_origem);
    const account_b = await ObtemSaldoPorConta(conta_destino);

    if (account_a.agencia != account_b.agencia) {
      valor += 8;
    }

    if (valor > account_a.balance) {
      logger.error("Saldo insulficiente");
      throw new Error("Saldo insuficiente");
    }
    account_a.balance -= valor;

    await AtualizaSaldo(account_a.agencia, account_a.conta, account_a.balance);

    await AtualizaSaldo(
      account_b.agencia,
      account_b.conta,
      account_b.balance + (valor - 8)
    );

    logger.info(`PUT /account/transferencia ${account_a.balance}`);
    res.send(JSON.stringify({ saldo_atualizado: account_a.balance }));
  } catch (error) {
    next(error);
  }
});

//OBTEM VALOR MEDIO DO SALDO EM CONTA PARA OS CLIENTES DA AGENCIA INFORMADA
router.get("/avg", async (req, res, next) => {
  try {
    const { agencia } = req.body;

    const media = await clientModel.aggregate([
      { $match: { agencia: agencia } },
      { $group: { _id: null, total: { $avg: "$balance" } } },
    ]);

    logger.info(`GET /account/avg - ${media[0].total}`);
    res.send(JSON.stringify({ media: media[0].total }));
  } catch (error) {
    next(error);
  }
});

//OBTEM LISTA DAS CONTAS COM MENOR SALDO
router.get("/downBalance", async (req, res, next) => {
  try {
    const { quantidade } = req.body;

    if (!quantidade) {
      logger.error("Quantidade não informada");
      throw new Error("quantidade deve ser informada");
    }

    const accounts = await clientModel
      .find({}, { _id: 0, agencia: 1, conta: 1, balance: 1 })
      .limit(quantidade)
      .sort({ balance: 1 });

    logger.info(`GET /account/downBalance - ${JSON.stringify(accounts)}`);
    res.send(JSON.stringify({ accounts }));
  } catch (error) {
    next(error);
  }
});

//OBTEM LISTA DAS CONTAS COM MAIOR SALDO
router.get("/topBalance", async (req, res, next) => {
  try {
    const { quantidade } = req.body;

    if (!quantidade) {
      logger.error("Quantidade não informada");
      throw new Error("quantidade deve ser informada");
    }

    const accounts = await clientModel
      .find({}, { _id: 0, agencia: 1, conta: 1, name: 1, balance: 1 })
      .limit(quantidade)
      .sort({ balance: -1, name: 1 });

    logger.info(`GET /account/downBalance - ${JSON.stringify(accounts)}`);
    res.send(JSON.stringify({ accounts }));
  } catch (error) {
    next(error);
  }
});

router.post("/processClientsPrivate", async (req, res, next) => {
  try {
    const agencias = await clientModel.distinct("agencia");
    const accounts = [];
    let aux;

    for (const element of agencias) {
      aux = await clientModel
        .findOne({ agencia: element })
        .sort({ balance: -1 })
        .limit(1);
      aux.agencia = 99;
      await clientModel.updateOne({ _id: aux.id }, aux);
      accounts.push(aux);
    }

    logger.info(`GET /account/downBalance - ${JSON.stringify(accounts)}`);
    res.send(JSON.stringify({ accounts }));
  } catch (error) {
    next(error);
  }
});

//TRATAMENTO DE ERRO GENERICO
router.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.baseUrl} - ${err.message}`);
  res.status(400).send({ error: err.message });
});

export default router;
