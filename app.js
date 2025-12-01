const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const users = require("./controllers/users");

// Page d'accueil
app.get("/", (req, res) => {
    res.json({ 
        message: "API BDE MIAGE-UFHB", 
        status: "En ligne",
        endpoints: [
            "POST /api/inscription",
            "POST /api/admin/login",
            "GET /api/admin/participants"
        ]
    });
});

// Routes publiques
app.post("/api/inscription", users.inscrire);

// Routes admin
app.post("/api/admin/login", users.loginAdmin);
app.get("/api/admin/participants", users.getParticipants);
app.post("/api/admin/parrainer", users.fairePairing);
app.get("/api/admin/export", users.exporterExcel);
app.delete("/api/admin/reset", users.reinitialiser);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\nServeur BDE démarré`);
    console.log(`Port: ${PORT}`);
    console.log(`${new Date().toLocaleString('fr-FR')}\n`);
});
