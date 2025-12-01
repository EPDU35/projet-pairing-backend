const mysql = require("mysql2");

const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "pairing_db",
    port: process.env.DB_PORT || 3306
});

db.connect(err => {
    if (err) {
        console.error("Connexion MySQL échouée:", err.message);
        console.log("Vérifie tes variables d'environnement DB_HOST, DB_USER, DB_PASSWORD");
        return;
    }
    console.log("MySQL connecté avec succès");
    
    // Créer les tables si elles n'existent pas
    const createTables = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nom VARCHAR(100) NOT NULL,
            prenom VARCHAR(100) NOT NULL,
            sexe ENUM('M', 'F') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS paires (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user1_id INT NOT NULL,
            user2_id INT NOT NULL,
            type_paire ENUM('mixte', 'meme_sexe') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    db.query(createTables, (err) => {
        if (err) {
            console.error("Erreur création des tables:", err.message);
        } else {
            console.log("Tables créées ou déjà existantes");
        }
    });
});

module.exports = db;
