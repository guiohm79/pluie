import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const RainComparison = () => {
  const [data, setData] = useState([]);
  const [yearlyTotals, setYearlyTotals] = useState({});
  const [cumulData, setCumulData] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/pluviomètre gui_14_03_2025.csv');
        const text = await response.text();
        
        const result = Papa.parse(text, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true
        });

        const yearlyData = {};
        const cumulByDate = {};
        const runningTotals = {
          '2022': 0,
          '2023': 0,
          '2024': 0,
          '2025': 0
        };
        const finalTotals = {...runningTotals};

        // On va d'abord créer un tableau de toutes les dates possibles (jours de l'année)
        const allDates = [];
        for (let month = 1; month <= 12; month++) {
          const daysInMonth = new Date(2024, month, 0).getDate(); // Année bissextile pour février
          for (let day = 1; day <= daysInMonth; day++) {
            const dayOfYear = `${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
            allDates.push(dayOfYear);
            
            // Initialiser les structures pour chaque jour possible
            yearlyData[dayOfYear] = {
              date: dayOfYear,
              '2022': 0,
              '2023': 0,
              '2024': 0,
              '2025': 0,
              'cumul2022': 0,
              'cumul2023': 0,
              'cumul2024': 0,
              'cumul2025': 0
            };
            
            cumulByDate[dayOfYear] = {
              '2022': 0,
              '2023': 0,
              '2024': 0,
              '2025': 0
            };
          }
        }

        // Maintenant on traite les données
        result.data.forEach(row => {
          if (row.Long && row.Long.includes('/')) {
            const [year, month, dayTime] = row.Long.split('/');
            if (!dayTime) return;
            
            const day = dayTime.split(' ')[0];
            // Format avec leading zeros pour garantir un tri correct
            const formattedMonth = month.padStart(2, '0');
            const formattedDay = day.padStart(2, '0');
            const dayOfYear = `${formattedMonth}/${formattedDay}`;
            const rain = parseFloat(row.Lat) || 0;
            
            if (['2022', '2023', '2024', '2025'].includes(year)) {
              yearlyData[dayOfYear][year] = rain;
              runningTotals[year] += rain;
              finalTotals[year] = Math.round(runningTotals[year] * 10) / 10;
            }
          }
        });

        // Maintenant on calcule les cumuls pour chaque jour, en tenant compte des jours manquants
        // On va parcourir les jours dans l'ordre chronologique
        allDates.forEach((dayOfYear, index) => {
          const [month, day] = dayOfYear.split('/');
          // On s'assure que le premier jour a les cumuls à 0 ou à la valeur du jour
          if (index === 0) {
            Object.keys(runningTotals).forEach(year => {
              const dayRain = yearlyData[dayOfYear][year];
              yearlyData[dayOfYear][`cumul${year}`] = dayRain;
              cumulByDate[dayOfYear][year] = dayRain;
            });
            return;
          }
          
          // Pour les jours suivants, on prend le cumul du jour précédent + la pluie du jour
          const prevDay = allDates[index - 1];
          Object.keys(runningTotals).forEach(year => {
            const dayRain = yearlyData[dayOfYear][year];
            const prevCumul = cumulByDate[prevDay][year];
            const newCumul = prevCumul + dayRain;
            
            yearlyData[dayOfYear][`cumul${year}`] = newCumul;
            cumulByDate[dayOfYear][year] = newCumul;
          });
        });

        // On trie les données pour l'affichage
        const chartData = Object.values(yearlyData).sort((a, b) => {
          const [aMonth, aDay] = a.date.split('/');
          const [bMonth, bDay] = b.date.split('/');
          return (parseInt(aMonth) * 31 + parseInt(aDay)) - (parseInt(bMonth) * 31 + parseInt(bDay));
        });

        setData(chartData);
        setYearlyTotals(finalTotals);
        setCumulData(cumulByDate);
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
      }
    };

    fetchData();
  }, []);

  const getYearColor = (year) => {
    const colors = {
      '2022': '#60A5FA',
      '2023': '#34D399',
      '2024': '#FBBF24',
      '2025': '#F87171'
    };
    return colors[year];
  };

  // Tooltip personnalisé qui va chercher lui-même les données de cumul
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const years = ['2022', '2023', '2024', '2025'];
      
      const dailyValues = years.map(year => ({
        year,
        value: payload.find(p => p.dataKey === year)?.value ?? 0,
        color: getYearColor(year)
      }));
      
      // On utilise notre objet cumulData pour récupérer les cumuls
      const cumulValues = years.map(year => ({
        year,
        value: cumulData[label]?.[year] ?? 0,
        color: getYearColor(year)
      }));
      
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
          <div style={{ marginBottom: '8px' }}>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>Pluie du jour :</p>
            {dailyValues.map(({year, value, color}) => (
              <p key={year} style={{ color, margin: '2px 0' }}>
                {year}: {value.toFixed(1)} mm
              </p>
            ))}
          </div>
          <div>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>Cumul depuis le 01/01 :</p>
            {cumulValues.map(({year, value, color}) => (
              <p key={year} style={{ color, margin: '2px 0' }}>
                {year}: {value.toFixed(1)} mm
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '600px', 
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
        marginBottom: '8px', 
        textAlign: 'center' 
      }}>Comparaison des précipitations</h2>
      
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '24px', 
        marginBottom: '16px',
        fontSize: '1.125rem' 
      }}>
        <span style={{ color: getYearColor('2022') }}>2022: {yearlyTotals['2022']}mm</span>
        <span style={{ color: getYearColor('2023') }}>2023: {yearlyTotals['2023']}mm</span>
        <span style={{ color: getYearColor('2024') }}>2024: {yearlyTotals['2024']}mm</span>
        <span style={{ color: getYearColor('2025') }}>2025: {yearlyTotals['2025']}mm</span>
      </div>
      
      <div style={{ width: '100%', height: '500px' }}>
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
              dataKey="date" 
              angle={-45}
              textAnchor="end"
              height={60}
              interval={15}
              tick={{ fontSize: 12, fill: '#9CA3AF' }}
              stroke="#4B5563"
            />
            <YAxis 
              domain={[0, 45]}
              ticks={[0, 15, 30, 45]}
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
            <Line 
              type="monotone" 
              dataKey="2022" 
              stroke={getYearColor('2022')}
              name="2022"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="2023" 
              stroke={getYearColor('2023')}
              name="2023"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="2024" 
              stroke={getYearColor('2024')}
              name="2024"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="2025" 
              stroke={getYearColor('2025')}
              name="2025"
              dot={false}
              strokeWidth={2}
              activeDot={{ r: 6 }}
            />
            <Line 
              type="monotone" 
              dataKey="cumul2022" 
              stroke={getYearColor('2022')}
              name="cumul2022"
              dot={false}
              hide={true}
            />
            <Line 
              type="monotone" 
              dataKey="cumul2023" 
              stroke={getYearColor('2023')}
              name="cumul2023"
              dot={false}
              hide={true}
            />
            <Line 
              type="monotone" 
              dataKey="cumul2024" 
              stroke={getYearColor('2024')}
              name="cumul2024"
              dot={false}
              hide={true}
            />
            <Line 
              type="monotone" 
              dataKey="cumul2025" 
              stroke={getYearColor('2025')}
              name="cumul2025"
              dot={false}
              hide={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RainComparison;