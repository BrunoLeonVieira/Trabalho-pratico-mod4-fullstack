import mongoose from "mongoose";

//cria modelo de dados
const clientSchema = mongoose.Schema({
  agencia: {
    type: Number,
    required: true,
  },
  conta: {
    type: Number,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  balance: {
    type: Number,
    required: true,
    validate(value) {
      if (value < 0) throw new Error("Valor negativo para o saldo");
    },
  },
});

//definindo o modelo da coleção
const clientModel = mongoose.model("clients", clientSchema);
export { clientModel };
