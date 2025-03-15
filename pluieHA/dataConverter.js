/**
 * Convertisseur pour transformer les données d'historique Home Assistant 
 * au format attendu par le composant de graphique
 */
(function() {
    function convertHistoryToChartData(historyData, entityId) {
      // Structure pour stocker les données traitées
      const dailyData = {};       // Données quotidiennes
      const yearlyTotals = {};    // Totaux annuels
      const yearsFound = new Set(); // Ensemble des années trouvées
      const cumulativeData = {};  // Structure pour les cumuls annuels
      
      // Vérifier si nous avons des données d'historique valides
      if (!historyData || !historyData.length || !historyData[0]) {
        console.warn("Pas de données d'historique valides");
        return { dailyData: [], yearlyTotals: {}, availableYears: [] };
      }
      
      // Récupérer les données pour l'entité spécifiée
      const entityData = historyData.find(data => 
        data.length > 0 && data[0].entity_id === entityId
      );
      
      if (!entityData || !entityData.length) {
        console.warn(`Pas de données trouvées pour l'entité ${entityId}`);
        return { dailyData: [], yearlyTotals: {}, availableYears: [] };
      }
      
      // Parcourir les points de données d'historique
      entityData.forEach(point => {
        // Extraire la valeur (s'assurer qu'elle est numérique)
        const value = parseFloat(point.state);
        if (isNaN(value) || value < 0) return; // Ignorer les valeurs non numériques ou négatives
        
        // Convertir le timestamp en date
        const date = new Date(point.last_changed);
        const year = date.getFullYear().toString();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        
        // Ajouter l'année à notre ensemble d'années trouvées
        yearsFound.add(year);
        
        // Initialiser le total annuel pour cette année si pas encore fait
        if (!yearlyTotals[year]) {
          yearlyTotals[year] = 0;
        }
        
        // Clé unique pour chaque jour (format MM/DD comme dans ton code d'origine)
        const monthDay = `${month}/${day}`;
        
        // Date complète pour trier
        const fullDate = `${year}-${month}-${day}`;
        
        // Initialiser l'objet du jour s'il n'existe pas
        if (!dailyData[monthDay]) {
          dailyData[monthDay] = {
            date: monthDay
          };
        }
        
        // Si on a déjà une valeur pour ce jour et cette année, on l'additionne
        if (dailyData[monthDay][year]) {
          dailyData[monthDay][year] += value;
        } else {
          dailyData[monthDay][year] = value;
        }
        
        // Cumuler la valeur pour l'année
        yearlyTotals[year] += value;
        
        // Pour calculer correctement les cumuls par année
        if (!cumulativeData[year]) {
          cumulativeData[year] = [];
        }
        
        // Ajouter cette entrée au tableau pour cette année
        cumulativeData[year].push({
          fullDate,
          monthDay,
          rainValue: value,
          timestamp: date.getTime() // Pour trier chronologiquement
        });
      });
      
      // Convertir l'ensemble des années en tableau trié
      const yearsArray = Array.from(yearsFound).sort();
      
      // Pour chaque année, calculer correctement les cumuls
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
            runningTotal += entry.rainValue;
            // Stocker le cumul pour ce jour
            yearCumulatives[entry.monthDay] = runningTotal;
          });
          
          // Maintenant, parcourir tous les jours et assurer la continuité des cumuls
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
            
            // On assigne le cumul à cette date
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
      
      // Arrondir les totaux annuels
      Object.keys(yearlyTotals).forEach(year => {
        yearlyTotals[year] = Math.round(yearlyTotals[year] * 10) / 10;
      });
      
      return {
        dailyData: sortedDailyData,
        yearlyTotals: yearlyTotals,
        availableYears: yearsArray
      };
    }
    
    // Exposer l'API de conversion
    window.RainGaugeDataConverter = {
      convertHistoryData: convertHistoryToChartData
    };
  })();