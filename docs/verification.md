# Verification evidence

Verified on October 13, 2026.

| Check | Result |
| --- | --- |
| Strict TypeScript compilation and production build | Passed |
| Content validation | 12 chapters, 36 lessons, 108 localized MDX files |
| Numerical, TensorFlow parity, component, translation and formula tests | 22 passed |
| Production browser suite | 39 passed across Chromium, Firefox and WebKit |
| Root-hosted deployment smoke suite | 3 passed across all three browsers |
| Root-hosted recorded model, worker prediction and mobile evaluation table | Passed |
| Accessibility | No serious/critical axe violations in checked pages and labs; contrast checks enabled |
| Keyboard / Arabic axes | Skip link, arrow-key matrix navigation, locale preservation and mobile navigation passed |
| Keras classification and regression scripts | Both executed; frozen weights and save/reload consistency verified |
| Keras notebook | Every cell executed, including both 10-epoch tasks and intermediate layer inspection |
| GitHub Actions YAML | Both workflow files parsed successfully |
| Dependency audit during implementation | Zero reported vulnerabilities |
| Compressed application entry | Approximately 115 KB, below the 250 KB budget |
| Lighthouse desktop home | Performance 100 / accessibility 100 |
| Lighthouse desktop reading | Performance 100 / accessibility 100 |

Browser tests ran against production output in `mcr.microsoft.com/playwright:v1.64.0-noble`, with one test worker. Root tests also requested recorded models and executed frozen inference, exercising asset paths rather than only checking HTML. The production site was tested at the project subpath and at `/`.

The Keras examples and notebook ran in an isolated Python 3.11 environment with TensorFlow CPU 2.21.0, Keras 3.15.1 and NumPy 2.1.3. Only synthetic data and the example source were mounted. No BrainScan dataset was accessed.

Lighthouse reports and screenshots are in the neighboring `performance/` and `screenshots/` directories. The desktop release profile is 1350×940, 40 ms RTT, 10,240 Kbps and CPU slowdown 1. Earlier standard simulated-mobile measurements scored 89 for home and 81 for reading, with accessibility 100; mobile performance remains more sensitive to slower CPUs and networks. This is not a claim of identical performance on every device.

Recorded runs are genuine TensorFlow.js CPU training results. Tests regenerate validation data, reload final weights and confirm stored final loss/score agree. Artifact files explicitly include topology, initial/final weights, preprocessing, label order, configuration and provenance.

The source is ready for GitHub Pages. No remote repository or public deployment was created during this implementation. The repository owner must add a remote and enable Pages with GitHub Actions as described in `deployment.md`.

Final focused checks also covered exact numerical readouts, all feature channels, frozen inference, and Arabic keyboard coordinates. Accessibility scans wait for the entrance transition to finish before checking final contrast. All twelve labs passed the final contrast checks in all three browsers.
