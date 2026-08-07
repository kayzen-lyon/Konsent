# Worker d'analyse Konsent — conteneur éphémère, un par scan (§5.2).
# Aucun état n'est partagé entre deux analyses.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY src ./src

# Utilisateur non privilégié fourni par l'image de base.
USER pwuser

ENTRYPOINT ["node", "--experimental-strip-types", "src/index.ts"]
