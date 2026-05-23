// =========================================================================
// SERVEUR PASSERELLE INTERNET SECURISE : GAZ BUTANE 12.5 KG
// =========================================================================

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Variable de stockage pour la bouteille
let etatBouteille = {
    poids: 12.5,
    pourcentage: 100.0,
    batterie: 3.3,
    alerte: false,
    joursRestantsEstimes: "Calcul en cours..."
};

let historiqueMesures = [];

// --- ROUTE 1 : RECEVOIR LES DONNEES (Sécurisée par Clé API) ---
app.post('/api/gaz', (req, res) => {
    // VERIFICATION DE SECURITE INTERNET
    const cleSecurite = req.headers['x-api-key'];
    if (cleSecurite !== "MonSecretCameroun2026") {
        return res.status(401).send({ error: "Acces refuse ! Cle de securite invalide." });
    }

    const donnees = req.body;
    const tempsActuel = Date.now();
    
    etatBouteille.poids = donnees.poids;
    etatBouteille.pourcentage = donnees.pourcentage;
    etatBouteille.batterie = donnees.batterie;
    etatBouteille.alerte = (donnees.poids < 2.0);

    historiqueMesures.push({ poids: donnees.poids, temps: tempsActuel });
    if (historiqueMesures.length > 10) historiqueMesures.shift();

    if (historiqueMesures.length >= 2) {
        const premiere = historiqueMesures[0];
        const derniere = historiqueMesures[historiqueMesures.length - 1];
        
        const deltaPoids = premiere.poids - derniere.poids;
        const deltaTempsJours = (derniere.temps - premiere.temps) / (1000 * 60 * 60 * 24);

        if (deltaPoids > 0 && deltaTempsJours > 0) {
            const vitesseConsommationParJour = deltaPoids / deltaTempsJours;
            const joursCalcules = derniere.poids / vitesseConsommationParJour;
            etatBouteille.joursRestantsEstimes = Math.round(joursCalcules) + " jours restants";
        } else {
            etatBouteille.joursRestantsEstimes = "Consommation stable";
        }
    }

    console.log(`[ESP32] Donnees securisees reçues -> Poids: ${donnees.poids} kg`);
    res.status(200).send({ message: "Donnees traitees en toute securite par le serveur !" });
});

// --- ROUTE 2 : TRANSMETTRE LES DONNEES A L'APPLICATION ---
app.get('/api/status', (req, res) => {
    res.json(etatBouteille);
});

app.listen(port, () => {
    console.log("=== SERVEUR GAZ SECURISE DEMARRE SUR LE PORT 3000 ===");
});
