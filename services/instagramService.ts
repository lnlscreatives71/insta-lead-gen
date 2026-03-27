// Instagram Discovery Service - Synced
import { InstagramLead, Competitor } from '../types';
import { GoogleGenAI, Type, GenerateContentResponse } from "@google/genai";
import { batchAnalyzeLeads, withRetry } from './geminiService';

// --- DATA PARSING HELPERS ---
const parseNumeric = (val: any): number => {
  if (typeof val === 'number') return Math.floor(val);
  if (typeof val === 'string') {
    const cleanStr = val.replace(/[,a-zA-Z\s]/g, '');
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};

const parseString = (...values: any[]): string => {
  for (const val of values) {
    if (typeof val === 'string' && val.trim() !== '') return val.trim();
    if (val && typeof val === 'object' && val.raw_text) return String(val.raw_text).trim();
  }
  return "";
};

// --- 2. HYBRID PHASE 1: MULTIPLEX KEYWORD SEARCH ---
export const discoverUsernamesWithApify = async (
  niche: string, 
  count: number, 
  apifyToken: string, 
  excludedUsernames: string[] = [],
  onProgress?: (status: string, percent: number) => void
): Promise<string[]> => {
  
  if (onProgress) onProgress(`Phase 1A: AI generating optimal search vectors for "${niche}"...`, 10);
  
  let keywords: string[] = [];
  try {
    if (!process.env.API_KEY) throw new Error("GEMINI_KEY_MISSING");
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `I am using an Instagram search tool to find creators in the "${niche}" niche. Instagram limits results per keyword to roughly 20 profiles.
    Provide exactly 3 highly popular, broad, 1-word or 2-word Instagram search keywords that will yield completely different sets of creators for this niche. 
    Return ONLY the keywords separated by commas. No quotes, no bullet points, no extra text.
    Example for 'Family & Parenting': motherhood, parenting, dadlife`;

    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    }));
    
    const text = response.text || "";
    keywords = text
      .replace(/[0-9.]/g, '')
      .split(',')
      .map(k => k.trim().replace(/['"\n\r]/g, ''))
      .filter(Boolean)
      .slice(0, 3);
      
  } catch (e) {
    console.warn("AI Vector Generation Failed, using fallback", e);
    let coreKeyword = niche;
    const splitters = [' & ', ' and ', ',', '/', '|', '-'];
    for (const splitter of splitters) {
      if (coreKeyword.toLowerCase().includes(splitter)) {
        coreKeyword = coreKeyword.split(new RegExp(splitter, 'i'))[0].trim();
      }
    }
    const sanitizedSearch = coreKeyword.replace(/[?!.;:\-+=*&%$#@/\\~^<>()[\]{}|"'']/g, ' ').replace(/\s+/g, ' ').trim();
    const wordParts = sanitizedSearch.split(' ');
    keywords = [wordParts.length > 2 ? wordParts.slice(0, 2).join(' ') : sanitizedSearch || "creators"];
  }

  if (keywords.length === 0) keywords = ["creators"];

  if (onProgress) onProgress(`Phase 1B: Multiplex Search across vectors: [${keywords.join(', ')}]...`, 15);

  const bufferSize = Math.max(100, count * 5);
  const limitPerSearch = Math.ceil(bufferSize / keywords.length);
  const url = `https://api.apify.com/v2/acts/apify~instagram-search-scraper/run-sync-get-dataset-items?token=${apifyToken}&timeout=300`;

  const searchPromises = keywords.map(async (kw) => {
    const input = {
      enhanceUserSearchWithFacebookPage: false,
      search: kw,
      searchLimit: limitPerSearch,
      searchType: "user"
    };
    try {
      const data = await withRetry(async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input)
        });
        if (response.status === 429) throw new Error("429 Too Many Requests");
        if (!response.ok) return null; // Signal to ignore
        return response.json();
      });

      if (!data) return [];
      
      const rawResults = Array.isArray(data) ? data : (data.items || data.results || data.data || [data]);
      return rawResults.map((item: any) => parseString(item.username, item.user?.username, item.node?.username, item.owner?.username)).filter(Boolean);
    } catch (err) {
      console.error(`Apify Keyword Discovery Error for "${kw}":`, err);
      return [];
    }
  });

  const resultsArray = await Promise.all(searchPromises);
  let extractedUsernames = resultsArray.flat();
    
  extractedUsernames = extractedUsernames.filter((u: string) => !excludedUsernames.includes(u));
  extractedUsernames = Array.from(new Set(extractedUsernames));

  return extractedUsernames.slice(0, bufferSize);
};

