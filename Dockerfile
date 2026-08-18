# syntax=docker/dockerfile:1

# Pinned to the same version as .node-version, so the container and local
# development don't drift. Digest pins the exact image content -- the tag
# alone isn't immutable, same reasoning as pinning GitHub Actions to a SHA.
FROM node:26.7.0-slim@sha256:4ebb5ace66f15a24c14c492e01a8beeed4fddf970a856109f5126e703e5fe503 AS base
WORKDIR /app
# Husky only makes sense in a working copy with git hooks; skip it so `npm ci`
# doesn't fail on its prepare script.
ENV HUSKY=0

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json prisma.config.ts ./
COPY prisma ./prisma
# Explicit, because npm ci does not generate the client -- and the runtime
# stage installs without devDependencies, so the prisma CLI isn't there to do
# it later. Needs no DATABASE_URL: prisma.config.ts falls back to an empty
# string, and generating reads the schema rather than a database.
RUN npx prisma generate
COPY src ./src
RUN npm run build

FROM base AS runtime
ENV NODE_ENV=production
COPY package.json package-lock.json ./
# --ignore-scripts because the prepare script runs husky, which isn't installed
# here without devDependencies. Nothing else needs a lifecycle script: the
# generated Prisma client is copied in below rather than built here.
#
# Prisma 7's @prisma/client declares its CLI, TypeScript and Prisma Studio as
# runtime dependencies, so --omit=dev keeps all of them -- roughly 200 MB of
# build tooling and a React GUI that never serves a request. Removed here,
# after the client itself is installed. The CI smoke test builds this image
# and queries through it, so if a future Prisma release genuinely needs one of
# these at runtime, that fails rather than reaching production.
RUN npm ci --omit=dev --ignore-scripts \
  && rm -rf \
    node_modules/prisma \
    node_modules/typescript \
    node_modules/@types \
    node_modules/@prisma/studio-core \
    node_modules/@prisma/dev \
    node_modules/@electric-sql \
    node_modules/effect \
    node_modules/elkjs \
    node_modules/react \
    node_modules/react-dom \
  && npm cache clean --force
# @prisma/client is a runtime dependency, but it's only a shim that re-exports
# from .prisma/client -- which is generated, not installed. Without this the
# image starts and then fails on the first query.
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/dist ./dist

USER node
EXPOSE 3000

# Node 24 has fetch built in, so this needs no curl in the image.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT??3000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/api/index.js"]
