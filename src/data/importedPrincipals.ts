import { School, AppUser, PendingInvite, PortalSettings, FirebaseMailDocument, ActivityEvent } from '../types';
import { renderInviteEmail } from '../utils/emailUtils';
import { buildHtmlEmail } from '../services/emailService';
import { doc, writeBatch, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, cleanForFirestore } from '../lib/firebase';

export interface RawPrincipalRecord {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  schoolName: string;
  notes?: string;
}

export interface MatchedPrincipalImportItem {
  id: string;
  principalName: string;
  email: string;
  phone: string;
  rawSchoolName: string;
  matchedSchoolId?: string;
  matchedSchoolName?: string;
  matchStatus: 'matched' | 'unmatched' | 'inactive';
  role: 'principal' | 'additional_contact';
  isMatched: boolean;
}

export const RAW_PRINCIPAL_ROWS: RawPrincipalRecord[] = [
  { firstName: 'Angelica', lastName: 'Altamirano', email: 'aaltamirano@cps.edu', phone: '(312) 388-1312', schoolName: 'Hubbard High School' },
  { firstName: 'Alexis', lastName: 'Gonzales', email: 'aegonzales@cps.edu', phone: '773-534-1650', schoolName: 'Corkery Elementary School' },
  { firstName: 'Amanda', lastName: 'Rosman', email: 'amanda@boggsschool.org', phone: '313-408-7235', schoolName: 'The James & Grace Lee Boggs School' },
  { firstName: 'Ashley', lastName: 'Hegwood', email: 'avhegwood@cps.edu', phone: '773-535-7860', schoolName: 'Ashburn Community Elementary School' },
  { firstName: 'Charles', lastName: 'Anderson', email: 'canderson@cps.edu', phone: '(773) 534-6250', schoolName: 'Michele Clark' },
  { firstName: 'Carmen', lastName: 'Medina', email: 'cmedina@cps.edu', phone: '(708) 528-7801', schoolName: 'James Hedges Fine & Performing Arts School' },
  { firstName: 'Chandra', lastName: 'Byrd-Wright', email: 'crbyrd-wright@cps.edu', phone: '773-259-0538', schoolName: 'Dunne STEM Academy' },
  { firstName: 'Carina', lastName: 'Martinez', email: 'cymartinez@cps.edu', phone: '(773) 979-3550', schoolName: 'Washington High School' },
  { firstName: 'Dawn', lastName: 'Sydnor Cole', email: 'dasydnor@cps.edu', phone: '(773) 535-9288', schoolName: 'Morrill Math & Science Elementary School' },
  { firstName: 'Venus', lastName: 'DeLoach', email: 'ddvenus@cps.edu', phone: '(773) 406-1886', schoolName: 'George Washington Carver Elementary School' },
  { firstName: 'Daniel', lastName: 'Heylin', email: 'dheylin@cps.edu', phone: '(773) 534-4400', schoolName: 'Kelvyn Park High School' },
  { firstName: 'Dawn', lastName: 'Ramos', email: 'dmramos1@cps.edu', phone: '(773) 619-9969', schoolName: 'Edward Tilden Community Career High School' },
  { firstName: 'Emily', lastName: 'Feltes', email: 'eafeltes@cps.edu', phone: '773-534-8520', schoolName: 'North-Grand HS' },
  { firstName: 'Eileen', lastName: 'Kennedy', email: 'emkennedy@cps.edu', phone: '(773) 535-4945', schoolName: 'Richards Career Academy' },
  { firstName: 'Francisco', lastName: 'Leal', email: 'fleal@cps.edu', phone: '(773) 577-7753', schoolName: 'Gale Community Academy' },
  { firstName: 'Francisco', lastName: 'Oliva Gonzalez', email: 'folivagonzalez@cps.edu', phone: '773-535-4515', schoolName: 'Nathan S. Davis Dual Language School' },
  { firstName: 'Gerardo', lastName: 'Arriaga', email: 'garriaga@cps.edu', phone: '773-841-3189', schoolName: 'Monarcas Academy' },
  { firstName: 'Genessa', lastName: 'Brown', email: 'gbrown@nlcphs.org', phone: '(773) 542-1490', schoolName: 'North Lawndale College Prep' },
  { firstName: 'Hamed', lastName: 'Flores', email: 'haflores@cps.edu', phone: '773-620-1412', schoolName: 'Madero Middle School' },
  { firstName: 'Harrison', lastName: 'Baker', email: 'hbaker6@cps.edu', phone: '(773) 535-0585', schoolName: 'Murray Language Academy' },
  { firstName: 'Homero', lastName: 'Penuelas', email: 'hlpenuelas@cps.edu', phone: '708-983-9978', schoolName: 'Curie High School' },
  { firstName: 'Jeremy', lastName: 'Feiwell', email: 'jcfeiwell@cps.edu', phone: '773-534-1465', schoolName: 'Cardenas' },
  { firstName: 'Juan Carlos', lastName: 'Ocon', email: 'jcocon@cps.edu', phone: '312-217-7793', schoolName: 'Benito Juarez Community Academy' },
  { firstName: 'Jorge', lastName: 'Melgar', email: 'jmmelgar@cps.edu', phone: '(312) 543-4151', schoolName: 'Belmont-Cragin Elementary School' },
  { firstName: 'Jammie', lastName: 'Poole', email: 'jpoolejr@cps.edu', phone: '(312) 589-8612', schoolName: 'John Marshall High School' },
  { firstName: 'Kamilah', lastName: 'Hampton', email: 'klhampton2@cps.edu', phone: '(708) 769-0862', schoolName: 'Richard J Daley Elementary Academy' },
  { firstName: 'Katherine', lastName: 'Engelhardt', email: 'kmengelhardt@cps.edu', phone: '(773) 535-2365', schoolName: 'Grimes School' },
  { firstName: 'Kelly', lastName: 'Flowers', email: 'krflowers@cps.edu', phone: '(177) 384-2996', schoolName: 'Dubois Elementary School' },
  { firstName: 'Kyla', lastName: 'Mathews', email: 'kwmathews@cps.edu', phone: '(773) 534-2000', schoolName: 'Rodger C. Sullivan High School' },
  { firstName: 'Lisa', lastName: 'Epstein', email: 'laepstein@cps.edu', phone: '(773) 535-2255', schoolName: 'Richard Henry Lee Elementary' },
  { firstName: 'Kathy', lastName: 'Lause', email: 'LauseKM@myips.org', phone: '317-502-3391', schoolName: 'Rousseau McClellan Montessori School 91' },
  { firstName: 'Latasha', lastName: 'Taylor', email: 'lmtaylor8@cps.edu', phone: '(773) 535-6000', schoolName: 'Chicago Vocational High School' },
  { firstName: 'Lakeya', lastName: 'Poston', email: 'lposton@cps.edu', phone: '630-202-1650', schoolName: 'Willa Cather Elementary School' },
  { firstName: 'Lawrence', lastName: 'Spaulding', email: 'lpspaulding@cps.edu', phone: '773-535-5177', schoolName: 'Julian High School' },
  { firstName: 'LaToya', lastName: 'Edmondson', email: 'LWOODS2@CPS.EDU', phone: '773-534-6025', schoolName: 'Milton Brunson Math and Science Specialty Elementary School' },
  { firstName: 'Marcie', lastName: 'Byrd', email: 'mabyrd@cps.edu', phone: '773-807-8533', schoolName: 'Henry H. Nash Elementary School' },
  { firstName: 'Melissa', lastName: 'Carlon', email: 'macarlon@cps.edu', phone: '917-664-1709', schoolName: 'George Washington Elementary School' },
  { firstName: 'Mark', lastName: 'Janka', email: 'mejanka1@cps.edu', phone: '(773) 534-4451', schoolName: 'Jose de Diego Community Academy' },
  { firstName: 'Melissa', lastName: 'Romero', email: 'Melissa_Romero@isdschools.org', phone: '816-521-5360', schoolName: 'Van Horn High School' },
  { firstName: 'Mark', lastName: 'Carson', email: 'mlcarson@cps.edu', phone: '773-619-9997', schoolName: 'Nicholson STEM Academy' },
  { firstName: 'Patricia', lastName: 'Hernandez', email: 'phernandez3@cps.edu', phone: '773-704-4424', schoolName: 'Agustin Lara Academy' },
  { firstName: 'Romian', lastName: 'Crockett', email: 'rccrockett@cps.edu', phone: '(312) 871-9255', schoolName: 'Chalmers Elementary School' },
  { firstName: 'Ryan', lastName: 'Belville', email: 'Rdbelville@cps.edu', phone: '(773) 484-6077', schoolName: 'Sharon Christa McAuliffe Elementary School' },
  { firstName: 'Rebecca', lastName: 'Kijek', email: 'rlkijek@cps.edu', phone: '773-535-1453', schoolName: 'Peace and Education High School' },
  { firstName: 'Raul', lastName: 'Magdaleno', email: 'rmmagdaleno@cps.edu', phone: '(312) 852-1521', schoolName: 'Thomas Kelly College Prep' },
  { firstName: 'Rochelle', lastName: 'Bryant', email: 'rmbryant@cps.edu', phone: '(312) 513-2200', schoolName: 'Orr Academy High School' },
  { firstName: 'Rosa', lastName: 'Jimenez', email: 'rmjimenez1@cps.edu', phone: '773-592-1656', schoolName: 'Solorio Academy High School' },
  { firstName: 'Shelagh', lastName: 'Jackson', email: 'sajackson1@cps.edu', phone: '(773) 535-1804', schoolName: 'Mollison Elementary School' },
  { firstName: 'Sarah', lastName: 'Trevino-Terronez', email: 'sjtrevino@cps.edu', phone: '773-343-5396', schoolName: 'Funston Elementary School' },
  { firstName: 'Shamona', lastName: 'Mcdaniel', email: 'sqmcdaniel@cps.edu', phone: '773-612-0726', schoolName: 'Roswell B. Mason Elementary School' },
  { firstName: 'Tamara', lastName: 'Davis', email: 'tldavis28@cps.edu', phone: '(773) 534-1483', schoolName: 'Theodore Herzl School of Excellence' },
  { firstName: 'Tyrese', lastName: 'Graham', email: 'tlgraham@cps.edu', phone: '(177) 353-4288', schoolName: 'Uplift Community High School' },
  { firstName: 'Virag', lastName: 'Nanavati', email: 'vcnanavati@cps.edu', phone: '630-674-1811', schoolName: 'Farragut Career Academy' },
  { firstName: 'Zach', lastName: 'Korth', email: 'zmkorth@cps.edu', phone: '(312) 964-1590', schoolName: 'Morton Elementary School' },
];

