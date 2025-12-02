const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const users = require("./controllers/users");

// Protection anti-spam simple (rate limiting manuel)
const rateLimitStore = {};

const rateLimit = (maxRequests, windowMs) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        if (!rateLimitStore[ip]) {
            rateLimitStore[ip] = [];
        }
        
        rateLimitStore[ip] = rateLimitStore[ip].filter(time => now - time < windowMs);
        
        if (rateLimitStore[ip].length >= maxRequests) {
            return res.status(429).json({ 
                error: "Trop de requêtes. Attends un peu avant de réessayer." 
            });
        }
        
        rateLimitStore[ip].push(now);
        next();
    };
};

setInterval(() => {
    Object.keys(rateLimitStore).forEach(ip => {
        if (rateLimitStore[ip].length === 0) {
            delete rateLimitStore[ip];
        }
    });
}, 60 * 60 * 1000);

app.get("/", (req, res) => {
    res.json({ 
        message: "API Jeu d'Invisibilité - BDE MIAGE-UFHB", 
        status: "En ligne",
        endpoints: [
            "POST /api/inscription",
            "POST /api/admin/login",
            "GET /api/admin/participants",
            "POST /api/admin/parrainer",
            "GET /api/admin/export",
            "DELETE /api/admin/reset"
        ]
    });
});

app.post("/api/inscription", rateLimit(3, 15 * 60 * 1000), users.inscrire);

app.post("/api/admin/login", rateLimit(5, 15 * 60 * 1000), users.loginAdmin);
app.get("/api/admin/participants", users.getParticipants);
app.post("/api/admin/parrainer", users.fairePairing);
app.get("/api/admin/export", users.exporterExcel);
app.delete("/api/admin/reset", users.reinitialiser);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("\nServeur Jeu d'Invisibilité démarré");
    console.log(`Port: ${PORT}`);
    console.log(`${new Date().toLocaleString('fr-FR')}\n`);
});

module.exports = app;
