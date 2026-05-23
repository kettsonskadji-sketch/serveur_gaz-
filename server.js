// =========================================================================
// SERVEUR PASSERELLE INTERNET AVEC IA PREDICTIVE : GAZ BUTANE 12.5 KG (CORRIGE)
// =========================================================================

const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(__dirname));

// Variables de stockage et d'historique pour l'IA
let etatBouteille = {
    poids: 12.5,
    pourcentage: 100.0,
    batterie: 3.3,
    alerte: false,
    joursRestantsEstimes: "Calcul en cours..." // Nouvelle donnee IA
};

let historiqueMesures = []; // Stocke l'historique pour analyser la tendance

// --- ROUTE 1 : RECEVOIR LES DONNEES DE L'ESP32 ---
app.post('/api/gaz', (req, res) => {
    const donnees = req.body;
    const tempsActuel = Date.now();
    
    etatBouteille.poids = donnees.poids;
    etatBouteille.pourcentage = donnees.pourcentage;
    etatBouteille.batterie = donnees.batterie;
    etatBouteille.alerte = (donnees.poids < 2.0);

    // --- ALGORITHME D'IA (REGRESSION LINEAIRE DE TENDANCE) ---
    historiqueMesures.push({ poids: donnees.poids, temps: tempsActuel });
    
    // On garde uniquement les 10 dernieres mesures pour l'analyse de tendance recente
    if (historiqueMesures.length > 10) historiqueMesures.shift();

    if (historiqueMesures.length >= 2) {
        const premiere = historiqueMesures[0]; // Correction ici pour cibler le premier element
        const derniere = historiqueMesures[historiqueMesures.length - 1];
        
        // Calcul de la vitesse de consommation (delta poids / delta temps)
        const deltaPoids = premiere.poids - derniere.poids;
        const deltaTempsJours = (derniere.temps - premiere.temps) / (1000 * 60 * 60 * 24); // conversion en jours

        if (deltaPoids > 0 && deltaTempsJours > 0) {
            const vitesseConsommationParJour = deltaPoids / deltaTempsJours;
            // IA : Estimation du nombre de jours restants avant d'atteindre 0kg (Mot corrige sans accent)
            const joursCalcules = derniere.poids / vitesseConsommationParJour;
            etatBouteille.joursRestantsEstimes = Math.round(joursCalcules) + " jours restants";
        } else {
            etatBouteille.joursRestantsEstimes = "Consommation stable";
        }
    }

    console.log(`[ESP32] Poids: ${donnees.poids} kg | IA Prediction: ${etatBouteille.joursRestantsEstimes}`);
    res.status(200).send({ message: "Donnees traitees par l'IA du serveur !" });
});

// --- ROUTE 2 : TRANSMETTRE LES DONNEES A L'APPLICATION ---
getRoute = app.get('/api/status', (req, res) => {
    res.json(etatBouteille);
});

app.listen(port, () => {
    console.log("=== SERVEUR GAZ + IA DEMARRE SUR LE PORT 3000 ===");
    console.log("Pret a ecouter la bouteille de 12.5 kg...");
});
