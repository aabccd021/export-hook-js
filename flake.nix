{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";
    treefmt-nix.url = "github:numtide/treefmt-nix";
  };

  outputs = { self, nixpkgs, treefmt-nix }:
    let
      pkgs = nixpkgs.legacyPackages.x86_64-linux;


      treefmtEval = treefmt-nix.lib.evalModule pkgs {
        projectRootFile = "flake.nix";
        programs.prettier.enable = true;
        programs.nixpkgs-fmt.enable = true;
        programs.biome.enable = true;
        programs.shfmt.enable = true;
        settings.formatter.prettier.priority = 1;
        settings.formatter.biome.priority = 2;
        settings.global.excludes = [ "LICENSE" "*.ico" ];
      };

      tsc = pkgs.runCommandNoCCLocal "tsc" { } ''
        cp -L ${./hook.ts} ./hook.ts
        cp -L ${./tsconfig.json} ./tsconfig.json
        ${pkgs.typescript}/bin/tsc
        touch $out
      '';

      biome = pkgs.runCommandNoCCLocal "biome" { } ''
        cp -L ${./biome.jsonc} ./biome.jsonc
        cp -L ${./hook.ts} ./hook.ts
        cp -L ${./package.json} ./package.json
        cp -L ${./tsconfig.json} ./tsconfig.json
        ${pkgs.biome}/bin/biome check --error-on-warnings
        touch $out
      '';

      dist = pkgs.runCommandNoCCLocal "dist" { } ''
        mkdir  $out
        ${pkgs.esbuild}/bin/esbuild ${./hook.ts} \
          --bundle \
          --format=esm \
          --minify \
          --sourcemap \
          --outfile="$out/export-hook.min.js"
      '';

      packages = {
        formatting = treefmtEval.config.build.check self;
        tsc = tsc;
        biome = biome;
        dist = dist;
      };

      gcroot = packages // {
        gcroot-all = pkgs.linkFarm "gcroot-all" packages;
      };

      publish = pkgs.writeShellApplication {
        name = "publish";
        text = ''
          nix flake check
          npm config set //registry.npmjs.org/:_authToken "$NPM_TOKEN"
          result=$(nix build --no-link --print-out-paths .#dist)
          rm -rf dist
          cp -Lr "$result" dist
          chmod -R 700 dist
          npm publish
        '';
      };
    in
    {

      checks.x86_64-linux = gcroot;

      packages.x86_64-linux = gcroot;

      formatter.x86_64-linux = treefmtEval.config.build.wrapper;

      devShells.x86_64-linux.default = pkgs.mkShellNoCC {
        buildInputs = [
          pkgs.bun
          pkgs.nodejs
          pkgs.biome
          pkgs.typescript
        ];
      };

      apps.x86_64-linux.publish = {
        type = "app";
        program = "${publish}/bin/publish";
      };
    };
}
