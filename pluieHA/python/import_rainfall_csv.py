"""
Script pour importer un fichier CSV de pluviomètre dans Home Assistant
À placer dans le dossier /config/python_scripts/

Le fichier CSV doit avoir le format:
Timestamp;"Timezone : Europe/Madrid";sum_rain
1661335200;"2022/08/24 12:00:00";0.2
...etc...
"""
import csv
import datetime
import os
import logging

# Configurer le logger
logger = logging.getLogger(__name__)

def parse_csv(file_path, entity_id):
    try:
        # Vérifier si le fichier existe
        if not os.path.exists(file_path):
            logger.error(f"Le fichier {file_path} n'existe pas!")
            return
        
        # Récupérer le service d'état de Home Assistant
        hass = hass  # variable 'hass' disponible dans les python_scripts
        
        # Ouvrir et lire le fichier CSV avec le bon délimiteur (point-virgule)
        with open(file_path, 'r', encoding='utf-8') as csvfile:
            # Détecter les lignes d'en-tête
            header_detected = False
            rain_index = None
            date_index = None
            
            # Créer un lecteur CSV avec délimiteur ;
            csv_reader = csv.reader(csvfile, delimiter=';')
            
            # Structure pour stocker les données
            data_points = []
            
            # Parcourir les lignes
            for i, row in enumerate(csv_reader):
                # Sauter les lignes vides
                if not row:
                    continue
                
                # Chercher les en-têtes
                if not header_detected:
                    for j, cell in enumerate(row):
                        if cell.lower() == 'sum_rain':
                            rain_index = j
                        elif 'timezone' in cell.lower():
                            date_index = j
                        elif 'timestamp' in cell.lower():
                            timestamp_index = j
                    
                    # Si on a trouvé les colonnes nécessaires, on considère qu'on a détecté l'en-tête
                    if rain_index is not None and (date_index is not None or timestamp_index is not None):
                        header_detected = True
                        continue
                
                # Si on a détecté l'en-tête et qu'on a les indices nécessaires
                if header_detected:
                    try:
                        # Récupérer la valeur de pluie
                        rain_value = float(row[rain_index].replace(',', '.'))
                        
                        # Récupérer la date
                        if date_index is not None:
                            # Date sous forme de chaîne (enlever les guillemets)
                            date_str = row[date_index].replace('"', '')
                            # Convertir en objet datetime
                            date_obj = datetime.datetime.strptime(date_str, "%Y/%m/%d %H:%M:%S")
                        elif timestamp_index is not None:
                            # Timestamp Unix
                            timestamp = int(row[timestamp_index])
                            # Convertir en objet datetime
                            date_obj = datetime.datetime.fromtimestamp(timestamp)
                        
                        # Ajouter le point de données
                        data_points.append({
                            'date': date_obj,
                            'value': rain_value
                        })
                    except (ValueError, IndexError) as e:
                        logger.warning(f"Erreur avec la ligne {i+1}: {e}")
                        continue
            
            # Trier les données par date
            data_points.sort(key=lambda x: x['date'])
            
            # Si on a des données, créer l'historique
            if data_points:
                # Créer l'historique pour cette entité
                history_data = []
                
                # Date du jour pour le point actuel
                current_date = datetime.datetime.now()
                
                # Rechercher la valeur la plus récente pour aujourd'hui
                today_value = 0
                today_start = datetime.datetime.combine(current_date.date(), datetime.time.min)
                
                for point in reversed(data_points):
                    if point['date'] >= today_start:
                        today_value = point['value']
                        break
                
                # Mettre à jour l'état de l'entité
                hass.states.set(entity_id, today_value, {
                    'unit_of_measurement': 'mm',
                    'friendly_name': 'Pluviomètre',
                    'device_class': 'precipitation',
                    'state_class': 'measurement',
                    'last_reset': today_start.isoformat(),
                    'historic_data_points': len(data_points)
                })
                
                # Créer un service pour récupérer l'historique
                hass.services.register('rainfall', 'get_history', lambda call: get_history(call, data_points))
                
                logger.info(f"Import réussi de {len(data_points)} points de données pour {entity_id}")
                return True
    
    except Exception as e:
        logger.error(f"Erreur lors de l'import du CSV: {str(e)}")
        return False

def get_history(call, data_points):
    """Service pour récupérer l'historique des précipitations"""
    start_date = call.data.get('start_date')
    end_date = call.data.get('end_date')
    
    # Si pas de dates spécifiées, renvoyer toutes les données
    if not start_date:
        start_date = data_points[0]['date']
    else:
        start_date = datetime.datetime.fromisoformat(start_date)
    
    if not end_date:
        end_date = datetime.datetime.now()
    else:
        end_date = datetime.datetime.fromisoformat(end_date)
    
    # Filtrer les données
    filtered_data = [
        point for point in data_points 
        if start_date <= point['date'] <= end_date
    ]
    
    return filtered_data

# Appeler la fonction avec les arguments du service
file_path = data.get('file_path')
entity_id = data.get('entity_id', 'sensor.pluviometre_gui')

if file_path:
    parse_csv(file_path, entity_id)
else:
    logger.error("Aucun chemin de fichier spécifié!")