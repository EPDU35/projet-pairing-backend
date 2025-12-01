const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const users = require("./controllers/users");

// Routes publiques
app.post("/api/inscription", users.inscrire);

// Routes admin
app.post("/api/admin/login", users.loginAdmin);
app.get("/api/admin/participants", users.getParticipants);
app.post("/api/admin/parrainer", users.fairePairing);
app.get("/api/admin/export", users.exporterExcel);
app.delete("/api/admin/reset", users.reinitialiser);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`\nServeur BDE démarré`);
    console.log(`http://localhost:${PORT}`);
    console.log(`${new Date().toLocaleString('fr-FR')}\n`);
});