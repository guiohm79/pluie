#!/usr/bin/env python3
"""
Script pour récupérer la dernière valeur de pluie du fichier CSV
"""
import csv
import os
import sys
import datetime

# Chemin vers le fichier CSV
CSV_PATH = "/config/www/pluviomètre gui_15_03_2025.csv"

def get_latest_rain():
    try:
        if not os.path.exists(CSV_PATH):
            print("0")
            sys.exit(0)
            
        # Lire le fichier CSV
        with open(CSV_PATH, 'r', encoding='utf-8') as csvfile:
            # On cherche d'abord l'en-tête
            first_lines = []
            for i in range(10):  # Lire les 10 premières lignes
                try:
                    line = next(csvfile)
                    first_lines.append(line)
                except StopIteration:
                    break
                    
            # Chercher l'index de la colonne sum_rain
            rain_index = None
            for line in first_lines:
                if "sum_rain" in line:
                    parts = line.split(';')
                    for i, part in enumerate(parts):
                        if "sum_rain" in part:
                            rain_index = i
                            break
                    break
            
            # Si on n'a pas trouvé l'index, on suppose que c'est 2
            if rain_index is None:
                rain_index = 2
                
            # Revenir au début du fichier
            csvfile.seek(0)
            
            # Créer un lecteur CSV
            reader = csv.reader(csvfile, delimiter=';')
            
            # Ignorer les lignes d'en-tête
            data_found = False
            for _ in range(5):  # Skip up to 5 header lines
                try:
                    next(reader)
                except StopIteration:
                    break
                    
            # Lire toutes les lignes pour trouver la dernière valeur
            last_value = 0
            for row in reader:
                if len(row) <= rain_index:
                    continue
                    
                try:
                    value = float(row[rain_index].replace(',', '.'))
                    if value >= 0:  # Ignorer les valeurs négatives
                        last_value = value
                except (ValueError, IndexError):
                    continue
            
            # Retourner la dernière valeur trouvée
            print(last_value)
            
    except Exception as e:
        # En cas d'erreur, retourner 0
        print(f"0")
        sys.exit(1)

if __name__ == "__main__":
    get_latest_rain()