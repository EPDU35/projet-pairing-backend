const mysql = require("mysql2/promise");

// Utiliser l'URL complète de Railway si disponible
const DATABASE_URL = process.env.DATABASE_URL;

let pool;

if (DATABASE_URL) {
    // Créer un pool avec l'URL complète (pour production)
    pool = mysql.createPool({
        uri: DATABASE_URL,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10,
        idleTimeout: 60000,
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
        maxIdle: 10,
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
    });
}

// Fonction pour initialiser les tables
async function initializeTables() {
    let connection;
    try {
        connection = await pool.getConnection();
        console.log("MySQL connecté avec succès");

        // Créer la table users
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                sexe ENUM('M', 'F') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("Table users prête");

        // Créer la table paires
        await connection.query(`
            CREATE TABLE IF NOT EXISTS paires (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user1_id INT NOT NULL,
                user2_id INT NOT NULL,
                type_paire ENUM('mixte', 'meme_sexe') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user1_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (user2_id) REFERENCES users(id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("Table paires prête");

    } catch (err) {
        console.error("Erreur connexion/création tables:", err.message);
    } finally {
        if (connection) connection.release();
    }
}

// Initialiser les tables au démarrage
initializeTables();

module.exports = pool;
