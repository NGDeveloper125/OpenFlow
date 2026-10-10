# Neural Network Builder — UI Plan

Oct 4, 2026 · @Hi, I'm tyring to install rust and cargo on my ubunto, I ran thi

## Overview

The UI is a Vue 3 + TypeScript app where the user loads data, builds a network visually, configures training, then watches training run live. All maths runs in a Rust core compiled to WASM inside a Web Worker on the user's machine; the UI only edits a config and displays results.

**Scope of this plan:** every screen and configuration option the UI exposes, plus how the UI is structured and the order to build it. The Rust core has its own plan; this one only defines what the UI sends it and what it expects back.

### The Rust / Vue split

- **Vue owns:** the configuration (a single JSON-serialisable object), validation of that config, layout and interaction, charts and visualisations, saving projects locally.
- **Rust owns:** building the network from the config, shape inference, data preprocessing at scale, training, evaluation, inference, and serialising trained weights.
- **The contract between them** is a versioned config schema plus a message protocol over the worker. Design this first and keep both sides honest with it.

### Guiding principles

- **One config object is the source of truth.** Every screen is a view onto part of it. Save, load, undo and "export as JSON" all fall out of this.
- **Sensible defaults everywhere.** A beginner should be able to press Train on a default MLP without touching a setting. Advanced options sit behind an "Advanced" toggle per section.
- **Validate early and show shapes.** Show tensor shapes between every layer as the user builds. A shape mismatch should be visible before training starts, not as a Rust error.
- **Never block the UI.** Training runs in the worker; the UI stays responsive and can pause or stop at any time.
- **Start with what the core supports.** The tables below list the full menu; mark each option in the UI as available only once the Rust side implements it. Build the core set first (marked *Core* in each table).

## Screens and layout

The app is a single page with a left-hand step navigation and a main workspace. Steps follow the natural workflow, but the user can jump between them freely; each step shows a status (not set / valid / has errors).

1. **Projects** — create, open, duplicate, delete and import/export projects (a project = config + optional trained weights + training history). Includes templates: "MNIST MLP", "XOR", "Iris classifier", "Simple regression", "Small CNN".
2. **Data** — load a dataset, preview it, choose features and target, configure preprocessing and splits.
3. **Model** — the network builder: layer palette, layer stack/graph, layer inspector, shape readout, parameter count.
4. **Training setup** — loss, metrics, optimiser, learning-rate schedule, batching, regularisation, stopping rules, seed.
5. **Train** — start/pause/stop, live charts, per-layer diagnostics, logs.
6. **Evaluate** — metrics on the test set, confusion matrix, error analysis.
7. **Playground** — run the trained model on new inputs (draw a digit, type values, upload a sample).

A persistent top bar shows the project name, save status, compute status (WASM loaded, SIMD/threads available, memory used) and a settings menu (theme, number formatting, reset to defaults).

The layout works at desktop widths first. On narrow screens, the step navigation collapses into a drawer; the model builder switches from a canvas to a vertical list.

## Data

The data step decides the input and output shapes, so the model builder depends on it. Show a summary card at the top: number of samples, input shape, output shape, task type.

### Sources

| Source | What the user does | Core |
| --- | --- | --- |
| Built-in datasets | Pick XOR, spirals, Iris, MNIST, Fashion-MNIST, a sine wave | Yes |
| CSV upload | Upload a file, pick delimiter, header row, column types | Yes |
| Image folder / ZIP | Upload images with labels from folder names or a CSV | Later |
| Synthetic generator | Choose a function or distribution, noise level, sample count | Later |
| JSON / NPY | Upload arrays directly | Later |

All files stay in the browser. Parsing large files should happen in the worker, not the main thread.

### Task and columns

- **Task type:** binary classification, multi-class classification, multi-label classification, regression. Inferred from the target column, overridable.
- **Feature columns:** multi-select, with type per column (numeric, categorical, ignore).
- **Target column(s):** single or multiple; class labels listed with counts so imbalance is visible.

### Preprocessing

| Option | Choices | Core |
| --- | --- | --- |
| Numeric scaling | None, min-max (0–1), standardise (z-score), robust (median/IQR) | Yes |
| Categorical encoding | One-hot, ordinal | Yes |
| Target encoding (classification) | One-hot, integer labels | Yes |
| Missing values | Drop rows, fill mean, fill median, fill constant | Yes |
| Image resize / normalise | Target size, greyscale, scale pixels to 0–1 or −1–1 | Later |
| Augmentation (images) | Random flip, rotate, shift, noise | Later |
| Class imbalance | None, class weights, oversample minority | Later |

