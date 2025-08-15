import { createUIResource } from "@mcp-ui/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Optional: Define configuration schema to require configuration at connection time
export const configSchema = z.object({
  debug: z.boolean().default(false).describe("Enable debug logging"),
});

export default function createStatelessServer({
  config,
}: {
  config: z.infer<typeof configSchema>;
}) {
  const server = new McpServer({
    name: "Desmos MCP",
    version: "1.0.0",
  });

  // Add Desmos graphing calculator tool
  server.tool(
    "graph",
    "Create an interactive function graph using Desmos API",
    {
      functions: z
        .array(z.string())
        .min(1)
        .max(10)
        .describe(
          "Array of mathematical functions to graph (e.g., ['y=x^2', 'y=sin(x)'])"
        ),
      title: z.string().optional().describe("Title for the graph"),
      xMin: z.number().optional().describe("Minimum x value for the viewport"),
      xMax: z.number().optional().describe("Maximum x value for the viewport"),
      yMin: z.number().optional().describe("Minimum y value for the viewport"),
      yMax: z.number().optional().describe("Maximum y value for the viewport"),
      showGrid: z.boolean().default(true).describe("Show grid lines"),
      showKeypad: z
        .boolean()
        .default(true)
        .describe("Show the on-screen keypad"),
      showExpressions: z
        .boolean()
        .default(true)
        .describe("Show the expressions list"),
    },
    async ({
      functions,
      title = "Function Graph",
      xMin,
      xMax,
      yMin,
      yMax,
      showGrid = true,
      showKeypad = true,
      showExpressions = true,
    }) => {
      try {
        // Generate minimal HTML with just Desmos calculator
        const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: white;
            width: 100%;
            height: 100vh;
            overflow: hidden;
        }
        #calculator {
            width: 100%;
            height: 100vh;
        }
    </style>
</head>
<body>
    <div id="calculator"></div>
    
    <script src="https://www.desmos.com/api/v1.11/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"></script>
    
    <script>
        var calculator = Desmos.GraphingCalculator(document.getElementById('calculator'), {
            keypad: ${showKeypad},
            graphpaper: ${showGrid},
            expressions: ${showExpressions},
            settingsMenu: true,
            zoomButtons: true,
            pointsOfInterest: true,
            trace: true,
            border: false,
            lockViewport: false,
            expressionsCollapsed: false,
            capExpressionSize: false,
            authorFeatures: false,
            images: true,
            folders: true,
            notes: true,
            sliders: true,
            actions: 'auto',
            substitutions: true,
            links: true,
            qwertyKeyboard: true,
            distributions: true,
            restrictedFunctions: false,
            forceEnableGeometryFunctions: false,
            pasteGraphLink: false,
            pasteTableData: true,
            clearIntoDegreeMode: false
        });

        ${
          xMin !== undefined &&
          xMax !== undefined &&
          yMin !== undefined &&
          yMax !== undefined
            ? `
        calculator.setMathBounds({
            left: ${xMin},
            right: ${xMax},
            bottom: ${yMin},
            top: ${yMax}
        });
        `
            : ""
        }

        ${functions
          .map((func, index) => {
            let expression = func;
            if (func.includes("y=")) {
              expression = func.replace("y=", "");
            } else if (func.includes("=")) {
              expression = func;
            } else {
              expression = func;
            }
            return `calculator.setExpression({ id: 'function${index}', latex: '${expression}' });`;
          })
          .join("\n        ")}

        calculator.setExpression({ id: 'fit', latex: 'fit()' });
        setTimeout(() => calculator.removeExpression({ id: 'fit' }), 1000);
    </script>
</body>
</html>`;

        // Create the UI resource directly with the HTML content
        const uiResource = createUIResource({
          uri: `ui://desmos-graph/${Date.now()}`,
          content: {
            type: "rawHtml",
            htmlString: htmlContent,
          },
          encoding: "blob",
        });

        return {
          content: [uiResource],
        };
      } catch (error) {
        // Return error message if graph creation fails
        const errorUiResource = createUIResource({
          uri: "ui://error-component/desmos-graph",
          content: {
            type: "rawHtml",
            htmlString: `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Graph Creation Error</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f6f8fa;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .error-container {
            background: white;
            border-radius: 12px;
            padding: 40px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            text-align: center;
            max-width: 500px;
        }
        .error-icon {
            font-size: 48px;
            margin-bottom: 20px;
        }
        .error-title {
            color: #dc3545;
            font-size: 24px;
            margin-bottom: 16px;
        }
        .error-message {
            color: #6c757d;
            font-size: 16px;
            line-height: 1.5;
        }
    </style>
</head>
<body>
    <div class="error-container">
        <div class="error-icon">⚠️</div>
        <div class="error-title">Graph Creation Error</div>
        <div class="error-message">
            Failed to create the function graph<br>
            ${error instanceof Error ? error.message : "Unknown error occurred"}
        </div>
    </div>
</body>
</html>
            `,
          },
          encoding: "blob",
        });

        return {
          content: [errorUiResource],
        };
      }
    }
  );

  return server.server;
}
