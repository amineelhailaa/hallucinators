# Hallucinators

An interactive CNN learning laboratory: every pixel, neuron, gradient and prediction open for inspection.

React + TypeScript. 12 chapters, 36 lessons in English, French and Arabic, 12 interactive labs, real CPU browser training, and GitHub Pages deployment. The interface uses a restrained pixel science-lab style with readable technical documentation and keyboard-accessible numerical figures.

## Run locally

Use Node 24 LTS (see `.nvmrc`):

```sh
npm ci
npm run dev
```

Open the printed `/hallucinators/` URL. All training happens in a background worker on this device. No database, backend, account or external dataset is required.

## Explore

- **Course:** image tensors, neurons, nonlinearity, function composition, gradients, training loops, convolutions, pooling, flatten, task heads, generalization and the full Keras workflow.
- **Labs:** editable pixels, weighted sums, XOR, kernel scanning, pooling collisions, flatten index mapping, loss gradients, SGD snapshots, actual CNN training, transformations, classification/regression and frozen inference.
- **Glossary / reference:** searchable terminology, formulas and the 2,468-parameter architecture.

Every lesson has Explanation / Mathematics / Keras Code views, prerequisites, a worked example, a counterexample, an explained check and references. Arabic uses RTL prose while tensors, formulas and code retain their numerical LTR order.

## Checks and production build

```sh
npm run test
npm run build
npm run check:bundle
npx playwright install --with-deps chromium firefox webkit
npm run test:browser
npm run preview
```

The production files are in `dist`. Content validation checks all languages, required sections and internal links. Browser tests cover direct links, all lessons, labs, language switching, reduced motion, accessibility, mobile widths, training, artifacts and inference.

## Recorded training

```sh
npm run record
```

This runs two real 10-epoch TensorFlow.js CPU experiments and saves metrics, initial/final weights and provenance under `public/runs`. Recorded runs are explicitly labeled and can restore their model for further inspection. Seeds, data sizes and optimizer settings are stored with each run. Do not replace them with illustrative or fabricated curves.

## Python examples

Use Python 3.11 in a virtual environment:

```sh
python -m venv .venv
. .venv/bin/activate
pip install -r examples/requirements.txt
python examples/cnn.py --task classification --epochs 10
python examples/cnn.py --task regression --epochs 10
```

`examples/hallucinators.ipynb` walks through training and intermediate shapes. Outputs go to ignored `artifacts/`. The scripts verify parameter counts, frozen inference and save/reload prediction agreement. Python uses NumPy RNG; its generated data differs from browser samples even with the same seed.

## Deployment and contributions

[GitHub Pages setup](docs/deployment.md) explains repository settings, base paths, the Actions workflow and rollback. [Architecture and content authoring](docs/architecture.md) explains scientific contracts, worker events, translation and lesson maintenance. [Verification evidence](docs/verification.md) records checks actually completed.

No BrainScan images or clinical model are included. These bounded synthetic experiments teach mechanisms rather than establish production model quality.

Original visual interface and diagrams; self-hosted fonts from Fontsource with SIL Open Font License. Project source: MIT, see LICENSE.
