# Multi-stage Docker build for Meno NFT Off-ramp Platform
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install dependencies based on the preferred package manager
COPY package.json package-lock.json* ./
RUN \
  if [ -f package-lock.json ]; then npm ci --only=production; \
  else echo "Lockfile not found." && exit 1; \
  fi

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set build-time environment variables
ARG NEXT_PUBLIC_DEPLOYMENT_ENV=production
ARG NEXT_PUBLIC_PROJECT_ID
ARG NEXT_PUBLIC_MORPH_MAINNET_RPC
ARG NEXT_PUBLIC_MORPH_TESTNET_RPC

ENV NEXT_PUBLIC_DEPLOYMENT_ENV=$NEXT_PUBLIC_DEPLOYMENT_ENV
ENV NEXT_PUBLIC_PROJECT_ID=$NEXT_PUBLIC_PROJECT_ID
ENV NEXT_PUBLIC_MORPH_MAINNET_RPC=$NEXT_PUBLIC_MORPH_MAINNET_RPC
ENV NEXT_PUBLIC_MORPH_TESTNET_RPC=$NEXT_PUBLIC_MORPH_TESTNET_RPC

# Build the application
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]