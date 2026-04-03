import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { parseDSL } from "./src/parser/parseScene";

function iyagiPlugin() {
  return {
    name: "vite-plugin-iyagi",
    transform(code: string, id: string) {
      if (!id.endsWith(".iyagi")) return;
      const filename =
        id
          .split("/")
          .pop()
          ?.replace(/\.iyagi$/i, "") ?? "Story";
      const title =
        filename.charAt(0).toUpperCase() + filename.slice(1).replace(/_/g, " ");
      const { story, errors } = parseDSL(code, { title });
      if (errors.length > 0) {
        console.warn(`[iyagi] parse errors in ${id}:`, errors);
      }
      return {
        code: `export default ${JSON.stringify(story)}`,
        map: null,
      };
    },
  };
}

export default defineConfig({
  plugins: [react(), vanillaExtractPlugin(), iyagiPlugin()],
});
