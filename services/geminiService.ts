
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { PraiseItem, PraiseCategory } from "../types";
import { MASTER_PRAISE_LIST } from "../data/praiseList";

const cache: Record<string, PraiseItem[]> = {};
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function decodeBase64(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

export const fetchPraisesBatch = async (
  page: number, 
  lang: string, 
  category: string,
  pageSize: number = 10,
  retries: number = 3
): Promise<PraiseItem[]> => {
  const cacheKey = `${lang}-${category}-${page}`;
  if (cache[cacheKey]) return cache[cacheKey];

  // Filter by category first
  const filteredList = category === PraiseCategory.ALL 
    ? MASTER_PRAISE_LIST 
    : MASTER_PRAISE_LIST.filter(p => p.category === category);

  const startIndex = (page - 1) * pageSize;
  const batch = filteredList.slice(startIndex, startIndex + pageSize);

  if (batch.length === 0) return [];

  if (lang === 'en') {
    return batch.map(b => ({
      id: b.id,
      originalText: b.text,
      translation: b.text,
      reference: b.ref,
      category: b.category
    }));
  }

  const prompt = `Translate the following Christian praises (focused on Jesus, Jehovah, and the Holy Spirit) from English into "${lang}".
  Keep the translations worshipful and biblically accurate. 
  For each item, provide:
  - The translated text.
  - A phonetic transliteration (if the script is non-Latin).
  
  Input Data (JSON):
  ${JSON.stringify(batch)}
  
  Return as a JSON array of objects with the original 'id' and 'ref', and added 'translatedText' and 'phonetic'.`;

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                translatedText: { type: Type.STRING },
                phonetic: { type: Type.STRING },
                ref: { type: Type.STRING }
              },
              required: ["id", "translatedText", "ref"]
            }
          }
        }
      });

      const responseText = response.text || '[]';
      const parsed = JSON.parse(responseText);
      
      const results = parsed.map((item: any) => {
        const original = batch.find(b => b.id === item.id);
        return {
          id: item.id,
          originalText: item.translatedText,
          translation: original?.text || "",
          phonetic: item.phonetic,
          reference: item.ref,
          category: original?.category || 'General'
        };
      });

      cache[cacheKey] = results;
      return results;
    } catch (error: any) {
      if (attempt < retries) {
        await sleep(1000 * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  return [];
};

export const playPraiseSpeech = async (text: string, languageName: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ 
        parts: [{ text: `Say clearly and peacefully in ${languageName}: ${text}` }] 
      }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: { 
            prebuiltVoiceConfig: { voiceName: 'Zephyr' } 
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return;

    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    // Resume context to ensure audio plays
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), audioContext, 24000, 1);
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    
    return new Promise<void>((resolve) => {
      source.onended = () => resolve();
      source.start();
    });
  } catch (error) {
    console.error("Speech playback error:", error);
  }
};
