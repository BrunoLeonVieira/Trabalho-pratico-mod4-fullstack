import express from "express";
import account from "./Routers/accounts.js";
import winston from "winston";
import cors from "cors"; //BIBLIOTECA PARA LIBERAÇÃO DAS ROTAS PARA ACESSO DE OUTROS DOMINIOS
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();
const { combine, timestamp, label, printf } = winston.format;
const format_log = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

global.logger = winston.createLogger({
  level: "silly",
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logger-api.log" }),
  ],
  format: combine(label({ label: "api-accounts" }), timestamp(), format_log),
});

(async () => {
  try {
    await mongoose.connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info("Base de dados conectada com sucesso!");
  } catch (error) {
    logger.error("Erro de conexao com a base de dados" + error);
  }
})();

const app = express();
app.use(express.json());

app.use(cors()); //LIBERANDO TODOS ENDPOINT PARA ACESSO DE OUTROS DOMINIOS

app.use("/account", account);

app.listen(process.env.PORT || 8080, async () => {
  try {
    logger.info("API Started");
  } catch (error) {
    logger.error("Erro ao iniciar API!");
  }
});
