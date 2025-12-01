const db = require("../db");

// Inscription étudiant
exports.inscrire = (req, res) => {
    const { nom, prenom, sexe } = req.body;

    if (!nom || !prenom || !sexe) {
        return res.status(400).json({ message: "Tous les champs sont requis" });
    }

    if (!['M', 'F'].includes(sexe)) {
        return res.status(400).json({ message: "Sexe invalide (M ou F)" });
    }

    const sql = "INSERT INTO users (nom, prenom, sexe) VALUES (?, ?, ?)";
    
    db.query(sql, [nom.trim(), prenom.trim(), sexe], (err) => {
        if (err) {
            console.log("Erreur insertion:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        res.json({ message: "Inscription réussie !" });
    });
};

// Login admin
exports.loginAdmin = (req, res) => {
    const { identifiant, code } = req.body;

    if (identifiant === "Admivieedu" && code === "44502") {
        res.json({ 
            success: true, 
            message: "Connexion réussie",
            token: "admin-bde-2025" 
        });
    } else {
        res.status(401).json({ 
            success: false, 
            message: "Identifiant ou code incorrect" 
        });
    }
};

// Récupérer tous les participants
exports.getParticipants = (req, res) => {
    const sql = "SELECT * FROM users ORDER BY created_at DESC";
    
    db.query(sql, (err, users) => {
        if (err) {
            console.log("Erreur:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        
        const garcons = users.filter(u => u.sexe === "M").length;
        const filles = users.filter(u => u.sexe === "F").length;
        
        res.json({
            users: users,
            stats: {
                total: users.length,
                garcons: garcons,
                filles: filles
            }
        });
    });
};

// Faire le pairing automatique
exports.fairePairing = (req, res) => {
    db.query("SELECT * FROM users", (err, users) => {
        if (err) {
            console.log("Erreur:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (users.length < 2) {
            return res.status(400).json({ 
                message: "Il faut au moins 2 participants" 
            });
        }

        // Mélange aléatoire
        let garcons = users.filter(u => u.sexe === "M").sort(() => Math.random() - 0.5);
        let filles = users.filter(u => u.sexe === "F").sort(() => Math.random() - 0.5);
        
        const paires = [];

        // Paires mixtes en priorité
        while (garcons.length && filles.length) {
            const g = garcons.pop();
            const f = filles.pop();
            paires.push({
                personne1: g,
                personne2: f,
                type: "mixte"
            });
        }

        // Paires de garçons si filles épuisées
        while (garcons.length > 1) {
            const g1 = garcons.pop();
            const g2 = garcons.pop();
            paires.push({
                personne1: g1,
                personne2: g2,
                type: "meme_sexe"
            });
        }

        // Paires de filles si garçons épuisés
        while (filles.length > 1) {
            const f1 = filles.pop();
            const f2 = filles.pop();
            paires.push({
                personne1: f1,
                personne2: f2,
                type: "meme_sexe"
            });
        }

        // Gestion des personnes seules
        const personnesSeules = [];
        if (garcons.length === 1) personnesSeules.push(garcons[0]);
        if (filles.length === 1) personnesSeules.push(filles[0]);

        if (personnesSeules.length > 0) {
            paires.push({
                personne1: personnesSeules[0],
                personne2: null,
                type: "seul"
            });
        }

        // Supprimer anciennes paires
        db.query("DELETE FROM paires", (err) => {
            if (err) {
                console.log("Erreur suppression paires:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }

            // Sauvegarder nouvelles paires (seulement celles avec 2 personnes)
            const pairesAInserer = paires.filter(p => p.personne2 !== null);
            
            if (pairesAInserer.length === 0) {
                return res.json({
                    message: "Pairing effectué !",
                    paires: paires,
                    stats: { 
                        total: paires.length, 
                        mixtes: 0, 
                        meme_sexe: 0,
                        seuls: paires.filter(p => p.type === "seul").length
                    }
                });
            }

            let compteur = 0;
            let erreurInsert = false;

            pairesAInserer.forEach((p) => {
                const sql = "INSERT INTO paires (user1_id, user2_id, type_paire) VALUES (?, ?, ?)";
                db.query(sql, [p.personne1.id, p.personne2.id, p.type], (err) => {
                    if (err) {
                        console.log("Erreur insertion paire:", err);
                        erreurInsert = true;
                    }
                    compteur++;
                    
                    if (compteur === pairesAInserer.length) {
                        if (erreurInsert) {
                            return res.status(500).json({ message: "Erreur lors de l'insertion des paires" });
                        }
                        
                        res.json({
                            message: "Pairing effectué avec succès !",
                            paires: paires,
                            stats: {
                                total: paires.length,
                                mixtes: paires.filter(p => p.type === "mixte").length,
                                meme_sexe: paires.filter(p => p.type === "meme_sexe").length,
                                seuls: paires.filter(p => p.type === "seul").length
                            }
                        });
                    }
                });
            });
        });
    });
};

// Exporter en format Excel (CSV)
exports.exporterExcel = (req, res) => {
    const sql = `
        SELECT 
            u1.nom as nom1, u1.prenom as prenom1, u1.sexe as sexe1,
            u2.nom as nom2, u2.prenom as prenom2, u2.sexe as sexe2,
            p.type_paire
        FROM paires p
        JOIN users u1 ON p.user1_id = u1.id
        JOIN users u2 ON p.user2_id = u2.id
        ORDER BY p.id
    `;
    
    db.query(sql, (err, paires) => {
        if (err) {
            console.log("Erreur:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }

        if (paires.length === 0) {
            return res.status(404).json({ message: "Aucune paire à exporter" });
        }

        // Générer CSV avec BOM UTF-8 pour Excel
        let csv = "\uFEFF"; // BOM UTF-8
        csv += "Binome,Nom 1,Prenom 1,Sexe 1,Nom 2,Prenom 2,Sexe 2,Type\n";
        
        paires.forEach((p, i) => {
            csv += `${i + 1},${p.nom1},${p.prenom1},${p.sexe1},${p.nom2},${p.prenom2},${p.sexe2},${p.type_paire}\n`;
        });

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', 'attachment; filename=binomes-bde-2025.csv');
        res.send(csv);
    });
};

// Réinitialiser tout
exports.reinitialiser = (req, res) => {
    db.query("DELETE FROM paires", (err) => {
        if (err) {
            console.log("Erreur:", err);
            return res.status(500).json({ message: "Erreur serveur" });
        }
        
        db.query("DELETE FROM users", (err) => {
            if (err) {
                console.log("Erreur:", err);
                return res.status(500).json({ message: "Erreur serveur" });
            }
            
            // Réinitialiser les auto-increment
            db.query("ALTER TABLE users AUTO_INCREMENT = 1", () => {
                db.query("ALTER TABLE paires AUTO_INCREMENT = 1", () => {
                    res.json({ message: "Tout a été réinitialisé" });
                });
            });
        });
    });
};