/**
 * Normalizes strings for robust matching across school names
 */
export function normalizeSchoolName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(elementary|middle|high|academy|school|center|arts|prep|stem|community|specialty|fine|performing|dual|language|montessori|multicultural|career|hs)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

/**
 * Matches raw principal records to target School entities
 */
export function matchPrincipalsToSchools(
  records: RawPrincipalRecord[],
  schools: School[]
): MatchedPrincipalImportItem[] {
  return records.map((rec, idx) => {
    const rawClean = rec.schoolName?.trim() || '';
    const normRaw = normalizeSchoolName(rawClean);
    const fullName = `${rec.firstName} ${rec.lastName}`.replace(/\s+/g, ' ').trim();
    const cleanEmail = rec.email.trim().toLowerCase();

    let matchedSchool: School | undefined;

    if (rawClean) {
      // 1. Exact match
      matchedSchool = schools.find((s) => s.name.toLowerCase() === rawClean.toLowerCase());

      // 2. Contains match
      if (!matchedSchool) {
        matchedSchool = schools.find(
          (s) =>
            s.name.toLowerCase().includes(rawClean.toLowerCase()) ||
            rawClean.toLowerCase().includes(s.name.toLowerCase())
        );
      }

      // 3. Normalized stripped match
      if (!matchedSchool && normRaw.length >= 3) {
        matchedSchool = schools.find((s) => {
          const normS = normalizeSchoolName(s.name);
          return normS.includes(normRaw) || normRaw.includes(normS);
        });
      }
    }

    const isInactive =
      rec.firstName.startsWith('NOT ACTIVE') ||
      cleanEmail.includes('.bak') ||
      cleanEmail.startsWith('-') ||
      cleanEmail === '1234@gmail.com';

    return {
      id: `prin-import-${idx + 1}`,
      principalName: fullName,
      email: cleanEmail.startsWith('-') ? cleanEmail.substring(1) : cleanEmail,
      phone: rec.phone || '',
      rawSchoolName: rawClean,
      matchedSchoolId: matchedSchool?.id,
      matchedSchoolName: matchedSchool?.name,
      matchStatus: isInactive ? 'inactive' : matchedSchool ? 'matched' : 'unmatched',
      role: matchedSchool ? 'principal' : 'additional_contact',
      isMatched: !!matchedSchool && !isInactive,
    };
  });
}

