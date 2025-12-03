const db = require("../config/db");

// Fonction pour créer un cycle fermé par niveau
function creerCycleFerme(users) {
    const n = users.length;
    if (n < 2) return [];

    // Mélanger aléatoirement
    const melange = [...users].sort(() => Math.random() - 0.5);
    
    const paires = [];
    for (let i = 0; i < n; i++) {
        const donneur = melange[i];
        const receveur = melange[(i + 1) % n]; // Le dernier pointe vers le premier
        paires.push({ donneur_id: donneur.id, receveur_id: receveur.id });
    }
    
    return paires;
}

// Lancer le pairing
exports.lancerPairing = async (req, res) => {
    try {
        // 1. Vérifier s'il y a déjà un tirage
        const [existant] = await db.query("SELECT COUNT(*) as count FROM attributions");
        if (existant[0].count > 0) {
            return res.status(400).json({ 
                message: "Un tirage a déjà été effectué. Réinitialisez d'abord." 
            });
        }

        // 2. Récupérer tous les utilisateurs groupés par niveau
        const [users] = await db.query("SELECT id, nom, prenom, sexe, niveau FROM users ORDER BY niveau, id");
        
        if (users.length < 2) {
            return res.status(400).json({ 
                message: "Il faut au moins 2 inscrits pour lancer le pairing" 
            });
        }

        // 3. Grouper les utilisateurs par niveau
        const parNiveau = {
            'L1': [],
            'L2': [],
            'L3': [],
            'M1': [],
            'M2': []
        };

        users.forEach(user => {
            if (parNiveau[user.niveau]) {
                parNiveau[user.niveau].push(user);
            }
        });

        // 4. Vérifier que chaque niveau a au moins 2 personnes
        const niveauxInsuffisants = [];
        Object.keys(parNiveau).forEach(niveau => {
            if (parNiveau[niveau].length === 1) {
                niveauxInsuffisants.push(niveau);
            }
        });

        if (niveauxInsuffisants.length > 0) {
            return res.status(400).json({ 
                message: `Impossible de créer un cycle. Niveaux avec 1 seule personne : ${niveauxInsuffisants.join(', ')}. Il faut au moins 2 personnes par niveau ou 0.`
            });
        }

        // 5. Créer un cycle fermé pour chaque niveau
        let toutesLesPaires = [];
        const cycles = {};

        Object.keys(parNiveau).forEach(niveau => {
            if (parNiveau[niveau].length >= 2) {
                const cycle = creerCycleFerme(parNiveau[niveau]);
                cycles[niveau] = cycle;
                toutesLesPaires = toutesLesPaires.concat(cycle);
            }
        });

        // 6. Insérer toutes les attributions
        if (toutesLesPaires.length === 0) {
            return res.status(400).json({ 
                message: "Aucun pairing possible. Vérifiez les inscriptions." 
            });
        }

        const values = toutesLesPaires.map(p => [p.donneur_id, p.receveur_id]);
        await db.query(
            "INSERT INTO attributions (donneur_id, receveur_id) VALUES ?",
            [values]
        );

        // 7. Récupérer les résultats avec noms complets
        const [resultats] = await db.query(`
            SELECT 
                u1.identifiant as donneur_identifiant,
                u1.nom as donneur_nom,
                u1.prenom as donneur_prenom,
                u1.niveau as donneur_niveau,
                u2.identifiant as receveur_identifiant,
                u2.nom as receveur_nom,
                u2.prenom as receveur_prenom,
                u2.niveau as receveur_niveau
            FROM attributions a
            JOIN users u1 ON a.donneur_id = u1.id
            JOIN users u2 ON a.receveur_id = u2.id
            ORDER BY u1.niveau, u1.nom
        `);

        res.json({ 
            message: "Pairing effectué avec succès par niveau !",
            paires: resultats,
            statistiques: {
                total: resultats.length,
                parNiveau: Object.keys(cycles).reduce((acc, niveau) => {
                    acc[niveau] = cycles[niveau].length;
                    return acc;
                }, {})
            }
        });

    } catch (error) {
        console.error("Erreur lors du pairing:", error);
        res.status(500).json({ 
            message: "Erreur lors de la création du pairing",
            error: error.message 
        });
    }
};

// Réinitialiser le pairing
exports.reinitialiserPairing = async (req, res) => {
    try {
        await db.query("DELETE FROM attributions");
        res.json({ message: "Pairing réinitialisé avec succès" });
    } catch (error) {
        console.error("Erreur réinitialisation:", error);
        res.status(500).json({ message: "Erreur lors de la réinitialisation" });
    }
};

// Vérifier si un tirage a été effectué
exports.verifierTirage = async (req, res) => {
    try {
        const [result] = await db.query("SELECT COUNT(*) as count FROM attributions");
        res.json({ tirageEffectue: result[0].count > 0 });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la vérification" });
    }
};
