CREATE DATABASE IF NOT EXISTS pairing_db;
USE pairing_db;

– Supprimer l’ancienne table paires si elle existe
DROP TABLE IF EXISTS paires;
DROP TABLE IF EXISTS attributions;
DROP TABLE IF EXISTS users;

– Table des utilisateurs (inchangée)
CREATE TABLE users (
id INT AUTO_INCREMENT PRIMARY KEY,
nom VARCHAR(100) NOT NULL,
prenom VARCHAR(100) NOT NULL,
sexe ENUM(‘M’, ‘F’) NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

– Nouvelle table : attributions unidirectionnelles
CREATE TABLE attributions (
id INT AUTO_INCREMENT PRIMARY KEY,
donneur_id INT NOT NULL,
receveur_id INT NOT NULL,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (donneur_id) REFERENCES users(id) ON DELETE CASCADE,
FOREIGN KEY (receveur_id) REFERENCES users(id) ON DELETE CASCADE,
UNIQUE KEY unique_donneur (donneur_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;