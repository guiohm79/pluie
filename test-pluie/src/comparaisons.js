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

const RainComparison = () => {
  // États pour les données et le fonctionnement du composant
  const [data, setData] = useState(defaultData);
  const [yearlyTotals, setYearlyTotals] = useState({ '2022': 0, '2023': 0, '2024': 0, '2025': 0 });
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
      const yearlyTotalsTemp = {  // Totaux annuels
        '2022': 0, 
        '2023': 0, 
        '2024': 0, 
        '2025': 0
      };
      
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
          
          // Clé unique pour chaque jour
          const monthDay = `${month}/${day}`;
          
          // Clé pour regrouper par mois
          const monthKey = `${month}`;
          
          // Initialiser l'objet du jour s'il n'existe pas
          if (!dailyData[monthDay]) {
            dailyData[monthDay] = {
              date: monthDay,
              '2022': 0,
              '2023': 0,
              '2024': 0,
              '2025': 0
            };
          }
          
          // Initialiser l'objet du mois s'il n'existe pas
          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
              name: getMonthName(month),
              '2022': 0,
              '2023': 0,
              '2024': 0,
              '2025': 0
            };
          }
          
          // Ajouter la valeur au jour correspondant
          if (['2022', '2023', '2024', '2025'].includes(year)) {
            dailyData[monthDay][year] = rainValue;
            monthlyData[monthKey][year] += rainValue;
            yearlyTotalsTemp[year] += rainValue;
          }
        }
      }

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
    const colors = {
      '2022': '#60A5FA', // Bleu
      '2023': '#34D399', // Vert
      '2024': '#FBBF24', // Jaune
      '2025': '#F87171'  // Rouge
    };
    return colors[year] || '#9CA3AF'; // Gris par défaut
  };

  // Tooltip personnalisé
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: '#1F2937', 
          padding: '12px', 
          border: '1px solid #374151',
          borderRadius: '6px', 
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
          color: '#E5E7EB' 
        }}>
          <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{label}</p>
          {payload.map((p) => (
            <p key={p.dataKey} style={{ 
              color: p.color, 
              margin: '2px 0' 
            }}>
              {p.name}: {p.value.toFixed(1)} mm
            </p>
          ))}
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
        <span style={{ color: getYearColor('2022') }}>2022: {yearlyTotals['2022']}mm</span>
        <span style={{ color: getYearColor('2023') }}>2023: {yearlyTotals['2023']}mm</span>
        <span style={{ color: getYearColor('2024') }}>2024: {yearlyTotals['2024']}mm</span>
        <span style={{ color: getYearColor('2025') }}>2025: {yearlyTotals['2025']}mm</span>
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
                  height={80}
                  interval={displayMode === 'daily' ? 14 : 0} // Montrer moins de labels en mode quotidien
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
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
                
                {/* Lignes pour chaque année */}
                <Line 
                  type="monotone" 
                  dataKey="2022" 
                  stroke={getYearColor('2022')}
                  name="2022"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="2023" 
                  stroke={getYearColor('2023')}
                  name="2023"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="2024" 
                  stroke={getYearColor('2024')}
                  name="2024"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="2025" 
                  stroke={getYearColor('2025')}
                  name="2025"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

export default RainComparison;