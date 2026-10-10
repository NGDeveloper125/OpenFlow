// Public method example
pub fn example(input: &str) -> String {
    input.to_uppercase()
}

pub fn core_version() -> &'static str {
    env!("CARGO_PKG_VERSION")
}

#[cfg(test)]
mod tests {
    use super::*;

    // Unit test for example
    #[test]
    fn example_returns_uppercase() {
        assert_eq!(example("abc"), "ABC");
    }
}
