let pkgs = import <nixpkgs> { };

in pkgs.mkShell {
  # name = "csharp";
  buildInputs = with pkgs; [
    nodejs
    typescript
    typescript-language-server
    esbuild
  ];
}
