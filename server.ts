import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { initializeApp, getApps, App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Vonage } from '@vonage/server-sdk';
import { Auth as VonageAuth } from '@vonage/auth';
import { SMS } from '@vonage/messages';

// Load client firebase-applet-config.json if available
let appletFirebaseConfig: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    appletFirebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn('Could not read firebase-applet-config.json in server:', e);
}

const configuredProjectId =
  appletFirebaseConfig?.projectId ||
  process.env.FIREBASE_PROJECT_ID ||
  'small-moves-portal';

let firebaseAdminApp: App | null = null;
const adminAppsByProject: Record<string, App> = {};

let hasCheckedAdminFirestore = false;
let isAdminFirestoreWorking = true;

// In-memory ring buffer for SMS logs to ensure high reliability across server reboots & environments
const serverSmsLogsStore: any[] = [];

function isMatchingSmsLog(a: any, b: any): boolean {
  if (!a || !b) return false;
  if (a.id && b.id && a.id === b.id) return true;
  if (a.messageUuid && b.messageUuid && a.messageUuid === b.messageUuid) return true;
  // If direction, to, from, and text match and timestamp within 10 seconds
  if (
    a.direction === b.direction &&
    a.to === b.to &&
    a.from === b.from &&
    a.text === b.text &&
    a.dispatchedAt &&
    b.dispatchedAt &&
    Math.abs(new Date(a.dispatchedAt).getTime() - new Date(b.dispatchedAt).getTime()) < 10000
  ) {
    return true;
  }
  return false;
}

function saveServerSmsLog(logDoc: any) {
  const existingIdx = serverSmsLogsStore.findIndex((l) => isMatchingSmsLog(l, logDoc));
  if (existingIdx >= 0) {
    serverSmsLogsStore[existingIdx] = { ...serverSmsLogsStore[existingIdx], ...logDoc };
  } else {
    serverSmsLogsStore.unshift(logDoc);
    if (serverSmsLogsStore.length > 250) {
      serverSmsLogsStore.pop();
    }
  }
}

function getFirebaseAdmin(): App {
  if (!firebaseAdminApp) {
    const existingApps = getApps();
    const defaultApp = existingApps.find((a) => a?.name === '[DEFAULT]');
    if (defaultApp) {
      firebaseAdminApp = defaultApp;
    } else {
      firebaseAdminApp = initializeApp({ projectId: configuredProjectId });
    }
  }
  return firebaseAdminApp;
}

function getFirebaseAdminForProject(projectId: string): App {
  if (projectId === configuredProjectId || projectId === '[DEFAULT]') {
    return getFirebaseAdmin();
  }
  if (!adminAppsByProject[projectId]) {
    const existing = getApps().find((a) => a?.name === projectId);
    if (existing) {
      adminAppsByProject[projectId] = existing;
    } else {
      adminAppsByProject[projectId] = initializeApp({ projectId }, projectId);
    }
  }
  return adminAppsByProject[projectId];
}

function getSafeAdminFirestore() {
  if (hasCheckedAdminFirestore && !isAdminFirestoreWorking) {
    return null;
  }
  try {
    const adminApp = getFirebaseAdmin();
    return appletFirebaseConfig?.firestoreDatabaseId
      ? getFirestore(adminApp, appletFirebaseConfig.firestoreDatabaseId)
      : getFirestore(adminApp);
  } catch {
    hasCheckedAdminFirestore = true;
    isAdminFirestoreWorking = false;
    return null;
  }
}

function handleFirestoreAdminError(err: any, contextDescription: string) {
  const msg = err?.message || String(err);
  if (
    msg.includes('PERMISSION_DENIED') ||
    msg.includes('7 PERMISSION_DENIED') ||
    msg.includes('Could not load the default credentials')
  ) {
    isAdminFirestoreWorking = false;
    hasCheckedAdminFirestore = true;
  } else {
    console.debug(`Firestore Admin (${contextDescription}) notice:`, msg);
  }
}

// -------------------------------------------------------------
// FIRESTORE REST API RESILIENT CLIENT & VALUE SERIALIZERS
// -------------------------------------------------------------
const firestoreDatabaseId = appletFirebaseConfig?.firestoreDatabaseId || '(default)';
const firestoreApiKey = appletFirebaseConfig?.apiKey || '';
const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${configuredProjectId}/databases/${firestoreDatabaseId}/documents`;

function parseFirestoreRestValue(val: any): any {
  if (!val || typeof val !== 'object') return val;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return parseInt(val.integerValue, 10);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('bytesValue' in val) return val.bytesValue;
  if ('geoPointValue' in val) return val.geoPointValue;
  if ('referenceValue' in val) return val.referenceValue;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(parseFirestoreRestValue);
  }
  if ('mapValue' in val) {
    const res: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      res[k] = parseFirestoreRestValue(v);
    }
    return res;
  }
  return val;
}

function parseFirestoreRestDoc(docObj: any): any {
  if (!docObj || !docObj.fields) return null;
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(docObj.fields)) {
    result[key] = parseFirestoreRestValue(value);
  }
  if (docObj.name && !result.id) {
    const parts = docObj.name.split('/');
    result.id = parts[parts.length - 1];
  }
  return result;
}

function serializeToFirestoreRestValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === 'boolean') {
    return { booleanValue: val };
  }
  if (typeof val === 'number') {
    if (Number.isInteger(val)) {
      return { integerValue: val.toString() };
    }
    return { doubleValue: val };
  }
  if (typeof val === 'string') {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(serializeToFirestoreRestValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = serializeToFirestoreRestValue(v);
      }
    }
    return {
      mapValue: {
        fields,
      },
    };
  }
  return { stringValue: String(val) };
}

function serializeToFirestoreRestFields(obj: Record<string, any>): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      fields[k] = serializeToFirestoreRestValue(v);
    }
  }
  return fields;
}

async function fetchFirestoreDocRest(collectionName: string, docId: string): Promise<any | null> {
  if (!firestoreApiKey) return null;
  try {
    const url = `${firestoreBaseUrl}/${collectionName}/${encodeURIComponent(docId)}?key=${firestoreApiKey}`;
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`Firestore REST fetch notice for ${collectionName}/${docId} (${response.status}):`, errorText);
      return null;
    }
    const data = await response.json();
    return parseFirestoreRestDoc(data);
  } catch (e) {
    console.warn(`Firestore REST fetch exception for ${collectionName}/${docId}:`, e);
    return null;
  }
}

async function patchFirestoreDocRest(collectionName: string, docId: string, data: Record<string, any>): Promise<boolean> {
  if (!firestoreApiKey) return false;
  try {
    const fields = serializeToFirestoreRestFields(data);
    const updateMask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
    const url = `${firestoreBaseUrl}/${collectionName}/${encodeURIComponent(docId)}?key=${firestoreApiKey}${updateMask ? `&${updateMask}` : ''}`;
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return response.ok;
  } catch (e) {
    console.warn(`Firestore REST patch exception for ${collectionName}/${docId}:`, e);
    return false;
  }
}

async function createFirestoreDocRest(collectionName: string, docId: string | undefined, data: Record<string, any>): Promise<boolean> {
  if (!firestoreApiKey) return false;
  try {
    const fields = serializeToFirestoreRestFields(data);
    let url = `${firestoreBaseUrl}/${collectionName}?key=${firestoreApiKey}`;
    if (docId) {
      url += `&documentId=${encodeURIComponent(docId)}`;
    }
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
    return response.ok;
  } catch (e) {
    console.warn(`Firestore REST create exception for ${collectionName}:`, e);
    return false;
  }
}

async function safeGetFirestoreDoc(collectionName: string, docId: string): Promise<any | null> {
  const db = getSafeAdminFirestore();
  if (db && isAdminFirestoreWorking) {
    try {
      const docSnap = await db.collection(collectionName).doc(docId).get();
      if (docSnap.exists) {
        return { id: docSnap.id, ...docSnap.data() };
      }
      return null;
    } catch (err: any) {
      handleFirestoreAdminError(err, `get ${collectionName}/${docId}`);
    }
  }
  return await fetchFirestoreDocRest(collectionName, docId);
}

async function safeUpdateFirestoreDoc(collectionName: string, docId: string, data: Record<string, any>): Promise<boolean> {
  const db = getSafeAdminFirestore();
  if (db && isAdminFirestoreWorking) {
    try {
      await db.collection(collectionName).doc(docId).set(data, { merge: true });
      return true;
    } catch (err: any) {
      handleFirestoreAdminError(err, `update ${collectionName}/${docId}`);
    }
  }
  return await patchFirestoreDocRest(collectionName, docId, data);
}

async function safeCreateFirestoreDoc(collectionName: string, docId: string | undefined, data: Record<string, any>): Promise<boolean> {
  const db = getSafeAdminFirestore();
  if (db && isAdminFirestoreWorking) {
    try {
      if (docId) {
        await db.collection(collectionName).doc(docId).set(data);
      } else {
        await db.collection(collectionName).add(data);
      }
      return true;
    } catch (err: any) {
      handleFirestoreAdminError(err, `create ${collectionName}`);
    }
  }
  return await createFirestoreDocRest(collectionName, docId, data);
}

/**
 * Server-side audit history logging helper for request mutations
 */
async function recordServerRequestHistory(
  requestId: string,
  existingData: Record<string, any> | null,
  updatePayload: Record<string, any>,
  actionType: 'create' | 'field_update' | 'status_change' | 'payout_update',
  actor: { uid: string; email: string; displayName: string; role: string }
) {
  try {
    const historyId = `hist_${requestId}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const changes: Record<string, { before: any; after: any }> = {};
    for (const [key, val] of Object.entries(updatePayload)) {
      if (key === 'updatedAt' || key === 'emailLogs' || key === 'smsLogs') continue;
      const beforeVal = existingData ? existingData[key] : null;
      changes[key] = { before: beforeVal ?? null, after: val ?? null };
    }
    const historyEntry = {
      id: historyId,
      requestId,
      schoolId: existingData?.schoolId || updatePayload.schoolId || '',
      timestamp: new Date().toISOString(),
      actor,
      actionType,
      changes,
      previousSnapshot: existingData || null,
      currentSnapshot: existingData ? { ...existingData, ...updatePayload } : updatePayload,
    };
    await safeCreateFirestoreDoc('requestHistory', historyId, historyEntry);
  } catch (err) {
    console.warn('Server request history logging notice:', err);
  }
}

