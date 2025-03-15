/**
 * Adaptateur pour intégrer le composant RainComparison de React dans Home Assistant
 */
(function() {
    // Composant React adapté pour Home Assistant
    class RainComparisonAdapter extends React.Component {
      constructor(props) {
        super(props);
        
        this.state = {
          data: props.data || [],
          yearlyTotals: props.yearlyTotals || {},
          availableYears: props.availableYears || [],
          displayMode: props.displayMode || 'daily'
        };
      }
      
      // Couleurs pour les années
      getYearColor(year) {
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
        
        return yearColors[year] || '#9CA3AF';
      }
      
      // Obtenir le nom du mois
      getMonthName(monthNumber) {
        const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                           "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
        return monthNames[parseInt(monthNumber) - 1];
      }
      
      // Tooltip personnalisé
      renderCustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
          if (!label || label === "NaN" || label === "undefined" || label.includes("undefined")) return null;
          
          // Format de la date (similaire à ton code original)
          const match = /(\d{2})\/(\d{2})/.exec(label);
          if (!match) return <div>{label}</div>;
          
          const month = match[1];
          const day = match[2];
          const monthName = this.getMonthName(month);
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
              <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>{completeDate}</p>
              {payload
                .filter(p => {
                  return this.state.displayMode === 'cumulative' 
                    ? (p.value > 0 && p.dataKey.startsWith('cumul'))
                    : (p.value > 0 && !p.dataKey.startsWith('cumul'));
                })
                .map((p) => (
                  <div key={p.dataKey} style={{ 
                    color: this.state.displayMode === 'cumulative' 
                      ? this.getYearColor(p.dataKey.replace('cumul', '')) 
                      : p.color,
                    margin: '4px 0'
                  }}>
                    <span>{this.state.displayMode === 'cumulative' 
                      ? p.dataKey.replace('cumul', '') 
                      : p.dataKey}:</span>
                    <span style={{ fontWeight: 'bold', marginLeft: '8px' }}>{p.value.toFixed(1)} mm</span>
                  </div>
                ))}
            </div>
          );
        }
        return null;
      };
      
      render() {
        const { data, yearlyTotals, availableYears, displayMode } = this.state;
        const { height, width } = this.props;
        
        // Les composants de Recharts
        const { 
          LineChart, Line, XAxis, YAxis, CartesianGrid, 
          Tooltip, Legend, ResponsiveContainer 
        } = Recharts;
        
        return (
          <div style={{ width: '100%', height: '100%' }}>
            {/* Totaux annuels */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: '16px', 
              marginBottom: '12px',
              flexWrap: 'wrap',
              fontSize: '0.9rem'
            }}>
              {Object.entries(yearlyTotals).map(([year, total]) => (
                <span key={year} style={{ color: this.getYearColor(year) }}>
                  {year}: {total}mm
                </span>
              ))}
            </div>
            
            {/* Graphique */}
            <ResponsiveContainer width={width || "100%"} height={height || 400}>
              <LineChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="date"
                  angle={-45}
                  textAnchor="end"
                  height={70}
                  interval={15}
                  stroke="#4B5563"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                />
                <YAxis 
                  domain={[0, 'auto']}
                  label={{ 
                    value: displayMode === 'cumulative' ? 'Cumul (mm)' : 'Pluie (mm)', 
                    angle: -90, 
                    position: 'insideLeft',
                    style: { textAnchor: 'middle', fill: '#9CA3AF', fontSize: 12 }
                  }}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  stroke="#4B5563"
                />
                <Tooltip content={this.renderCustomTooltip} />
                
                {/* Lignes pour chaque année */}
                {availableYears.map(year => (
                  <Line 
                    key={year}
                    type={displayMode === 'cumulative' ? "monotone" : "linear"}
                    dataKey={displayMode === 'cumulative' ? `cumul${year}` : year} 
                    stroke={this.getYearColor(year)}
                    strokeWidth={displayMode === 'cumulative' ? 2 : 1.5}
                    dot={false}
                    connectNulls={displayMode === 'cumulative'}
                    activeDot={{ r: 4 }}
                  />
                ))}
                
                {/* Lignes de cumul cachées pour le tooltip */}
                {displayMode !== 'cumulative' && availableYears.map(year => (
                  <Line 
                    key={`cumul${year}`}
                    dataKey={`cumul${year}`}
                    stroke="transparent"
                    hide={true}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        );
      }
    }
  
    // Fonction pour rendre le composant dans un container DOM
    function renderRainComparison(container, props) {
      if (container && React && ReactDOM && Recharts) {
        ReactDOM.render(
          React.createElement(RainComparisonAdapter, props),
          container
        );
        return true;
      }
      return false;
    }
  
    // Exposer l'API
    window.RechartsComponent = {
      renderChart: renderRainComparison
    };
  })();