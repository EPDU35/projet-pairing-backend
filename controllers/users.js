const pool = require("../db");

// Identifiants admin en dur (à modifier selon tes besoins)
const ADMIN_USERNAME = "Admivieedu";
const ADMIN_PASSWORD = "44502";

// Login admin
exports.loginAdmin = async (req, res) => {
    const { username, password } = req.body;

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        res.json({ 
            success: true, 
            message: "Connexion réussie",
            token: "admin-token-123" // Token simple pour le frontend
        });
    } else {
        res.status(401).json({ error: "Identifiants incorrects" });
    }
};

// Inscription d'un participant
exports.inscrire = async (req, res) => {
    const { nom, prenom, sexe } = req.body;

    if (!nom || !prenom || !sexe) {
        return res.status(400).json({ error: "Tous les champs sont obligatoires" });
    }

    try {
        const [result] = await pool.query(
            "INSERT INTO users (nom, prenom, sexe) VALUES (?, ?, ?)",
            [nom.trim(), prenom.trim(), sexe]
        );
        res.json({ message: "Inscription réussie", userId: result.insertId });
    } catch (err) {
        console.error("Erreur insertion:", err);
        res.status(500).json({ error: "Erreur lors de l'inscription" });
    }
};

// Récupérer tous les participants
exports.getParticipants = async (req, res) => {
    try {
        const [users] = await pool.query("SELECT * FROM users ORDER BY created_at DESC");
        
        const stats = {
            total: users.length,
            garcons: users.filter(u => u.sexe === "M").length,
            filles: users.filter(u => u.sexe === "F").length
        };

        res.json({ users, stats });
    } catch (err) {
        console.error("Erreur:", err);
        res.status(500).json({ error: "Erreur lors de la récupération des participants" });
    }
};

// Lancer le pairing (nom de la fonction = fairePairing pour correspondre à app.js)
exports.fairePairing = async (req, res) => {
    try {
        // Récupérer tous les users
        const [users] = await pool.query("SELECT * FROM users");

        if (users.length < 2) {
            return res.status(400).json({ error: "Il faut au moins 2 participants" });
        }

        // Séparer par sexe
        let garcons = users.filter(u => u.sexe === "M");
        let filles = users.filter(u => u.sexe === "F");

        // Mélanger avec Fisher-Yates
        const melanger = (arr) => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };

        garcons = melanger(garcons);
        filles = melanger(filles);

        const paires = [];
        const seuls = [];

        // Créer des paires mixtes
        while (garcons.length > 0 && filles.length > 0) {
            const g = garcons.shift();
            const f = filles.shift();
            paires.push({ user1: g, user2: f, type: "mixte" });
        }

        // Gérer les personnes seules
        const restants = [...garcons, ...filles];
        while (restants.length >= 2) {
            const p1 = restants.shift();
            const p2 = restants.shift();
            paires.push({ user1: p1, user2: p2, type: "meme_sexe" });
        }

        if (restants.length === 1) {
            seuls.push(restants[0]);
        }

        // Supprimer les anciennes paires
        await pool.query("DELETE FROM paires");

        // Insérer les nouvelles paires
        for (const p of paires) {
            await pool.query(
                "INSERT INTO paires (user1_id, user2_id, type_paire) VALUES (?, ?, ?)",
                [p.user1.id, p.user2.id, p.type]
            );
        }

        res.json({ 
            message: "Pairing réussi",
            paires: paires.map(p => ({
                binome: `${p.user1.prenom} ${p.user1.nom} + ${p.user2.prenom} ${p.user2.nom}`,
                type: p.type
            })),
            seuls: seuls.map(s => `${s.prenom} ${s.nom}`)
        });

    } catch (err) {
        console.error("Erreur pairing:", err);
        res.status(500).json({ error: "Erreur lors du pairing" });
    }
};

// Récupérer les paires existantes
exports.getPaires = async (req, res) => {
    try {
        const [paires] = await pool.query(`
            SELECT 
                p.*,
                u1.nom as nom1, u1.prenom as prenom1, u1.sexe as sexe1,
                u2.nom as nom2, u2.prenom as prenom2, u2.sexe as sexe2
            FROM paires p
            JOIN users u1 ON p.user1_id = u1.id
            JOIN users u2 ON p.user2_id = u2.id
            ORDER BY p.created_at DESC
        `);

        const formatted = paires.map(p => ({
            id: p.id,
            binome: `${p.prenom1} ${p.nom1} + ${p.prenom2} ${p.nom2}`,
            type: p.type_paire,
            user1: { nom: p.nom1, prenom: p.prenom1, sexe: p.sexe1 },
            user2: { nom: p.nom2, prenom: p.prenom2, sexe: p.sexe2 }
        }));

        res.json({ paires: formatted });
    } catch (err) {
        console.error("Erreur:", err);
        res.status(500).json({ error: "Erreur lors de la récupération des paires" });
    }
};

// Exporter en CSV (nom de la fonction = exporterExcel pour correspondre à app.js)
exports.exporterExcel = async (req, res) => {
    try {
        const [paires] = await pool.query(`
            SELECT 
                u1.prenom as prenom1, u1.nom as nom1,
                u2.prenom as prenom2, u2.nom as nom2,
                p.type_paire
            FROM paires p
            JOIN users u1 ON p.user1_id = u1.id
            JOIN users u2 ON p.user2_id = u2.id
        `);

        let csv = "Personne 1,Personne 2,Type\n";
        paires.forEach(p => {
            csv += `"${p.prenom1} ${p.nom1}","${p.prenom2} ${p.nom2}",${p.type_paire}\n`;
        });

        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=pairings.csv");
        res.send(csv);
    } catch (err) {
        console.error("Erreur export:", err);
        res.status(500).json({ error: "Erreur lors de l'export" });
    }
};

// Réinitialiser tout
exports.reinitialiser = async (req, res) => {
    try {
        await pool.query("DELETE FROM paires");
        await pool.query("DELETE FROM users");
        res.json({ message: "Base de données réinitialisée" });
    } catch (err) {
        console.error("Erreur:", err);
        res.status(500).json({ error: "Erreur lors de la réinitialisation" });
    }
};