Scaling statistics are computed on the training split only and saved with the model, so inference applies the same transform. Show this explicitly in the UI — it's a common beginner mistake.

### Splits

- **Train / validation / test** percentages (default 70 / 15 / 15), with sliders that always sum to 100.
- **Shuffle** before splitting (on by default), using the project seed.
- **Stratify** by class for classification (on by default).
- **Preview:** a table of the first rows after preprocessing, plus a histogram per feature and class distribution per split.

## Network architecture

The model screen has three panels: a **layer palette** (left), the **network** itself (centre), and a **layer inspector** (right) for the selected layer.

### Model-level settings

- **Model type:** Sequential (a straight stack — Core) or Graph (layers with multiple inputs/outputs, skip connections — Later).
- **Input layer:** shape taken from the data step, read-only but visible. Optional override for advanced users.
- **Output layer:** suggested from the task (e.g. Dense with N units + softmax for N classes, 1 unit + sigmoid for binary, 1 unit + linear for regression). Warn if the user's choice doesn't match the task and loss.
- **Numeric precision:** f32 (Core). f16 or mixed precision only if the core ever supports it.
- **Name and description** for the model.

### The layer builder

- **Add layers** by drag from the palette or a "+" button between layers. Reorder by drag, duplicate, delete, enable/disable (skip a layer without removing it).
- **Each layer card** shows: type, key parameters (e.g. "Dense 64, ReLU"), output shape, parameter count. Errors show inline in red on the card.
- **Running totals:** total parameters (trainable / non-trainable) and estimated memory for weights + activations at the chosen batch size.
- **Shape inference** runs on every change. Ask the Rust core to validate (it owns the truth), but also do a quick TS-side check for instant feedback.
- **Graph mode (Later):** nodes and edges on a canvas (Vue Flow is a good fit), with merge layers (add, concatenate) for skip/residual connections.
- **Quick builders:** "MLP wizard" (number of hidden layers, units per layer, activation, dropout) and "CNN wizard" (conv blocks, filters, pooling) that generate the layer list in one go.
- **Undo / redo** for every change, kept in the store.
- **Visual view:** a toggle showing the network as neurons and connections for small models (e.g. under 100 units per layer), or as blocks for larger ones.

## Layer types and parameters

The layer inspector renders a form from the layer's schema, so adding a layer type means adding a schema entry, not new UI code. Every layer also has: name, trainable on/off, and a notes field.

| Layer | Parameters in the inspector | Core |
| --- | --- | --- |
| Dense (fully connected) | Units; activation; use bias; weight init; bias init; L1/L2 regularisation | Yes |
| Activation | Function (see activations table) | Yes |
| Dropout | Rate (0–0.9) | Yes |
| Flatten | None | Yes |
| Batch normalisation | Momentum; epsilon; learn scale/shift on/off | Later |
| Layer normalisation | Epsilon; learn scale/shift on/off | Later |
| Conv2D | Filters; kernel size; stride; padding (valid / same); dilation; activation; use bias; init | Later |
| Conv1D | As Conv2D, one dimension | Later |
| MaxPool2D / AvgPool2D | Pool size; stride; padding | Later |
| Global average / max pool | None | Later |
| Reshape | Target shape | Later |
| Embedding | Vocabulary size; embedding dimension; init | Later |
| RNN / LSTM / GRU | Units; return sequences; activation; recurrent activation; dropout; recurrent dropout | Later |
| Attention / multi-head attention | Heads; key dimension; dropout; causal mask | Later |
| Add / Concatenate (graph mode) | Axis (concatenate only) | Later |

For each parameter, the schema defines: type, default, min/max or allowed values, a one-line help text, and whether it's "advanced" (hidden by default). Show help as a tooltip with a short explanation and a sensible starting value — this is where the app teaches as well as configures.

## Activations and weight initialisation

Both are dropdowns in the layer inspector. Next to each dropdown, show a small plot of the chosen function (activation curve, or the init distribution) — cheap to draw in TS and very helpful.

### Activations

| Activation | Parameters | Typical use | Core |
| --- | --- | --- | --- |
| Linear (none) | — | Regression output | Yes |
| ReLU | — | Default for hidden layers | Yes |
| Sigmoid | — | Binary / multi-label output | Yes |
| Tanh | — | Hidden layers, RNNs | Yes |
| Softmax | Axis | Multi-class output | Yes |
| Leaky ReLU | Negative slope (default 0.01) | Hidden layers, avoids dead units | Yes |
| ELU | Alpha | Hidden layers | Later |
| SELU | — | Self-normalising MLPs | Later |
| GELU | Approximation (exact / tanh) | Transformers | Later |
| Swish / SiLU | — | Deeper networks | Later |
| Softplus | — | Positive outputs | Later |

