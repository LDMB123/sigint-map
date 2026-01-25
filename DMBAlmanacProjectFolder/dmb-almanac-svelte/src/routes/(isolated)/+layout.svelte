<!-- 
  Isolated layout with @root reset 
  This bypasses the root +layout.svelte completely
-->
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>WASM Diagnostic</title>
        <style>
            * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
            }
            body {
                font-family:
                    system-ui,
                    -apple-system,
                    sans-serif;
                background: #1a1a1a;
                color: #e5e5e5;
                min-height: 100vh;
            }
        </style>
    </head>
    <body>
        <slot />
    </body>
</html>