/**
 * Core batch executor to synchronize matched principals, create PendingInvites,
 * update Managed Users, and enqueue rendered invitation emails in the mail queue.
 */
export async function executeBatchPrincipalImport(
  matchedItems: MatchedPrincipalImportItem[],
  schools: School[],
  settings?: PortalSettings,
  actorEmail?: string
): Promise<{
  updatedSchools: School[];
  createdInvites: PendingInvite[];
  createdUsers: AppUser[];
  queuedEmails: FirebaseMailDocument[];
  count: number;
}> {
  const updatedSchoolsMap = new Map<string, School>();
  schools.forEach((s) => updatedSchoolsMap.set(s.id, { ...s }));

  const createdInvites: PendingInvite[] = [];
  const createdUsers: AppUser[] = [];
  const queuedEmails: FirebaseMailDocument[] = [];
  const nowIso = new Date().toISOString();
  const templates = settings?.emailTemplates || [];

  const validItems = matchedItems.filter(
    (item) => item.isMatched && item.matchedSchoolId && item.email && !item.email.includes('.bak')
  );

  for (const item of validItems) {
    const school = updatedSchoolsMap.get(item.matchedSchoolId!);
    if (!school) continue;

    // 1. Update School's Principal Details
    const updatedSchool: School = {
      ...school,
      principalName: item.principalName,
      principalEmail: item.email,
      principalPhone: item.phone || school.phone,
      status: 'active',
      updatedAt: nowIso,
    };
    updatedSchoolsMap.set(school.id, updatedSchool);

    // 2. Create Pending Invite
    const inviteCode = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
    const inviteDocId = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const origin = 'https://smallmoves.org';
    const inviteLink = `${origin}/setup-account?email=${encodeURIComponent(item.email)}`;

    const pendingInvite: PendingInvite = {
      id: inviteDocId,
      email: item.email,
      name: item.principalName,
      role: 'principal',
      schoolId: school.id,
      schoolName: school.name,
      jobTitle: 'School Principal',
      invitedBy: actorEmail || 'PEF Administrator',
      invitedAt: nowIso,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending',
      inviteCode,
      notes: `Welcome to the Small Moves Principal Emergency Fund for ${school.name}. Please complete account setup and review your annual allocation.`,
    };
    createdInvites.push(pendingInvite);

    // 3. Create Managed User (AppUser)
    const userDocId = `USR-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const appUser: AppUser = {
      id: userDocId,
      name: item.principalName,
      email: item.email,
      phone: item.phone,
      role: 'principal',
      schoolId: school.id,
      schoolName: school.name,
      jobTitle: 'School Principal',
      status: 'pending',
      createdAt: nowIso,
      mfaEnabled: false,
    };
    createdUsers.push(appUser);

    // 4. Render and Queue Invitation Email
    const rendered = renderInviteEmail(templates, {
      recipient_name: item.principalName,
      recipient_email: item.email,
      school_name: school.name,
      amount: (school.annualBudget || 10000).toLocaleString(),
      role: 'principal',
      invite_link: inviteLink,
      custom_note: pendingInvite.notes,
    });

    const mailDocId = `mail-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const renderedHtml = buildHtmlEmail(rendered.subject, rendered.body, settings);

    const queuedMail: FirebaseMailDocument = {
      id: mailDocId,
      to: [item.email],
      from: `"${settings.emailProvider?.fromName || 'Small Moves Principal Emergency Fund'}" <${settings.emailProvider?.fromEmail || 'support@smallmoves.org'}>`,
      replyTo: settings.emailProvider?.replyToEmail || settings.emailProvider?.fromEmail || 'support@smallmoves.org',
      message: {
        subject: rendered.subject,
        text: rendered.body,
        html: renderedHtml,
      },
      sendgridOptions: {
        sandboxMode: !!settings.emailProvider?.sandboxMode,
        categories: ['principal_invitation', 'onboarding_queue'],
        customArgs: {
          appletId: 'pef-portal',
          triggerEvent: 'principal_invitation',
          schoolId: school.id,
          recipientRole: 'principal',
        },
      },
      metadata: {
        triggerEvent: 'principal_invitation',
        schoolId: school.id,
        templateId: rendered.template?.id || 'tpl-10',
        dispatchedBy: actorEmail || 'PEF Administrator',
        dispatchedAt: nowIso,
        isTest: false,
      },
      delivery: {
        state: 'PENDING',
        startTime: nowIso,
        info: {
          messageId: `queued-invite-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          accepted: [item.email],
          response: 'Email communications paused. Invitation placed in pending queue.',
        },
      },
      createdAt: serverTimestamp(),
    };
    queuedEmails.push(queuedMail);
  }

  // 5. Commit batch writes to Firestore
  if (db && validItems.length > 0) {
    const chunkSize = 150;
    for (let i = 0; i < validItems.length; i += chunkSize) {
      const batch = writeBatch(db);

      // School docs - TARGETED: Only update principal contact details and status; NEVER touch annualBudget or derived metrics
      const subSchools = Array.from(updatedSchoolsMap.values()).slice(i, i + chunkSize);
      for (const s of subSchools) {
        const partialUpdate: Partial<School> = {
          principalName: s.principalName,
          principalEmail: s.principalEmail,
          principalPhone: s.principalPhone,
          status: s.status,
          updatedAt: s.updatedAt,
        };
        batch.set(doc(db, 'schools', s.id), cleanForFirestore(partialUpdate), { merge: true });
      }

      // Invite docs
      const subInvites = createdInvites.slice(i, i + chunkSize);
      for (const inv of subInvites) {
        batch.set(doc(db, 'pendingInvites', inv.id), cleanForFirestore(inv), { merge: true });
      }

      // User docs
      const subUsers = createdUsers.slice(i, i + chunkSize);
      for (const u of subUsers) {
        batch.set(doc(db, 'appUsers', u.id), cleanForFirestore(u), { merge: true });
      }

      // Mail queue docs
      const subMails = queuedEmails.slice(i, i + chunkSize);
      for (const m of subMails) {
        batch.set(doc(db, settings.emailProvider?.mailCollection || 'mail', m.id), cleanForFirestore(m), { merge: true });
      }

      await batch.commit().catch((e) => console.warn('Batch write notice during principal import:', e));
    }

    // 6. Record activity audit log
    const logId = `log-import-principals-${Date.now()}`;
    const activityLog: ActivityEvent = {
      id: logId,
      actorId: actorEmail || 'admin',
      actorName: actorEmail || 'PEF Administrator',
      actorRole: 'admin',
      eventType: 'principal_update',
      message: `Batch imported ${validItems.length} school principals and queued onboarding invitations.`,
      timestamp: nowIso,
    };
    try {
      await setDoc(doc(db, 'activityLogs', logId), cleanForFirestore(activityLog));
    } catch (e) {
      console.warn('Error saving activity log:', e);
    }
  }

  return {
    updatedSchools: Array.from(updatedSchoolsMap.values()),
    createdInvites,
    createdUsers,
    queuedEmails,
    count: validItems.length,
  };
}
