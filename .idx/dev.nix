{ pkgs, ... }: {
  channel = "stable-23.11";

  packages = [
    pkgs.nodejs_20
    pkgs.python311
  ];

  idx = {
    extensions = [
      "ms-python.python"
      "ms-playwright.playwright"
    ];

    previews = {
      enable = true;
      previews = {
        frontend = {
          command = ["npm" "start"];
          manager = "web";
          env = {
            PORT = "8080";
          };
        };
        api = {
          command = ["npm" "--prefix" "apps/api" "run" "dev"];
          manager = "web";
          env = {
            PORT = "3001";
          };
        };
      };
    };

    workspace = {
      onCreate = {
        npm-install = "npm install";
        npm-install-api = "npm --prefix apps/api install";
      };
    };
  };
}