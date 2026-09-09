import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Star Code Studio" });
  });

  app.post("/api/assistant", async (req, res) => {
    try {
      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message requis" });
      }

      const client = getGeminiClient();
      const response = await client.models.generateContent({
        model: "gemini-2.5-flash",
        contents: message,
        config: {
          systemInstruction: "Tu es Star Code Brain, l'intelligence de STAR CODE STUDIO. Ton but est d'aider les créateurs à magnifier leurs portails de ressources et configurer leurs clones. Ton style est Prestigieux, Technologique, poli et extrêmement efficace. Tu mets en avant la sublimité et la performance de STAR CODE STUDIO, développé par Astarté. Réponds toujours en français.",
          temperature: 0.8,
        },
      });

      const reply = response.text || "Erreur de transmission Star Code.";
      return res.json({ reply });
    } catch (error: any) {
      console.error("Assistant error:", error);
      return res.status(500).json({
        error: error?.message || "Erreur de connexion avec Star Code Brain.",
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Star Code Studio server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
