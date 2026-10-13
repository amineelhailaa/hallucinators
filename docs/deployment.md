# GitHub Pages deployment

## First release

1. Create a GitHub repository named `hallucinators`, choosing visibility appropriate to your account and Pages plan.
2. Add its remote to the local repository and push `main`:
   ```sh
   git remote add origin <your-repository-git-url>
   git push -u origin main
   ```
3. In **Settings → Pages → Build and deployment**, select **GitHub Actions**.
4. In **Actions**, run **Deploy Hallucinators to GitHub Pages**, or push another commit to main.
5. Open the URL in the deployment job/environment. The default project URL is `https://<owner>.github.io/hallucinators/`.

The workflow runs unit tests, validates all 108 lessons, builds, checks the compressed entry budget and runs Chromium/Firefox/WebKit tests. Only a passing build artifact reaches deployment. A failed run leaves the previous deployed site intact. Pull requests run validation without deployment permissions.

## User site or custom domain

Set repository Actions variable `VITE_BASE_PATH` to `/` for `<owner>.github.io` or a root custom domain. Default is `/hallucinators/`. For another repository name, set it to `/<repository>/`. Browser tests inherit the same path. Add a `public/CNAME` file only when configuring an actual custom domain, and configure DNS and the Pages domain accordingly.

Hash links such as `/#/ar/course/flatten` need no rewrite rule. Font, worker, recorded-run and content paths derive from Vite's base URL. A blank page usually means the base path does not match the published location; inspect failed asset requests and redeploy with the correct variable.

## Rollback

Revert the bad source commit and push main, or dispatch the deployment workflow against the previously passing commit/ref through the Actions interface. The selected commit is checked and rebuilt before deployment. Preserve recorded artifacts when comparing releases.

## Local reproduction

```sh
npm ci
npm run test
npm run build
npm run check:bundle
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
```

For a root-hosting smoke test:

```sh
VITE_BASE_PATH=/ npm run build
ROOT_BUILD=1 npx playwright test --project chromium e2e/root.spec.ts
```

Rebuild normally afterwards to restore `/hallucinators/`. No personal tokens are stored in the application. Deployment uses GitHub's scoped workflow identity.

On Linux hosts where native Playwright browser libraries are unavailable, use the matching isolated test image (currently Playwright 1.64.0):

```sh
docker run --rm --ipc=host \
  -v "$PWD":/app -w /app \
  mcr.microsoft.com/playwright:v1.64.0-noble \
  npx playwright test
```

CI installs the browser libraries on Ubuntu automatically. When upgrading Playwright, update the Docker image to the same version.
