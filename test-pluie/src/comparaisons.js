import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import Papa from 'papaparse';

// Données pour le graphique par défaut (un exemple simple)
const defaultData = Array.from({ length: 12 }, (_, i) => {
  return { 
    date: `${(i + 1).toString().padStart(2, '0')}/15`, 
    pluie: Math.floor(Math.random() * 10)
  };
});

// Couleurs pour les années (on pourra en ajouter d'autres si besoin)
const yearColors = {
  '2019': '#F472B6', // Rose
  '2020': '#A78BFA', // Violet
  '2021': '#93C5FD', // Bleu clair
  '2022': '#60A5FA', // Bleu
  '2023': '#34D399', // Vert
  '2024': '#FBBF24', // Jaune
  '2025': '#F87171', // Rouge
  '2026': '#6EE7B7', // Turquoise
  '2027': '#FCD34D', // Or
  '2028': '#9CA3AF', // Gris
};

const RainComparison = () => {
  // États pour les données et le fonctionnement du composant
  const [data, setData] = useState(defaultData);
  const [yearlyTotals, setYearlyTotals] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [displayMode, setDisplayMode] = useState('daily'); // 'daily' ou 'cumulative'
  const [showDropZone, setShowDropZone] = useState(false); // Nouvel état pour contrôler l'affichage de la zone

  // États pour le zoom du graphique (simplifié)
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [isZooming, setIsZooming] = useState(false);
  const [zoomDomain, setZoomDomain] = useState({ start: 0, end: 365 });
  
  const dropZoneRef = useRef(null);

  // Charger fichier CSV par défaut au démarrage
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        // On va d'abord essayer de lister les fichiers CSV disponibles dans le dossier public
        // Comme on ne peut pas lister directement les fichiers dans le dossier public depuis le navigateur,
        // on va essayer de charger le premier fichier CSV trouvé dans une liste prédéfinie

        // Liste des noms de fichiers CSV courants à essayer
        const possibleCsvFiles = [
          '/pluviomètre gui_15_03_2025.csv',                        // Essayer un nom simple et générique d'abord
          '/pluviomètre_gui_15_03_2025.csv',  // Essayer ton fichier spécifique
          '/data.csv',  // Variation avec espace
          '/pluviometre.csv',                 // Sans accents
          '/rainfall.csv',                    // En anglais
          '/pluie.csv',                       // Simple en français
        ];

        // On essaie chaque fichier jusqu'à en trouver un qui fonctionne
        for (const csvFile of possibleCsvFiles) {
          try {
            const response = await fetch(csvFile);
            if (response.ok) {
              const text = await response.text();
              setFileName(csvFile.replace('/', '')); // Enlever le slash initial pour le nom de fichier
              
              // Ajout d'un délai pour s'assurer que le composant est bien monté avant de traiter les données
              setTimeout(() => {
                processCSV(text);
                console.log(`Fichier CSV chargé avec succès: ${csvFile}`);
              }, 300);
              
              return; // On a trouvé un fichier, on sort de la fonction
            }
          } catch (fileError) {
            // On ignore les erreurs individuelles et on continue avec le fichier suivant
            console.log(`Impossible de charger ${csvFile}:`, fileError);
          }
        }

        // Si on arrive ici, c'est qu'aucun fichier n'a été trouvé
        console.warn("Aucun fichier CSV trouvé dans le dossier public, utilisation des données d'exemple");
      } catch (error) {
        console.warn("Erreur lors du chargement des fichiers CSV, utilisation des données d'exemple:", error);
      }
    };

    loadDefaultData();
  }, []);

  // Traiter les données CSV
  const processCSV = (csvText) => {
    try {
      setIsLoading(true);
      setError(null);

      // On parse le CSV comme du texte
      const result = Papa.parse(csvText, { delimiter: ';' });
      console.log("Résultat du parsing CSV:", result);
      
      if (!result.data || result.data.length < 2) {
        throw new Error("Le fichier CSV ne contient pas assez de données");
      }

      // Analyser la structure du fichier
      console.log("Échantillon des premières lignes:", result.data.slice(0, 5));

      // On cherche l'indice de la ligne qui contient "Timestamp" ou on prend la première ligne comme en-tête
      let dataStartIndex = 1; // Par défaut, on considère que la première ligne est l'en-tête
      const headerRow = result.data[0];
      
      // Si l'en-tête est identifiable, on l'utilise (différents formats possibles)
      if (headerRow && headerRow.some(cell => cell && (
        cell === "Timestamp" || 
        cell === "Date" || 
        cell.includes("Time") || 
        cell.includes("Date")
      ))) {
        dataStartIndex = 1; // La ligne suivante contient les données
        console.log("En-tête trouvé à la ligne 0");
      } else {
        // Recherche plus approfondie dans les premières lignes
        for (let i = 0; i < Math.min(10, result.data.length); i++) {
          if (result.data[i] && result.data[i].some(cell => cell && (
            cell === "Timestamp" || 
            cell === "Date" || 
            cell.includes("Time") || 
            cell.includes("Date")
          ))) {
            dataStartIndex = i + 1;
            console.log("En-tête trouvé à la ligne", i);
            break;
          }
        }
      }
      
      console.log("Début des données à l'index:", dataStartIndex);

      // Structures pour stocker les données
      const dailyData = {};       // Données quotidiennes
      const monthlyData = {};     // Données mensuelles
      const yearlyTotalsTemp = {}; // Totaux annuels (vide au départ)
      const yearsFound = new Set(); // Ensemble des années trouvées
      
      // Structure pour les cumuls annuels (une entrée par date et par année)
      const cumulativeData = {};
      
      // Parcourir les lignes de données
      for (let i = dataStartIndex; i < result.data.length; i++) {
        const row = result.data[i];
        if (!row || row.length < 2) continue; // Ignorer les lignes trop courtes
        
        // Essayer de trouver la date et la valeur de pluie
        let dateStr = '';
        let rainValue = 0;
        
        // Essayer différentes colonnes pour trouver la date
        if (row[1] && typeof row[1] === 'string' && (row[1].includes('/') || row[1].includes('-'))) {
          dateStr = row[1].replace(/"/g, '');
        } else if (row[0] && typeof row[0] === 'string' && (row[0].includes('/') || row[0].includes('-'))) {
          dateStr = row[0].replace(/"/g, '');
        }
        
        // Chercher une valeur numérique pour la pluie (parcourir toutes les colonnes)
        for (let j = 0; j < row.length; j++) {
          if (row[j] !== undefined && row[j] !== '') {
            // Nettoyage de la valeur (remplacer virgule par point et retirer les espaces)
            const cleanValue = row[j].toString().replace(',', '.').trim();
            const possibleValue = parseFloat(cleanValue);
            
            // Vérifier que c'est un nombre et qu'il est raisonnable (entre 0 et 500 mm)
            if (!isNaN(possibleValue) && possibleValue >= 0 && possibleValue <= 500) {
              rainValue = possibleValue;
              break; // On prend la première valeur numérique raisonnable trouvée
            }
          }
        }
        
        // Format de date possible: YYYY/MM/DD ou DD/MM/YYYY ou MM/DD/YYYY
        let dateMatch = /(\d{4})\/(\d{2})\/(\d{2})/.exec(dateStr);  // Format YYYY/MM/DD
        if (!dateMatch) dateMatch = /(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);  // Format YYYY-MM-DD
        
        if (!dateMatch) {
          // Format DD/MM/YYYY ou MM/DD/YYYY
          dateMatch = /(\d{2})\/(\d{2})\/(\d{4})/.exec(dateStr) || /(\d{2})-(\d{2})-(\d{4})/.exec(dateStr);
          if (dateMatch) {
            // On suppose que c'est JJ/MM/AAAA plutôt que MM/JJ/AAAA (format européen)
            const day = dateMatch[1];
            const month = dateMatch[2];
            const year = dateMatch[3];
            dateStr = `${year}/${month}/${day}`;
            dateMatch = [dateStr, year, month, day];
          }
        }
        if (dateMatch) {
          const year = dateMatch[1];
          const month = dateMatch[2]; // "01", "02", etc.
          const day = dateMatch[3];
          
          // Ajouter l'année à notre ensemble d'années trouvées
          yearsFound.add(year);
          
          // Initialiser le total annuel pour cette année si pas encore fait
          if (!yearlyTotalsTemp[year]) {
            yearlyTotalsTemp[year] = 0;
          }
          
          // Clé unique pour chaque jour
          const monthDay = `${month}/${day}`;
          
          // Date complète pour trier
          const fullDate = `${year}-${month}-${day}`;
          
          // Clé pour regrouper par mois
          const monthKey = `${month}`;
          
          // Initialiser l'objet du jour s'il n'existe pas
          if (!dailyData[monthDay]) {
            dailyData[monthDay] = {
              date: monthDay
            };
          }
          
          // Initialiser l'objet du mois s'il n'existe pas
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              name: getMonthName(month)
            };
          }
          
          // Ajouter la valeur au jour et au mois correspondants
          dailyData[monthDay][year] = rainValue;
          
          // Cumuler la valeur de pluie pour l'année
          yearlyTotalsTemp[year] += rainValue;
          
          // Pour calculer correctement les cumuls par année
          if (!cumulativeData[year]) {
            cumulativeData[year] = [];
          }
          
          // Ajouter cette entrée au tableau pour cette année
          cumulativeData[year].push({
            fullDate,
            monthDay,
            rainValue,
            timestamp: parseInt(row[0], 10) // Pour trier chronologiquement
          });
          
          // Initialiser ou incrémenter la valeur du mois pour cette année
          if (!monthlyData[monthKey][year]) {
            monthlyData[monthKey][year] = 0;
          }
          monthlyData[monthKey][year] += rainValue;
        }
      }

      // Convertir l'ensemble des années en tableau trié
      const yearsArray = Array.from(yearsFound).sort();
      setAvailableYears(yearsArray);
      
      console.log("Années détectées:", yearsArray);

      // Pour chaque année, calculer correctement les cumuls et remplir les trous de données
      yearsArray.forEach(year => {
        // D'abord, trier les données par date
        if (cumulativeData[year]) {
          cumulativeData[year].sort((a, b) => a.timestamp - b.timestamp);
          
          // Calculer le cumul progressif
          let runningTotal = 0;
          
          // Créer un objet temporaire qui stocke tous les cumuls pour cette année
          const yearCumulatives = {};
          
          // Calculer d'abord tous les cumuls pour les jours où on a des données
          cumulativeData[year].forEach(entry => {
            // Vérification de sécurité pour les valeurs aberrantes
            const rainToAdd = entry.rainValue > 300 ? 0 : entry.rainValue;
            runningTotal += rainToAdd;
            // Stocker le cumul pour ce jour
            yearCumulatives[entry.monthDay] = runningTotal;
          });
          
          // Maintenant, parcourir tous les jours de l'année et assurer la continuité des cumuls
          const allDates = Object.keys(dailyData).sort((a, b) => {
            const [aMonth, aDay] = a.split('/').map(Number);
            const [bMonth, bDay] = b.split('/').map(Number);
            return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
          });
          
          let lastKnownCumul = 0;
          
          allDates.forEach(date => {
            // Si on a une valeur de cumul pour cette date, on l'utilise
            if (yearCumulatives[date] !== undefined) {
              lastKnownCumul = yearCumulatives[date];
            }
            
            // On assigne le cumul à cette date (soit la nouvelle valeur, soit la dernière connue)
            dailyData[date][`cumul${year}`] = lastKnownCumul;
          });
        }
      });

      // Trier les données quotidiennes par date
      const sortedDailyData = Object.values(dailyData).sort((a, b) => {
        const [aMonth, aDay] = a.date.split('/').map(Number);
        const [bMonth, bDay] = b.date.split('/').map(Number);
        return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
      });
      
      // Arrondir les totaux annuels et éliminer les valeurs aberrantes
      Object.keys(yearlyTotalsTemp).forEach(year => {
        // Si le total est au-dessus de 5000mm (valeur exceptionnelle pour la France),
        // c'est probablement une erreur de format ou de parsing
        if (yearlyTotalsTemp[year] > 5000) {
          yearlyTotalsTemp[year] = 0; 
          console.warn(`Valeur aberrante détectée pour l'année ${year}: ${yearlyTotalsTemp[year]} mm`);
        } else {
          yearlyTotalsTemp[year] = Math.round(yearlyTotalsTemp[year] * 10) / 10;
        }
      });
      
      console.log("Données quotidiennes:", sortedDailyData.slice(0, 5), "...");
      console.log("Totaux annuels:", yearlyTotalsTemp);

      // Définir les données en fonction du mode d'affichage
      if (displayMode === 'daily' || displayMode === 'cumulative') {
        setData(sortedDailyData);
      }
      
      setYearlyTotals(yearlyTotalsTemp);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur lors du traitement du fichier:', err);
      setError(`Erreur: ${err.message}`);
      setIsLoading(false);
      // Garder les données d'exemple si le traitement échoue
    }
  };

  // Basculer entre les modes d'affichage
  const toggleDisplayMode = () => {
    // Rotation entre les deux modes seulement
    const newMode = displayMode === 'daily' ? 'cumulative' : 'daily';
    setDisplayMode(newMode);
    
    // Si on a des données CSV chargées, on retraite le fichier
    if (fileName) {
      fetchAndReprocessData();
    }
  };
  
  // Obtenir le libellé du bouton selon le mode d'affichage actuel
  const getButtonLabel = () => {
    switch (displayMode) {
      case 'daily':
        return 'Afficher les cumuls';
      case 'cumulative':
        return 'Afficher par jour';
      default:
        return 'Changer de vue';
    }
  };
  
  // Recharger et retraiter le fichier CSV
  const fetchAndReprocessData = async () => {
    try {
      const response = await fetch(`/${fileName}`);
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }
      const text = await response.text();
      processCSV(text);
    } catch (error) {
      console.error("Erreur lors du rechargement des données:", error);
      setError(`Erreur lors du rechargement des données: ${error.message}`);
    }
  };

  // Fonctions pour le zoom (version simplifiée et plus ergonomique)
  const handleMouseDown = (e) => {
    if (displayMode === 'daily' && e && e.activeLabel) {
      setRefAreaLeft(e.activeLabel);
      setIsZooming(true);
    }
  };

  const handleMouseMove = (e) => {
    if (isZooming && e && e.activeLabel) {
      setRefAreaRight(e.activeLabel);
    }
  };

  const handleMouseUp = () => {
    if (!isZooming) return;

    // Si on n'a pas de zone valide, on sort
    if (!refAreaLeft || !refAreaRight) {
      setIsZooming(false);
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    // On cherche les indices dans le tableau de données
    let idxLeft = data.findIndex(item => item.date === refAreaLeft);
    let idxRight = data.findIndex(item => item.date === refAreaRight);
    
    // Si on a des indices invalides, on sort
    if (idxLeft < 0 || idxRight < 0) {
      setIsZooming(false);
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    // On s'assure que left < right
    if (idxLeft > idxRight) {
      [idxLeft, idxRight] = [idxRight, idxLeft];
    }

    // On définit la zone de zoom
    setZoomDomain({ start: idxLeft, end: idxRight });
    
    // On nettoie les variables de sélection
    setIsZooming(false);
    setRefAreaLeft('');
    setRefAreaRight('');
  };

  // Réinitialiser le zoom
  const resetZoom = () => {
    setZoomDomain({ start: 0, end: 365 });
  };
  
  // Vérifier si on a zoomé
  const isZoomed = () => {
    return zoomDomain.start > 0 || zoomDomain.end < 365;
  };

  // Fonctions pour gérer le fichier CSV et l'affichage
  const getMonthName = (monthNumber) => {
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                        "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return monthNames[parseInt(monthNumber) - 1];
  };
  
  // Obtenir le nom court du mois
  const getMonthShortName = (monthNumber) => {
    const monthShortNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", 
                             "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    return monthShortNames[parseInt(monthNumber) - 1];
  };

  // Gestion du glisser-déposer
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      
      // Vérification du type de fichier
      if (!file.name.endsWith('.csv')) {
        setError("Le fichier doit être au format CSV");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        processCSV(event.target.result);
      };
      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
      };
      reader.readAsText(file);
    }
    
    // Masquer la zone après l'importation d'un fichier
    setShowDropZone(false);
  };

  // Gestion du clic pour sélectionner un fichier
  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setFileName(file.name);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        processCSV(event.target.result);
      };
      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
      };
      reader.readAsText(file);
      
      // Masquer la zone après l'importation d'un fichier
      setShowDropZone(false);
    }
  };

  // Basculer l'affichage de la zone de dépôt
  const toggleDropZone = () => {
    setShowDropZone(!showDropZone);
  };

  // Obtenir la couleur pour chaque année
  const getYearColor = (year) => {
    return yearColors[year] || '#9CA3AF'; // Gris par défaut si année non définie
  };

  // Tooltip personnalisé - Avec affichage des cumuls
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Vérifier si label est défini ou valide pour éviter "NaN undefined"
      if (!label || label === "NaN" || label === "undefined" || label.includes("undefined")) return null;
      
      // En mode mensuel, on affiche directement le nom du mois
      if (displayMode === 'monthly') {
        return (
          <div style={{ 
            backgroundColor: '#1F2937', 
            padding: '12px', 
            border: '1px solid #374151',
            borderRadius: '6px', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            color: '#E5E7EB',
            maxWidth: '280px'
          }}>
            <p style={{ 
              fontWeight: 'bold', 
              marginBottom: '8px', 
              borderBottom: '1px solid #374151',
              paddingBottom: '4px'
            }}>
              {label}
            </p>
            <div style={{ 
              maxHeight: '200px',
              overflowY: payload.length > 5 ? 'auto' : 'visible'
            }}>
              {payload
                .filter(p => {
                  // En mode cumulatif, on affiche uniquement les cumuls, sinon uniquement les valeurs de pluie
                  return displayMode === 'cumulative' 
                    ? (p.value > 0 && p.dataKey.startsWith('cumul'))
                    : (p.value > 0 && !p.dataKey.startsWith('cumul'));
                })
                .sort((a, b) => b.value - a.value)
                .map((p) => {
                  // Trouver le cumul correspondant pour cette année si on n'est pas déjà en mode cumulatif
                  let cumulValue = null;
                  if (displayMode !== 'cumulative') {
                    const yearKey = p.dataKey;
                    const cumulKey = `cumul${yearKey}`;
                    const cumulPayload = payload.find(item => item.dataKey === cumulKey);
                    cumulValue = cumulPayload ? cumulPayload.value : null;
                  }
                  
                  // Pour le mode cumulatif, on affiche directement l'année sans le préfixe "cumul"
                  const displayKey = displayMode === 'cumulative' 
                    ? p.dataKey.replace('cumul', '') 
                    : p.dataKey;
                  
                  return (
                    <div key={p.dataKey} style={{ 
                      color: displayMode === 'cumulative' 
                        ? getYearColor(p.dataKey.replace('cumul', '')) 
                        : p.color, 
                      margin: '4px 0',
                      padding: '4px 0',
                      borderBottom: '1px dotted #374151'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>{displayKey}:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{p.value.toFixed(1)} mm</span>
                      </div>
                      {/* Afficher le cumul s'il est disponible et qu'on n'est pas en mode cumulatif */}
                      {displayMode !== 'cumulative' && cumulValue !== null && (
                        <div style={{ 
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.9em',
                          marginTop: '2px',
                          opacity: '0.8'
                        }}>
                          <span>Cumul {p.dataKey}:</span>
                          <span>{cumulValue.toFixed(1)} mm</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              {payload.filter(p => {
                return displayMode === 'cumulative' 
                  ? (p.value > 0 && p.dataKey.startsWith('cumul'))
                  : (p.value > 0 && !p.dataKey.startsWith('cumul'));
              }).length === 0 && (
                <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pas de précipitations</p>
              )}
            </div>
          </div>
        );
      }
      
      // Pour l'affichage quotidien ou cumulatif
      // On extrait le mois et le jour à partir de la date (format "MM/JJ")
      const match = /(\d{2})\/(\d{2})/.exec(label);
      
      // Si le format n'est pas celui attendu, afficher le label tel quel
      if (!match) {
        return (
          <div style={{ 
            backgroundColor: '#1F2937', 
            padding: '12px', 
            border: '1px solid #374151',
            borderRadius: '6px', 
            boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
            color: '#E5E7EB'
          }}>
            <p>{label}</p>
          </div>
        );
      }
      
      const month = match[1];
      const day = match[2];
      
      // Obtenir le nom du mois
      const monthName = getMonthName(month);
      
      // Date complète pour le tooltip
      const completeDate = `${parseInt(day, 10)} ${monthName}`;
      
      return (
        <div style={{ 
          backgroundColor: '#1F2937', 
          padding: '12px', 
          border: '1px solid #374151',
          borderRadius: '6px', 
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          color: '#E5E7EB',
          maxWidth: '280px'
        }}>
          <p style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            borderBottom: '1px solid #374151',
            paddingBottom: '4px'
          }}>
            {completeDate}
          </p>
          <div style={{ 
            maxHeight: '200px',
            overflowY: payload.length > 5 ? 'auto' : 'visible'
          }}>
            {payload
              .filter(p => {
                // En mode cumulatif, on affiche uniquement les cumuls, sinon uniquement les valeurs de pluie
                return displayMode === 'cumulative' 
                  ? (p.value > 0 && p.dataKey.startsWith('cumul'))
                  : (p.value > 0 && !p.dataKey.startsWith('cumul'));
              })
              .sort((a, b) => b.value - a.value)
              .map((p) => {
                // Trouver le cumul correspondant pour cette année si on n'est pas déjà en mode cumulatif
                let cumulValue = null;
                if (displayMode !== 'cumulative') {
                  const yearKey = p.dataKey;
                  const cumulKey = `cumul${yearKey}`;
                  const cumulPayload = payload.find(item => item.dataKey === cumulKey);
                  cumulValue = cumulPayload ? cumulPayload.value : null;
                }
                
                // Pour le mode cumulatif, on affiche directement l'année sans le préfixe "cumul"
                const displayKey = displayMode === 'cumulative' 
                  ? p.dataKey.replace('cumul', '') 
                  : p.dataKey;
                
                return (
                  <div key={p.dataKey} style={{ 
                    color: displayMode === 'cumulative' 
                      ? getYearColor(p.dataKey.replace('cumul', '')) 
                      : p.color, 
                    margin: '4px 0',
                    padding: '4px 0',
                    borderBottom: '1px dotted #374151'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{displayKey}:</span>
                      <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{p.value.toFixed(1)} mm</span>
                    </div>
                    {/* Afficher le cumul s'il est disponible et qu'on n'est pas en mode cumulatif */}
                    {displayMode !== 'cumulative' && cumulValue !== null && (
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '0.9em',
                        marginTop: '2px',
                        opacity: '0.8'
                      }}>
                        <span>Cumul {p.dataKey}:</span>
                        <span>{cumulValue.toFixed(1)} mm</span>
                      </div>
                    )}
                  </div>
                );
              })}
            {payload.filter(p => {
              return displayMode === 'cumulative' 
                ? (p.value > 0 && p.dataKey.startsWith('cumul'))
                : (p.value > 0 && !p.dataKey.startsWith('cumul'));
            }).length === 0 && (
              <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pas de précipitations</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100%', 
      padding: '16px', 
      backgroundColor: '#1f2937', 
      borderRadius: '8px', 
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
      color: '#e5e7eb',
      marginBottom: '20px'
    }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: 'bold', 
        marginBottom: '16px', 
        textAlign: 'center' 
      }}>Comparaison des précipitations</h2>
      
      {/* Bouton pour afficher/masquer la zone de glisser-déposer */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <button
          onClick={toggleDropZone}
          style={{
            backgroundColor: '#4B5563',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
            outline: 'none',
            marginRight: '10px'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#374151'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4B5563'}
        >
          {showDropZone ? 'Cacher l\'import' : 'Importer un fichier'}
        </button>
        
        <button
          onClick={toggleDisplayMode}
          style={{
            backgroundColor: '#4B5563',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'background-color 0.2s',
            outline: 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#374151'}
          onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#4B5563'}
        >
          {getButtonLabel()}
        </button>
      </div>
      
      {/* Zone de glisser-déposer (conditionnelle) */}
      {showDropZone && (
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? '#60A5FA' : '#4B5563'}`,
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: isDragging ? 'rgba(96, 165, 250, 0.1)' : 'transparent'
          }}
          onClick={() => document.getElementById('file-input').click()}
        >
          <input
            id="file-input"
            type="file"
            accept=".csv"
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <div>
            <p style={{ marginBottom: '8px' }}>
              {isDragging 
                ? "Lâche ton fichier ici !" 
                : "Glisse et dépose un fichier CSV ou clique pour sélectionner"}
            </p>
            {fileName && (
              <p style={{ fontWeight: 'bold', color: '#60A5FA' }}>
                Fichier actuel: {fileName}
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Totaux annuels */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '24px', 
        marginBottom: '16px',
        fontSize: '1.125rem',
        flexWrap: 'wrap'
      }}>
        {Object.entries(yearlyTotals).map(([year, total]) => (
          <span key={year} style={{ color: getYearColor(year) }}>
            {year}: {total}mm
          </span>
        ))}
      </div>
      
      {/* Message d'erreur */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(248, 113, 113, 0.2)',
          borderRadius: '6px',
          color: '#F87171',
          marginBottom: '16px',
          textAlign: 'center'
        }}>
          {error}
        </div>
      )}
      
      {/* Indicateur de chargement ou graphique */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Chargement des données...</p>
        </div>
      ) : (
        <>
          {/* Conteneur du graphique */}
          <div className="graph-container" style={{ 
            width: '100%', 
            height: '500px',
            overflow: 'visible',
            position: 'relative'
          }}>
            {/* Bouton réinitialiser zoom (simple) */}
            {displayMode === 'daily' && isZoomed() && (
              <button
                onClick={resetZoom}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  zIndex: 100,
                  backgroundColor: '#4B5563',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Réinitialiser zoom
              </button>
            )}
            
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={displayMode === 'daily' ? data.slice(zoomDomain.start, zoomDomain.end + 1) : data}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 30,
                }}
                onMouseDown={displayMode === 'daily' ? handleMouseDown : undefined}
                onMouseMove={displayMode === 'daily' ? handleMouseMove : undefined}
                onMouseUp={displayMode === 'daily' ? handleMouseUp : undefined}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey={displayMode === 'daily' || displayMode === 'cumulative' ? 'date' : 'name'}
                  angle={-45}
                  textAnchor="end"
                  height={90} // Augmenter la hauteur pour plus d'espace
                  interval={displayMode === 'daily' || displayMode === 'cumulative' ? 30 : 0} // Montrer une étiquette tous les ~30 jours
                  tick={(props) => {
                    const { x, y, payload } = props;
                    
                    // Vérifier si la valeur est valide
                    if (!payload.value || payload.value === "NaN" || payload.value === "undefined" || payload.value.includes("undefined")) {
                      return null;
                    }
                    
                    // En mode quotidien ou cumulatif, formatter l'étiquette
                    if ((displayMode === 'daily' || displayMode === 'cumulative') && payload.value.includes('/')) {
                      const parts = payload.value.split('/');
                      if (parts.length !== 2) return null;
                      
                      const [month, day] = parts;
                      // Formatter pour montrer le jour et le mois court
                      const label = `${parseInt(day, 10)} ${getMonthShortName(month)}`;
                      
                      return (
                        <g transform={`translate(${x},${y})`}>
                          <text 
                            x={0} 
                            y={0} 
                            dy={16} 
                            textAnchor="end" 
                            fill="#9CA3AF" 
                            transform="rotate(-45)"
                            fontSize={12}
                          >
                            {label}
                          </text>
                        </g>
                      );
                    }
                    
                    // En mode mensuel, comportement standard
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text 
                          x={0} 
                          y={0} 
                          dy={16} 
                          textAnchor="end" 
                          fill="#9CA3AF" 
                          transform="rotate(-45)"
                          fontSize={12}
                        >
                          {payload.value}
                        </text>
                      </g>
                    );
                  }}
                  stroke="#4B5563"
                />
        <YAxis 
                  domain={[0, 'auto']}
                  label={{ 
                    value: displayMode === 'cumulative' ? 'Cumul de précipitations (mm)' : 'Précipitations (mm)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -10,
                    style: { textAnchor: 'middle', fontSize: 14, fill: '#9CA3AF' }
                  }} 
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="#4B5563"
                  // Limitation pour éviter les échelles trop grandes
                  allowDataOverflow={true}
                  tickCount={10}
                />
                <Tooltip content={<CustomTooltip />} />
                
                {/* Lignes pour chaque année disponible */}
                {availableYears.map(year => (
                  <Line 
                    key={year}
                    type={displayMode === 'cumulative' ? "monotone" : "linear"}
                    dataKey={displayMode === 'cumulative' ? `cumul${year}` : year} 
                    stroke={getYearColor(year)}
                    name={displayMode === 'cumulative' ? `Cumul ${year}` : year}
                    strokeWidth={displayMode === 'cumulative' ? 3 : 2}
                    dot={false}
                    connectNulls={displayMode === 'cumulative' ? true : false}
                    activeDot={{ r: 6 }}
                    hide={displayMode === 'cumulative' ? false : false}
                  />
                ))}
                
                {/* Lignes de cumul cachées pour le tooltip en mode non-cumulatif */}
                {displayMode !== 'cumulative' && availableYears.map(year => (
                  <Line 
                    key={`cumul${year}`}
                    type="monotone" 
                    dataKey={`cumul${year}`}
                    stroke="transparent"
                    name={`Cumul ${year}`}
                    hide={true} // Caché visuellement mais disponible pour le tooltip
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default RainComparison;