### Weight initialisation

| Initialiser | Parameters | Pairs well with | Core |
| --- | --- | --- | --- |
| Zeros / ones / constant | Value | Biases only | Yes |
| Random uniform | Min; max | Experiments | Yes |
| Random normal | Mean; std dev | Experiments | Yes |
| Xavier / Glorot uniform | — | Tanh, sigmoid | Yes |
| Xavier / Glorot normal | — | Tanh, sigmoid | Yes |
| He / Kaiming uniform | — | ReLU family | Yes |
| He / Kaiming normal | — | ReLU family | Yes |
| LeCun normal | — | SELU | Later |
| Orthogonal | Gain | RNNs | Later |

Default the initialiser from the activation (He for ReLU-family, Glorot otherwise) and show "auto" in the dropdown until the user overrides it.

## Loss functions and metrics

The loss dropdown is filtered by task type, with the recommended one pre-selected. The UI warns about known-bad combinations, e.g. softmax output with binary cross-entropy, or a sigmoid output with MSE for classification.

### Loss functions

| Loss | Task | Parameters | Core |
| --- | --- | --- | --- |
| Mean squared error (MSE) | Regression | — | Yes |
| Mean absolute error (MAE) | Regression | — | Yes |
| Huber | Regression | Delta | Later |
| Binary cross-entropy | Binary, multi-label | From logits on/off | Yes |
| Categorical cross-entropy | Multi-class (one-hot) | From logits; label smoothing | Yes |
| Sparse categorical cross-entropy | Multi-class (integer labels) | From logits | Later |
| Hinge | Binary (SVM-style) | — | Later |
| KL divergence | Distribution targets | — | Later |

Also: **class weights** (from the data step) applied to the loss, and **loss reduction** (mean or sum) as an advanced option.

### Metrics

Multi-select; chosen metrics are tracked per epoch for train and validation and appear in the training charts.

| Metric | Task | Core |
| --- | --- | --- |
| Loss (always on) | All | Yes |
| Accuracy | Classification | Yes |
| Precision / recall / F1 | Classification | Later |
| Top-k accuracy | Multi-class | Later |
| AUC-ROC | Binary | Later |
| MAE / MSE / RMSE | Regression | Yes |
| R² | Regression | Later |

## Optimisers and learning-rate schedules

Pick an optimiser from a dropdown; its parameters appear below with defaults filled in. Learning rate gets a log-scale slider (1e-5 to 1) plus a text box.

### Optimisers

| Optimiser | Parameters (defaults) | Core |
| --- | --- | --- |
| SGD | Learning rate (0.01) | Yes |
| SGD + momentum | Learning rate; momentum (0.9); Nesterov on/off | Yes |
| Adam | Learning rate (0.001); beta1 (0.9); beta2 (0.999); epsilon (1e-8) | Yes |
| AdamW | As Adam + weight decay (0.01) | Later |
| RMSprop | Learning rate; rho (0.9); momentum; epsilon | Later |
| Adagrad | Learning rate; initial accumulator; epsilon | Later |

Shared advanced options: **gradient clipping** (none / by value / by global norm, with threshold) and **weight decay** where the optimiser supports it.

### Learning-rate schedules

Show a preview chart of the learning rate over the configured epochs, updating as the user changes settings.

| Schedule | Parameters | Core |
| --- | --- | --- |
| Constant | — | Yes |
| Step decay | Step size (epochs); factor | Yes |
| Exponential decay | Decay rate | Later |
| Cosine annealing | Minimum LR; period; restarts on/off | Later |
| Reduce on plateau | Monitored metric; factor; patience; minimum LR | Later |
| Linear warm-up | Warm-up epochs or steps (combines with any of the above) | Later |
| One-cycle | Max LR; warm-up percentage | Later |

## Training settings

Everything else that controls a training run, grouped into collapsible sections on the Training setup screen.

