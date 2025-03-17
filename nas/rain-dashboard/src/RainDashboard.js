import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import Papa from 'papaparse';

/**
 * Tableau de bord de visualisation des précipitations
 * Optimisé pour Docker et l'intégration avec Home Assistant
 */
const RainDashboard = ({ csvPath = './data/rainfall.csv' }) => {
  // États pour les données et le fonctionnement
  const [data, setData] = useState([]);
  const [yearlyTotals, setYearlyTotals] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayMode, setDisplayMode] = useState('daily'); // 'daily' ou 'cumulative'
  
  // États pour le zoom
  const [zoomDomain, setZoomDomain] = useState({ start: 0, end: 365 });
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [isZooming, setIsZooming] = useState(false);
  
  // États pour l'interface
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Couleurs pour les années
  const YEAR_COLORS = {
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

  // Fonction pour obtenir le nom du mois
  const getMonthName = useCallback((monthNumber) => {
    const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                       "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
    return monthNames[parseInt(monthNumber, 10) - 1] || "";
  }, []);

  // Obtenir le nom court du mois
  const getMonthShortName = useCallback((monthNumber) => {
    const monthShortNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", 
                           "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
    return monthShortNames[parseInt(monthNumber, 10) - 1] || "";
  }, []);

  // Obtenir la couleur pour une année
  const getYearColor = useCallback((year) => {
    return YEAR_COLORS[year] || '#9CA3AF'; // Gris par défaut
  }, []);

  // Traitement des données CSV
  const processCSV = useCallback((csvText) => {
    try {
      setIsLoading(true);
      setError(null);

      // Analyse du CSV avec PapaParse
      const result = Papa.parse(csvText, { 
        delimiter: ';',
        header: false,
        skipEmptyLines: true
      });
      
      if (!result.data || result.data.length < 2) {
        throw new Error("Le fichier CSV ne contient pas assez de données");
      }

      // Trouver l'indice de la ligne qui contient "Timestamp"
      let dataStartIndex = 0;
      let timestampColumnIndex = 0;
      let dateColumnIndex = 1;
      let rainColumnIndex = 2;
      
      // Recherche des colonnes dans les 10 premières lignes
      for (let i = 0; i < Math.min(10, result.data.length); i++) {
        const row = result.data[i];
        if (!row) continue;
        
        for (let j = 0; j < row.length; j++) {
          const cell = row[j];
          if (!cell) continue;
          
          const cellText = cell.toString().toLowerCase();
          
          if (cellText === "timestamp") {
            dataStartIndex = i + 1;
            timestampColumnIndex = j;
          } else if (cellText.includes("timezone") || cellText.includes("date")) {
            dateColumnIndex = j;
          } else if (cellText === "sum_rain" || cellText.includes("rain") || cellText.includes("pluie")) {
            rainColumnIndex = j;
          }
        }
        
        // Si on a trouvé un en-tête, on arrête la recherche
        if (dataStartIndex > 0) break;
      }
      
      // Si on n'a pas trouvé d'en-tête, on suppose que les données commencent à la ligne 3
      if (dataStartIndex === 0) {
        dataStartIndex = 3;
      }

      // Structures pour stocker les données
      const dailyData = {};       // Données quotidiennes
      const yearlyTotalsTemp = {}; // Totaux annuels
      const yearsFound = new Set(); // Ensemble des années trouvées
      const cumulativeData = {};  // Données cumulatives
      
      // Parcourir les lignes de données
      for (let i = dataStartIndex; i < result.data.length; i++) {
        const row = result.data[i];
        if (!row || row.length <= Math.max(timestampColumnIndex, dateColumnIndex, rainColumnIndex)) continue;
        
        // Récupérer les valeurs des colonnes
        const timestamp = row[timestampColumnIndex];
        let dateStr = row[dateColumnIndex] || "";
        let rainValue = 0;
        
        // Nettoyage et conversion de la valeur de pluie
        if (row[rainColumnIndex] !== undefined) {
          const cleanValue = row[rainColumnIndex].toString().replace(',', '.').trim();
          rainValue = parseFloat(cleanValue);
          if (isNaN(rainValue) || rainValue < 0 || rainValue > 500) {
            rainValue = 0; // Valeur par défaut ou ignorer cette ligne
          }
        }
        
        // Nettoyage de la date
        if (dateStr) {
          dateStr = dateStr.toString().replace(/"/g, '');
        }
        
        let dateObj;
        let year, month, day;
        
        // Essayer de parser la date à partir du timestamp Unix
        if (timestamp && !isNaN(timestamp)) {
          dateObj = new Date(parseInt(timestamp, 10) * 1000);
          year = dateObj.getFullYear().toString();
          month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
          day = dateObj.getDate().toString().padStart(2, '0');
        } 
        // Sinon, essayer de parser à partir de la chaîne de date
        else if (dateStr) {
          // Format possible: YYYY/MM/DD, DD/MM/YYYY, etc.
          let dateMatch = /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.exec(dateStr);
          
          if (!dateMatch) {
            dateMatch = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/.exec(dateStr);
            if (dateMatch) {
              day = dateMatch[1].padStart(2, '0');
              month = dateMatch[2].padStart(2, '0');
              year = dateMatch[3];
            }
          } else {
            year = dateMatch[1];
            month = dateMatch[2].padStart(2, '0');
            day = dateMatch[3].padStart(2, '0');
          }
          
          if (!year) {
            continue; // Passer à la ligne suivante si le format de date n'est pas reconnu
          }
        } else {
          continue; // Aucune information de date disponible
        }
        
        // Ajouter l'année à notre ensemble
        yearsFound.add(year);
        
        // Initialiser le total annuel
        if (!yearlyTotalsTemp[year]) {
          yearlyTotalsTemp[year] = 0;
        }
        
        // Clé unique pour chaque jour
        const monthDay = `${month}/${day}`;
        
        // Date complète pour trier
        const fullDate = `${year}-${month}-${day}`;
        
        // Initialiser l'objet du jour
        if (!dailyData[monthDay]) {
          dailyData[monthDay] = {
            date: monthDay
          };
        }
        
        // Ajouter la valeur du jour (additionner si plusieurs entrées pour le même jour)
        dailyData[monthDay][year] = (dailyData[monthDay][year] || 0) + rainValue;
        
        // Cumuler la valeur pour l'année
        yearlyTotalsTemp[year] += rainValue;
        
        // Pour calculer les cumuls par année
        if (!cumulativeData[year]) {
          cumulativeData[year] = [];
        }
        
        // Ajouter cette entrée au tableau pour cette année
        cumulativeData[year].push({
          fullDate,
          monthDay,
          rainValue,
          timestamp: new Date(fullDate).getTime()
        });
      }

      // Convertir l'ensemble des années en tableau trié
      const yearsArray = Array.from(yearsFound).sort();
      
      // Pour chaque année, calculer les cumuls
      yearsArray.forEach(year => {
        if (cumulativeData[year] && cumulativeData[year].length > 0) {
          // Trier les données par date
          cumulativeData[year].sort((a, b) => a.timestamp - b.timestamp);
          
          // Calculer le cumul progressif
          let runningTotal = 0;
          const yearCumulatives = {};
          
          // Calculer tous les cumuls
          cumulativeData[year].forEach(entry => {
            runningTotal += entry.rainValue;
            yearCumulatives[entry.monthDay] = runningTotal;
          });
          
          // Parcourir tous les jours et assurer la continuité des cumuls
          const allDates = Object.keys(dailyData).sort((a, b) => {
            const [aMonth, aDay] = a.split('/').map(Number);
            const [bMonth, bDay] = b.split('/').map(Number);
            return (aMonth * 100 + aDay) - (bMonth * 100 + bDay);
          });
          
          let lastKnownCumul = 0;
          allDates.forEach(date => {
            if (yearCumulatives[date] !== undefined) {
              lastKnownCumul = yearCumulatives[date];
            }
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
      Object.keys(yearlyTotalsTemp).forEach(year => {
        if (yearlyTotalsTemp[year] > 5000) {
          yearlyTotalsTemp[year] = 0; // Probablement une erreur
        } else {
          yearlyTotalsTemp[year] = Math.round(yearlyTotalsTemp[year] * 10) / 10;
        }
      });

      // Mise à jour des états
      setData(sortedDailyData);
      setYearlyTotals(yearlyTotalsTemp);
      setAvailableYears(yearsArray);
      setLastUpdated(new Date());
      setIsLoading(false);
    } catch (err) {
      console.error('Erreur lors du traitement du fichier CSV:', err);
      setError(`Erreur: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  // Charger les données du CSV
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(csvPath);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const text = await response.text();
        processCSV(text);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
        setError(`Erreur lors du chargement des données: ${error.message}`);
        setIsLoading(false);
      }
    };

    loadData();

    // Configuration de l'actualisation automatique si activée
    let refreshInterval;
    if (autoRefresh) {
      refreshInterval = setInterval(() => {
        loadData();
      }, 30 * 60 * 1000); // 30 minutes
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [csvPath, autoRefresh, processCSV]);

  // Basculer entre les modes d'affichage
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'daily' ? 'cumulative' : 'daily');
  };

  // Fonctions pour le zoom
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

    if (!refAreaLeft || !refAreaRight) {
      setIsZooming(false);
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    let idxLeft = data.findIndex(item => item.date === refAreaLeft);
    let idxRight = data.findIndex(item => item.date === refAreaRight);
    
    if (idxLeft < 0 || idxRight < 0) {
      setIsZooming(false);
      setRefAreaLeft('');
      setRefAreaRight('');
      return;
    }

    if (idxLeft > idxRight) {
      [idxLeft, idxRight] = [idxRight, idxLeft];
    }

    setZoomDomain({ start: idxLeft, end: idxRight });
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

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      if (!label || label === "NaN" || label === "undefined" || label.includes("undefined")) {
        return null;
      }
      
      const match = /(\d{2})\/(\d{2})/.exec(label);
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
      const monthName = getMonthName(month);
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
                return displayMode === 'cumulative' 
                  ? (p.value > 0 && p.dataKey.startsWith('cumul'))
                  : (p.value > 0 && !p.dataKey.startsWith('cumul'));
              })
              .sort((a, b) => b.value - a.value)
              .map((p) => {
                let cumulValue = null;
                if (displayMode !== 'cumulative') {
                  const yearKey = p.dataKey;
                  const cumulKey = `cumul${yearKey}`;
                  const cumulPayload = payload.find(item => item.dataKey === cumulKey);
                  cumulValue = cumulPayload ? cumulPayload.value : null;
                }
                
                const displayKey = displayMode === 'cumulative' 
                  ? p.dataKey.replace('cumul', '') 
                  : p.dataKey;
                
                return (
                  <div key={p.dataKey} style={{ 
                    color: displayMode === 'cumulative' 
                      ? getYearColor(p.dataKey.replace('cumul', '')) 
                      : getYearColor(p.dataKey), 
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

  // Interface utilisateur principale
  return (
    <div style={{ 
      width: '100%', 
      padding: '16px', 
      backgroundColor: '#1f2937', 
      borderRadius: '8px',
      color: '#e5e7eb'
    }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: 'bold', 
        marginBottom: '16px', 
        textAlign: 'center' 
      }}>Comparaison des précipitations</h2>
      
      {/* Boutons de commande */}
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
            marginRight: '10px'
          }}
        >
          {displayMode === 'daily' ? 'Afficher les cumuls' : 'Afficher par jour'}
        </button>
        
        <button
          onClick={() => setAutoRefresh(!autoRefresh)}
          style={{
            backgroundColor: autoRefresh ? '#34D399' : '#4B5563',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {autoRefresh ? 'Actualisation auto activée' : 'Actualisation auto désactivée'}
        </button>
      </div>
      
      {/* Totaux annuels */}
      {Object.keys(yearlyTotals).length > 0 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '24px', 
          marginBottom: '16px',
          fontSize: '1.125rem',
          flexWrap: 'wrap'
        }}>
          {Object.entries(yearlyTotals)
            .sort(([yearA], [yearB]) => yearA.localeCompare(yearB))
            .map(([year, total]) => (
              <span key={year} style={{ color: getYearColor(year) }}>
                {year}: {total}mm
              </span>
            ))}
        </div>
      )}
      
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
      
      {/* Indicateur de dernière mise à jour */}
      {lastUpdated && (
        <div style={{ 
          textAlign: 'center', 
          fontSize: '0.875rem', 
          color: '#9CA3AF',
          marginBottom: '10px'
        }}>
          Dernière mise à jour: {lastUpdated.toLocaleString()}
        </div>
      )}
      
      {/* Indicateur de chargement ou graphique */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>Chargement des données...</p>
        </div>
      ) : (
        <div style={{ 
          width: '100%', 
          height: '500px',
          position: 'relative'
        }}>
          {/* Bouton réinitialiser zoom */}
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
              data={displayMode === 'daily' ? 
                data.slice(zoomDomain.start, zoomDomain.end + 1) : 
                data
              }
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
                dataKey="date"
                angle={-45}
                textAnchor="end"
                height={90}
                interval={displayMode === 'daily' ? 30 : 0}
                tick={(props) => {
                  const { x, y, payload } = props;
                  
                  if (!payload.value || payload.value === "NaN" || payload.value.includes("undefined")) {
                    return null;
                  }
                  
                  if (payload.value.includes('/')) {
                    const parts = payload.value.split('/');
                    if (parts.length !== 2) return null;
                    
                    const month = parts[0];
                    const day = parts[1];
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
                allowDataOverflow={true}
                tickCount={10}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Zone de référence pour le zoom */}
              {isZooming && refAreaLeft && refAreaRight && (
                <ReferenceArea 
                  x1={refAreaLeft} 
                  x2={refAreaRight} 
                  strokeOpacity={0.3} 
                  fill="#60A5FA" 
                  fillOpacity={0.3} 
                />
              )}
              
              {/* Lignes pour chaque année */}
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
                />
              ))}
              
              {/* Lignes de cumul cachées pour le tooltip */}
              {displayMode !== 'cumulative' && availableYears.map(year => (
                <Line 
                  key={`cumul${year}`}
                  type="monotone" 
                  dataKey={`cumul${year}`}
                  stroke="transparent"
                  name={`Cumul ${year}`}
                  hide={true}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default RainDashboard;