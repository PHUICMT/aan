fn main() {
  // Re-embed icon resources after icon regen (touch to force rebuild).
  println!("cargo:rerun-if-changed=icons/icon.ico");
  println!("cargo:rerun-if-changed=icons/icon.png");
  tauri_build::build()
}
