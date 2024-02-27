fn main() {
    println!("cargo:rerun-if-changed=bindings.d.ts");
    println!("cargo:rerun-if-changed=bindings.js");

    napi_build::setup();
}
