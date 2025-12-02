const mysql = require("mysql2/promise");

// Si tu as une URL complète de Railway
const DATABASE_URL = process.env.DATABASE_URL;

let pool;

if (DATABASE_URL) {
    // Utiliser l'URL complète (pour production)
    pool = mysql.createPool(DATABASE_URL);
} else {
    // Configuration manuelle (pour local)
    pool = mysql.createPool({
        host: process.env.DB_HOST || "localhost",
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "pairing_db",
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });
}

// Tester la connexion et créer les tables
(async () => {
    try {
        const connection = await pool.getConnection();
        console.log("MySQL connecté avec succès");
        
        // Créer les tables si elles n'existent pas
        await connection.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                nom VARCHAR(100) NOT NULL,
                prenom VARCHAR(100) NOT NULL,
                sexe ENUM('M', 'F') NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY unique_user (nom, prenom)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        await connection.query(`
            CREATE TABLE IF NOT EXISTS attributions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                donneur_id INT NOT NULL,
                receveur_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (donneur_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (receveur_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE KEY unique_attribution (donneur_id, receveur_id)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        console.log("Tables créées ou déjà existantes");
        connection.release();
    } catch (err) {
        console.error("Erreur MySQL:", err.message);
        console.log("Vérifie tes variables d'environnement");
    }
})();

module.exports = pool;
