# GitHub Repository Setup Guide

This guide helps you configure your GitHub repository for automated Docker builds and releases.

## Required GitHub Secrets

To enable automated Docker builds and pushes, you need to configure the following secrets in your GitHub repository:

### 1. Docker Hub Secrets (Optional)

If you want to push to Docker Hub:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Add the following secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | `your-username` |
| `DOCKERHUB_TOKEN` | Docker Hub access token | `dckr_pat_...` |

**To create a Docker Hub access token:**
1. Log in to [Docker Hub](https://hub.docker.com/)
2. Go to **Account Settings** → **Security**
3. Click **New Access Token**
4. Give it a name (e.g., "GitHub Actions")
5. Copy the generated token

### 2. GitHub Container Registry

GitHub Container Registry (ghcr.io) uses the built-in `GITHUB_TOKEN` automatically. No additional setup required.

## Repository Settings

### 1. Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select **Allow all actions and reusable workflows**
3. Under "Workflow permissions", select **Read and write permissions**
4. Check **Allow GitHub Actions to create and approve pull requests**

### 2. Enable GitHub Packages

1. Go to **Settings** → **Actions** → **General**
2. Scroll down to "Workflow permissions"
3. Ensure **Read and write permissions** is selected

### 3. Configure Branch Protection (Optional)

For production repositories, consider setting up branch protection:

1. Go to **Settings** → **Branches**
2. Click **Add rule**
3. Branch name pattern: `main` (or `master`)
4. Enable:
   - **Require a pull request before merging**
   - **Require status checks to pass before merging**
   - **Require branches to be up to date before merging**

## Workflow Triggers

The automated workflows trigger on:

### Docker Build Workflow
- Push to `main`, `master`, or `develop` branches
- Changes to specific files:
  - `VERSION`
  - `Dockerfile`
  - `package*.json`
  - Source code files
- Pull requests to `main` or `master`
- Manual trigger via GitHub Actions UI

### Release Workflow
- Push to `main` or `master` with changes to `VERSION` file
- Manual trigger with version input

## Version Management

### Automatic Versioning

1. **Update the VERSION file:**
   ```bash
   echo "1.0.1" > VERSION
   ```

2. **Commit and push:**
   ```bash
   git add VERSION
   git commit -m "chore: bump version to 1.0.1"
   git push origin main
   ```

3. **Automated actions:**
   - Docker images built for multiple architectures
   - Images pushed to registries
   - GitHub release created
   - Changelog generated

### Manual Release

You can also trigger a release manually:

1. Go to **Actions** tab in your repository
2. Select **Release and Tag** workflow
3. Click **Run workflow**
4. Enter the version number (optional)
5. Click **Run workflow**

## Docker Image Locations

After successful builds, your images will be available at:

### GitHub Container Registry
```bash
# Latest
docker pull ghcr.io/your-username/your-repo:latest

# Specific version
docker pull ghcr.io/your-username/your-repo:1.0.0
```

### Docker Hub (if configured)
```bash
# Latest
docker pull your-username/backup-service:latest

# Specific version
docker pull your-username/backup-service:1.0.0
```

## Supported Architectures

The automated builds create images for:
- `linux/amd64` (Intel/AMD 64-bit)
- `linux/arm64` (ARM 64-bit, Apple M1/M2, AWS Graviton)
- `linux/arm/v7` (ARM 32-bit, Raspberry Pi)

## Troubleshooting

### Build Failures

1. **Check the Actions tab** for detailed error logs
2. **Common issues:**
   - Missing secrets (Docker Hub credentials)
   - Dockerfile syntax errors
   - Test failures
   - Network timeouts

### Permission Issues

1. **Ensure workflow permissions** are set to "Read and write"
2. **Check if GITHUB_TOKEN** has package write permissions
3. **Verify branch protection rules** don't block the workflow

### Docker Hub Issues

1. **Verify Docker Hub credentials** in repository secrets
2. **Check Docker Hub rate limits**
3. **Ensure repository exists** on Docker Hub (or enable auto-creation)

## Security Considerations

### Secrets Management
- Never commit secrets to the repository
- Use GitHub Secrets for sensitive information
- Regularly rotate access tokens
- Use least-privilege access tokens

### Image Security
- Images are automatically scanned with Trivy
- Security reports appear in the Security tab
- Consider using signed images for production

### Dependency Management
- Dependabot is configured for automatic updates
- Review and test dependency updates
- Pin specific versions for production builds

## Monitoring and Maintenance

### GitHub Actions Usage
- Monitor your GitHub Actions usage in repository insights
- Free tier includes 2,000 minutes per month
- Consider optimizing workflows for efficiency

### Image Storage
- GitHub Packages has storage limits
- Clean up old images periodically
- Consider retention policies for development images

### Release Management
- Tag important releases for easy reference
- Maintain a changelog for user communication
- Use semantic versioning consistently

## Next Steps

1. **Configure secrets** in your repository settings
2. **Test the workflow** by updating the VERSION file
3. **Verify images** are pushed to registries
4. **Set up monitoring** for failed builds
5. **Document deployment** procedures for your team

---

For more information, see:
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
