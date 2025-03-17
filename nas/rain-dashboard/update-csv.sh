#!/bin/bash
# update-csv.sh
# Script pour copier les données de pluie de Home Assistant vers le volume Docker

# Configuration
SOURCE_FILE="/share/Container/rain-dashboard/data/pluviometre.csv"  # Chemin du fichier source dans Home Assistant
TARGET_DIR="/share/Container/rain-dashboard/data"  # Répertoire de destination sur QNAP
TARGET_FILE="$TARGET_DIR/rainfall.csv"  # Nom du fichier cible (simplifié pour éviter les problèmes d'encodage)
LOG_FILE="/share/Container/rain-dashboard/logs/update-csv.log"  # Fichier de log

# Créer les répertoires nécessaires s'ils n'existent pas
mkdir -p "$TARGET_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Fonction de logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Vérifier que le fichier source existe
if [ ! -f "$SOURCE_FILE" ]; then
    log "ERREUR: Le fichier source $SOURCE_FILE n'existe pas."
    exit 1
fi

# Copier le fichier
log "Début de la copie de $SOURCE_FILE vers $TARGET_FILE"
cp "$SOURCE_FILE" "$TARGET_FILE"

# Vérifier que la copie a réussi
if [ $? -eq 0 ]; then
    log "Copie réussie."
    
    # Créer un fichier timestamp
    echo "Dernière mise à jour: $(date '+%Y-%m-%d %H:%M:%S')" > "$TARGET_DIR/timestamp.txt"
    
    # Définir les permissions appropriées
    chmod 644 "$TARGET_FILE"
    chmod 644 "$TARGET_DIR/timestamp.txt"
    
    log "Processus terminé avec succès."
    exit 0
else
    log "ERREUR: Échec de la copie."
    exit 1
fi
