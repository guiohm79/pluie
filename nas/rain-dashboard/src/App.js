import React from 'react';
import './App.css';
import RainDashboard from './components/RainDashboard';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Tableau de bord des précipitations</h1>
      </header>
      <main>
        <RainDashboard csvPath="./data/rainfall.csv" />
      </main>
      <footer>
        <p>© {new Date().getFullYear()} - Visualisation des précipitations</p>
      </footer>
    </div>
  );
}

export default App;