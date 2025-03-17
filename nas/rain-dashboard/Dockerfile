# Dockerfile pour l'application de visualisation des précipitations
FROM node:18-alpine as build

# Répertoire de travail dans le conteneur
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le reste des fichiers du projet
COPY . .

# Créer un build de production
RUN npm run build

# Étape 2: configuration du serveur nginx
FROM nginx:alpine

# Installer OpenSSL pour générer les certificats
RUN apk add --no-cache openssl

# Créer un répertoire pour les certificats SSL
RUN mkdir -p /etc/nginx/ssl

# Générer des certificats SSL auto-signés
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/server.key -out /etc/nginx/ssl/server.crt \
    -subj "/C=FR/ST=State/L=City/O=Organization/CN=localhost"

# Copier le build depuis l'étape précédente
COPY --from=build /app/build /usr/share/nginx/html

# Exposer les ports HTTP et HTTPS
EXPOSE 80 443

# Copier la configuration nginx personnalisée
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Commande pour démarrer nginx
CMD ["nginx", "-g", "daemon off;"]
