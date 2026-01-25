# Skill: Docker Build & Push

**ID**: `docker-build`
**Category**: Deployment
**Agent**: Docker Specialist

---

## When to Use
- Building container images
- Multi-stage builds
- Optimizing image size
- Publishing to registries

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| dockerfile | string | yes | Path to Dockerfile |
| tag | string | yes | Image tag |
| registry | string | no | Container registry |

## Steps

### 1. Create Optimized Dockerfile
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

# Copy only necessary files
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./

USER nextjs
EXPOSE 3000

CMD ["node", "dist/index.js"]
```

### 2. Build Image
```bash
docker build -t ${tag} -f ${dockerfile} .
```

### 3. Test Locally
```bash
docker run --rm -p 3000:3000 ${tag}
curl http://localhost:3000/health
```

### 4. Push to Registry
```bash
docker tag ${tag} ${registry}/${tag}
docker push ${registry}/${tag}
```

## Best Practices
- Use multi-stage builds
- Copy package files before source
- Run as non-root user
- Use specific base image versions
- Add .dockerignore file
