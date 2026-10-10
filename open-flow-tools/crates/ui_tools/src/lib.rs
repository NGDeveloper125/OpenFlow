use wasm_bindgen::prelude::*;

// Exported to JavaScript. This layer only converts between JavaScript's types
// and the library's; the work itself belongs in domain, where
// `cargo test` reaches it without a browser or the wasm target.
#[wasm_bindgen]
pub fn example(input: &str) -> String {
    domain::example(input)
}

// Without a hook, a Rust panic surfaces in the browser console as
// "unreachable executed" and nothing else. Bound here rather than taken from
// a crate, which keeps the dependency list to wasm-bindgen alone.
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn error(message: &str);
}

// Runs once, when JavaScript instantiates the module.
#[wasm_bindgen(start)]
fn start() {
    std::panic::set_hook(Box::new(|info| error(&info.to_string())));
}

#[wasm_bindgen]
pub fn version() -> String {
    domain::core_version().to_string()
}
