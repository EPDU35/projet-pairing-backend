const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const users = require("./controllers/users");

// Page d'accueil
app.get("/", (req, res) => {
    res.json({ 
        message: "API BDE MIAGE-UFHB - Jeu des Invisibles", 
        status: "En ligne",
        endpoints: [
            "POST /api/inscription",
            "POST /api/admin/login",
            "GET /api/admin/participants",
            "POST /api/admin/parrainer",
            "GET /api/admin/paires",
            "GET /api/admin/export",
            "DELETE /api/admin/reset"
        ]
    });
});

// Routes publiques
app.post("/api/inscription", users.inscrire);
app.post("/api/tirage", users.decouvrirAttribution);
app.get("/api/tirage/statut", users.verifierStatutTirage);

// Routes admin
app.post("/api/admin/login", users.loginAdmin);
app.get("/api/admin/participants", users.getParticipants);
app.post("/api/admin/parrainer", users.fairePairing);
app.get("/api/admin/paires", users.getPaires);
app.get("/api/admin/export", users.exporterExcel);
app.delete("/api/admin/participant/:id", users.supprimerParticipant);
app.delete("/api/admin/reset", users.reinitialiser);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\nServeur BDE démarré`);
    console.log(`Port: ${PORT}`);
    console.log(`${new Date().toLocaleString('fr-FR')}\n`);
});
