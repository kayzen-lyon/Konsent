# Worker d'analyse Konsent — conteneur éphémère, un par scan (§5.2).
# Aucun état n'est partagé entre deux analyses.
FROM mcr.microsoft.com/playwright:v1.49.1-jammy

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

COPY src ./src

# Utilisateur non privilégié fourni par l'image de base.
USER pwuser

EXPOSE 8080

# Par défaut, le worker sert l'application : c'est ce mode qui ferme le
# jalon P0. Le mode ligne de commande reste accessible en surchargeant la
# commande :
#   docker run --rm konsent-worker node --experimental-strip-types src/index.ts https://exemple.fr
CMD ["node", "--experimental-strip-types", "src/server.ts"]