// --- 3. HYBRID PHASE 2: APIFY PROFILE AUDIT ---
export const fetchApifyProfileData = async (usernames: string[], apifyToken: string): Promise<any[]> => {
  const url = `https://api.apify.com/v2/acts/coderx~instagram-profile-scraper-bio-posts/run-sync-get-dataset-items?token=${apifyToken}&timeout=300`;
  
  const cleanUsernames = usernames.map(u => u.replace(/@/g, '').trim()).filter(Boolean);

  const input = {
    usernames: cleanUsernames
  };

  try {
    const response = await withRetry(async () => {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(input)
      });
      if (res.status === 429) throw new Error("429 Too Many Requests");
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`APIFY_PROFILE_ERROR_${res.status} - ${errText}`);
      }
      return res;
    });

    const data = await response.json();
    const profiles = Array.isArray(data) ? data : (data.items || data.results || data.data || [data]);
    return profiles;
  } catch (error) {
    console.error("Apify Profile Error:", error);
    throw error;
  }
};

// --- 4. HYBRID MASTER WORKFLOW ---
export const runHybridDiscovery = async (
  niche: string, 
  count: number, 
  apifyToken: string, 
  excludedUsernames: string[],
  onProgress: (status: string, percent: number) => void
): Promise<{leads: InstagramLead[], sources: any[]}> => {
  
  const usernames = await discoverUsernamesWithApify(niche, count, apifyToken, excludedUsernames, onProgress);
  const sources: any[] = []; 
  
  if (usernames.length === 0) {
    throw new Error("NO_USERNAMES_FOUND - Phase 1 parsed 0 valid usernames. The search scraper format may be unsupported.");
  }

  onProgress(`Phase 2: Auditing ${usernames.length} raw profiles via CoderX...`, 40);
  const rawProfiles = await fetchApifyProfileData(usernames, apifyToken);
  
  if (rawProfiles.length === 0) {
    throw new Error("API_RETURNED_EMPTY - Phase 2 profile scraper returned no data.");
  }

  const qualifiedLeads: InstagramLead[] = [];
  const redFlags = ['course', 'shop', 'ebook', 'stan.store', 'coaching', 'linktr.ee', 'bio.site', 'beacons.ai'];

  onProgress(`Phase 3: Filtering & Analyzing Post Metrics...`, 60);
  
  for (const profile of rawProfiles) {
    if (qualifiedLeads.length >= count) break;

    const username = parseString(profile.username, profile.ownerUsername);
    if (!username) continue;

    const followers = parseNumeric(profile.followersCount ?? profile.followers ?? profile.edge_followed_by?.count ?? profile.ig_followers);
    
    if (followers > 100000 || followers < 5000) continue;
    
    const bioText = parseString(profile.biography, profile.bio, profile.biography_with_entities).toLowerCase();
    const externalUrlRaw = parseString(profile.externalUrl, profile.url, profile.external_url);
    const fullName = parseString(profile.fullName, profile.name, profile.full_name, username);
    const profilePic = parseString(profile.hdProfilePicUrl, profile.profilePicUrl, profile.profile_pic_url_hd, profile.profile_pic_url);
    
    const combinedBioCheck = bioText + " " + externalUrlRaw.toLowerCase();

    const isMonetized = redFlags.some(word => combinedBioCheck.includes(word));
    if (isMonetized) continue;

    const rawPostsArray = Array.isArray(profile.latestPosts) 
      ? profile.latestPosts 
      : Array.isArray(profile.posts)
        ? profile.posts
        : Array.isArray(profile.edge_owner_to_timeline_media?.edges) 
          ? profile.edge_owner_to_timeline_media.edges.map((e: any) => e?.node).filter(Boolean)
          : [];
    
    const posts = rawPostsArray.map((p: any) => {
      const isVid = Boolean(p?.isVideo || p?.is_video || p?.mediaType === 'GraphVideo' || p?.__typename === 'GraphVideo' || p?.productType === 'clips' || p?.productType === 'igtv');
      let ts = null;
      
      if (p?.timestamp) {
        ts = new Date(p.timestamp).getTime();
      } else if (p?.taken_at_timestamp) {
        ts = parseNumeric(p.taken_at_timestamp) * 1000;
      } else if (p?.taken_at) {
        ts = parseNumeric(p.taken_at) * 1000;
      }
      
      return { isVideo: isVid, timestamp: ts };
    }).filter((p: any) => p.timestamp !== null && !isNaN(p.timestamp));

    let topFormat: 'Reels' | 'Carousels' | 'Mixed' = 'Mixed';
    let activitySplit = 'N/A';
    
    if (posts.length > 0) {
      const videoCount = posts.filter((p: any) => p.isVideo).length;
      const imageCount = posts.length - videoCount;
      topFormat = videoCount > imageCount ? 'Reels' : 'Carousels';

      posts.sort((a: any, b: any) => b.timestamp - a.timestamp);

      if (posts.length > 1) {
        const date1 = posts[0].timestamp;
        const date2 = posts[posts.length - 1].timestamp;
        const diffDays = Math.max(1, Math.abs(date1 - date2) / (1000 * 60 * 60 * 24));
        const postsPerDay = posts.length / diffDays;
        
        if (postsPerDay >= 1) {
          activitySplit = `${postsPerDay.toFixed(1)} posts/day`;
        } else {
          activitySplit = `${(postsPerDay * 7).toFixed(1)} posts/week`;
        }
      }
    }

    const estRev = Math.floor((followers * 0.04 * 3) * 0.015 * 97);
    const emailMatch = bioText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);

    const lead: InstagramLead = {
      username: username,
      fullName: fullName,
      handle: `@${username}`,
      niche: niche,
      followers: followers,
      dailyWeeklySplit: activitySplit,
      topFormat: topFormat,
      estRevenueGap: estRev,
      email: emailMatch ? emailMatch[0] : 'DM Only',
      bio: bioText,
      profilePic: profilePic,
      externalUrl: externalUrlRaw,
      isAiGenerated: false
    };

    qualifiedLeads.push(lead);
  }

  onProgress(`Phase 4: Executing High-Speed Batch Strategy Analysis...`, 85);
  
  // BATCH OPTIMIZATION: Process all strategies in ONE API call instead of loops
  const batchResults = await batchAnalyzeLeads(qualifiedLeads);
  
  const finalizedLeads: InstagramLead[] = qualifiedLeads.map(lead => {
    const analysis = batchResults[lead.username];
    return {
      ...lead,
      suggestedProduct: analysis?.strategy || {
        name: "Tailored Growth Blueprint",
        type: "Mini-Course",
        description: "A comprehensive guide designed to solve their audience's primary pain point in this niche."
      },
      competitors: analysis?.competitors || []
    };
  });

  return { leads: finalizedLeads, sources };
};

