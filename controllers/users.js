const pool = require(”../db”);

// Identifiants admin (à modifier en variables d’environnement pour plus de sécurité)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || “Admivieedu”;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || “44502”;

// Protection anti-bruteforce
let loginAttempts = {};

// Nettoyage automatique des tentatives après 15 minutes
setInterval(() => {
loginAttempts = {};
}, 15 * 60 * 1000);

// Login admin avec protection anti-bruteforce
exports.loginAdmin = async (req, res) => {
const { username, password } = req.body;
const ip = req.ip || req.connection.remoteAddress;

```
// Bloquer après 5 tentatives
if (loginAttempts[ip] >= 5) {
    return res.status(429).json({ 
        error: "Trop de tentatives. Réessaie dans 15 minutes" 
    });
}

if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    loginAttempts[ip] = 0;
    res.json({ 
        success: true, 
        message: "Connexion réussie",
        token: "admin-token-" + Date.now()
    });
} else {
    loginAttempts[ip] = (loginAttempts[ip] || 0) + 1;
    res.status(401).json({ 
        error: "Identifiants incorrects",
        tentativesRestantes: 5 - loginAttempts[ip]
    });
}
```

};

// Inscription avec protection contre les doublons
exports.inscrire = async (req, res) => {
const { nom, prenom, sexe } = req.body;

```
if (!nom || !prenom || !sexe) {
    return res.status(400).json({ error: "Tous les champs sont obligatoires" });
}

try {
    // Vérifier si la personne est déjà inscrite
    const [existing] = await pool.query(
        "SELECT * FROM users WHERE LOWER(nom) = LOWER(?) AND LOWER(prenom) = LOWER(?)",
        [nom.trim(), prenom.trim()]
    );

    if (existing.length > 0) {
        return res.status(409).json({ error: "Tu es déjà inscrit !" });
    }

    // Insérer le nouveau participant
    const [result] = await pool.query(
        "INSERT INTO users (nom, prenom, sexe) VALUES (?, ?, ?)",
        [nom.trim(), prenom.trim(), sexe]
    );
    res.json({ message: "Inscription réussie", userId: result.insertId });
} catch (err) {
    console.error("Erreur insertion:", err);
    res.status(500).json({ error: "Erreur lors de l'inscription" });
}
```

};

