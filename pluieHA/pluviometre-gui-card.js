class RainGaugeCard extends HTMLElement {
    // Définition des propriétés
    static get properties() {
      return {
        hass: Object,
        config: Object,
      };
    }
  
    // CSS pour la carte
    static getStubConfig() {
      return {
        entity: "sensor.pluviometre_gui",
        title: "Pluviomètre",
        chart_type: "daily", // daily ou cumulative
        days_to_show: 30,
      };
    }
  
    // Constructeur
    constructor() {
      super();
      this.attachShadow({ mode: "open" });
      
      // Créer la structure de base
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="card-header"></div>
          <div class="card-content">
            <div class="chart-container"></div>
          </div>
          <div class="card-actions">
            <mwc-button id="switchViewButton">Changer de vue</mwc-button>
          </div>
        </ha-card>
        <style>
          ha-card {
            padding: 16px;
          }
          .chart-container {
            width: 100%;
            height: 400px;
          }
          .card-header {
            font-size: 1.5rem;
            font-weight: 500;
            padding-bottom: 12px;
          }
          .card-actions {
            display: flex;
            justify-content: center;
            padding-top: 12px;
          }
        </style>
      `;
  
      // État interne
      this._chartType = "daily";
      this._rainData = {};
      this._availableYears = [];
  
      // Référence à la bibliothèque recharts (qu'on devra charger)
      this._chart = null;
    }
  
    // Setter pour l'objet hass (appelé par Home Assistant)
    set hass(hass) {
      this._hass = hass;
      this._updateRainData();
      this._updateContent();
    }
  
    // Setter pour la configuration (appelé par Home Assistant)
    setConfig(config) {
      if (!config.entity) {
        throw new Error("Vous devez définir une entité");
      }
    
      this._config = config;
      this._configureCard();
    }
    // Configuration initiale de la carte
    _configureCard() {
      // Définir le titre
      const headerElem = this.shadowRoot.querySelector(".card-header");
      headerElem.textContent = this._config.title || "Pluviomètre";
  
      // Configurer le bouton de changement de vue
      const switchButton = this.shadowRoot.querySelector("#switchViewButton");
      switchButton.addEventListener("click", () => this._toggleChartType());
  
      // Charger les dépendances externes (Recharts, React, etc.)
      this._loadExternalDependencies();
    }
  
    // Mise à jour des données de pluie
    _updateRainData() {
      if (!this._hass || !this._config) return;
  
      const entityId = this._config.entity;
      const entity = this._hass.states[entityId];
  
      if (!entity) {
        console.error(`Entité ${entityId} non trouvée`);
        return;
      }
  
      // Récupérer l'historique de cette entité via l'API Home Assistant
      this._fetchHistoryData(entityId);
    }
  
    // Récupération des données d'historique
    async _fetchHistoryData(entityId) {
      // Calcul de la période
      const endTime = new Date();
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - (this._config.days_to_show || 30));
  
      // Appel à l'API History de Home Assistant
      try {
        // REMARQUE: Cette partie doit utiliser l'API Hass appropriée
        // L'approche exacte dépend de la façon dont Home Assistant expose l'API
        // Ceci est un exemple conceptuel
        const historyData = await this._hass.callWS({
          type: "history/history_during_period",
          entity_ids: [entityId],
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
        });
  
        this._processHistoryData(historyData);
      } catch (error) {
        console.error("Erreur lors de la récupération de l'historique", error);
      }
    }
  
    // Traitement des données d'historique
    _processHistoryData(historyData) {
      // Traitement similaire à ton code dans comparaisons.js
      // ...
      
      // Créer un format de données compatible avec celui attendu par ton composant React
      const processedData = [];
      const yearlyTotals = {};
      const yearsFound = new Set();
  
      // Adapter ici le traitement en fonction de la structure renvoyée par l'API History
      
      this._rainData = processedData;
      this._yearlyTotals = yearlyTotals;
      this._availableYears = Array.from(yearsFound).sort();
      
      // Mettre à jour le graphique
      this._renderChart();
    }
  
    // Affichage du graphique
    _renderChart() {
      const chartContainer = this.shadowRoot.querySelector(".chart-container");
      
      // Si tu utilises Recharts, tu devras adapter cette partie pour l'intégrer dans le DOM
      // Utiliser soit un mini système de rendu React, soit convertir ton code en vanilla JS
      
      // Exemple conceptuel (pseudo-code)
      if (window.RechartsComponent) {
        const chartProps = {
          data: this._rainData,
          yearlyTotals: this._yearlyTotals,
          availableYears: this._availableYears,
          displayMode: this._chartType,
          height: 400,
          width: chartContainer.clientWidth,
        };
        
        // Rendu du graphique dans le container
        window.RechartsComponent.renderChart(chartContainer, chartProps);
      }
    }
  
    // Mise à jour du contenu
    _updateContent() {
      // Ici, tu peux mettre à jour d'autres éléments de la carte en fonction de l'état actuel
      const switchButton = this.shadowRoot.querySelector("#switchViewButton");
      switchButton.textContent = this._chartType === "daily" ? 
        "Afficher les cumuls" : "Afficher par jour";
    }
  
    // Basculer entre les modes d'affichage
    _toggleChartType() {
      this._chartType = this._chartType === "daily" ? "cumulative" : "daily";
      this._updateContent();
      this._renderChart();
    }
  
    // Chargement des dépendances externes
    _loadExternalDependencies() {
      // Charger React si pas déjà chargé
      if (!window.React) {
        this._loadScript("https://unpkg.com/react@17/umd/react.production.min.js");
        this._loadScript("https://unpkg.com/react-dom@17/umd/react-dom.production.min.js");
      }
      
      // Charger Recharts si pas déjà chargé
      if (!window.Recharts) {
        this._loadScript("https://unpkg.com/recharts@2.1.9/umd/Recharts.min.js", () => {
          // Une fois Recharts chargé, on peut initialiser notre moteur de rendu personnalisé
          this._initRechartsRenderer();
        });
      } else {
        this._initRechartsRenderer();
      }
    }
  
    // Initialiser le moteur de rendu Recharts
    _initRechartsRenderer() {
      // Ce serait une fonction qui utilise React et Recharts pour créer un composant de graphique
      // et l'injecter dans notre shadow DOM
      
      // Exemple conceptuel (pseudo-code)
      window.RechartsComponent = {
        renderChart: (container, props) => {
          // Utiliser ReactDOM pour rendre un composant similaire à ton RainComparison
          // dans le container fourni
        }
      };
      
      // Rendre le graphique initial
      this._renderChart();
    }
  
    // Charger un script externe
    _loadScript(src, callback) {
      const script = document.createElement("script");
      script.src = src;
      script.onload = callback;
      document.head.appendChild(script);
    }
  }
  
  // Définir l'élément personnalisé
  customElements.define("pluviometre-gui-card", RainGaugeCard);
  
  // Informations sur la carte pour HACS
  window.customCards = window.customCards || [];
  window.customCards.push({
    type: "pluviometre-gui-card",
    name: "Carte Pluviomètre GUI",
    description: "Visualisation de données de pluviomètre avec comparaison par année",
  });