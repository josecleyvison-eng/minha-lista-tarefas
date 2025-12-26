const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose(); // Importamos o SQLite
const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));

// 1. Criar e Conectar ao Banco de Dados
// Ele vai criar um arquivo chamado 'database.db' na sua pasta automaticamente
const db = new sqlite3.Database("database.db");

// 2. Criar a Tabela (se ela não existir)
// É como criar as colunas no Excel: ID, Descrição e se está Feita
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tarefas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        descricao TEXT,
        feita INTEGER
    )`);
});

// --- ROTAS (Agora usando SQL) ---

// ROTA GET (Buscar)
app.get("/tarefas", (req, res) => {
  // "Selecione TUDO da tabela tarefas"
  db.all("SELECT * FROM tarefas", (err, rows) => {
    if (err) return res.status(500).send(err.message);

    // O banco salva True/False como 1/0. Vamos converter de volta para o Frontend entender
    const tarefasFormatadas = rows.map((t) => ({
      id: t.id,
      descricao: t.descricao,
      feita: t.feita === 1, // Se for 1, vira true. Se for 0, vira false
    }));

    res.json(tarefasFormatadas);
  });
});

// ROTA POST (Criar)
app.post("/tarefas", (req, res) => {
  const descricao = req.body.descricao;
  // Vamos inserir 0 (false) porque a tarefa começa não feita
  const sql = "INSERT INTO tarefas (descricao, feita) VALUES (?, ?)";

  // Aquele '?' é substituído pelos dados (segurança contra hackers!)
  db.run(sql, [descricao, 0], function (err) {
    if (err) return res.status(500).send(err.message);

    // Devolvemos a tarefa criada com o ID que o banco gerou
    res.status(201).json({ id: this.lastID, descricao, feita: false });
  });
});

// ROTA PUT (Atualizar)
app.put("/tarefas/:id", (req, res) => {
  const id = req.params.id;
  const { descricao, feita } = req.body;

  // Lógica para saber o que atualizar
  // Se veio 'feita', convertemos true/false para 1/0. Se não, mantemos o que estava.
  // (Num app real faríamos uma query mais dinâmica, mas aqui vamos simplificar atualizando tudo)

  // IMPORTANTE: SQL não aceita update parcial fácil igual Javascript.
  // Vamos fazer um update focado na coluna que mudou.

  if (descricao !== undefined) {
    db.run(
      "UPDATE tarefas SET descricao = ? WHERE id = ?",
      [descricao, id],
      (err) => {
        if (err) return res.status(500).send(err);
        res.send("Descrição atualizada");
      }
    );
  }

  if (feita !== undefined) {
    const valorFeita = feita ? 1 : 0; // Converte true->1, false->0
    db.run(
      "UPDATE tarefas SET feita = ? WHERE id = ?",
      [valorFeita, id],
      (err) => {
        if (err) return res.status(500).send(err);
        res.send("Status atualizado");
      }
    );
  }
});

// ROTA DELETE (Apagar)
app.delete("/tarefas/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM tarefas WHERE id = ?", [id], (err) => {
    if (err) return res.status(500).send(err);
    res.send("Deletado!");
  });
});

app.listen(3000, () => {
  console.log("Servidor SQL rodando em http://localhost:3000");
});
