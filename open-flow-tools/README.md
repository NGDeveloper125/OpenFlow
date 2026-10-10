# open-flow-tools

A WebAssembly module in `crates/ui_tools`, with the logic it exposes in
`crates/domain`.

## Prerequisites

    rustup target add wasm32-unknown-unknown
    cargo install wasm-pack --locked

## Build

    wasm-pack build crates/ui_tools --target web --out-dir ../../pkg

That writes `pkg/` at the project root: the `.wasm`, the JavaScript that loads
it, and TypeScript definitions.

## Run

    python -m http.server

Then open <http://localhost:8000>. Serving it is not optional — `index.html`
loads an ES module which fetches the `.wasm` beside it, and neither works from
the filesystem.

## Test

    cargo test

Runs on the host: no browser, no wasm target. That works because the logic
lives in `crates/domain`, and the binding layer in
`crates/ui_tools` is thin enough to have nothing worth unit-testing. A
test of the binding itself would need `wasm-bindgen-test` and a headless
browser.
