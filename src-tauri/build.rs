use std::process::Command;

fn main() {
    let output = Command::new("git")
        .args(&["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|out| String::from_utf8(out.stdout).ok())
        .unwrap_or_else(|| "".into());

    // Pass this to Rust as an environment variable named "GIT_HASH"
    println!("cargo:rustc-env=GIT_HASH={}", output.trim());

    tauri_build::build()
}