// --- LITE MODE (AI ONLY FALLBACK) ---
export const geminiSearchFallback = async (niche: string, count: number, excludedUsernames: string[] = []): Promise<{leads: InstagramLead[], sources: any[]}> => {
  if (!process.env.API_KEY) throw new Error("GEMINI_KEY_MISSING");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const exclusionSnippet = excludedUsernames.length > 0 
    ? `\nCRITICAL: Do NOT include any of the following usernames, as they have already been audited: ${excludedUsernames.join(', ')}.`
    : "";

  const prompt = `Find exactly ${count} Instagram micro-influencers (10k-100k followers) in the "${niche}" niche. 
  Focus on creators with high engagement who do NOT have courses, ebooks, or obvious stores in their bio.${exclusionSnippet}
  Return a JSON object with an "influencers" array. 
  Fields: username, fullName, niche, followers (number), bio, topFormat ('Reels' or 'Carousels'), externalUrl.`;

  try {
    const response = await withRetry<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            influencers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  username: { type: Type.STRING },
                  fullName: { type: Type.STRING },
                  niche: { type: Type.STRING },
                  followers: { type: Type.NUMBER },
                  bio: { type: Type.STRING },
                  topFormat: { type: Type.STRING },
                  externalUrl: { type: Type.STRING }
                },
                required: ["username", "followers"]
              }
            }
          }
        }
      }
    }));

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Extract actual URLs from the grounding chunks
    const sourceUrls: string[] = sources
      .map((chunk: any) => chunk.web?.uri)
      .filter(Boolean);

    const text = response.text;
    if (!text) throw new Error("AI_NO_RESPONSE");
    
    const data = JSON.parse(text.trim());

    const rawLeads = (data.influencers || []).map((inf: any) => {
      const safeFollowers = parseNumeric(inf.followers);
      const estRev = Math.floor((safeFollowers * 0.04 * 3) * 0.015 * 97);
      
      return {
        username: parseString(inf.username),
        fullName: parseString(inf.fullName, inf.username),
        handle: `@${parseString(inf.username)}`,
        niche: parseString(inf.niche, niche),
        followers: safeFollowers,
        dailyWeeklySplit: "Est. 1.2 posts/day",
        topFormat: (inf.topFormat === 'Reels' || inf.topFormat === 'Carousels' ? inf.topFormat : 'Mixed') as any,
        estRevenueGap: estRev,
        email: 'DM Only',
        bio: parseString(inf.bio),
        isAiGenerated: true,
        externalUrl: parseString(inf.externalUrl)
      };
    });

    // BATCH OPTIMIZATION: Process all strategies in ONE API call instead of loops
    const batchResults = await batchAnalyzeLeads(rawLeads);
    
    const leadsWithStrategy: InstagramLead[] = rawLeads.map((l: any) => {
      const analysis = batchResults[l.username];
      return { 
        ...l, 
        suggestedProduct: analysis?.strategy || {
          name: "Tailored Growth Blueprint",
          type: "Mini-Course",
          description: "A comprehensive guide designed to solve their audience's primary pain point in this niche."
        }, 
        competitors: analysis?.competitors || [],
        groundingSources: sourceUrls 
      };
    });

    return { leads: leadsWithStrategy, sources };
  } catch (err) {
    console.error("Gemini Fallback Error:", err);
    throw err;
  }
};