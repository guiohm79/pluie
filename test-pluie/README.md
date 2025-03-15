# 🌧️ Visualisation Pluviométrique - Mode d'emploi

Salut toi ! Bienvenue dans ce petit bijou de visualisation de pluie. C'est pas tous les jours qu'on s'amuse avec des gouttes d'eau, mais quand on s'y met, autant avoir un truc qui en jette !
## amelioration et bug
 - [X] le script n'adapte pas le nombre de courbe en fonction du nombre d'année
 - [X] lorsque les données sont affichées par jour, l'etiquette ne montre pas les jours
 - [X] l'etiquette affiche "NaN undifined"
 - [ ] Il faut ajouter lors du survolle du graphique, en meme temps que les données, le cumule depuis le 1er janvier pour chaque année
 - [ ] il faut ajouter un mode sur le graphique qui montre le cumul annuel de pluie depuis le 1er janvier pour chaque année


## 🚀 C'est quoi ce bazar ?

C'est une appli React toute simple qui te permet de visualiser tes données de pluviométrie. L'appli transforme ces données en graphiques colorés qui te montrent quand il a plu.

## 📦 Installation

1. Clone ce dépôt : `git clone [ton-adresse-git]`
2. Va dans le dossier : `cd test-pluie`
3. Installe les dépendances : `npm install`
4. Lance le bazar : `npm start`
5. Et voilà, ton navigateur devrait s'ouvrir tout seul sur `http://localhost:3000`

## 🎮 Comment ça marche ?

1. **Au démarrage** : L'appli va chercher le fichier CSV par défaut dans le dossier `public` (celui qui s'appelle "pluviomètre gui_14_03_2025.csv").

2. **Glisser-déposer** : Si t'as d'autres fichiers de données, tu peux les glisser-déposer dans la zone prévue.

3. **Changer de vue** : T'as un bouton pour basculer entre l'affichage par jour et l'affichage par mois. 

4. **Les couleurs** : Chaque année a sa couleur :
   - 2022 : Bleu 
   - 2023 : Vert
   - 2024 : Jaune
   - 2025 : Rouge
   

## 📊 Format du fichier CSV

Alors, attention, faut pas mettre n'importe quoi comme fichier ! Ton CSV doit ressembler à peu près à ça :

```
Name;Long;Lat;ModuleName;ModuleType
"Module intérieur branche";0.548669;41.1340977;"pluviomètre gui";"Rain gauge"
Timestamp;"Timezone : Europe/Madrid";sum_rain
1661335200;"2022/08/24 12:00:00";0.2
1661421600;"2022/08/25 12:00:00";0.5
...
```

Les points importants :
- Le délimiteur doit être un point-virgule (`;`)
- L'appli cherche la ligne qui commence par "Timestamp" pour savoir où commencent les données
- La structure des données doit être : [timestamp, date au format "YYYY/MM/DD HH:MM:SS", valeur de pluie]

## 🛠️ Personnalisation

Si t'es un peu bricoleur et que tu veux changer des trucs :

- Les couleurs des années sont définies dans la fonction `getYearColor()`
- Tu peux ajuster l'échelle de l'axe Y en modifiant le `domain` du composant `YAxis`
- Si t'as des fichiers CSV avec un format différent, tu peux adapter la fonction `processCSV()`

## 🆘 Ça marche pas ?

T'inquiète, on a tous des coups de mou. Voici quelques astuces :

1. **Le graphique s'affiche pas** : Vérifie la console du navigateur (F12), y'a peut-être des erreurs qui traînent.
2. **Le CSV est pas reconnu** : Assure-toi qu'il utilise bien des point-virgules comme séparateurs et qu'il a une ligne "Timestamp".
3. **Ça rame comme pas possible** : Si t'as des fichiers énormes, ça peut ramer un peu au chargement, sois patient !
4. **L'interface est moche** : Bon bah là, je peux plus rien pour toi... 😜

## 🙏 Un dernier mot

N'hésite pas à améliorer ce truc ! C'est open source, fais-en ce que tu veux. Et si t'as des idées de ouf, lance une PR, on est là pour s'amuser !