// Récupérer tous les participants
exports.getParticipants = async (req, res) => {
try {
const [users] = await pool.query(“SELECT * FROM users ORDER BY created_at DESC”);

```
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
```

};

// JEU D’INVISIBILITÉ - Tirage aléatoire avec contrainte de mixité
exports.fairePairing = async (req, res) => {
try {
// Récupérer tous les users
const [users] = await pool.query(“SELECT * FROM users”);

```
    if (users.length < 2) {
        return res.status(400).json({ error: "Il faut au moins 2 participants" });
    }

    // Séparer par sexe
    let garcons = users.filter(u => u.sexe === "M");
    let filles = users.filter(u => u.sexe === "F");

    if (garcons.length === 0 || filles.length === 0) {
        return res.status(400).json({ 
            error: "Il faut au moins 1 garçon et 1 fille pour un tirage mixte" 
        });
    }

    // Mélanger aléatoirement (Fisher-Yates)
    const melanger = (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    };

    garcons = melanger(garcons);
    filles = melanger(filles);

    const attributions = [];
    const sansBinome = [];

    const nbMax = Math.max(garcons.length, filles.length);

    // Chaque fille offre à un garçon
    for (let i = 0; i < filles.length; i++) {
        const garcon = garcons[i % garcons.length];
        attributions.push({
            donneur: filles[i],
            receveur: garcon
        });
    }

    // Chaque garçon offre à une fille (mélange différent)
    const fillesMelangees = melanger([...filles]);
    for (let i = 0; i < garcons.length; i++) {
        const fille = fillesMelangees[i % fillesMelangees.length];
        attributions.push({
            donneur: garcons[i],
            receveur: fille
        });
    }

    // Supprimer les anciennes attributions
    await pool.query("DELETE FROM attributions");

    // Insérer les nouvelles attributions
    for (const attr of attributions) {
        try {
            await pool.query(
                "INSERT IGNORE INTO attributions (donneur_id, receveur_id) VALUES (?, ?)",
                [attr.donneur.id, attr.receveur.id]
            );
        } catch (err) {
            console.error("Erreur insertion attribution:", err);
        }
    }

    res.json({
        message: "Tirage réussi",
        attributions: attributions.map(a => ({
            donneur: `${a.donneur.prenom} ${a.donneur.nom}`,
            receveur: `${a.receveur.prenom} ${a.receveur.nom}`,
            type: a.donneur.sexe === "F" ? "fille_vers_garcon" : "garcon_vers_fille"
        })),
        stats: {
            total: attributions.length,
            fillesVersGarcons: attributions.filter(a => a.donneur.sexe === "F").length,
            garconsVersFilles: attributions.filter(a => a.donneur.sexe === "M").length
        }
    });

} catch (err) {
    console.error("Erreur tirage:", err);
    res.status(500).json({ error: "Erreur lors du tirage" });
}
```

};

// Récupérer les attributions existantes
exports.getPaires = async (req, res) => {
try {
const [attributions] = await pool.query(`SELECT  a.*, d.nom as nom_donneur, d.prenom as prenom_donneur, d.sexe as sexe_donneur, r.nom as nom_receveur, r.prenom as prenom_receveur, r.sexe as sexe_receveur FROM attributions a JOIN users d ON a.donneur_id = d.id JOIN users r ON a.receveur_id = r.id ORDER BY a.created_at DESC`);

```
    const formatted = attributions.map(a => ({
        id: a.id,
        donneur: `${a.prenom_donneur} ${a.nom_donneur}`,
        receveur: `${a.prenom_receveur} ${a.nom_receveur}`,
        sexeDonneur: a.sexe_donneur,
        sexeReceveur: a.sexe_receveur,
        type: a.sexe_donneur === "F" ? "fille_vers_garcon" : "garcon_vers_fille"
    }));

    res.json({ paires: formatted });
} catch (err) {
    console.error("Erreur:", err);
    res.status(500).json({ error: "Erreur lors de la récupération des attributions" });
}
```

};

// Exporter en CSV
exports.exporterExcel = async (req, res) => {
try {
const [attributions] = await pool.query(`SELECT  d.prenom as prenom_donneur, d.nom as nom_donneur, d.sexe as sexe_donneur, r.prenom as prenom_receveur, r.nom as nom_receveur, r.sexe as sexe_receveur FROM attributions a JOIN users d ON a.donneur_id = d.id JOIN users r ON a.receveur_id = r.id`);

```
    let csv = "Donneur,Sexe Donneur,Receveur,Sexe Receveur,Type\n";
    attributions.forEach(a => {
        const type = a.sexe_donneur === "F" ? "Fille vers Garçon" : "Garçon vers Fille";
        csv += `"${a.prenom_donneur} ${a.nom_donneur}","${a.sexe_donneur}","${a.prenom_receveur} ${a.nom_receveur}","${a.sexe_receveur}","${type}"\n`;
    });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", "attachment; filename=tirage_invisibilite.csv");
    res.send("\ufeff" + csv); // BOM UTF-8 pour Excel
} catch (err) {
    console.error("Erreur export:", err);
    res.status(500).json({ error: "Erreur lors de l'export" });
}
```

};

// Réinitialiser tout
exports.reinitialiser = async (req, res) => {
try {
await pool.query(“DELETE FROM attributions”);
await pool.query(“DELETE FROM users”);
res.json({ message: “Base de données réinitialisée” });
} catch (err) {
console.error(“Erreur:”, err);
res.status(500).json({ error: “Erreur lors de la réinitialisation” });
}
};