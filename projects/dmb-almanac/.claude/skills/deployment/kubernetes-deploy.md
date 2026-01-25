# Skill: Kubernetes Deployment

**ID**: `kubernetes-deploy`
**Category**: Deployment
**Agent**: Deployment Orchestrator

---

## When to Use
- Deploying applications to Kubernetes
- Setting up new environments
- Configuring scaling and resources
- Managing secrets and configs

## Required Inputs

| Input | Type | Required | Description |
|-------|------|----------|-------------|
| app_name | string | yes | Application name |
| namespace | string | yes | Target namespace |
| image | string | yes | Container image |
| replicas | number | no | Number of replicas |

## Steps

### 1. Create Deployment Manifest
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ${app_name}
  namespace: ${namespace}
spec:
  replicas: ${replicas:-3}
  selector:
    matchLabels:
      app: ${app_name}
  template:
    metadata:
      labels:
        app: ${app_name}
    spec:
      containers:
      - name: ${app_name}
        image: ${image}
        ports:
        - containerPort: 8080
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
```

### 2. Create Service
```yaml
apiVersion: v1
kind: Service
metadata:
  name: ${app_name}
  namespace: ${namespace}
spec:
  selector:
    app: ${app_name}
  ports:
  - port: 80
    targetPort: 8080
  type: ClusterIP
```

### 3. Apply Manifests
```bash
kubectl apply -f deployment.yaml
kubectl apply -f service.yaml
kubectl rollout status deployment/${app_name} -n ${namespace}
```

## Common Issues
- Image pull errors (check registry auth)
- Resource limits too low
- Probe failures (check endpoints)
- PodSecurityPolicy restrictions
