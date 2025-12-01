const mysql = require("mysql2");

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "pairing_db"
});

db.connect(err => {
    if (err) {
        console.error("❌ Connexion MySQL échouée:", err.message);
        console.log("💡 Vérifie que MySQL est démarré et que la base 'pairing_db' existe");
        return;
    }
    console.log("✅ MySQL connecté");
});

module.exports = db;