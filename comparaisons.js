import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

const RainComparison = () => {
  const [data, setData] = useState([]);
  const [yearlyTotals, setYearlyTotals] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await window.fs.readFile('pluviomètre gui_14_03_2025.csv', { encoding: 'utf8' });
        const result = Papa.parse(response, {
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
                '_cumul2022': 0,
                '_cumul2023': 0,
                '_cumul2024': 0,
                '_cumul2025': 0
              };
            }
            
            if (['2022', '2023', '2024', '2025'].includes(year)) {
              yearlyData[dayOfYear][year] = rain;
              runningTotals[year] += rain;
              yearlyData[dayOfYear][`_cumul${year}`] = runningTotals[year];
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
        value: payload.find(p => p.dataKey === `_cumul${year}`)?.value ?? 0,
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

  return (
    <div className="w-full h-[500px] p-4 bg-gray-900 rounded-lg shadow text-gray-200">
      <h2 className="text-2xl font-bold mb-2 text-center">Comparaison des précipitations</h2>
      <div className="flex justify-center gap-6 mb-4 text-lg">
        <span style={{color: getYearColor('2022')}}>2022: {yearlyTotals['2022']}mm</span>
        <span style={{color: getYearColor('2023')}}>2023: {yearlyTotals['2023']}mm</span>
        <span style={{color: getYearColor('2024')}}>2024: {yearlyTotals['2024']}mm</span>
        <span style={{color: getYearColor('2025')}}>2025: {yearlyTotals['2025']}mm</span>
      </div>
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
          {/* Lignes de cumul cachées avec un underscore pour ne pas apparaître dans la légende */}
          <Line 
            type="monotone" 
            dataKey="_cumul2022" 
            stroke={getYearColor('2022')}
            hide={true}
          />
          <Line 
            type="monotone" 
            dataKey="_cumul2023" 
            stroke={getYearColor('2023')}
            hide={true}
          />
          <Line 
            type="monotone" 
            dataKey="_cumul2024" 
            stroke={getYearColor('2024')}
            hide={true}
          />
          <Line 
            type="monotone" 
            dataKey="_cumul2025" 
            stroke={getYearColor('2025')}
            hide={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RainComparison;