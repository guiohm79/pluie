// Solution complète pour corriger les bugs dans comparaisons.js

import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
  const [displayMode, setDisplayMode] = useState('daily'); // 'daily' ou 'monthly'
  
  const dropZoneRef = useRef(null);

  // Charger fichier CSV par défaut au démarrage
  useEffect(() => {
    const loadDefaultData = async () => {
      try {
        const response = await fetch('/pluviomètre gui_14_03_2025.csv');
        if (!response.ok) {
          console.warn("Fichier CSV par défaut non trouvé, utilisation des données d'exemple");
          return;
        }
        const text = await response.text();
        setFileName('pluviomètre gui_14_03_2025.csv');
        processCSV(text);
      } catch (error) {
        console.warn("Erreur lors du chargement du fichier par défaut, utilisation des données d'exemple:", error);
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
      
      if (!result.data || result.data.length < 5) {
        throw new Error("Le fichier CSV ne contient pas assez de données");
      }

      // On cherche l'indice de la ligne qui contient "Timestamp"
      let dataStartIndex = -1;
      for (let i = 0; i < result.data.length; i++) {
        if (result.data[i].length > 0 && result.data[i][0] === "Timestamp") {
          dataStartIndex = i + 1; // Les données commencent à la ligne suivante
          break;
        }
      }
      
      console.log("Début des données à l'index:", dataStartIndex);
      
      if (dataStartIndex === -1) {
        throw new Error("Format de fichier non reconnu - Impossible de trouver la ligne Timestamp");
      }

      // Structures pour stocker les données
      const dailyData = {};       // Données quotidiennes
      const monthlyData = {};     // Données mensuelles
      const yearlyTotalsTemp = {}; // Totaux annuels (vide au départ)
      const yearsFound = new Set(); // Ensemble des années trouvées
      const yearCumulatives = {}; // Pour suivre les cumuls par année
      
      // Parcourir les lignes de données
      for (let i = dataStartIndex; i < result.data.length; i++) {
        const row = result.data[i];
        if (row.length < 3) continue; // Ignorer les lignes trop courtes
        
        // Format attendu: [timestamp, date_string, rain_value]
        const dateStr = row[1] ? row[1].replace(/"/g, '') : '';
        let rainValue = 0;
        
        // Extraire la valeur de pluie
        if (row[2] !== undefined) {
          rainValue = parseFloat(row[2].replace(',', '.')) || 0;
        }
        
        // Extraire l'année, le mois et le jour de la chaîne de date
        const dateMatch = /(\d{4})\/(\d{2})\/(\d{2})/.exec(dateStr);
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
          
          // Initialiser le cumul pour cette année si pas encore fait
          if (!yearCumulatives[year]) {
            yearCumulatives[year] = {};
          }
          
          // Clé unique pour chaque jour
          const monthDay = `${month}/${day}`;
          
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
          
          // Stocker le cumul à jour pour cette date
          yearCumulatives[year][monthDay] = yearlyTotalsTemp[year];
          
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

      // Ajouter les données cumulatives pour chaque jour
      Object.keys(dailyData).forEach(day => {
        Object.keys(yearCumulatives).forEach(year => {
          if (yearCumulatives[year][day]) {
            dailyData[day][`cumul${year}`] = yearCumulatives[year][day];
          }
        });
      });

      // De même pour les données mensuelles, ajouter les cumuls de fin de mois
      const monthLastDays = {
        '01': '01/31', '02': '02/28', '03': '03/31', '04': '04/30',
        '05': '05/31', '06': '06/30', '07': '07/31', '08': '08/31',
        '09': '09/30', '10': '10/31', '11': '11/30', '12': '12/31'
      };

      Object.keys(monthlyData).forEach(month => {
        const lastDay = monthLastDays[month];
        Object.keys(yearCumulatives).forEach(year => {
          // Prendre le cumul du dernier jour du mois s'il existe
          if (yearCumulatives[year][lastDay]) {
            monthlyData[month][`cumul${year}`] = yearCumulatives[year][lastDay];
          } else {
            // Sinon, chercher le dernier jour disponible du mois
            const daysInMonth = Object.keys(yearCumulatives[year])
              .filter(day => day.startsWith(month + '/'))
              .sort((a, b) => {
                const dayA = parseInt(a.split('/')[1]);
                const dayB = parseInt(b.split('/')[1]);
                return dayB - dayA; // Trier par ordre décroissant pour avoir le dernier jour en premier
              });
            
            if (daysInMonth.length > 0) {
              monthlyData[month][`cumul${year}`] = yearCumulatives[year][daysInMonth[0]];
            }
          }
        });
      });

      // Trier les données quotidiennes par date
      const sortedDailyData = Object.values(dailyData).sort((a, b) => {
        const [aMonth, aDay] = a.date.split('/').map(Number);
        const [bMonth, bDay] = b.date.split('/').map(Number);
        return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
      });
      
      // Trier les données mensuelles
      const sortedMonthlyData = Object.values(monthlyData).sort((a, b) => {
        const monthOrder = {
          'Janvier': 1, 'Février': 2, 'Mars': 3, 'Avril': 4, 'Mai': 5, 'Juin': 6,
          'Juillet': 7, 'Août': 8, 'Septembre': 9, 'Octobre': 10, 'Novembre': 11, 'Décembre': 12
        };
        return monthOrder[a.name] - monthOrder[b.name];
      });

      // Arrondir les totaux annuels
      Object.keys(yearlyTotalsTemp).forEach(year => {
        yearlyTotalsTemp[year] = Math.round(yearlyTotalsTemp[year] * 10) / 10;
      });
      
      console.log("Données quotidiennes:", sortedDailyData.slice(0, 5), "...");
      console.log("Données mensuelles:", sortedMonthlyData);
      console.log("Totaux annuels:", yearlyTotalsTemp);

      setData(displayMode === 'daily' ? sortedDailyData : sortedMonthlyData);
      setYearlyTotals(yearlyTotalsTemp);
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur lors du traitement du fichier:', err);
      setError(`Erreur: ${err.message}`);
      setIsLoading(false);
      // Garder les données d'exemple si le traitement échoue
    }
  };

  // Basculer entre affichage quotidien et mensuel
  const toggleDisplayMode = () => {
    const newMode = displayMode === 'daily' ? 'monthly' : 'daily';
    setDisplayMode(newMode);
    
    // Si on a des données CSV chargées, on retraite le fichier
    if (fileName) {
      fetchAndReprocessData();
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

  // Obtenir le nom du mois à partir de son numéro
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
    }
  };

  // Obtenir la couleur pour chaque année
  const getYearColor = (year) => {
    return yearColors[year] || '#9CA3AF'; // Gris par défaut si année non définie
  };

  // Tooltip personnalisé - CORRIGÉ POUR AFFICHER LES CUMULS ET ÉVITER "NaN undefined"
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Vérifier si label est défini pour éviter "NaN undefined"
      if (!label) return null;
      
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
                .filter(p => p.value > 0 && !p.dataKey.startsWith('cumul'))
                .sort((a, b) => b.value - a.value)
                .map((p) => {
                  // Trouver le cumul correspondant pour cette année
                  const cumulKey = `cumul${p.dataKey}`;
                  const cumulPayload = payload.find(item => item.dataKey === cumulKey);
                  const cumulValue = cumulPayload ? cumulPayload.value : null;
                  
                  return (
                    <div key={p.dataKey} style={{ 
                      color: p.color, 
                      margin: '4px 0',
                      padding: '4px 0',
                      borderBottom: '1px dotted #374151'
                    }}>
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between'
                      }}>
                        <span>{p.dataKey}:</span>
                        <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{p.value.toFixed(1)} mm</span>
                      </div>
                      {/* Afficher le cumul s'il est disponible */}
                      {cumulValue !== null && (
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
              {payload.filter(p => p.value > 0 && !p.dataKey.startsWith('cumul')).length === 0 && (
                <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pas de précipitations</p>
              )}
            </div>
          </div>
        );
      }
      
      // Pour l'affichage quotidien
      // On extrait le mois et le jour à partir de la date (format "MM/JJ")
      // Utiliser une regex pour être sûr d'extraire correctement les valeurs
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
              .filter(p => p.value > 0 && !p.dataKey.startsWith('cumul'))
              .sort((a, b) => b.value - a.value)
              .map((p) => {
                // Trouver le cumul correspondant pour cette année
                const cumulKey = `cumul${p.dataKey}`;
                const cumulPayload = payload.find(item => item.dataKey === cumulKey);
                const cumulValue = cumulPayload ? cumulPayload.value : null;
                
                return (
                  <div key={p.dataKey} style={{ 
                    color: p.color, 
                    margin: '4px 0',
                    padding: '4px 0',
                    borderBottom: '1px dotted #374151'
                  }}>
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between'
                    }}>
                      <span>{p.dataKey}:</span>
                      <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{p.value.toFixed(1)} mm</span>
                    </div>
                    {/* Afficher le cumul s'il est disponible */}
                    {cumulValue !== null && (
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
            {payload.filter(p => p.value > 0 && !p.dataKey.startsWith('cumul')).length === 0 && (
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
      
      {/* Zone de glisser-déposer */}
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
      
      {/* Bouton pour basculer le mode d'affichage */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
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
          {displayMode === 'daily' ? 'Afficher par mois' : 'Afficher par jour'}
        </button>
      </div>
      
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
            overflow: 'visible'
          }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 30,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey={displayMode === 'daily' ? 'date' : 'name'}
                  angle={-45}
                  textAnchor="end"
                  height={90} // Augmenter la hauteur pour plus d'espace
                  interval={displayMode === 'daily' ? 30 : 0} // Montrer une étiquette tous les ~30 jours
                  tick={(props) => {
                    const { x, y, payload } = props;
                    
                    // En mode quotidien, formatter l'étiquette
                    if (displayMode === 'daily') {
                      const [month, day] = payload.value.split('/');
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
                    value: 'Précipitations (mm)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: -10,
                    style: { textAnchor: 'middle', fontSize: 14, fill: '#9CA3AF' }
                  }} 
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  stroke="#4B5563"
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="top" 
                  height={36}
                  wrapperStyle={{
                    paddingBottom: '20px',
                    fontSize: '14px'
                  }}
                />
                
                {/* Lignes pour chaque année disponible - n'afficher que les vraies valeurs, pas les cumuls */}
                {availableYears.map(year => (
                  <Line 
                    key={year}
                    type="monotone" 
                    dataKey={year} 
                    stroke={getYearColor(year)}
                    name={year}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                ))}
                
                {/* On ajoute les lignes de cumul mais on les cache pour qu'elles soient disponibles dans le tooltip */}
                {availableYears.map(year => (
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