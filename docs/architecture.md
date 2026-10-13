# Architecture and scientific contracts

Hallucinators is a static React application. Hash URLs carry locale and destination. Vite emits independent lesson chunks and a worker chunk. The entry never imports TensorFlow; training is requested only by the training, transformation, or inference labs.

## Four independent concerns

- `src/content`: authored localized MDX and stable lesson metadata.
- `src/engine`: pure channels-last math, seeded synthetic generation and TensorFlow model construction.
- `src/labs`: experiment state, controls, SVG/Canvas rendering and accessible numerical representations.
- `src/workers`: live training, prediction, inspection, artifact restoration and explicit test evaluation.

`src/labs/trainingStore.ts` owns one lazy worker per tab. It persists the current experiment across lab navigation and locale changes. Every initialization receives a new run ID; events from older runs are ignored. A new training request always reinitializes weights, optimizer and history. Pause takes effect at the next batch boundary; cancel stops without deleting the course. Test evaluation is a separate command.

## Shapes and values

The pure engine uses per-sample `[H,W,C]` tensors with channels last, and row-major values. The worker uses full `[B,H,W,C]` tensors. Flatten preserves each sample and maps `k=(y*W+x)*C+c`. Convolution uses cross-correlation, a bias per output channel and all input channels. “Same” uses asymmetric padding when required and `ceil(I/S)` outputs. Pooling uses valid nonoverlapping windows.

Classification uses 4 linear logits and stable softmax cross-entropy, with one-hot targets inside the worker. The Python example uses integer labels and sparse cross-entropy. Both are equivalent label representations, not identical numerical training implementations. Regression uses 2 linear outputs with MSE. The backbone is freshly initialized for each task.

## Determinism

Synthetic dataset and shuffle seeds are explicit. We generate 512/128/128 distinct images, rejecting exact cross-split duplicates. Classification is balanced. CPU initialization is seeded. Small floating-point differences across engines and platforms remain possible. Python uses NumPy RNG and therefore generates different samples than JavaScript.

The recorded runs contain genuine CPU results, configuration, generator/script provenance, complete initial weights and final weights. They can be regenerated using `npm run record`. Restoring an artifact never invents training: the interface labels it Recorded run. Evaluation still runs against regenerated test data. Frozen inference compares **every** parameter before/after and reports the maximum absolute difference.

## Accessibility and localization

Canvas is decorative; keyboard-operable numerical matrices expose equivalent values. Matrix arrow keys preserve spatial coordinates even in Arabic. Prose/navigation use RTL; formulas, code and indices use LTR. Language changes preserve routes and lab state. Display preferences tolerate unavailable storage. Motion respects the OS reduced-motion setting, and animation is user initiated.

## Adding concepts

Add a stable lesson ID, prerequisites and lab mapping to metadata. Author one MDX file for each language. Every file needs explanation, objectives, prerequisite links, worked calculation, misconception, explained check, mathematical symbols, code and sources. Run content validation and browser tests before release. The authoring source in `scripts/content.py` generates the initial curriculum; edit it when regenerating, or edit MDX directly without rerunning the generator.

## Boundaries

No database, credentials, clinical data, accounts, server inference or third-party runtime requests. The app fetches only its own static assets. Browser experiments illustrate mechanisms and do not establish real-world model quality. The default CNN omits dropout and batch normalization to keep the traced model simple; their train/evaluation behavior is taught separately.

The glossary loads one locale-specific static index, with 72 entries including individual definitions for epochs, batches, weights, gradients, logits and metrics. English aliases remain searchable in French and Arabic. Search does not request external services.

## Performance profile

The release benchmark uses Lighthouse with a 1350×940 desktop viewport, 40 ms RTT, 10,240 Kbps throughput and CPU slowdown 1. The reading-route targets are performance ≥90 and accessibility ≥95 on this profile. Reports are saved under `docs/performance`. Mobile layout and keyboard accessibility are independently tested at 360 px. Standard simulated-mobile measurements are also retained; they may be lower on slower CPUs and networks. Re-run measurements without simultaneous builds or training to avoid contaminating the CPU timings.

Regenerate the initial course with `npm run generate:content` (Python 3 required for authoring only). This runs the base authoring script, the additional optimizer/loss/normalization explanations, and all three search indexes. Production builds require only Node and use the committed MDX directly. Formula parsing tests include every localized equation.
