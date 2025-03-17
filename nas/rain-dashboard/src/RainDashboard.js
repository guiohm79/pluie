import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea } from 'recharts';
import Papa from 'papaparse';

/**
 * Tableau de bord de visualisation des précipitations
 * Version corrigée pour résoudre les problèmes d'affichage des données cumulatives
 */
const RainDashboard = ({ csvPath = './data/rainfall.csv' }) => {
  // États pour les données et le fonctionnement
  const [rawData, setRawData] = useState([]);
  const [yearlyTotals, setYearlyTotals] = useState({});
  const [availableYears, setAvailableYears] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayMode, setDisplayMode] = useState('daily'); // 'daily' ou 'cumulative'
  
  // États pour le zoom
  const [zoomDomain, setZoomDomain] = useState({ start: 0, end: 364 });
  const [refAreaLeft, setRefAreaLeft] = useState('');
  const [refAreaRight, setRefAreaRight] = useState('');
  const [isZooming, setIsZooming] = useState(false);
  
  // États pour l'interface
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataVersion, setDataVersion] = useState(0); // Force refresh when data changes

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

  // Générer la liste complète des jours de l'année
  const getAllDaysOfYear = useCallback(() => {
    const days = [];
    // Tableau des jours par mois (sans considérer les années bissextiles)
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    
    for (let month = 1; month <= 12; month++) {
      for (let day = 1; day <= daysInMonth[month-1]; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const monthStr = month.toString().padStart(2, '0');
        // Utiliser MMDD comme clé pour l'ordre (facile à trier)
        days.push({
          key: `${monthStr}${dayStr}`,
          display: `${monthStr}/${dayStr}`,
          dayOfYear: days.length,
          month,
          day
        });
      }
    }
    return days;
  }, []);

  // Fonction pour parser les données du CSV
  const parseCSVData = useCallback((csvText) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Analyse initiale du CSV
      const result = Papa.parse(csvText, {
        delimiter: ';',
        header: false,
        skipEmptyLines: true
      });
      
      if (!result.data || result.data.length < 2) {
        throw new Error("Le fichier CSV ne contient pas assez de données");
      }
      
      // Identifier les colonnes à partir des en-têtes
      let timestampCol = -1;
      let dateCol = -1;
      let rainCol = -1;
      let headerRow = -1;
      
      // Chercher les en-têtes dans les 15 premières lignes
      for (let i = 0; i < Math.min(15, result.data.length); i++) {
        const row = result.data[i];
        if (!row) continue;
        
        for (let j = 0; j < row.length; j++) {
          if (!row[j]) continue;
          
          const cell = row[j].toString().toLowerCase().trim();
          
          if (cell === 'timestamp') {
            timestampCol = j;
            headerRow = i;
          } else if (cell.includes('timezone') || cell.includes('date')) {
            dateCol = j;
          } else if (cell === 'sum_rain' || cell.includes('rain') || cell.includes('pluie')) {
            rainCol = j;
          }
        }
        
        // Si on a trouvé l'en-tête, on arrête
        if (headerRow !== -1) break;
      }
      
      // Si aucun en-tête n'a été trouvé, on utilise des valeurs par défaut
      if (headerRow === -1) {
        headerRow = 2;
        timestampCol = 0;
        dateCol = 1;
        rainCol = 2;
      }
      
      // Extraction des données brutes par jour
      const rawRainData = {};  // Structure: { 'YYYY': { 'MMDD': valeur } }
      const yearTotals = {};   // Total par année
      
      for (let i = headerRow + 1; i < result.data.length; i++) {
        const row = result.data[i];
        if (!row || row.length <= Math.max(timestampCol, dateCol, rainCol)) continue;
        
        // Extraire la date
        let year = '';
        let month = '';
        let day = '';
        
        // Essayer d'extraire la date du timestamp Unix
        if (timestampCol >= 0 && row[timestampCol] && !isNaN(row[timestampCol])) {
          const date = new Date(parseInt(row[timestampCol], 10) * 1000);
          year = date.getFullYear().toString();
          month = (date.getMonth() + 1).toString().padStart(2, '0');
          day = date.getDate().toString().padStart(2, '0');
        }
        // Sinon, essayer d'extraire de la colonne date
        else if (dateCol >= 0 && row[dateCol]) {
          const dateStr = row[dateCol].toString().replace(/"/g, '');
          
          // Différents formats possibles: YYYY/MM/DD ou DD/MM/YYYY
          const patterns = [
            /(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/, // YYYY/MM/DD
            /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/  // DD/MM/YYYY
          ];
          
          for (const pattern of patterns) {
            const match = pattern.exec(dateStr);
            if (match) {
              if (match[1].length === 4) {
                year = match[1];
                month = match[2].padStart(2, '0');
                day = match[3].padStart(2, '0');
              } else {
                day = match[1].padStart(2, '0');
                month = match[2].padStart(2, '0');
                year = match[3];
              }
              break;
            }
          }
        }
        
        // Si on n'a pas pu extraire une date valide, passer à la ligne suivante
        if (!year || !month || !day) continue;
        
        // Extraire la valeur de pluie
        let rainValue = 0;
        if (rainCol >= 0 && row[rainCol] !== undefined) {
          const cleanValue = row[rainCol].toString().replace(',', '.').trim();
          rainValue = parseFloat(cleanValue);
          if (isNaN(rainValue) || rainValue < 0 || rainValue > 500) {
            rainValue = 0;
          }
        }
        
        // Enregistrer les données par jour et année
        if (!rawRainData[year]) {
          rawRainData[year] = {};
          yearTotals[year] = 0;
        }
        
        const mmdd = `${month}${day}`;
        rawRainData[year][mmdd] = (rawRainData[year][mmdd] || 0) + rainValue;
        yearTotals[year] += rainValue;
      }
      
      // Formater les totaux annuels
      Object.keys(yearTotals).forEach(year => {
        yearTotals[year] = Math.round(yearTotals[year] * 10) / 10;
      });
      
      setRawData(rawRainData);
      setYearlyTotals(yearTotals);
      setAvailableYears(Object.keys(rawRainData).sort());
      setLastUpdated(new Date());
      setIsLoading(false);
      setDataVersion(prev => prev + 1); // Force re-render
      
    } catch (err) {
      console.error('Erreur lors du traitement des données CSV:', err);
      setError(`Erreur: ${err.message}`);
      setIsLoading(false);
    }
  }, []);

  // Chargement initial des données
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(csvPath);
        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }
        const text = await response.text();
        parseCSVData(text);
      } catch (error) {
        console.error("Erreur lors du chargement du fichier CSV:", error);
        setError(`Erreur lors du chargement des données: ${error.message}`);
        setIsLoading(false);
      }
    };
    
    loadData();
    
    // Actualisation automatique
    let interval;
    if (autoRefresh) {
      interval = setInterval(loadData, 30 * 60 * 1000); // 30 minutes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [csvPath, autoRefresh, parseCSVData]);

  // Préparation des données pour l'affichage
  const displayData = useMemo(() => {
    // Si pas de données, retourner un tableau vide
    if (Object.keys(rawData).length === 0) return [];
    
    // Récupérer tous les jours de l'année
    const allDays = getAllDaysOfYear();
    
    // Préparer les données pour chaque jour
    const formattedData = allDays.map(dayInfo => {
      const dataPoint = {
        id: dayInfo.dayOfYear,
        date: dayInfo.display,
        key: dayInfo.key
      };
      
      // Pour chaque année disponible
      availableYears.forEach(year => {
        // Valeur du jour (précipitations)
        const rainValue = rawData[year]?.[dayInfo.key] || 0;
        dataPoint[year] = rainValue;
        
        // Initialisation des cumuls
        dataPoint[`cumul${year}`] = 0;
      });
      
      return dataPoint;
    });
    
    // Calcul des cumuls pour chaque année
    availableYears.forEach(year => {
      let cumul = 0;
      for (let i = 0; i < formattedData.length; i++) {
        // Ajouter la valeur du jour au cumul
        cumul += formattedData[i][year] || 0;
        // Mettre à jour le cumul
        formattedData[i][`cumul${year}`] = cumul;
      }
    });
    
    return formattedData;
  }, [rawData, availableYears, getAllDaysOfYear, dataVersion]);

  // Basculer entre les modes d'affichage
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'daily' ? 'cumulative' : 'daily');
  };

  // Gestion du zoom
  const handleMouseDown = (e) => {
    if (displayMode === 'daily' && e && e.activeLabel) {
      const index = displayData.findIndex(item => item.date === e.activeLabel);
      if (index !== -1) {
        setRefAreaLeft(e.activeLabel);
        setIsZooming(true);
      }
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
    
    let idxLeft = displayData.findIndex(item => item.date === refAreaLeft);
    let idxRight = displayData.findIndex(item => item.date === refAreaRight);
    
    if (idxLeft === -1 || idxRight === -1) {
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
    setZoomDomain({ start: 0, end: 364 });
  };

  // Vérifier si on a zoomé
  const isZoomed = () => {
    return zoomDomain.start > 0 || zoomDomain.end < 364;
  };

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;
    
    // Extraction du mois et du jour
    const match = /(\d{2})\/(\d{2})/.exec(label);
    if (!match) return null;
    
    const month = match[1];
    const day = match[2];
    const monthName = getMonthName(month);
    
    return (
      <div style={{ 
        backgroundColor: '#1F2937', 
        padding: '12px', 
        border: '1px solid #374151',
        borderRadius: '6px', 
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        color: '#E5E7EB',
        maxWidth: '280px',
        fontSize: '14px'
      }}>
        <p style={{ 
          fontWeight: 'bold', 
          marginBottom: '8px', 
          borderBottom: '1px solid #374151',
          paddingBottom: '4px',
          fontSize: '16px'
        }}>
          {day} {monthName}
        </p>
        
        <div style={{ 
          maxHeight: '200px',
          overflowY: payload.length > 5 ? 'auto' : 'visible'
        }}>
          {payload
            .filter(p => {
              // Filtrer selon le mode d'affichage
              return displayMode === 'cumulative' 
                ? (p.dataKey.startsWith('cumul') && p.value > 0)
                : (!p.dataKey.startsWith('cumul') && p.dataKey !== 'date' && p.dataKey !== 'id' && p.dataKey !== 'key' && p.value > 0);
            })
            .sort((a, b) => {
              // Tri par valeur décroissante
              if (displayMode === 'cumulative') {
                return b.value - a.value;
              }
              // Pour le mode quotidien, on trie par année décroissante
              return b.dataKey.localeCompare(a.dataKey);
            })
            .map((p) => {
              // Informations de cumul pour le mode quotidien
              let cumulValue = null;
              if (displayMode !== 'cumulative') {
                const yearKey = p.dataKey;
                const cumulKey = `cumul${yearKey}`;
                const cumulPayload = payload.find(item => item.dataKey === cumulKey);
                cumulValue = cumulPayload ? cumulPayload.value : null;
              }
              
              // Clé d'affichage
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
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ fontWeight: 'bold' }}>{displayKey}:</span>
                    <span style={{ marginLeft: '8px' }}>{p.value.toFixed(1)} mm</span>
                  </div>
                  
                  {displayMode !== 'cumulative' && cumulValue !== null && (
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.9em',
                      marginTop: '2px',
                      opacity: '0.8'
                    }}>
                      <span>Cumul {displayKey}:</span>
                      <span>{cumulValue.toFixed(1)} mm</span>
                    </div>
                  )}
                </div>
              );
            })}
          
          {payload.filter(p => {
            return displayMode === 'cumulative' 
              ? (p.value > 0 && p.dataKey.startsWith('cumul'))
              : (p.value > 0 && !p.dataKey.startsWith('cumul') && p.dataKey !== 'date' && p.dataKey !== 'id' && p.dataKey !== 'key');
          }).length === 0 && (
            <p style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pas de précipitations</p>
          )}
        </div>
      </div>
    );
  };

  // Rendu du composant
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
          {displayMode === 'daily' ? 'Afficher par jour' : 'Afficher les cumuls'}
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
          Actualisation auto {autoRefresh ? 'activée' : 'désactivée'}
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
      
      {/* Dernière mise à jour */}
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
                displayData.slice(zoomDomain.start, zoomDomain.end + 1) : 
                displayData
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
                interval={displayMode === 'daily' ? 30 : 15}
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
                  key={displayMode === 'cumulative' ? `cumul${year}` : year}
                  type={displayMode === 'cumulative' ? "monotone" : "linear"}
                  dataKey={displayMode === 'cumulative' ? `cumul${year}` : year} 
                  stroke={getYearColor(year)}
                  name={displayMode === 'cumulative' ? `Cumul ${year}` : year}
                  strokeWidth={displayMode === 'cumulative' ? 3 : 2}
                  dot={false}
                  connectNulls={true}
                  activeDot={{ r: 6 }}
                  isAnimationActive={false}
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