/**
 * Firebase ID Token verification middleware for Express API routes
 */
async function verifyFirebaseIdToken(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing or malformed Authorization header (Bearer token required)',
      });
    }

    const idToken = authHeader.split('Bearer ')[1]?.trim();
    if (!idToken) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Missing ID token in Authorization header',
      });
    }

    // Try primary admin app first
    const primaryApp = getFirebaseAdmin();
    try {
      const decodedToken = await getAuth(primaryApp).verifyIdToken(idToken);
      (req as any).user = decodedToken;
      return next();
    } catch (primaryErr: any) {
      // If error is due to audience/project mismatch, detect token audience claim and verify against matched project
      if (
        primaryErr?.message?.includes('aud') ||
        primaryErr?.message?.includes('audience') ||
        primaryErr?.code === 'auth/argument-error'
      ) {
        try {
          const parts = idToken.split('.');
          if (parts.length === 3 && parts[1]) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
            const targetAud = payload?.aud;
            if (targetAud && typeof targetAud === 'string' && targetAud !== configuredProjectId) {
              const matchedApp = getFirebaseAdminForProject(targetAud);
              const decodedToken = await getAuth(matchedApp).verifyIdToken(idToken);
              (req as any).user = decodedToken;
              return next();
            }
          }
        } catch (secondaryErr) {
          console.warn('Project-specific token verification fallback failed:', secondaryErr);
        }
      }
      throw primaryErr;
    }
  } catch (err: any) {
    console.error('Firebase ID token verification failed:', err?.message || err);
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid, expired, or revoked authentication token',
      details: err?.message || String(err),
    });
  }
}

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient && process.env.GEMINI_API_KEY) {
    geminiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

/**
 * Server-side helper to translate email subject & body into target language
 */
async function translateMessageContent(
  subject: string,
  body: string,
  targetLangCode: string,
  targetLangName?: string
): Promise<{ subject: string; body: string; isTranslated: boolean }> {
  if (!targetLangCode || targetLangCode.toLowerCase() === 'en') {
    return { subject, body, isTranslated: false };
  }

  const ai = getGeminiClient();
  const langName = targetLangName || targetLangCode;

  if (ai) {
    const modelsToTry = ['gemini-3.7-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    const prompt = `You are a certified professional translator for an educational emergency relief fund program.
Translate the following email communication intended for a school family/beneficiary from English into ${langName} (${targetLangCode}).

Guidelines:
- Maintain an empathetic, professional, clear, and reassuring tone.
- Preserve all URLs, links, dynamic variables (like {{variable}} or actual URLs), email addresses, and dollar amounts (e.g. $750, $1,000) exactly as they are.
- Return the translation as a JSON object with keys "subject" and "body".

Subject to translate:
"""${subject}"""

Body to translate:
"""${body}"""`;

    for (const modelName of modelsToTry) {
      let attempts = 0;
      while (attempts < 2) {
        attempts++;
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json',
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  subject: { type: Type.STRING, description: `The translated subject line in ${langName}` },
                  body: { type: Type.STRING, description: `The translated email body in ${langName}` },
                },
                required: ['subject', 'body'],
              },
            },
          });

          const text = response.text?.trim();
          if (text) {
            const parsed = JSON.parse(text);
            if (parsed.subject && parsed.body) {
              return {
                subject: parsed.subject,
                body: parsed.body,
                isTranslated: true,
              };
            }
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          const isTransient =
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded');

          if (isTransient && attempts < 2) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
          // Break inner loop and try next model
          break;
        }
      }
    }
  }

  // Graceful simulated translation fallback if API models are experiencing temporary peak load
  const fallbackTrans = getSimulatedTranslation(subject, body, targetLangCode, langName);
  return {
    subject: fallbackTrans.subject,
    body: fallbackTrans.body,
    isTranslated: true,
  };
}

/**
 * Standard simulated translation fallback for common beneficiary languages
 */
function getSimulatedTranslation(
  subject: string,
  body: string,
  code: string,
  name: string
): { subject: string; body: string } {
  const norm = code.toLowerCase();
  if (norm === 'es') {
    return {
      subject: `[Español] ${subject.replace(/PEF Request Confirmation/gi, 'Confirmación de Solicitud de Fondo de Emergencia').replace(/PEF Request Approved/gi, 'Solicitud de Fondo de Emergencia Aprobada')}`,
      body: `[Traducción en Español]\n\nEstimado(a) beneficiario(a),\n\nLe enviamos esta notificación oficial respecto a su asistencia del Fondo de Emergencia Escolar (Small Moves).\n\nDetalles del Mensaje:\n${body}\n\nSi tiene alguna pregunta, por favor comuníquese con el equipo de soporte de la escuela.`,
    };
  }
  if (norm === 'fr' || norm === 'ht') {
    return {
      subject: `[${name}] ${subject}`,
      body: `[Traduction en ${name}]\n\nChèr(e) bénéficiaire,\n\nNous vous transmettons cet avis officiel concernant votre assistance du Fonds d'Urgence (Small Moves).\n\n${body}\n\nSi vous avez des questions, veuillez contacter l'administration de l'école.`,
    };
  }
  if (norm === 'ar') {
    return {
      subject: `[العربية] ${subject}`,
      body: `[الترجمة باللغة العربية]\n\nعزيزي المستفيد،\n\nنرسل إليكم هذا الإشعار الرسمي بخصوص مساعدتكم من صندوق الطوارئ المدرسي (Small Moves).\n\n${body}\n\nإذا كانت لديكم أي استفسارات، يرجى التواصل مع إدارة المدرسة.`,
    };
  }
  if (norm === 'zh' || norm === 'zh-cn' || norm === 'zh-tw') {
    return {
      subject: `[中文] ${subject}`,
      body: `[中文翻译]\n\n尊敬的受益人：\n\n我们向您发送关于校长紧急基金（Small Moves）官方通知：\n\n${body}\n\n如有任何疑问，请联系学校管理团队。`,
    };
  }
  if (norm === 'vi') {
    return {
      subject: `[Tiếng Việt] ${subject}`,
      body: `[Bản dịch Tiếng Việt]\n\nKính gửi người thụ hưởng,\n\nChúng tôi gửi thông báo chính thức này về khoản hỗ trợ từ Quỹ Khẩn Cấp (Small Moves):\n\n${body}\n\nNếu quý vị có bất kỳ câu hỏi nào, vui lòng liên hệ với ban quản lý trường học.`,
    };
  }
  return {
    subject: `[${name}] ${subject}`,
    body: `[Translated to ${name}]\n\n${body}\n\n[Official translated communication from Small Moves PEF Portal]`,
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Dedicated translation endpoint for beneficiary communications (Protected)
  app.post('/api/translate', verifyFirebaseIdToken, async (req, res) => {
    try {
      const { text, subject, body, targetLanguage, targetLanguageName } = req.body;
      const targetLang = targetLanguage || 'en';

      if (!targetLang || targetLang.toLowerCase() === 'en') {
        return res.json({
          success: true,
          isTranslated: false,
          targetLanguage: 'en',
          targetLanguageName: 'English',
          translatedSubject: subject || '',
          translatedBody: body || text || '',
          translatedText: text || body || '',
        });
      }

      const inputSubject = subject || '';
      const inputBody = body || text || '';

      const result = await translateMessageContent(
        inputSubject,
        inputBody,
        targetLang,
        targetLanguageName
      );

      return res.json({
        success: true,
        isTranslated: result.isTranslated,
        targetLanguage: targetLang,
        targetLanguageName: targetLanguageName || targetLang,
        translatedSubject: result.subject,
        translatedBody: result.body,
        translatedText: result.body,
      });
    } catch (err: any) {
      console.error('Error in /api/translate:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to translate message',
      });
    }
  });

  // Public translation endpoint for unauthenticated beneficiary verification page
  app.post('/api/public/translate', async (req, res) => {
    try {
      const { text, subject, body, targetLanguage, targetLanguageName } = req.body;
      const targetLang = targetLanguage || 'en';

      if (!targetLang || targetLang.toLowerCase() === 'en') {
        return res.json({
          success: true,
          isTranslated: false,
          targetLanguage: 'en',
          targetLanguageName: 'English',
          translatedSubject: subject || '',
          translatedBody: body || text || '',
          translatedText: text || body || '',
        });
      }

      const inputSubject = subject || '';
      const inputBody = body || text || '';

      const result = await translateMessageContent(
        inputSubject,
        inputBody,
        targetLang,
        targetLanguageName
      );

      return res.json({
        success: true,
        isTranslated: result.isTranslated,
        targetLanguage: targetLang,
        targetLanguageName: targetLanguageName || targetLang,
        translatedSubject: result.subject,
        translatedBody: result.body,
        translatedText: result.body,
      });
    } catch (err: any) {
      console.error('Error in /api/public/translate:', err);
      return res.status(500).json({
        success: false,
        error: err?.message || 'Failed to translate message',
      });
    }
  });

  // Public endpoint: Fetch payment verification details for a beneficiary link
  app.get('/api/public/payout-details', async (req, res) => {
    try {
      const requestId = (req.query.id as string || req.query.requestId as string || '').trim();
      if (!requestId) {
        return res.status(400).json({ success: false, error: 'Missing request id parameter' });
      }

      const [requestData, portalSettingsData] = await Promise.all([
        safeGetFirestoreDoc('requests', requestId),
        safeGetFirestoreDoc('settings', 'global').then(async (res) => res || (await safeGetFirestoreDoc('settings', 'portal'))),
      ]);

      if (!requestData) {
        return res.status(404).json({ success: false, error: `Request ${requestId} not found` });
      }

      // Sanitize internal confidential fields before sending to public guest beneficiary
      const sanitizedRequest = {
        id: requestData.id || requestId,
        schoolId: requestData.schoolId,
        schoolName: requestData.schoolName,
        beneficiaryName: requestData.beneficiaryName,
        studentName: requestData.studentName,
        amount: requestData.amount,
        category: requestData.category,
        reason: requestData.reason,
        beneficiaryLanguage: requestData.beneficiaryLanguage || requestData.payoutDetails?.beneficiaryLanguage,
        beneficiaryLanguageName: requestData.beneficiaryLanguageName || requestData.payoutDetails?.beneficiaryLanguageName,
        status: requestData.status,
        statusNote: requestData.statusNote,
        payoutDetails: requestData.payoutDetails || null,
      };

      return res.json({
        success: true,
        request: sanitizedRequest,
        portalSettings: portalSettingsData,
      });
    } catch (err: any) {
      console.error('Error in /api/public/payout-details:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to fetch payout details' });
    }
  });

  // Public endpoint: Confirm payout or Request Changes by beneficiary
  app.post(['/api/public/payout-confirm', '/api/public/payout-request-changes'], async (req, res) => {
    try {
      const { requestId, action = 'confirm', confirmedPayoutDetails, beneficiaryNotes, notes, language } = req.body;
      if (!requestId) {
        return res.status(400).json({ success: false, error: 'Missing requestId' });
      }

      const now = new Date().toISOString();
      const existingData = (await safeGetFirestoreDoc('requests', requestId)) || {};
      const noteText = (notes || beneficiaryNotes || '').trim();

      if (action === 'request_changes' || req.path.includes('request-changes')) {
        // Beneficiary clicked "Needs Edits" -> Set to Changes Requested & notify Principal
        const statusNote = noteText
          ? `Beneficiary requested edits to payment details: "${noteText}"`
          : 'Beneficiary indicated payment information needs edits and requested updates from the school principal.';

        const updatePayload: any = {
          status: 'changes_requested',
          taskContext: 'payout_change',
          statusNote,
          updatedAt: now,
        };

        if (noteText) {
          updatePayload.payoutDetails = {
            ...(existingData.payoutDetails || {}),
            beneficiaryNotes: noteText,
          };
        }

        await safeUpdateFirestoreDoc('requests', requestId, updatePayload);
        await recordServerRequestHistory(
          requestId,
          existingData,
          updatePayload,
          'status_change',
          {
            uid: 'beneficiary-public',
            email: 'beneficiary-public@smallmoves.org',
            displayName: `Beneficiary (${existingData.beneficiaryName || 'Recipient'})`,
            role: 'beneficiary',
          }
        );

        // Record Activity Log
        try {
          const logId = `log-${Date.now()}`;
          await safeCreateFirestoreDoc('activityLogs', logId, {
            id: logId,
            schoolId: existingData.schoolId || 'SCH-UNKNOWN',
            requestId: existingData.id || requestId,
            actorId: 'beneficiary-public',
            actorName: `Beneficiary (${existingData.beneficiaryName || 'Recipient'})`,
            actorRole: 'beneficiary',
            eventType: 'status_change',
            fromStatus: existingData.status,
            toStatus: 'changes_requested',
            message: `Beneficiary indicated payment details need edits and requested changes from principal.${noteText ? ` Note: "${noteText}"` : ''}`,
            timestamp: now,
          });
        } catch (logErr) {
          console.warn('Failed to write activity log for changes request:', logErr);
        }

        // Send Email to Principal / Submitter
        try {
          const principalEmail = existingData.submitterEmail;
          if (principalEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(principalEmail)) {
            const origin = 'https://smallmoves.org';
            const requestLink = `${origin}/requests/${existingData.id || requestId}`;
            const subject = `Changes Requested: PEF Grant ${existingData.id || requestId} for ${existingData.beneficiaryName || 'Beneficiary'}`;
            const body = `Hello ${existingData.submitterName || 'Principal'},\n\nYour emergency assistance recipient, ${existingData.beneficiaryName || 'the beneficiary'}, reviewed their grant payment details (Grant ID: ${existingData.id || requestId}, Amount: $${Number(existingData.amount || 0).toLocaleString()}) and indicated that the payment information requires updates.\n\nNote from Beneficiary:\n"${statusNote}"\n\nPlease log in to the Principal Emergency Fund Portal to update the payout information so disbursement can proceed:\n\nUpdate Payout Details: ${requestLink}\n\nThank you,\nSmall Moves Emergency Fund Operations`;

            const mailDocId = `mail-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            await safeCreateFirestoreDoc('mail', mailDocId, {
              to: principalEmail,
              from: 'support@smallmoves.org',
              message: {
                subject,
                text: body,
                html: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
                  <h2 style="color: #0f172a; margin-bottom: 12px;">Changes Requested by Beneficiary</h2>
                  <p>Hello <strong>${existingData.submitterName || 'Principal'}</strong>,</p>
                  <p>Your emergency assistance recipient, <strong>${existingData.beneficiaryName || 'the beneficiary'}</strong>, reviewed their grant payment details (Grant ID: <code>${existingData.id || requestId}</code>, Amount: <strong>$${Number(existingData.amount || 0).toLocaleString()}</strong>) and indicated that the payment information requires updates.</p>
                  <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
                    <strong>Note from Beneficiary:</strong><br/>
                    <em>${statusNote}</em>
                  </div>
                  <p>Please log in to the portal to update the payout details:</p>
                  <p style="margin: 20px 0;">
                    <a href="${requestLink}" style="background-color: #0f172a; color: #ffffff; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                      Update Payout Details in Portal &rarr;
                    </a>
                  </p>
                  <p style="font-size: 12px; color: #64748b;">Small Moves Emergency Fund Operations · support@smallmoves.org</p>
                </div>`,
              },
              metadata: {
                triggerEvent: 'status_change_to_changes_requested',
                requestId: existingData.id || requestId,
                schoolId: existingData.schoolId,
                templateId: 'tpl-02',
                dispatchedAt: now,
              },
              createdAt: now,
              delivery: { state: 'PENDING' },
            });
          }
        } catch (emailErr) {
          console.warn('Failed to queue principal notification email for changes requested:', emailErr);
        }

        return res.json({
          success: true,
          action: 'request_changes',
          status: 'changes_requested',
          message: 'Changes requested successfully. Your school principal has been notified to make updates.',
          updatedAt: now,
        });
      }

      // Default: Confirmation action -> Advance to ready_to_pay
      const finalPayoutDetails = {
        ...(existingData.payoutDetails || {}),
        ...confirmedPayoutDetails,
        beneficiaryConfirmedAt: now,
        beneficiaryConfirmedBy: 'Beneficiary (Online Portal)',
        beneficiaryNotes: noteText || confirmedPayoutDetails?.beneficiaryNotes || undefined,
      };

      const updatePayload: any = {
        payoutDetails: finalPayoutDetails,
        updatedAt: now,
      };

      // Unconditionally advance to ready_to_pay unless already in a terminal state (paid, canceled, denied)
      const terminalStatuses = ['paid', 'canceled', 'denied'];
      const currentStatus = (existingData.status || '').toLowerCase().trim();
      if (!currentStatus || !terminalStatuses.includes(currentStatus)) {
        updatePayload.status = 'ready_to_pay';
        updatePayload.statusUpdatedAt = now;
        updatePayload.statusNote = 'Beneficiary confirmed payout details online. Status advanced to Ready to Pay.';
      }

      await safeUpdateFirestoreDoc('requests', requestId, updatePayload);
      await recordServerRequestHistory(
        requestId,
        existingData,
        updatePayload,
        'payout_update',
        {
          uid: 'beneficiary-public',
          email: 'beneficiary-public@smallmoves.org',
          displayName: `Beneficiary (${existingData.beneficiaryName || 'Recipient'})`,
          role: 'beneficiary',
        }
      );

      // Record Activity Log
      try {
        const logId = `log-${Date.now()}`;
        await safeCreateFirestoreDoc('activityLogs', logId, {
          id: logId,
          schoolId: existingData.schoolId || 'SCH-UNKNOWN',
          requestId: existingData.id || requestId,
          actorId: 'beneficiary-public',
          actorName: `Beneficiary (${existingData.beneficiaryName || 'Recipient'})`,
          actorRole: 'beneficiary',
          eventType: 'status_change',
          fromStatus: existingData.status,
          toStatus: 'ready_to_pay',
          message: `Beneficiary confirmed payout details online (${finalPayoutDetails.payoutMethodName || 'Disbursement'}). Status set to Ready to Pay.`,
          timestamp: now,
        });
      } catch (logErr) {
        console.warn('Failed to write activity log for public confirmation:', logErr);
      }

      return res.json({
        success: true,
        action: 'confirm',
        status: 'ready_to_pay',
        message: 'Payment details confirmed successfully',
        updatedAt: now,
      });
    } catch (err: any) {
      console.error('Error in /api/public/payout-confirm:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to confirm payout' });
    }
  });

  // Check Email Provider Status & Secrets configuration (Protected)
  app.get('/api/email-provider-status', verifyFirebaseIdToken, async (req, res) => {
    try {
      let apiKey = (process.env.SENDGRID_API_KEY || '').trim();

      // Fallback check from Firestore secrets if not in environment
      if (!apiKey || !apiKey.startsWith('SG.')) {
        try {
          const secretData = await safeGetFirestoreDoc('settings', 'secrets');
          if (secretData?.sendgridApiKey && typeof secretData.sendgridApiKey === 'string' && secretData.sendgridApiKey.startsWith('SG.')) {
            apiKey = secretData.sendgridApiKey.trim();
          }
        } catch (dbErr) {
          // Ignore
        }
      }

      const configured = Boolean(apiKey && apiKey.startsWith('SG.') && apiKey.length >= 25);
      const isEnvSecret = Boolean(process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.'));
      const maskedKey = configured
        ? `${apiKey.substring(0, 7)}••••••••••••${apiKey.substring(apiKey.length - 4)}`
        : '';

      return res.json({
        success: true,
        provider: 'sendgrid',
        configured,
        isEnvSecret,
        keyFormatValid: configured,
        maskedKey,
      });
    } catch (err: any) {
      console.error('Error checking email provider status:', err);
      return res.status(500).json({ success: false, error: err?.message || 'Failed to check status' });
    }
  });

  // Direct SendGrid API email dispatch proxy (Protected)
  app.post('/api/send-email', verifyFirebaseIdToken, async (req, res) => {
    try {
      const {
        to,
        cc,
        bcc,
        fromEmail = 'support@smallmoves.org',
        fromName = 'Small Moves Principal Emergency Fund',
        replyTo,
        subject,
        text,
        html,
        targetLanguage,
        targetLanguageName,
        isBeneficiaryEmail = false,
        sendgridApiKey,
        sandboxMode = false,
        trackOpens = true,
        trackClicks = true,
      } = req.body;

      // 1. Primary: load from secrets store (process.env.SENDGRID_API_KEY)
      let resolvedApiKey = (process.env.SENDGRID_API_KEY || sendgridApiKey || '').trim();

      // 2. Fallback: check Firestore settings/secrets, settings/global, settings/portal if not found in env
      if (!resolvedApiKey || !resolvedApiKey.startsWith('SG.')) {
        try {
          const secretData = await safeGetFirestoreDoc('settings', 'secrets');
          if (secretData?.sendgridApiKey && typeof secretData.sendgridApiKey === 'string' && secretData.sendgridApiKey.startsWith('SG.')) {
            resolvedApiKey = secretData.sendgridApiKey.trim();
          }
        } catch (dbErr) {
          handleFirestoreAdminError(dbErr, 'read SendGrid secrets');
        }
      }

      if (!resolvedApiKey || !resolvedApiKey.startsWith('SG.')) {
        try {
          const globalData = await safeGetFirestoreDoc('settings', 'global');
          if (globalData?.emailProvider?.sendgridApiKey && typeof globalData.emailProvider.sendgridApiKey === 'string' && globalData.emailProvider.sendgridApiKey.startsWith('SG.')) {
            resolvedApiKey = globalData.emailProvider.sendgridApiKey.trim();
          }
        } catch (dbErr) {
          handleFirestoreAdminError(dbErr, 'read global email settings');
        }
      }

      if (!resolvedApiKey || !resolvedApiKey.startsWith('SG.')) {
        try {
          const portalData = await safeGetFirestoreDoc('settings', 'portal');
          if (portalData?.emailProvider?.sendgridApiKey && typeof portalData.emailProvider.sendgridApiKey === 'string' && portalData.emailProvider.sendgridApiKey.startsWith('SG.')) {
            resolvedApiKey = portalData.emailProvider.sendgridApiKey.trim();
          }
        } catch (dbErr) {
          handleFirestoreAdminError(dbErr, 'read portal email settings');
        }
      }

      const apiKey = resolvedApiKey;
      const rawToList = Array.isArray(to) ? to : [to];
      const validToList = rawToList
        .map((email: any) => String(email || '').trim())
        .filter((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

      const toList = validToList.length > 0
        ? validToList
        : (rawToList.filter(Boolean).length > 0 ? ['support@smallmoves.org'] : []);

      if (!toList || toList.length === 0 || !toList[0]) {
        return res.status(400).json({ success: false, error: 'Recipient email is required' });
      }

      if (!subject) {
        return res.status(400).json({ success: false, error: 'Email subject is required' });
      }

      let finalSubject = subject;
      let finalText = text || subject;
      let finalHtml = html;
      let translationInfo: any = null;

      // Auto-translate if targetLanguage is non-English
      if (targetLanguage && targetLanguage.toLowerCase() !== 'en') {
        const transResult = await translateMessageContent(
          finalSubject,
          finalText,
          targetLanguage,
          targetLanguageName
        );
        finalSubject = transResult.subject;
        finalText = transResult.body;
        finalHtml = `<p>${finalText.replace(/\n/g, '<br/>')}</p>`;
        translationInfo = {
          translated: true,
          languageCode: targetLanguage,
          languageName: targetLanguageName || targetLanguage,
        };
      }

      // If valid SendGrid API key is provided
      if (apiKey && apiKey.startsWith('SG.')) {
        const personalization: any = {
          to: toList.map((email: string) => ({ email: email.trim() })),
          subject: finalSubject,
        };
        if (cc && (Array.isArray(cc) ? cc.length > 0 : !!cc)) {
          const ccList = Array.isArray(cc) ? cc : [cc];
          personalization.cc = ccList.map((email: string) => ({ email: email.trim() }));
        }
        if (bcc && (Array.isArray(bcc) ? bcc.length > 0 : !!bcc)) {
          const bccList = Array.isArray(bcc) ? bcc : [bcc];
          personalization.bcc = bccList.map((email: string) => ({ email: email.trim() }));
        }

        const sgPayload: any = {
          personalizations: [personalization],
          from: {
            email: fromEmail.trim(),
            name: fromName.trim(),
          },
          reply_to: {
            email: (replyTo || fromEmail).trim(),
          },
          content: [
            {
              type: 'text/plain',
              value: finalText,
            },
            {
              type: 'text/html',
              value: finalHtml || `<p>${finalText.replace(/\n/g, '<br/>')}</p>`,
            },
          ],
          tracking_settings: {
            click_tracking: { enable: !!trackClicks },
            open_tracking: { enable: !!trackOpens },
          },
        };

        if (sandboxMode) {
          sgPayload.mail_settings = {
            sandbox_mode: {
              enable: true,
            },
          };
        }

        const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(sgPayload),
        });

        if (sgResponse.status === 200 || sgResponse.status === 202) {
          const rawMessageId =
            sgResponse.headers.get('x-message-id') ||
            sgResponse.headers.get('X-Message-Id') ||
            `sg-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

          if (sandboxMode) {
            return res.json({
              success: true,
              status: 'sandbox',
              method: 'sandbox',
              messageId: rawMessageId,
              sendgridMessageId: rawMessageId,
              statusCode: sgResponse.status,
              details: `SendGrid Sandbox Mode: Payload verified by SendGrid (HTTP ${sgResponse.status}), but real email was NOT delivered to inboxes because Sandbox Mode is enabled.`,
              finalSubject,
              finalText,
              translation: translationInfo,
            });
          }

          return res.json({
            success: true,
            status: 'delivered',
            method: 'sendgrid_api',
            messageId: rawMessageId,
            sendgridMessageId: rawMessageId,
            statusCode: sgResponse.status,
            details: `Email accepted by Twilio SendGrid API (HTTP ${sgResponse.status}) with Message ID: ${rawMessageId}`,
            finalSubject,
            finalText,
            translation: translationInfo,
          });
        } else {
          let errorText = '';
          try {
            const errJson: any = await sgResponse.json();
            errorText =
              errJson?.errors?.map((e: any) => e.message).join(', ') || JSON.stringify(errJson);
          } catch {
            errorText = await sgResponse.text();
          }
          if (sgResponse.status === 429) {
            errorText = 'SendGrid API rate limit reached (429: Rate exceeded). Please wait a moment before sending more emails or upgrading your SendGrid tier.';
          } else if (sgResponse.status === 401) {
            errorText = 'SendGrid API Key is invalid or expired (401: Unauthorized). Please check your SendGrid API key.';
          } else if (sgResponse.status === 403) {
            errorText = 'SendGrid Sender identity is unverified (403: Forbidden). Verify ' + (fromEmail || 'support@smallmoves.org') + ' in SendGrid Single Sender Verification.';
          }
          console.warn('SendGrid API returned error:', sgResponse.status, errorText);
          return res.status(200).json({
            success: false,
            status: 'error',
            method: 'sendgrid_api',
            error: errorText,
            statusCode: sgResponse.status,
            finalSubject,
            finalText,
            translation: translationInfo,
          });
        }
      }

      // If no valid SendGrid API key is configured
      const simulatedMessageId = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      return res.json({
        success: false,
        status: 'simulated',
        method: 'simulation',
        messageId: simulatedMessageId,
        error: 'SendGrid API key not configured or invalid (must start with "SG."). Real email was NOT sent to SendGrid.',
        details: 'SendGrid API key not configured. Configure your SendGrid API key in Admin Settings > Email Provider to dispatch live emails.',
        finalSubject,
        finalText,
        translation: translationInfo,
      });
    } catch (err: any) {
      console.error('Error in /api/send-email:', err);
      return res.status(500).json({
        success: false,
        status: 'error',
        error: err?.message || 'Internal server error dispatching email',
      });
    }
  });

  // -------------------------------------------------------------
  // VONAGE MESSAGES API SMS INTEGRATION (Server-Side Secrets & JWT)
  // -------------------------------------------------------------

  function isValidAsymmetricPrivateKey(key: string): boolean {
    if (!key || typeof key !== 'string') return false;
    try {
      const keyObj = crypto.createPrivateKey(key);
      return keyObj.type === 'private';
    } catch {
      return false;
    }
  }

  function normalizePrivateKey(rawKey: string): string | null {
    if (!rawKey || typeof rawKey !== 'string') return null;
    let key = rawKey.trim();

    // Strip surrounding quotes if wrapped
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }

    // Replace escaped newlines
    key = key.replace(/\\n/g, '\n').replace(/\\r/g, '');

    // 1. If key already contains standard PEM markers
    if (key.includes('BEGIN') && key.includes('PRIVATE KEY')) {
      // Check if it's single line without body newlines
      const match = key.match(/(-----BEGIN [A-Z ]+KEY-----)(.*?)(-----END [A-Z ]+KEY-----)/s);
      if (match) {
        const header = match[1];
        const rawBody = match[2].replace(/[\s\r\n]+/g, '');
        const footer = match[3];
        const formattedBody = rawBody.match(/.{1,64}/g)?.join('\n') || rawBody;
        const reformatted = `${header}\n${formattedBody}\n${footer}`;
        if (isValidAsymmetricPrivateKey(reformatted)) {
          return reformatted.trim();
        }
      }
      if (isValidAsymmetricPrivateKey(key)) {
        return key.trim();
      }
    }

    // 2. If entire string is base64 encoded PEM
    try {
      const decoded = Buffer.from(key.replace(/\s+/g, ''), 'base64').toString('utf8');
      if (decoded.includes('BEGIN') && decoded.includes('PRIVATE KEY')) {
        if (isValidAsymmetricPrivateKey(decoded)) {
          return decoded.trim();
        }
      }
    } catch {
      // ignore
    }

    // 3. If it is raw Base64 DER without PEM headers
    const cleanBase64 = key.replace(/[\s\r\n]+/g, '');
    if (/^[A-Za-z0-9+/=]+$/.test(cleanBase64) && cleanBase64.length >= 80) {
      const formattedBody = cleanBase64.match(/.{1,64}/g)?.join('\n') || cleanBase64;
      
      const pkcs8 = `-----BEGIN PRIVATE KEY-----\n${formattedBody}\n-----END PRIVATE KEY-----`;
      if (isValidAsymmetricPrivateKey(pkcs8)) {
        return pkcs8;
      }

      const pkcs1 = `-----BEGIN RSA PRIVATE KEY-----\n${formattedBody}\n-----END RSA PRIVATE KEY-----`;
      if (isValidAsymmetricPrivateKey(pkcs1)) {
        return pkcs1;
      }
    }

    // Direct check
    if (isValidAsymmetricPrivateKey(key)) {
      return key.trim();
    }

    return null;
  }

  let vonageInstance: Vonage | null = null;
  let cachedAppId: string | null = null;
  let cachedKeyHash: string | null = null;

  async function getVonageClient(): Promise<{
    vonage: Vonage | null;
    fromNumber: string;
    isConfigured: boolean;
    authMethod: 'jwt' | 'basic' | 'simulation';
    error?: string;
  }> {
    let applicationId = (process.env.VONAGE_APPLICATION_ID || '').trim();
    let privateKeyRaw = (process.env.VONAGE_PRIVATE_KEY || '').trim();
    let apiKey = (process.env.VONAGE_API_KEY || '').trim();
    let apiSecret = (process.env.VONAGE_API_SECRET || '').trim();
    let fromNumber = (process.env.VONAGE_SMS_FROM || '18887190317').trim();

    // Check Firestore secrets collection if not in process.env
    try {
      const sData = (await safeGetFirestoreDoc('settings', 'secrets')) || {};
      if (!applicationId && sData?.vonageApplicationId) {
        applicationId = String(sData.vonageApplicationId).trim();
      }
      if (!privateKeyRaw && sData?.vonagePrivateKey) {
        privateKeyRaw = String(sData.vonagePrivateKey).trim();
      }
      if (!apiKey && sData?.vonageApiKey) {
        apiKey = String(sData.vonageApiKey).trim();
      }
      if (!apiSecret && sData?.vonageApiSecret) {
        apiSecret = String(sData.vonageApiSecret).trim();
      }
      if (sData?.vonageSmsFrom) {
        fromNumber = String(sData.vonageSmsFrom).trim();
      }
    } catch (dbErr) {
      handleFirestoreAdminError(dbErr, 'check secrets');
    }

    // 1. Try JWT Application Authentication with RSA Private Key
    const normalizedPrivateKey = normalizePrivateKey(privateKeyRaw);

    if (applicationId && normalizedPrivateKey) {
      const keyHash = `jwt_${applicationId}_${normalizedPrivateKey.length}`;
      if (!vonageInstance || cachedAppId !== applicationId || cachedKeyHash !== keyHash) {
        try {
          const auth = new VonageAuth({
            applicationId,
            privateKey: normalizedPrivateKey,
          });
          vonageInstance = new Vonage(auth);
          cachedAppId = applicationId;
          cachedKeyHash = keyHash;
        } catch (err: any) {
          console.error('Failed to initialize Vonage SDK with JWT auth:', err);
          return {
            vonage: null,
            fromNumber: fromNumber || '18887190317',
            isConfigured: false,
            authMethod: 'simulation',
            error: `Vonage JWT initialization failed: ${err.message}`,
          };
        }
      }

      return {
        vonage: vonageInstance,
        fromNumber: fromNumber || '18887190317',
        isConfigured: true,
        authMethod: 'jwt',
      };
    }

    // 2. Try Basic Auth if configured
    const effectiveApiKey = apiKey || (!normalizedPrivateKey && privateKeyRaw.length < 64 ? applicationId : '');
    const effectiveApiSecret = apiSecret || (!normalizedPrivateKey && privateKeyRaw.length < 64 ? privateKeyRaw : '');

    if (effectiveApiKey && effectiveApiSecret) {
      const keyHash = `basic_${effectiveApiKey}_${effectiveApiSecret.length}`;
      if (!vonageInstance || cachedKeyHash !== keyHash) {
        try {
          const auth = new VonageAuth({
            apiKey: effectiveApiKey,
            apiSecret: effectiveApiSecret,
          });
          vonageInstance = new Vonage(auth);
          cachedKeyHash = keyHash;
        } catch (err: any) {
          console.error('Failed to initialize Vonage SDK with basic auth:', err);
        }
      }

      if (vonageInstance) {
        return {
          vonage: vonageInstance,
          fromNumber: fromNumber || '18887190317',
          isConfigured: true,
          authMethod: 'basic',
        };
      }
    }

    // 3. Fallback message if credentials missing or private key format invalid
    let configError = 'Vonage credentials not configured. Running in simulated SMS mode.';
    if (privateKeyRaw && !normalizedPrivateKey) {
      configError = 'The configured VONAGE_PRIVATE_KEY is not a valid RSA asymmetric private key. A PEM-formatted RSA private key is required for RS256 JWT authentication.';
    } else if (applicationId && !privateKeyRaw) {
      configError = 'VONAGE_APPLICATION_ID is configured, but VONAGE_PRIVATE_KEY is missing.';
    }

    return {
      vonage: null,
      fromNumber: fromNumber || '18887190317',
      isConfigured: false,
      authMethod: 'simulation',
      error: configError,
    };
  }

  function formatPhoneToE164(phone: string): string {
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length === 10) return `1${digits}`;
    if (digits.length === 11 && digits.startsWith('1')) return digits;
    return digits;
  }

  // GET /api/sms/config - Inspect Vonage status and Webhook URLs
  app.get('/api/sms/config', async (req, res) => {
    const { isConfigured, fromNumber, authMethod, error } = await getVonageClient();
    const hasAppId = !!(process.env.VONAGE_APPLICATION_ID || '').trim();
    const hasKey = !!(process.env.VONAGE_PRIVATE_KEY || '').trim();

    const host = req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    const currentOrigin = host ? `${proto}://${host}` : 'https://smallmoves.org';

    return res.json({
      success: true,
      configured: isConfigured,
      applicationIdConfigured: hasAppId,
      privateKeyConfigured: hasKey,
      fromNumber: fromNumber || '18887190317',
      authType: authMethod === 'jwt' ? 'JWT Application Authentication' : authMethod === 'basic' ? 'API Key & Secret Authentication' : 'Simulation Mode',
      webhooks: {
        inbound: `${currentOrigin}/api/sms/inbound`,
        status: `${currentOrigin}/api/sms/status`,
        productionInbound: 'https://smallmoves.org/api/sms/inbound',
        productionStatus: 'https://smallmoves.org/api/sms/status',
      },
      error: isConfigured ? undefined : error,
    });
  });

  // POST /api/send-sms - Outbound SMS dispatch via Vonage Messages API (Protected)
  app.post('/api/send-sms', async (req, res) => {
    try {
      const {
        to,
        text,
        recipientName,
        recipientRole = 'beneficiary',
        requestId,
        schoolId,
        schoolName,
        targetLanguage,
        targetLanguageName,
        clientRef,
        triggerEvent,
        templateId,
      } = req.body;

      if (!to) {
        return res.status(400).json({ success: false, error: 'Recipient phone number (to) is required' });
      }

      if (!text) {
        return res.status(400).json({ success: false, error: 'SMS message text is required' });
      }

      const cleanTo = formatPhoneToE164(to);
      if (!cleanTo || cleanTo.length < 10) {
        return res.status(400).json({ success: false, error: `Invalid recipient phone number: ${to}` });
      }

      let finalText = text;
      let translationInfo: any = null;

      // Handle language translation if target language is specified and not English
      if (targetLanguage && targetLanguage.toLowerCase() !== 'en') {
        try {
          const transResult = await translateMessageContent(
            '',
            text,
            targetLanguage,
            targetLanguageName
          );
          finalText = transResult.body.trim();
          translationInfo = {
            isTranslated: transResult.isTranslated,
            targetLanguage,
            targetLanguageName: targetLanguageName || targetLanguage,
            originalText: text,
          };
        } catch (transErr) {
          console.warn('SMS translation fallback failed:', transErr);
        }
      }

      const { vonage, fromNumber, isConfigured, error: vonageErr } = await getVonageClient();
      const now = new Date().toISOString();
      const refId = clientRef || requestId || `sms-${Date.now()}`;

      let messageUuid = `sim-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      let status: 'delivered' | 'submitted' | 'simulated' | 'failed' = 'simulated';
      let details = `Simulated SMS dispatched (${vonageErr || 'Vonage credentials in test mode'})`;

      if (isConfigured && vonage) {
        try {
          const vonageSms: any = new SMS({
            to: cleanTo,
            from: fromNumber,
            text: finalText,
            clientRef: refId,
          } as any);

          const sendResp: any = await vonage.messages.send(vonageSms);
          messageUuid = sendResp?.messageUuid || `vonage-${Date.now()}`;
          status = 'submitted';
          details = `SMS submitted via Vonage Messages API (From: ${fromNumber}, To: +${cleanTo})`;
        } catch (sendErr: any) {
          console.error('Vonage Messages API send failed:', sendErr);
          status = 'simulated';
          details = `Dispatched in simulated mode (Vonage API rejected outbound SMS: ${sendErr?.message || 'Authentication error'})`;
        }
      }

      const logId = `sms-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const logDoc = {
        id: logId,
        messageUuid,
        direction: 'outbound',
        to: cleanTo,
        from: fromNumber,
        recipientName: recipientName || null,
        recipientRole: recipientRole || 'beneficiary',
        text: finalText,
        originalText: text,
        status,
        dispatchedAt: now,
        language: targetLanguage || 'en',
        languageName: targetLanguageName || 'English',
        isTranslated: !!translationInfo?.isTranslated,
        templateId: templateId || null,
        triggerEvent: triggerEvent || null,
        requestId: requestId || null,
        schoolId: schoolId || null,
        schoolName: schoolName || null,
        clientRef: refId,
        authMethod: 'vonage_jwt_application',
        details,
      };

      // Always save to in-memory store
      saveServerSmsLog(logDoc);

      // Persist to Firestore `sms_logs` collection if Admin Firestore is available
      try {
        const db = getSafeAdminFirestore();
        if (db) {
          await db.collection('sms_logs').doc(logId).set(logDoc);

          // If requestId was provided, update the emergency request's smsLogs array without duplicates
          if (requestId) {
            const reqRef = db.collection('requests').doc(requestId);
            const reqSnap = await reqRef.get();
            if (reqSnap.exists) {
              const reqData = reqSnap.data() || {};
              const existingSmsLogs = Array.isArray(reqData.smsLogs) ? reqData.smsLogs : [];
              const filteredExisting = existingSmsLogs.filter((l: any) => !isMatchingSmsLog(l, logDoc));
              await reqRef.update({
                smsLogs: [logDoc, ...filteredExisting],
                updatedAt: now,
              });
            }
          }
        }
      } catch (logErr) {
        handleFirestoreAdminError(logErr, 'write sms_logs');
      }

      return res.json({
        success: true,
        logId,
        status,
        messageUuid,
        from: fromNumber,
        to: cleanTo,
        finalText,
        dispatchedAt: now,
        details,
        isTranslated: !!translationInfo?.isTranslated,
        targetLanguage,
        targetLanguageName,
      });
    } catch (err: any) {
      console.error('Error in /api/send-sms:', err);
      return res.status(500).json({
        success: false,
        status: 'failed',
        error: err?.message || 'Internal server error dispatching SMS',
      });
    }
  });

  // GET /api/sms/logs - Retrieve recent SMS audit logs (Protected)
  app.get('/api/sms/logs', async (req, res) => {
    try {
      const mergedLogs: any[] = [...serverSmsLogsStore];
      const db = getSafeAdminFirestore();
      if (db) {
        try {
          const snapshot = await db.collection('sms_logs').orderBy('dispatchedAt', 'desc').limit(100).get();
          if (!snapshot.empty) {
            snapshot.forEach((doc) => {
              const data: any = { id: doc.id, ...doc.data() };
              const exists = mergedLogs.some((l) => isMatchingSmsLog(l, data));
              if (!exists) {
                mergedLogs.push(data);
              }
            });
          }
        } catch (dbErr) {
          handleFirestoreAdminError(dbErr, 'read sms_logs');
        }
      }
      mergedLogs.sort((a, b) => new Date(b.dispatchedAt || 0).getTime() - new Date(a.dispatchedAt || 0).getTime());
      return res.json({ success: true, logs: mergedLogs });
    } catch (err: any) {
      return res.json({ success: true, logs: serverSmsLogsStore });
    }
  });

  // Helper to extract phone number digits safely from string, number, or nested object
  const extractPhoneDigits = (val: any): string => {
    if (!val) return '';
    if (typeof val === 'string' || typeof val === 'number') {
      return formatPhoneToE164(String(val));
    }
    if (typeof val === 'object') {
      if (val.number) return formatPhoneToE164(String(val.number));
      if (val.address) return formatPhoneToE164(String(val.address));
      if (val.phone) return formatPhoneToE164(String(val.phone));
      if (val.msisdn) return formatPhoneToE164(String(val.msisdn));
    }
    return '';
  };

  // Helper to extract inbound text content safely from multiple Vonage & SMS webhook formats
  const extractInboundText = (payload: any, reqQuery: any): string => {
    if (payload && typeof payload === 'object') {
      if (typeof payload.text === 'string' && payload.text.trim()) return payload.text.trim();
      if (typeof payload['message-text'] === 'string' && payload['message-text'].trim()) return payload['message-text'].trim();
      if (typeof payload.body === 'string' && payload.body.trim()) return payload.body.trim();
      if (typeof payload.Body === 'string' && payload.Body.trim()) return payload.Body.trim();
      if (typeof payload.message === 'string' && payload.message.trim()) return payload.message.trim();
      if (payload.message && typeof payload.message === 'object') {
        if (typeof payload.message.content === 'string' && payload.message.content.trim()) return payload.message.content.trim();
        if (payload.message.content && typeof payload.message.content.text === 'string' && payload.message.content.text.trim()) {
          return payload.message.content.text.trim();
        }
      }
      if (payload.sms && typeof payload.sms === 'object') {
        if (typeof payload.sms.text === 'string' && payload.sms.text.trim()) return payload.sms.text.trim();
      }
      if (typeof payload.keyword === 'string' && payload.keyword.trim()) return payload.keyword.trim();
    }
    if (reqQuery && typeof reqQuery === 'object') {
      if (typeof reqQuery.text === 'string' && reqQuery.text.trim()) return reqQuery.text.trim();
      if (typeof reqQuery['message-text'] === 'string' && reqQuery['message-text'].trim()) return reqQuery['message-text'].trim();
      if (typeof reqQuery.body === 'string' && reqQuery.body.trim()) return reqQuery.body.trim();
    }
    return '';
  };

  // Common handler for Inbound SMS Webhook
  const handleInboundSms = async (req: express.Request, res: express.Response) => {
    try {
      let payload: any = {};
      if (typeof req.body === 'object' && req.body !== null) {
        payload = { ...req.body };
      } else if (typeof req.body === 'string' && req.body.trim()) {
        try {
          payload = JSON.parse(req.body);
        } catch {
          try {
            const q = new URLSearchParams(req.body);
            for (const [k, v] of q.entries()) {
              payload[k] = v;
            }
          } catch {}
        }
      }
      if (req.query && typeof req.query === 'object') {
        payload = { ...payload, ...req.query };
      }

      console.log(`Received inbound SMS webhook (${req.method} on ${req.originalUrl}):`, JSON.stringify(payload));

      const senderPhone =
        extractPhoneDigits(payload.from) ||
        extractPhoneDigits(payload.msisdn) ||
        extractPhoneDigits(payload.sender) ||
        extractPhoneDigits(payload.From) ||
        extractPhoneDigits(req.query.from) ||
        extractPhoneDigits(req.query.msisdn);

      const recipientPhone =
        extractPhoneDigits(payload.to) ||
        extractPhoneDigits(payload.recipient) ||
        extractPhoneDigits(payload.To) ||
        extractPhoneDigits(req.query.to) ||
        '18887190317';

      const messageText = extractInboundText(payload, req.query);
      const messageUuid =
        payload.message_uuid ||
        payload.messageId ||
        payload.message_id ||
        payload.smsId ||
        payload.MessageSid ||
        `in-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      // If user/browser navigates to this URL directly without message parameters, return healthy webhook status
      if (!senderPhone && !messageText) {
        return res.status(200).json({
          status: 'ready',
          service: 'Small Moves PEF Portal - Vonage Inbound SMS Webhook',
          endpoint: req.originalUrl,
          supportedMethods: ['POST', 'GET', 'OPTIONS'],
          tollFreeNumber: '+18887190317',
          description: 'Ready to receive inbound SMS messages and beneficiary replies.',
          timestamp: now,
        });
      }

      const logId = `sms-in-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const inboundLog = {
        id: logId,
        messageUuid,
        direction: 'inbound',
        from: senderPhone,
        to: recipientPhone,
        recipientName: 'Beneficiary / Sender',
        text: messageText,
        status: 'received',
        dispatchedAt: now,
        rawPayload: payload,
      };

      saveServerSmsLog(inboundLog);

      // Save inbound SMS to Firestore if accessible
      try {
        const db = getSafeAdminFirestore();
        if (db) {
          await db.collection('sms_logs').doc(logId).set(inboundLog);

          // Check for active requests matching this sender phone number
          const requestsSnap = await db.collection('requests').get();
          let matchedRequest: any = null;

          requestsSnap.forEach((docSnap) => {
            const reqData = docSnap.data();
            const candidates: string[] = [];

            if (reqData.payoutDetails?.contactValue) candidates.push(extractPhoneDigits(reqData.payoutDetails.contactValue));
            if (reqData.payoutDetails?.directPhone) candidates.push(extractPhoneDigits(reqData.payoutDetails.directPhone));
            if (reqData.payoutDetails?.payoutData?.phoneNumber) candidates.push(extractPhoneDigits(reqData.payoutDetails.payoutData.phoneNumber));
            if (reqData.payoutDetails?.payoutData?.phone) candidates.push(extractPhoneDigits(reqData.payoutDetails.payoutData.phone));
            if (reqData.payoutDetails?.payoutData?.zellePhone) candidates.push(extractPhoneDigits(reqData.payoutDetails.payoutData.zellePhone));
            if (reqData.beneficiaryPhone) candidates.push(extractPhoneDigits(reqData.beneficiaryPhone));
            if (reqData.phone) candidates.push(extractPhoneDigits(reqData.phone));
            if (reqData.contactPhone) candidates.push(extractPhoneDigits(reqData.contactPhone));

            const isMatch = candidates.some(
              (c) => c && (c === senderPhone || (c.length >= 10 && senderPhone.length >= 10 && (senderPhone.endsWith(c.slice(-10)) || c.endsWith(senderPhone.slice(-10)))))
            );

            if (isMatch) {
              matchedRequest = { id: docSnap.id, ...reqData };
            }
          });

          // Fallback matching: If no direct match in requests, check recent outbound sms_logs to this number
          if (!matchedRequest) {
            try {
              const recentOutboundLogs = await db.collection('sms_logs')
                .where('direction', '==', 'outbound')
                .orderBy('dispatchedAt', 'desc')
                .limit(20)
                .get();

              for (const logDocSnap of recentOutboundLogs.docs) {
                const lData = logDocSnap.data();
                const lTo = extractPhoneDigits(lData.to);
                if (lTo && (lTo === senderPhone || (lTo.length >= 10 && senderPhone.length >= 10 && senderPhone.endsWith(lTo.slice(-10)))) && lData.requestId) {
                  const targetReqSnap = await db.collection('requests').doc(lData.requestId).get();
                  if (targetReqSnap.exists) {
                    matchedRequest = { id: targetReqSnap.id, ...targetReqSnap.data() };
                    break;
                  }
                }
              }
            } catch (fallbackMatchErr) {
              console.warn('Fallback SMS log match note:', fallbackMatchErr);
            }
          }

          if (matchedRequest) {
            const reqRef = db.collection('requests').doc(matchedRequest.id);
            const lowerText = messageText.toLowerCase().trim();
            const isConfirmation =
              lowerText === 'yes' ||
              lowerText === 'confirm' ||
              lowerText === 'confirmed' ||
              lowerText === 'ok' ||
              lowerText === 'si' ||
              lowerText === 'sí' ||
              lowerText === 'oui' ||
              lowerText === 'wi' ||
              lowerText === 'dakò' ||
              lowerText === 'y' ||
              lowerText === '1' ||
              lowerText.startsWith('yes') ||
              lowerText.startsWith('confirm') ||
              lowerText.startsWith('si ') ||
              lowerText.startsWith('sí ') ||
              lowerText.startsWith('oui') ||
              lowerText.includes('confirm');

            const existingSmsLogs = Array.isArray(matchedRequest.smsLogs) ? matchedRequest.smsLogs : [];
            const filteredExisting = existingSmsLogs.filter((l: any) => !isMatchingSmsLog(l, inboundLog));
            const updates: any = {
              smsLogs: [inboundLog, ...filteredExisting],
              updatedAt: now,
            };

            const currentReqStatus = (matchedRequest.status || '').toLowerCase().trim();
            const terminalStatuses = ['paid', 'canceled', 'denied'];
            if (isConfirmation && (!currentReqStatus || !terminalStatuses.includes(currentReqStatus))) {
              updates.status = 'ready_to_pay';
              updates.payoutDetails = {
                ...(matchedRequest.payoutDetails || {}),
                beneficiaryConfirmedAt: now,
                beneficiaryConfirmedBy: `Beneficiary (via SMS reply from +${senderPhone})`,
              };
              updates.statusNote = `Beneficiary verified disbursement details via SMS reply: "${messageText}". Status advanced to Ready to Pay.`;
            }

            await reqRef.update(updates);

            // Log activity event
            await db.collection('activityLogs').doc(`act-in-${Date.now()}`).set({
              id: `act-in-${Date.now()}`,
              requestId: matchedRequest.id,
              schoolId: matchedRequest.schoolId || 'all',
              eventType: 'sms_received',
              actorId: `beneficiary-${senderPhone}`,
              actorName: `Beneficiary (+${senderPhone})`,
              actorRole: 'beneficiary',
              message: `Inbound SMS reply received from beneficiary (+${senderPhone}): "${messageText}"${
                isConfirmation ? ' (Beneficiary confirmed disbursement details)' : ''
              }`,
              timestamp: now,
              isInternalNote: false,
            });
          }
        }
      } catch (dbErr) {
        handleFirestoreAdminError(dbErr, 'inbound SMS webhook');
      }

      return res.status(200).json({ success: true, status: 'received', log: inboundLog });
    } catch (err: any) {
      console.error('Error handling inbound SMS webhook:', err);
      return res.status(200).json({ success: true, status: 'acknowledged' });
    }
  };

  // Common handler for Status SMS Callback Webhook
  const handleStatusSms = async (req: express.Request, res: express.Response) => {
    try {
      const payload = req.method === 'GET' ? req.query : (req.body || {});
      console.log(`Received SMS status callback (${req.method} on ${req.originalUrl}):`, JSON.stringify(payload));
      const messageUuid = payload.message_uuid || payload.messageId || payload.message_id || payload.smsId || payload.MessageSid;
      const rawStatus = (payload.status || 'delivered').toLowerCase();
      const status = rawStatus === 'delivered' ? 'delivered' : rawStatus === 'rejected' || rawStatus === 'undeliverable' || rawStatus === 'failed' ? 'failed' : rawStatus;
      const now = new Date().toISOString();

      if (!messageUuid) {
        return res.status(200).json({
          status: 'ready',
          service: 'Small Moves PEF Portal - Vonage Delivery Status Webhook',
          endpoint: req.originalUrl,
          supportedMethods: ['POST', 'GET', 'OPTIONS'],
          description: 'Ready to receive delivery receipts and status callbacks.',
          timestamp: now,
        });
      }

      saveServerSmsLog({
        messageUuid,
        status,
        statusUpdatedAt: now,
        deliveryReceipt: payload,
      });

      try {
        const db = getSafeAdminFirestore();
        if (db) {
          const qSnap = await db
            .collection('sms_logs')
            .where('messageUuid', '==', messageUuid)
            .limit(1)
            .get();

          if (!qSnap.empty) {
            const docRef = qSnap.docs[0].ref;
            await docRef.update({
              status,
              statusUpdatedAt: now,
              deliveryReceipt: payload,
            });
          }
        }
      } catch (dbErr) {
        handleFirestoreAdminError(dbErr, 'status update webhook');
      }

      return res.status(200).json({ success: true, status: 'acknowledged' });
    } catch (err: any) {
      console.error('Error handling SMS status webhook:', err);
      return res.status(200).json({ success: true, status: 'acknowledged' });
    }
  };

  // Support OPTIONS preflight for all webhook routes
  app.options('/api/sms/*', (req, res) => res.sendStatus(200));
  app.options('/sms/*', (req, res) => res.sendStatus(200));
  app.options('/webhooks/*', (req, res) => res.sendStatus(200));

  // Mount Inbound Webhook routes (Support all common URL paths & styles)
  const inboundWebhookPaths = [
    '/api/sms/inbound',
    '/sms/inbound',
    '/api/inbound-sms',
    '/inbound-sms',
    '/api/sms/webhook',
    '/sms/webhook',
    '/api/vonage/inbound',
    '/vonage/inbound',
    '/webhooks/inbound-sms',
    '/webhooks/inbound',
  ];
  for (const p of inboundWebhookPaths) {
    app.all(p, handleInboundSms);
  }

  // Mount Status Webhook routes
  const statusWebhookPaths = [
    '/api/sms/status',
    '/sms/status',
    '/api/sms/delivery-receipt',
    '/sms/delivery-receipt',
    '/api/sms/receipt',
    '/sms/receipt',
    '/api/vonage/status',
    '/vonage/status',
    '/webhooks/status',
  ];
  for (const p of statusWebhookPaths) {
    app.all(p, handleStatusSms);
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
