const mysql = require(“mysql2”);

// Utiliser l’URL complète de Railway si disponible
const DATABASE_URL = process.env.DATABASE_URL;

let pool;

if (DATABASE_URL) {
// Créer un pool avec l’URL complète (pour production)
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
host: process.env.DB_HOST || “localhost”,
user: process.env.DB_USER || “root”,
password: process.env.DB_PASSWORD || “”,
database: process.env.DB_NAME || “pairing_db”,
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
pool.getConnection((err, connection) => {
if (err) {
console.error(“Connexion MySQL échouée:”, err.message);
console.log(“Vérifie tes variables d’environnement DATABASE_URL”);
return;
}

```
console.log("MySQL connecté avec succès");

// Créer la table users
connection.query(`
    CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nom VARCHAR(100) NOT NULL,
        prenom VARCHAR(100) NOT NULL,
        sexe ENUM('M', 'F') NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`, (err) => {
    if (err) {
        console.error("Erreur création table users:", err.message);
    } else {
        console.log("Table users prête");
    }
});

// Supprimer l'ancienne table paires si elle existe
connection.query(`DROP TABLE IF EXISTS paires`, (err) => {
    if (!err) {
        console.log("Ancienne table paires supprimée");
    }
});

// Créer la nouvelle table attributions
connection.query(`
    CREATE TABLE IF NOT EXISTS attributions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        donneur_id INT NOT NULL,
        receveur_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (donneur_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receveur_id) REFERENCES users(id) ON DELETE CASCADE,
        UNIQUE KEY unique_donneur (donneur_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`, (err) => {
    if (err) {
        console.error("Erreur création table attributions:", err.message);
    } else {
        console.log("Table attributions prête");
    }
    connection.release();
});
```

});

// Exporter le pool avec support des promises
module.exports = pool.promise();