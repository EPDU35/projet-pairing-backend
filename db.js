const mysql = require("mysql2");

// Utiliser l'URL complète de Railway si disponible
const DATABASE_URL = process.env.DATABASE_URL;

let pool;

if (DATABASE_URL) {
    // Créer un pool avec l'URL complète
    pool = mysql.createPool({
        uri: DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });
} else {
    // Créer un pool avec les paramètres séparés (pour local)
    pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "pairing_db",
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });
}

// Tester la connexion au démarrage
pool.getConnection((err, connection) => {
    if (err) {
        console.error("Connexion MySQL échouée:", err.message);
        console.log("Vérifie tes variables d'environnement DATABASE_URL ou DB_HOST");
        return;
    }
    console.log("MySQL connecté avec succès");
    
    // Créer les tables si elles n'existent pas
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            nom VARCHAR(100) NOT NULL,
            prenom VARCHAR(100) NOT NULL,
            sexe ENUM('M', 'F') NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;
    
    const createPairesTable = `
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
    
    connection.query(createUsersTable, (err) => {
        if (err) {
            console.error("Erreur création table users:", err.message);
        } else {
            console.log("Table users prête");
        }
    });
    
    connection.query(createPairesTable, (err) => {
        if (err) {
            console.error("Erreur création table paires:", err.message);
        } else {
            console.log("Table paires prête");
        }
        connection.release();
    });
});

// Exporter le pool (pas une simple connexion)
module.exports = pool;
