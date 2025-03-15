import React from 'react';
import './App.css';
import RainComparison from './comparaisons'; // Assure-toi que ton composant est dans ce fichier

// Tu devras créer un fichier RainComparison.js avec le code que je t'ai donné précédemment

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1></h1>
      </header>
      <main style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <RainComparison />
      </main>
      <footer style={{ padding: '20px', textAlign: 'center', marginTop: '40px' }}>
        © 2025 
      </footer>
    </div>
  );
}

export default App;