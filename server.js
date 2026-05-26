// =========================================================================
// SERVEUR PASSERELLE INTERNET SÉCURISÉ : KADJI SMARTGAZ TRACKER (V2)
// =========================================================================

const express = require('express');
const cors = require('cors'); // Déblocage de la sécurité des navigateurs
const app = express();
const port = process.env.PORT || 3000;

// AUTORISATION CORS POUR LE WEB ET LE TÉLÉPHONE
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(__dirname));

// État initial de la bouteille (Dictionnaire Global)
let etatBouteille = {
    poids: 12.5,
    pourcentage: 100.0,
    batterie: 3.3,
    alerte: false,
    joursRestantsEstimes: "Analyse en cours..."
};

let historiqueMesures = [];

// --- ROUTE 1 : RECEVOIR LES DONNÉES (ESP32 ou Simulateur Web) ---
app.post('/api/gaz', (req, res) => {
    const cleSecurite = req.headers['x-api-key'];
    const estRequeteInterne = req.headers['referer'] && req.headers['referer'].includes(req.headers['host']);

    // Sécurité par clé API ou requête provenant du même site hébergé
    if (cleSecurite !== "MonSecretCameroun2026" && !estRequeteInterne) {
        return res.status(401).send({ error: "Acces refuse ! Cle de securite invalide." });
    }

    const donnees = req.body;
    const tempsActuel = Date.now();
    
    // Mise à jour des valeurs
    etatBouteille.poids = parseFloat(donnees.poids);
    etatBouteille.pourcentage = parseFloat(donnees.pourcentage);
    etatBouteille.batterie = parseFloat(donnees.batterie);
    etatBouteille.alerte = (etatBouteille.poids < 2.0);

    // Calcul de l'IA Prédictive (Algorithme de chute de poids)
    historiqueMesures.push({ poids: etatBouteille.poids, temps: tempsActuel });
    if (historiqueMesures.length > 5) historiqueMesures.shift();

    if (historiqueMesures.length >= 2) {
        const premiere = historiqueMesures[0];
        const derniere = historiqueMesures[historiqueMesures.length - 1];
        
        const deltaPoids = premiere.poids - derniere.poids;
        // Simulation accélérée pour le test web (calcul en secondes converti en vitesse théorique)
        const deltaTempsJours = (derniere.temps - premiere.temps) / (1000 * 5); 

        if (deltaPoids > 0) {
            const vitesseConsommation = deltaPoids / deltaTempsJours;
            const joursCalcules = derniere.poids / vitesseConsommation;
            etatBouteille.joursRestantsEstimes = Math.max(1, Math.round(joursCalcules)) + " jours restants";
        } else {
            etatBouteille.joursRestantsEstimes = "Consommation stable";
        }
    }

    console.log(`[DATA] Synchro réussie -> Poids: ${etatBouteille.poids} kg`);
    res.status(200).send({ message: "Donnees synchronisees avec succes !" });
});

// --- ROUTE 2 : TRANSMETTRE LES DONNÉES AU TÉLÉPHONE ---
app.get('/api/status', (req, res) => {
    res.json(etatBouteille);
});

app.listen(port, () => {
    console.log("=== KADJI SMARTGAZ TRACKER EN LIGNE ===");
});
