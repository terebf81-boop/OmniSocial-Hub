import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const distPath = path.resolve(__dirname, 'dist');
const isDev = process.argv.includes('--dev') || process.env.npm_lifecycle_event === 'dev';
const isProduction =
  !isDev && (process.env.NODE_ENV === 'production' || fs.existsSync(path.join(distPath, 'index.html')));

function getAiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

type PlatformType =
  | 'instagram'
  | 'x'
  | 'tiktok'
  | 'linkedin'
  | 'youtube'
  | 'facebook'
  | 'whatsapp'
  | 'threads'
  | 'email'
  | 'web';

type ChannelCategory = 'messages' | 'comments' | 'emails';

function detectPlatformFromUrl(rawUrl: string): { platform: PlatformType; suggestedChannel: ChannelCategory; cleanUrl: string } {
  const trimmed = rawUrl.trim();
  const lower = trimmed.toLowerCase();

  let cleanUrl = trimmed;
  if (!lower.startsWith('http://') && !lower.startsWith('https://') && !lower.startsWith('mailto:')) {
    if (trimmed.includes('@') && !trimmed.includes('/')) {
      cleanUrl = `mailto:${trimmed}`;
    } else {
      cleanUrl = `https://${trimmed}`;
    }
  }

  if (lower.startsWith('mailto:') || (trimmed.includes('@') && !trimmed.includes('/')) || lower.includes('gmail.com') || lower.includes('outlook.com')) {
    return { platform: 'email', suggestedChannel: 'emails', cleanUrl };
  }
  if (lower.includes('instagram.com')) {
    return { platform: 'instagram', suggestedChannel: 'comments', cleanUrl };
  }
  if (lower.includes('twitter.com') || lower.includes('x.com')) {
    return { platform: 'x', suggestedChannel: 'comments', cleanUrl };
  }
  if (lower.includes('tiktok.com')) {
    return { platform: 'tiktok', suggestedChannel: 'comments', cleanUrl };
  }
  if (lower.includes('linkedin.com')) {
    return { platform: 'linkedin', suggestedChannel: 'messages', cleanUrl };
  }
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
    return { platform: 'youtube', suggestedChannel: 'comments', cleanUrl };
  }
  if (lower.includes('facebook.com') || lower.includes('fb.com')) {
    return { platform: 'facebook', suggestedChannel: 'messages', cleanUrl };
  }
  if (lower.includes('wa.me') || lower.includes('whatsapp.com')) {
    return { platform: 'whatsapp', suggestedChannel: 'messages', cleanUrl };
  }
  if (lower.includes('threads.net')) {
    return { platform: 'threads', suggestedChannel: 'comments', cleanUrl };
  }
  return { platform: 'web', suggestedChannel: 'messages', cleanUrl };
}

function normalizeUsername(rawUsername: string, platform: PlatformType): string {
  const clean = rawUsername.trim();
  if (platform === 'email') {
    return clean.replace(/^@+/, '');
  }
  return clean.startsWith('@') ? clean : `@${clean}`;
}

function getPlatformDisplayName(platform: PlatformType): string {
  const map: Record<PlatformType, string> = {
    instagram: 'Instagram',
    x: 'X (Twitter)',
    tiktok: 'TikTok',
    linkedin: 'LinkedIn',
    youtube: 'YouTube',
    facebook: 'Facebook',
    whatsapp: 'WhatsApp',
    threads: 'Threads',
    email: 'Correo / Email',
    web: 'Web Profile',
  };
  return map[platform] || 'Social';
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'omnichat-hub' });
  });

  // Simplified Social & Email Connector (URL + Username only, zero complex OAuth tokens)
  app.post('/api/connections/resolve-profile', (req: Request, res: Response) => {
    const { profileUrl, username, channelCategory, language } = req.body as {
      profileUrl?: string;
      username?: string;
      channelCategory?: ChannelCategory;
      language?: 'es' | 'en';
    };

    if (!profileUrl || typeof profileUrl !== 'string' || profileUrl.trim().length < 4) {
      res.status(400).json({ error: language === 'en' ? 'Valid profile URL is required.' : 'Se requiere una URL de perfil válida.' });
      return;
    }
    if (!username || typeof username !== 'string' || username.trim().length < 1) {
      res.status(400).json({ error: language === 'en' ? 'Username is required.' : 'El nombre de usuario es obligatorio.' });
      return;
    }

    const detected = detectPlatformFromUrl(profileUrl);
    const normalizedUser = normalizeUsername(username, detected.platform);
    const resolvedChannel: ChannelCategory =
      channelCategory && ['messages', 'comments', 'emails'].includes(channelCategory)
        ? channelCategory
        : detected.suggestedChannel;

    const displayLabel = `${getPlatformDisplayName(detected.platform)} · ${normalizedUser}`;

    res.json({
      platform: detected.platform,
      profileUrl: detected.cleanUrl.slice(0, 500),
      username: normalizedUser.slice(0, 100),
      displayLabel: displayLabel.slice(0, 120),
      channelCategory: resolvedChannel,
    });
  });

  // Gemini AI Analysis & Suggested Reply
  app.post('/api/ai/analyze-and-suggest', async (req: Request, res: Response) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
      return;
    }

    const {
      senderName,
      platform,
      channelType,
      subjectOrContext,
      body,
      language,
      faqRules,
    } = req.body as {
      senderName: string;
      platform: string;
      channelType: string;
      subjectOrContext?: string;
      body: string;
      language?: 'es' | 'en';
      faqRules?: Array<{ id: string; title: string; keywords: string[]; replyTemplate: string }>;
    };

    if (!body || typeof body !== 'string') {
      res.status(400).json({ error: 'Interaction body is required.' });
      return;
    }

    const uiLang = language === 'en' ? 'English' : 'Spanish';
    const rulesContext =
      Array.isArray(faqRules) && faqRules.length > 0
        ? faqRules.map((r) => `- Rule ID: ${r.id} | Title: ${r.title} | Keywords: ${r.keywords.join(', ')} | Template: ${r.replyTemplate}`).join('\n')
        : 'No active FAQ rules configured.';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Analyze this incoming ${channelType} from ${platform}.