| Group | Option | Choices / range | Core |
| --- | --- | --- | --- |
| Run | Epochs | 1–10,000 (default 50) | Yes |
| Run | Batch size | 1–4,096, power-of-two presets (default 32) | Yes |
| Run | Shuffle each epoch | On / off (default on) | Yes |
| Run | Validation frequency | Every N epochs (default 1) | Yes |
| Regularisation | L1 / L2 (global default) | Strength, overridable per layer | Yes |
| Regularisation | Dropout (global default) | Rate, applied where the model has Dropout layers | Yes |
| Regularisation | Gradient clipping | Set in the optimiser section | Yes |
| Stopping | Early stopping | On / off; monitored metric; min delta; patience; restore best weights | Yes |
| Stopping | Target metric | Stop when e.g. validation accuracy ≥ value | Later |
| Stopping | Time limit | Minutes | Later |
| Checkpoints | Keep best model | On / off; monitored metric | Yes |
| Checkpoints | Save every N epochs | Number; max kept | Later |
| Reproducibility | Seed | Integer, with a "randomise" button | Yes |
| Compute | Threads | Auto / 1 / N (only if cross-origin isolation is available) | Later |
| Compute | UI update rate | Every N batches or every N ms | Yes |

Show a **run summary** at the bottom before the Train button: samples per epoch, batches per epoch, total steps, parameter count, and a rough memory estimate. Highlight anything unusual (batch size larger than the dataset, learning rate above 0.1 with Adam, no validation split).

## Training monitor

The Train screen is where users spend most of their time watching, so it should make problems obvious: overfitting, exploding or vanishing gradients, dead units, a learning rate that's too high.

### Controls

- Start, pause, resume, stop. Stop keeps the current weights; a separate "reset weights" re-initialises.
- Step one batch / one epoch (very useful for learning).
- Change learning rate live while paused (advanced).
- Progress: epoch x / N, batch y / M, elapsed time, estimated time remaining, samples per second.

### Live charts

- **Loss curve:** train vs validation per epoch, plus a smoothed per-batch training loss. Log-scale toggle.
- **Metric curves:** one chart per selected metric, train vs validation.
- **Learning rate** over time (confirms the schedule is doing what the user expects).
- **Markers** on the charts for best epoch, LR changes and early-stopping trigger.

### Per-layer diagnostics (Later)

- Weight and gradient histograms per layer, per epoch, with a slider to move through time.
- Gradient norm per layer — flags vanishing or exploding gradients.
- Fraction of dead ReLU units per layer.
- Activation distributions on a fixed batch.

### Decision boundary view (for 2D datasets)

For 2-feature datasets like XOR and spirals, draw the data points over a coloured map of the model's predictions, updating as it trains. This is the single most intuitive visual for small networks.

### Logs and run history

- A text log of events (start, epoch summaries, warnings, NaN detected, early stop).
- **Run history:** every training run is saved with its config snapshot and curves. The user can compare two or more runs on the same chart, with a diff of what changed in the config.

## Evaluation, playground and export

### Evaluate

- Run the trained model on the test split once; show all selected metrics.
- **Classification:** confusion matrix (counts and normalised), per-class precision/recall, ROC curve for binary tasks.
- **Regression:** predicted vs actual scatter plot, residual histogram.
- **Error browser:** a table of the worst predictions (highest loss), clickable to see the input — for images, show the image with true and predicted label.

### Playground

Input widgets depend on the dataset type:

- **Tabular:** a form with one field per feature, pre-filled from a random test sample, with a "random sample" button.
- **Images (MNIST-style):** a drawing canvas, downscaled to the input size, with a live prediction bar chart.
- **2D toy data:** click on the decision boundary plot to query a point.

Show the output probabilities as a bar chart, not just the top class. Optionally show activations per layer for the current input (Later).

### Save and export

| Export | Contents | Core |
| --- | --- | --- |
| Project file | Config + weights + preprocessing stats + run history, as one file | Yes |
| Config JSON | The network and training config only | Yes |
| Weights | Binary weights file from the Rust core | Yes |
| Training curves | CSV of per-epoch metrics | Yes |
| ONNX | Standard model format for use elsewhere | Later |
| Code snippet | Equivalent PyTorch or Keras code for the architecture | Later |

Projects autosave to browser storage (IndexedDB) — weights can be several MB, so don't use localStorage. Warn the user that clearing site data deletes projects, and encourage exporting.

## Vue app architecture

### Stack

- **Vue 3** with the Composition API and `<script setup lang="ts">`, built with **Vite**.
- **Pinia** for state, **Vue Router** for the steps.
- **Charts:** uPlot for fast live training curves; ECharts or Chart.js for the rest if you want richer chart types.
- **Graph editor (later):** Vue Flow.
- **Validation:** Zod for the config schema — one schema gives you TS types, runtime validation and default values.
- **UI components:** pick one library (PrimeVue, Naive UI or Vuetify) or plain components + a utility CSS framework. Choose early and stick with it.

