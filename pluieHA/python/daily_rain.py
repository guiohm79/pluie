"""
Script pour calculer et mettre à jour le cumul journalier de pluie
À placer dans le dossier /config/python_scripts/

Utilise l'historique pour calculer le cumul de la journée en cours
"""
import datetime
import logging

# Configurer le logger
logger = logging.getLogger(__name__)

def calculate_daily_rain(hass, entity_id, cumulative_entity_id):
    try:
        # Entité d'entrée disponible?
        if entity_id not in hass.states.entity_ids():
            logger.error(f"L'entité {entity_id} n'existe pas")
            return False
            
        # Récupérer minuit aujourd'hui
        now = datetime.datetime.now()
        today_start = datetime.datetime.combine(now.date(), datetime.time.min)
        
        # Appeler l'API historique de Home Assistant
        history = hass.services.call('history', 'history_during_period', {
            'entity_id': entity_id,
            'start_time': today_start.isoformat(),
            'end_time': now.isoformat(),
            'include_start_time_state': True,
            'significant_changes_only': False
        }, True)
        
        if not history or not isinstance(history, list) or not history[0]:
            logger.warning(f"Pas d'historique trouvé pour {entity_id}")
            return False
            
        # Filtrer pour ne garder que les valeurs numériques
        valid_points = []
        
        for point in history[0]:
            try:
                state = float(point['state'])
                if not isnan(state) and state >= 0:
                    valid_points.append({
                        'state': state,
                        'timestamp': datetime.datetime.fromisoformat(point['last_changed'])
                    })
            except (ValueError, TypeError):
                # Ignorer les valeurs non numériques
                pass
        
        if not valid_points:
            logger.warning(f"Pas de points de données valides pour {entity_id}")
            return False
            
        # Trier par timestamp
        valid_points.sort(key=lambda x: x['timestamp'])
        
        # Différentes méthodes selon le type de capteur
        
        # Méthode 1: Si le capteur fournit déjà le taux de précipitation
        # (comme la plupart des stations météo), on fait juste la somme
        daily_rain = sum(point['state'] for point in valid_points)
        
        # Méthode 2: Si le capteur donne un cumul croissant, on prend
        # la différence entre la première et dernière valeur
        if len(valid_points) > 1:
            first_value = valid_points[0]['state']
            last_value = valid_points[-1]['state']
            
            # Si le dernier point est beaucoup plus grand que le premier,
            # c'est probablement un capteur cumulatif
            if last_value > first_value * 3 and last_value - first_value > 5:
                daily_rain = last_value - first_value
        
        # Arrondir à une décimale
        daily_rain = round(daily_rain, 1)
        
        # Mettre à jour l'entité cumulative
        hass.states.set(cumulative_entity_id, daily_rain, {
            'unit_of_measurement': 'mm',
            'friendly_name': 'Cumul pluie du jour',
            'icon': 'mdi:weather-rainy',
            'device_class': 'precipitation',
            'state_class': 'total_increasing',
            'last_reset': today_start.isoformat()
        })
        
        logger.info(f"Cumul journalier calculé: {daily_rain}mm")
        return True
        
    except Exception as e:
        logger.error(f"Erreur lors du calcul du cumul journalier: {str(e)}")
        return False

# Récupérer les arguments
entity_id = data.get('entity_id', 'sensor.pluviometre_gui')
cumulative_entity_id = data.get('cumulative_entity_id', 'sensor.cumul_pluie_journalier')

# Exécuter le calcul
calculate_daily_rain(hass, entity_id, cumulative_entity_id)