Sender: ${senderName}
Context/Subject: ${subjectOrContext || 'Direct interaction'}
Message Body: "${body}"

Active FAQ Automation Rules:
${rulesContext}

Tasks:
1. Classify the tone/sentiment into one of: "positive", "neutral", "urgent", or "negative".
2. Assign a sentimentScore integer from 0 (very negative/critical) to 100 (very positive).
3. Write a 1-sentence sentimentReason in ${uiLang}.
4. Draft a natural, concise, polite suggestedReply matching the language of the incoming message (or ${uiLang} if unclear). If an FAQ rule matches the user's question, adapt its template seamlessly.
5. If an active FAQ rule clearly answers this message, set matchedFaqId and matchedFaqTitle; otherwise leave them empty strings.`,
        config: {
          systemInstruction: `You are OmniChat Hub's communication specialist. Always produce crisp, empathetic, ready-to-send replies without robotic fluff or placeholders.`,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              sentiment: {
                type: Type.STRING,
                enum: ['positive', 'neutral', 'urgent', 'negative'],
              },
              sentimentScore: {
                type: Type.INTEGER,
              },
              sentimentReason: {
                type: Type.STRING,
              },
              suggestedReply: {
                type: Type.STRING,
              },
              matchedFaqId: {
                type: Type.STRING,
              },
              matchedFaqTitle: {
                type: Type.STRING,
              },
            },
            required: ['sentiment', 'sentimentScore', 'sentimentReason', 'suggestedReply', 'matchedFaqId', 'matchedFaqTitle'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      console.error('Gemini analyze error:', error);
      res.status(502).json({
        error: error instanceof Error ? error.message : 'Failed to analyze message with AI.',
      });
    }
  });

  // Gemini AI FAQ Template Generator
  app.post('/api/ai/generate-faq', async (req: Request, res: Response) => {
    const ai = getAiClient();
    if (!ai) {
      res.status(503).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      return;
    }

    const { topic, language } = req.body as { topic?: string; language?: 'es' | 'en' };
    if (!topic || typeof topic !== 'string' || topic.trim().length < 2) {
      res.status(400).json({ error: 'Topic is required.' });
      return;
    }

    const uiLang = language === 'en' ? 'English' : 'Spanish';

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: `Create an automated FAQ response rule in ${uiLang} for the following customer topic: "${topic.trim()}".
Return:
- title: short descriptive title (max 60 chars)
- keywords: 3 to 5 lowercase trigger keywords in ${uiLang}
- replyTemplate: polite, helpful, concise ready-to-send response (max 400 chars).`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              keywords: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              replyTemplate: { type: Type.STRING },
            },
            required: ['title', 'keywords', 'replyTemplate'],
          },
        },
      });

      const parsed = JSON.parse((response.text ?? '{}').trim());
      res.json(parsed);
    } catch (error) {
      console.error('Gemini FAQ error:', error);
      res.status(502).json({
        error: error instanceof Error ? error.message : 'Failed to generate FAQ rule with AI.',
      });
    }
  });

  const httpServer = http.createServer(app);

  if (isProduction) {
    app.use(
      express.static(distPath, {
        setHeaders(res, filePath) {
          if (filePath.endsWith('sw.js') || filePath.endsWith('registerSW.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Service-Worker-Allowed', '/');
          } else if (filePath.endsWith('.webmanifest')) {
            res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  } else {
    process.env.DISABLE_HMR = 'true';
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        ws: { server: httpServer },
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`OmniChat Hub server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start OmniChat Hub server:', err);
  process.exit(1);
});
