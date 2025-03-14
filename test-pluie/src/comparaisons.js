import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const RainComparison = () => {
  const [data, setData] = useState([]);
  const [yearlyTotals, setYearlyTotals] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('/pluviomètre gui_14_03_2025.csv');
        const text = await response.text();
        
        // ICI C'EST LA CORRECTION: on parse "text" et non "response"
        const result = Papa.parse(text, {
          header: true,
          delimiter: ';',
          skipEmptyLines: true
        });

        const yearlyData = {};
        const runningTotals = {
          '2022': 0,
          '2023': 0,
          '2024': 0,
          '2025': 0
        };
        const finalTotals = {...runningTotals};
        
        result.data.forEach(row => {
          if (row.Long && row.Long.includes('/')) {
            const [year, month, dayTime] = row.Long.split('/');
            if (!dayTime) return;
            
            const day = dayTime.split(' ')[0];
            const dayOfYear = `${month}/${day}`;
            const rain = parseFloat(row.Lat) || 0;

            if (!yearlyData[dayOfYear]) {
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
            }
            
            if (['2022', '2023', '2024', '2025'].includes(year)) {
              yearlyData[dayOfYear][year] = rain;
              runningTotals[year] += rain;
              yearlyData[dayOfYear][`cumul${year}`] = runningTotals[year];
              finalTotals[year] = Math.round(runningTotals[year] * 10) / 10;
            }
          }
        });

        const chartData = Object.values(yearlyData).sort((a, b) => {
          const [aMonth, aDay] = a.date.split('/');
          const [bMonth, bDay] = b.date.split('/');
          return (parseInt(aMonth) * 31 + parseInt(aDay)) - (parseInt(bMonth) * 31 + parseInt(bDay));
        });

        setData(chartData);
        setYearlyTotals(finalTotals);
      } catch (error) {
        console.error('Erreur lors de la lecture du fichier:', error);
      }
    };

    fetchData();
  }, []);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const years = ['2022', '2023', '2024', '2025'];
      const dailyValues = years.map(year => ({
        year,
        value: payload.find(p => p.dataKey === year)?.value ?? 0,
        color: getYearColor(year)
      }));
      
      const cumulValues = years.map(year => ({
        year,
        value: payload.find(p => p.dataKey === `cumul${year}`)?.value ?? 0,
        color: getYearColor(year)
      }));
      
      return (
        <div className="bg-gray-800 p-3 border border-gray-700 rounded shadow text-gray-200">
          <p className="font-bold mb-2">{label}</p>
          <div className="mb-2">
            <p className="font-semibold mb-1">Pluie du jour :</p>
            {dailyValues.map(({year, value, color}) => (
              <p key={year} style={{color}}>
                {year}: {value.toFixed(1)} mm
              </p>
            ))}
          </div>
          <div>
            <p className="font-semibold mb-1">Cumul depuis le 01/01 :</p>
            {cumulValues.map(({year, value, color}) => (
              <p key={year} style={{color}}>
                {year}: {value.toFixed(1)} mm
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const getYearColor = (year) => {
    const colors = {
      '2022': '#60A5FA',
      '2023': '#34D399',
      '2024': '#FBBF24',
      '2025': '#F87171'
    };
    return colors[year];
  };

// À remplacer dans ton fichier comparaisons.js

// Remplace juste la partie "return" à la fin du composant:

return (
  <div className="graph-container" style={{ 
    width: '100%', 
    height: '500px', 
    maxHeight: '500px',
    padding: '16px', 
    backgroundColor: '#1f2937', 
    borderRadius: '8px', 
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)', 
    color: '#e5e7eb',
    marginBottom: '20px',
    overflow: 'hidden'
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
    
    <div style={{ width: '100%', height: '350px', maxHeight: '350px', overflow: 'hidden' }}>
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
          {/* Lignes de cumul pour le tooltip */}
          <Line 
            type="monotone" 
            dataKey="cumul2022" 
            stroke={getYearColor('2022')}
            hide={true}
          />
          <Line 
            type="monotone" 
            dataKey="cumul2023" 
            stroke={getYearColor('2023')}
            hide={true}
          />
          <Line 
            type="monotone" 
            dataKey="cumul2024" 
            stroke={getYearColor('2024')}
            hide={true}
          />
          <Line 
            type="monotone" 
            dataKey="cumul2025" 
            stroke={getYearColor('2025')}
            hide={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  </div>
);
}
export default RainComparison;