/**
 * Version simplifiée et adaptée du composant RainComparison pour Home Assistant
 * Basée sur le code existant dans comparaisons.js
 */
class RainComparisonHA extends React.Component {
    constructor(props) {
      super(props);
      
      this.state = {
        data: props.data || [],
        yearlyTotals: props.yearlyTotals || {},
        availableYears: props.availableYears || [],
        displayMode: props.displayMode || 'daily',
        isLoading: false,
        error: null,
        zoomDomain: { start: 0, end: 365 }
      };
      
      // Couleurs pour les années
      this.yearColors = {
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
      
      // Binding des méthodes
      this.toggleDisplayMode = this.toggleDisplayMode.bind(this);
      this.getMonthName = this.getMonthName.bind(this);
      this.getMonthShortName = this.getMonthShortName.bind(this);
      this.getYearColor = this.getYearColor.bind(this);
      this.resetZoom = this.resetZoom.bind(this);
    }
    
    componentDidUpdate(prevProps) {
      // Mettre à jour les données si les props changent
      if (prevProps.data !== this.props.data || 
          prevProps.yearlyTotals !== this.props.yearlyTotals ||
          prevProps.availableYears !== this.props.availableYears) {
        this.setState({
          data: this.props.data,
          yearlyTotals: this.props.yearlyTotals,
          availableYears: this.props.availableYears
        });
      }
      
      // Mettre à jour le mode d'affichage si les props changent
      if (prevProps.displayMode !== this.props.displayMode) {
        this.setState({ displayMode: this.props.displayMode });
      }
    }
    
    // Basculer entre les modes d'affichage
    toggleDisplayMode() {
      const newMode = this.state.displayMode === 'daily' ? 'cumulative' : 'daily';
      this.setState({ displayMode: newMode });
      
      // Informer le parent du changement si une fonction de callback est fournie
      if (this.props.onDisplayModeChange) {
        this.props.onDisplayModeChange(newMode);
      }
    }
    
    // Obtenir la couleur pour une année donnée
    getYearColor(year) {
      return this.yearColors[year] || '#9CA3AF'; // Gris par défaut
    }
    
    // Obtenir le nom du mois
    getMonthName(monthNumber) {
      const monthNames = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                         "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
      return monthNames[parseInt(monthNumber) - 1];
    }
    
    // Obtenir le nom court du mois
    getMonthShortName(monthNumber) {
      const monthShortNames = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", 
                             "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];
      return monthShortNames[parseInt(monthNumber) - 1];
    }
    
    // Réinitialiser le zoom
    resetZoom() {
      this.setState({ zoomDomain: { start: 0, end: 365 } });
    }
    
    // Vérifier si on a zoomé
    isZoomed() {
      const { zoomDomain } = this.state;
      return zoomDomain.start > 0 || zoomDomain.end < 365;
    }
    
    // Tooltip personnalisé
    renderCustomTooltip = ({ active, payload, label }) => {
      if (active && payload && payload.length) {
        // Vérifier si label est défini ou valide
        if (!label || label === "NaN" || label === "undefined" || label.includes("undefined")) return null;
        
        // Format de la date (similaire à ton code original)
        const match = /(\d{2})\/(\d{2})/.exec(label);
        if (!match) return <div>{label}</div>;
        
        const month = match[1];
        const day = match[2];
        const monthName = this.getMonthName(month);
        const completeDate = `${parseInt(day, 10)} ${monthName}`;
        
        const { displayMode } = this.state;
        
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
                  // Trouver le cumul correspondant
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
                        ? this.getYearColor(p.dataKey.replace('cumul', '')) 
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
                      
                      {/* Cumul s'il est disponible */}
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
              
              {/* Message si pas de précipitations */}
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
    
    render() {
      const { data, yearlyTotals, availableYears, displayMode, isLoading, error, zoomDomain } = this.state;
      
      // Vérifier qu'on a les objets Recharts nécessaires
      if (!Recharts) {
        return (
          <div style={{ padding: '20px', textAlign: 'center' }}>
            Erreur: Bibliothèque Recharts non chargée
          </div>
        );
      }
      
      // Déstructurer les composants Recharts
      const { 
        LineChart, Line, XAxis, YAxis, CartesianGrid, 
        Tooltip, ResponsiveContainer, ReferenceArea 
      } = Recharts;
      
      // Hauteur et largeur (options ou par défaut)
      const height = this.props.height || 500;
      const width = this.props.width || "100%";
      
      return (
        <div style={{ 
          width: '100%', 
          padding: '16px', 
          backgroundColor: '#1f2937', 
          borderRadius: '8px',
          color: '#e5e7eb'
        }}>
          {/* Titre (optionnel) */}
          {this.props.title && (
            <h2 style={{ 
              fontSize: '1.5rem', 
              fontWeight: 'bold', 
              marginBottom: '16px', 
              textAlign: 'center' 
            }}>{this.props.title}</h2>
          )}
          
          {/* Bouton pour changer de mode */}
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <button
              onClick={this.toggleDisplayMode}
              style={{
                backgroundColor: '#4B5563',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              {displayMode === 'daily' ? 'Afficher les cumuls' : 'Afficher par jour'}
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
              <span key={year} style={{ color: this.getYearColor(year) }}>
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
            <div style={{ 
              width: '100%', 
              height: `${height}px`,
              position: 'relative'
            }}>
              {/* Bouton réinitialiser zoom */}
              {displayMode === 'daily' && this.isZoomed() && (
                <button
                  onClick={this.resetZoom}
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
              
              <ResponsiveContainer width={width} height={height}>
                <LineChart
                  data={displayMode === 'daily' ? data.slice(zoomDomain.start, zoomDomain.end + 1) : data}
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
                        
                        const [month, day] = parts;
                        const label = `${parseInt(day, 10)} ${this.getMonthShortName(month)}`;
                        
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
                  <Tooltip content={this.renderCustomTooltip} />
                  
                  {/* Lignes pour chaque année */}
                  {availableYears.map(year => (
                    <Line 
                      key={year}
                      type={displayMode === 'cumulative' ? "monotone" : "linear"}
                      dataKey={displayMode === 'cumulative' ? `cumul${year}` : year} 
                      stroke={this.getYearColor(year)}
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
    }
  }
  
  // Si on est dans un environnement où window est défini, exporter le composant
  if (typeof window !== 'undefined') {
    window.RainComparisonHA = RainComparisonHA;
  }