### Config schema

- A versioned `ProjectConfig` type: `{ version, data, model: { layers[] }, training, ... }`, defined once in Zod.
- Each layer type is a discriminated union member (`{ type: 'dense', units, activation, ... }`), matching a Rust enum with `#[serde(tag = "type")]`. Keep the two in sync — consider generating TS types from Rust (e.g. with `ts-rs` or `tsify`) so there's only one source of truth.
- **Layer schema metadata** (labels, help text, min/max, advanced flag) lives alongside, and drives the auto-generated inspector forms.
- **Migrations:** a function per schema version, so old project files still load.

### Stores

- `project` — the current `ProjectConfig`, dirty flag, undo/redo stack, autosave.
- `engine` — worker lifecycle, WASM capabilities (SIMD, threads), status.
- `training` — run state, live metrics buffers, run history.
- `datasets` — loaded dataset metadata (the data itself lives in the worker, not in Vue).

### Worker and protocol

- One module worker hosts the WASM core. The UI never calls WASM directly.
- Typed messages as a discriminated union both ways, e.g. UI → worker: `loadDataset`, `validateModel`, `startTraining`, `pause`, `resume`, `stop`, `predict`, `exportWeights`; worker → UI: `validationResult`, `batchProgress`, `epochEnd`, `trainingDone`, `error`.
- Wrap it in a composable (`useEngine()`) that returns promises for request/response calls and event streams for training progress.
- Large data (datasets, weights, histograms) moves as transferable `ArrayBuffer`s, never as JSON.
- **Keep big arrays out of Vue reactivity.** Use `shallowRef` / `markRaw` for metric buffers and typed arrays, or Vue will try to make every element reactive and the UI will crawl.

### Folder structure

```
src/
  schema/        # Zod schemas, layer metadata, migrations
  stores/        # Pinia stores
  engine/        # worker, protocol types, useEngine()
  views/         # one per step: Data, Model, TrainingSetup, Train, Evaluate, Playground
  components/    # LayerCard, LayerInspector, SchemaForm, charts, ...
  composables/
```

## Build phases

Each phase leaves something usable. Pair each with the matching Rust core work — the UI phase shouldn't get ahead of what the core can actually run.

1. **Skeleton and engine bridge.** Vite + Vue + TS + Pinia + Router, the step navigation, a module worker loading the WASM core, and a `ping`/`capabilities` round trip.
   - *Learn:* Vue 3 Composition API, `<script setup>`, Pinia basics, module workers in Vite, loading WASM in a worker.
2. **Config schema and the XOR path.** Zod schema for the Core options only. Hard-code the XOR dataset, a fixed 2-4-1 MLP and Adam. Start training and print the loss per epoch in a list.
   - *Learn:* designing a shared schema across Rust and TS, discriminated unions, serde tagging, the worker message protocol.
3. **Model builder (sequential).** Layer palette, layer cards, add/remove/reorder, the schema-driven inspector form, shape and parameter readout, undo/redo.
   - *Learn:* building generic schema-driven forms in Vue, drag and drop, managing undo/redo in a store, computed state.
4. **Training setup and live monitor.** Loss/metrics/optimiser/schedule/training forms, the run summary, start/pause/stop, live loss and metric charts, the decision boundary view for 2D data.
   - *Learn:* streaming data from a worker into charts efficiently, `shallowRef`/`markRaw`, throttling UI updates, canvas drawing.
5. **Data step.** Built-in datasets, CSV upload with parsing in the worker, column selection, preprocessing options, splits, preview and histograms.
   - *Learn:* handling large files in the browser, transferables, designing a wizard-like flow.
6. **Projects, persistence, export.** IndexedDB autosave, project list, templates, import/export, schema migrations.
   - *Learn:* IndexedDB (via a small wrapper like `idb`), file download/upload APIs, versioned formats.
7. **Evaluate and playground.** Confusion matrix, regression plots, error browser, input widgets including the drawing canvas.
   - *Learn:* canvas input handling, preparing user input with the same preprocessing as training data.
8. **Advanced options.** Turn on the *Later* rows as the core supports them: CNN layers and wizard, batch norm, more optimisers and schedules, per-layer diagnostics, run comparison.
9. **Graph mode.** Vue Flow editor, merge layers, skip connections.
   - *Learn:* graph editors, topological sort, validating DAGs in the UI.
10. **Polish.** Accessibility (keyboard navigation for the builder, labels on all inputs), responsive layout, help tooltips everywhere, onboarding tour, component and E2E tests (Vitest + Playwright).
