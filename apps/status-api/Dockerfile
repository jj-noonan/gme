FROM node:22-slim

WORKDIR /app

# Workspace-aware install: root manifest + this app's + shared package's.
COPY package.json package-lock.json* ./
COPY apps/status-api/package.json apps/status-api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --workspace=@gme/status-api --include-workspace-root

COPY packages/shared packages/shared
COPY apps/status-api apps/status-api

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm", "run", "start", "--workspace=@gme/status-api"]
