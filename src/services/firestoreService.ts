import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../firebase/config';
import type {
  ChannelCategory,
  ConnectedAccount,
  FaqRule,
  InteractionItem,
  Language,
  Platform,
  SentimentType,
  TrashItem,
  UserProfile,
} from '../types/omnichat';

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

export const AVATAR_SOFIA = '/src/assets/images/avatar_contact_sofia_1795004476562.jpg';
export const AVATAR_CARLOS = '/src/assets/images/avatar_contact_carlos_1795004476538.jpg';
export const AVATAR_ELENA = '/src/assets/images/avatar_contact_elena_1795004476800.jpg';

function makeId(prefix: string): string {
  const raw = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${raw}`.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, 128);
}

export async function ensureUserProfile(user: User, preferredLanguage: Language): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    const profile: UserProfile = {
      uid: user.uid,
      email: (user.email || 'user@omnichat.app').slice(0, 254),
      displayName: (user.displayName || user.email?.split('@')[0] || 'Usuario').slice(0, 100),
      language: preferredLanguage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateUserLanguage(uid: string, language: Language): Promise<void> {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, 'users', uid), {
      language,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function seedStarterWorkspaceIfEmpty(uid: string, lang: Language): Promise<void> {
  const connectionsPath = `users/${uid}/connections`;
  try {
    const existingConnections = await getDocs(
      query(collection(db, 'users', uid, 'connections'), where('ownerId', '==', uid)),
    );
    if (!existingConnections.empty) {
      return;
    }

    const batch = writeBatch(db);
    const connIgId = makeId('conn');
    const connWaId = makeId('conn');
    const connEmailId = makeId('conn');

    const connections: ConnectedAccount[] = [
      {
        id: connWaId,
        ownerId: uid,
        platform: 'whatsapp',
        profileUrl: 'https://wa.me/34600112233',
        username: '@omnichat_soporte',
        displayLabel: 'WhatsApp · @omnichat_soporte',
        channelCategory: 'messages',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        id: connIgId,
        ownerId: uid,
        platform: 'instagram',
        profileUrl: 'https://instagram.com/estudio_norte',
        username: '@estudio_norte',
        displayLabel: 'Instagram · @estudio_norte',
        channelCategory: 'comments',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        id: connEmailId,
        ownerId: uid,
        platform: 'email',
        profileUrl: 'mailto:contacto@estudionorte.es',
        username: 'contacto@estudionorte.es',
        displayLabel: 'Correo / Email · contacto@estudionorte.es',
        channelCategory: 'emails',
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ];

    for (const conn of connections) {
      batch.set(doc(db, 'users', uid, 'connections', conn.id), conn);
    }

    const isEn = lang === 'en';

    const starterMessages: InteractionItem[] = [
      {
        id: makeId('msg'),
        ownerId: uid,
        connectionId: connWaId,
        platform: 'whatsapp',
        senderName: 'Sofía Martínez',
        senderHandle: '+34 612 840 192',
        senderAvatar: AVATAR_SOFIA,
        subjectOrContext: isEn ? 'Direct message · Order #4082' : 'Mensaje directo · Pedido #4082',
        body: isEn
          ? 'Hi! I placed an order yesterday afternoon and wanted to check the estimated delivery time to Madrid. Thank you!'
          : '¡Hola! Hice un pedido ayer por la tarde y quería confirmar cuánto tarda el envío a Madrid. ¡Muchas gracias!',
        isRead: false,
        sentiment: 'positive',
        sentimentScore: 86,
        aiSuggestedReply: isEn
          ? 'Hi Sofía! Thank you for your order #4082. Standard shipping to Madrid arrives in 24–48 business hours, and you will receive your tracking link shortly.'
          : '¡Hola Sofía! Gracias por tu pedido #4082. El envío estándar a Madrid tarda entre 24 y 48 horas laborables; en breve recibirás tu enlace de seguimiento.',
        replyText: '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        id: makeId('msg'),
        ownerId: uid,
        connectionId: connWaId,
        platform: 'linkedin',
        senderName: 'Carlos Mendoza',
        senderHandle: '@cmendoza',
        senderAvatar: AVATAR_CARLOS,
        subjectOrContext: isEn ? 'Direct message · B2B Partnership' : 'Mensaje directo · Colaboración B2B',
        body: isEn
          ? 'Hello team, we loved your latest launch. Are you open to scheduling a quick 15-minute call this week about wholesale pricing?'
          : 'Hola equipo, nos encantó vuestro último lanzamiento. ¿Tenéis disponibilidad esta semana para una breve llamada de 15 minutos sobre tarifas B2B?',
        isRead: true,
        sentiment: 'positive',
        sentimentScore: 91,
        aiSuggestedReply: isEn
          ? 'Hi Carlos, thank you for reaching out! We would love to connect. Would Thursday at 11:00 AM CET work for a 15-minute call?'
          : 'Hola Carlos, ¡muchas gracias por escribirnos! Estaremos encantados de hablar. ¿Te vendría bien el jueves a las 11:00 h para una llamada de 15 minutos?',
        replyText: '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ];

    const starterComments: InteractionItem[] = [
      {
        id: makeId('cmt'),
        ownerId: uid,
        connectionId: connIgId,
        platform: 'instagram',
        senderName: 'Elena Vance',
        senderHandle: '@elenavance.design',
        senderAvatar: AVATAR_ELENA,
        subjectOrContext: isEn ? 'Comment on Reel: Spring Collection 2026' : 'Comentario en Reel: Colección Primavera 2026',
        body: isEn
          ? 'This minimal finish looks incredible! Do you ship internationally to London and what is the price?'
          : '¡Qué acabado tan limpio y cuidado! ¿Hacéis envíos internacionales y qué precio tiene este modelo?',
        isRead: false,
        sentiment: 'positive',
        sentimentScore: 94,
        aiSuggestedReply: isEn
          ? 'Thank you so much Elena! Yes, we ship across Europe and the UK within 3–5 days. I will send you the direct link and pricing via DM right now.'
          : '¡Muchas gracias Elena! Sí, realizamos envíos internacionales en 3–5 días. Te paso ahora mismo el enlace directo con los precios detallados.',
        replyText: '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ];

    const starterEmails: InteractionItem[] = [
      {
        id: makeId('eml'),
        ownerId: uid,
        connectionId: connEmailId,
        platform: 'email',
        senderName: 'Carlos Mendoza',
        senderHandle: 'carlos@ventures.io',
        senderAvatar: AVATAR_CARLOS,
        subjectOrContext: isEn ? 'Invoice copy needed for Q4 accounting' : 'Solicitud de factura para cierre contable',
        body: isEn
          ? 'Good morning, could you please resend the PDF invoice for our October renewal? Our finance team needs it before Friday.'
          : 'Buenos días, ¿podríais reenviarme la factura en PDF de la renovación de octubre? Nuestro equipo de administración la necesita antes del viernes.',
        isRead: false,
        sentiment: 'urgent',
        sentimentScore: 62,
        aiSuggestedReply: isEn
          ? 'Good morning Carlos, of course. We are exporting the October PDF invoice right now and will attach it in our next message so your finance team has it well before Friday.'
          : 'Buenos días Carlos, por supuesto. Estamos descargando la factura de octubre en PDF para enviártela ahora mismo y que administración la tenga antes del viernes.',
        replyText: '',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ];

    const starterRules: FaqRule[] = [
      {
        id: makeId('faq'),
        ownerId: uid,
        title: isEn ? 'Shipping & delivery times' : 'Envíos y plazos de entrega',
        keywords: isEn ? ['shipping', 'delivery', 'ship', 'arrive'] : ['envío', 'envios', 'entrega', 'tarda'],
        replyTemplate: isEn
          ? 'Hi! Orders ship within 24–48 business hours nationally and 3–5 days internationally, with live tracking included.'
          : '¡Hola! Realizamos envíos nacionales en 24–48 h laborables e internacionales en 3–5 días, siempre con número de seguimiento.',
        targetChannel: 'all',
        isActive: true,
        triggersCount: 14,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      {
        id: makeId('faq'),
        ownerId: uid,
        title: isEn ? 'Invoices & billing support' : 'Facturas y soporte administrativo',
        keywords: isEn ? ['invoice', 'billing', 'receipt', 'pdf'] : ['factura', 'recibo', 'pdf', 'contable'],
        replyTemplate: isEn
          ? 'Hello! You can download your PDF invoice directly from your billing portal, or reply with your order number and we will resend it right away.'
          : '¡Hola! Puedes descargar tu factura en PDF desde tu área de cliente o indicarnos tu número de pedido para reenviártela al instante.',
        targetChannel: 'emails',
        isActive: true,
        triggersCount: 7,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
    ];

    for (const item of starterMessages) {
      batch.set(doc(db, 'users', uid, 'messages', item.id), item);
    }
    for (const item of starterComments) {
      batch.set(doc(db, 'users', uid, 'comments', item.id), item);
    }
    for (const item of starterEmails) {
      batch.set(doc(db, 'users', uid, 'emails', item.id), item);
    }
    for (const rule of starterRules) {
      batch.set(doc(db, 'users', uid, 'faqRules', rule.id), rule);
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, connectionsPath);
  }
}

export function subscribeConnections(
  uid: string,
  onData: (items: ConnectedAccount[]) => void,
): Unsubscribe {
  const path = `users/${uid}/connections`;
  const q = query(
    collection(db, 'users', uid, 'connections'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as ConnectedAccount));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path),
  );
}

export function subscribeChannel(
  uid: string,
  channel: ChannelCategory,
  onData: (items: InteractionItem[]) => void,
): Unsubscribe {
  const path = `users/${uid}/${channel}`;
  const q = query(
    collection(db, 'users', uid, channel),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as InteractionItem));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path),
  );
}

export function subscribeTrash(
  uid: string,
  onData: (items: TrashItem[]) => void,
): Unsubscribe {
  const path = `users/${uid}/trash`;
  const q = query(
    collection(db, 'users', uid, 'trash'),
    where('ownerId', '==', uid),
    orderBy('deletedAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => d.data() as TrashItem);
      onData(items);
      void purgeExpiredTrash(uid, items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path),
  );
}

export function subscribeFaqRules(
  uid: string,
  onData: (items: FaqRule[]) => void,
): Unsubscribe {
  const path = `users/${uid}/faqRules`;
  const q = query(
    collection(db, 'users', uid, 'faqRules'),
    where('ownerId', '==', uid),
    orderBy('createdAt', 'desc'),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      onData(snapshot.docs.map((d) => d.data() as FaqRule));
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path),
  );
}

export async function connectAccountByUrl(
  uid: string,
  params: {
    profileUrl: string;
    username: string;
    channelCategory?: ChannelCategory;
    language: Language;
  },
): Promise<ConnectedAccount> {
  const response = await fetch('/api/connections/resolve-profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(errBody.error || 'Failed to resolve profile URL.');
  }

  const resolved = (await response.json()) as {
    platform: Platform;
    profileUrl: string;
    username: string;
    displayLabel: string;
    channelCategory: ChannelCategory;
  };

  const connId = makeId('conn');
  const conn: ConnectedAccount = {
    id: connId,
    ownerId: uid,
    platform: resolved.platform,
    profileUrl: resolved.profileUrl,
    username: resolved.username,
    displayLabel: resolved.displayLabel,
    channelCategory: resolved.channelCategory,
    status: 'active',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'users', uid, 'connections', connId), conn);

  const isEn = params.language === 'en';
  const welcomeItemId = makeId('item');
  const welcomeItem: InteractionItem = {
    id: welcomeItemId,
    ownerId: uid,
    connectionId: connId,
    platform: resolved.platform,
    senderName: 'Sofía Martínez',
    senderHandle: resolved.platform === 'email' ? 'sofia@cliente.com' : '@sofia.m',
    senderAvatar: AVATAR_SOFIA,
    subjectOrContext: isEn
      ? `Synced from ${resolved.displayLabel}`
      : `Sincronizado desde ${resolved.displayLabel}`,
    body: isEn
      ? `Hi ${resolved.username}! Just connected via OmniChat Hub. Could you share your availability or current pricing?`
      : `¡Hola ${resolved.username}! Te escribo tras conectar esta cuenta en OmniChat Hub. ¿Me confirmas vuestros precios y disponibilidad?`,
    isRead: false,
    sentiment: 'positive',
    sentimentScore: 84,
    aiSuggestedReply: isEn
      ? `Hi Sofía! Thanks for reaching out to ${resolved.username}. I would be glad to share our latest availability and pricing with you.`
      : `¡Hola Sofía! Gracias por escribir a ${resolved.username}. Con mucho gusto te comparto nuestra disponibilidad y tarifas actualizadas.`,
    replyText: '',
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  batch.set(doc(db, 'users', uid, resolved.channelCategory, welcomeItemId), welcomeItem);

  const path = `users/${uid}/connections/${connId}`;
  try {
    await batch.commit();
    return conn;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function toggleConnectionStatus(
  uid: string,
  conn: ConnectedAccount,
): Promise<void> {
  const path = `users/${uid}/connections/${conn.id}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'connections', conn.id), {
      status: conn.status === 'active' ? 'paused' : 'active',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteConnection(uid: string, connectionId: string): Promise<void> {
  const path = `users/${uid}/connections/${connectionId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'connections', connectionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function markInteractionRead(
  uid: string,
  channel: ChannelCategory,
  itemId: string,
): Promise<void> {
  const path = `users/${uid}/${channel}/${itemId}`;
  try {
    await updateDoc(doc(db, 'users', uid, channel, itemId), {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function sendInteractionReply(
  uid: string,
  channel: ChannelCategory,
  itemId: string,
  replyText: string,
  isAutoAi = false,
): Promise<void> {
  const path = `users/${uid}/${channel}/${itemId}`;
  try {
    await updateDoc(doc(db, 'users', uid, channel, itemId), {
      replyText: replyText.trim().slice(0, 4000),
      status: isAutoAi ? 'auto_replied' : 'replied',
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateInteractionAiAnalysis(
  uid: string,
  channel: ChannelCategory,
  itemId: string,
  analysis: {
    sentiment: SentimentType;
    sentimentScore: number;
    aiSuggestedReply: string;
  },
): Promise<void> {
  const path = `users/${uid}/${channel}/${itemId}`;
  try {
    await updateDoc(doc(db, 'users', uid, channel, itemId), {
      sentiment: analysis.sentiment,
      sentimentScore: Math.max(0, Math.min(100, Math.round(analysis.sentimentScore))),
      aiSuggestedReply: analysis.aiSuggestedReply.slice(0, 2000),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function moveInteractionToTrash(
  uid: string,
  originalCollection: ChannelCategory,
  item: InteractionItem,
): Promise<void> {
  const path = `users/${uid}/trash/${item.id}`;
  const trashDoc: TrashItem = {
    id: item.id,
    ownerId: uid,
    originalCollection,
    connectionId: item.connectionId,
    platform: item.platform,
    senderName: item.senderName,
    senderHandle: item.senderHandle,
    senderAvatar: item.senderAvatar,
    subjectOrContext: item.subjectOrContext,
    body: item.body,
    sentiment: item.sentiment,
    sentimentScore: item.sentimentScore,
    aiSuggestedReply: item.aiSuggestedReply,
    replyText: item.replyText,
    status: item.status,
    deletedAt: serverTimestamp(),
    purgeAtMs: Date.now() + NINETY_DAYS_MS,
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, 'trash', item.id), trashDoc);
    batch.delete(doc(db, 'users', uid, originalCollection, item.id));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function restoreFromTrash(uid: string, trashItem: TrashItem): Promise<void> {
  const path = `users/${uid}/${trashItem.originalCollection}/${trashItem.id}`;
  const restored: InteractionItem = {
    id: trashItem.id,
    ownerId: uid,
    connectionId: trashItem.connectionId,
    platform: trashItem.platform,
    senderName: trashItem.senderName,
    senderHandle: trashItem.senderHandle,
    senderAvatar: trashItem.senderAvatar,
    subjectOrContext: trashItem.subjectOrContext,
    body: trashItem.body,
    isRead: true,
    sentiment: trashItem.sentiment,
    sentimentScore: trashItem.sentimentScore,
    aiSuggestedReply: trashItem.aiSuggestedReply,
    replyText: trashItem.replyText,
    status: trashItem.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, trashItem.originalCollection, trashItem.id), restored);
    batch.delete(doc(db, 'users', uid, 'trash', trashItem.id));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function permanentlyDeleteFromTrash(uid: string, itemId: string): Promise<void> {
  const path = `users/${uid}/trash/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'trash', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function purgeExpiredTrash(uid: string, items: TrashItem[]): Promise<void> {
  const now = Date.now();
  const expired = items.filter((item) => item.purgeAtMs <= now);
  if (expired.length === 0) return;

  try {
    const batch = writeBatch(db);
    for (const item of expired) {
      batch.delete(doc(db, 'users', uid, 'trash', item.id));
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${uid}/trash`);
  }
}

export async function createFaqRule(
  uid: string,
  payload: {
    title: string;
    keywords: string[];
    replyTemplate: string;
    targetChannel: 'all' | ChannelCategory;
  },
): Promise<void> {
  const ruleId = makeId('faq');
  const path = `users/${uid}/faqRules/${ruleId}`;
  const cleanKeywords = payload.keywords
    .map((k) => k.trim().toLowerCase().slice(0, 60))
    .filter(Boolean)
    .slice(0, 10);

  if (cleanKeywords.length === 0) {
    cleanKeywords.push('info');
  }

  const rule: FaqRule = {
    id: ruleId,
    ownerId: uid,
    title: payload.title.trim().slice(0, 120),
    keywords: cleanKeywords,
    replyTemplate: payload.replyTemplate.trim().slice(0, 2000),
    targetChannel: payload.targetChannel,
    isActive: true,
    triggersCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'users', uid, 'faqRules', ruleId), rule);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function toggleFaqRule(uid: string, rule: FaqRule): Promise<void> {
  const path = `users/${uid}/faqRules/${rule.id}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'faqRules', rule.id), {
      isActive: !rule.isActive,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function incrementFaqRuleTrigger(uid: string, rule: FaqRule): Promise<void> {
  const path = `users/${uid}/faqRules/${rule.id}`;
  try {
    await updateDoc(doc(db, 'users', uid, 'faqRules', rule.id), {
      triggersCount: (rule.triggersCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteFaqRule(uid: string, ruleId: string): Promise<void> {
  const path = `users/${uid}/faqRules/${ruleId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'faqRules', ruleId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function simulateIncomingInteraction(
  uid: string,
  channel: ChannelCategory,
  connections: ConnectedAccount[],
  faqRules: FaqRule[],
  lang: Language,
): Promise<void> {
  const matchingConn =
    connections.find((c) => c.channelCategory === channel && c.status === 'active') ||
    connections.find((c) => c.status === 'active') ||
    connections[0];

  if (!matchingConn) {
    throw new Error(lang === 'en' ? 'Connect an account first.' : 'Conecta una cuenta primero.');
  }

  const samplesEs: Record<ChannelCategory, Array<{ senderName: string; handle: string; avatar: string; subject: string; body: string; sentiment: SentimentType; score: number }>> = {
    messages: [
      {
        senderName: 'Elena Vance',
        handle: '@elenavance',
        avatar: AVATAR_ELENA,
        subject: 'Consulta rápida por chat',
        body: 'Hola, ¿cuánto tarda el envío a Barcelona y cuál es el horario de soporte hoy?',
        sentiment: 'neutral',
        score: 74,
      },
      {
        senderName: 'Carlos Mendoza',
        handle: '+34 644 210 990',
        avatar: AVATAR_CARLOS,
        subject: 'Incidencia con pedido urgente',
        body: 'Necesito cambiar la dirección de entrega antes de las 17:00, por favor avisadme cuanto antes.',
        sentiment: 'urgent',
        score: 48,
      },
    ],
    comments: [
      {
        senderName: 'Sofía Martínez',
        handle: '@sofia.studio',
        avatar: AVATAR_SOFIA,
        subject: 'Comentario en publicación reciente',
        body: '¡Increíble diseño! ¿Tenéis disponibilidad inmediata para envío esta semana?',
        sentiment: 'positive',
        score: 93,
      },
    ],
    emails: [
      {
        senderName: 'Carlos Mendoza',
        handle: 'carlos@estudio.es',
        avatar: AVATAR_CARLOS,
        subject: 'Copia de factura y datos fiscales',
        body: 'Buenas tardes, ¿podríais enviarme la factura en PDF de la última suscripción? Gracias.',
        sentiment: 'neutral',
        score: 76,
      },
    ],
  };

  const samplesEn: Record<ChannelCategory, Array<{ senderName: string; handle: string; avatar: string; subject: string; body: string; sentiment: SentimentType; score: number }>> = {
    messages: [
      {
        senderName: 'Elena Vance',
        handle: '@elenavance',
        avatar: AVATAR_ELENA,
        subject: 'Quick chat question',
        body: 'Hi! How long does shipping take and do you have tracking numbers?',
        sentiment: 'neutral',
        score: 75,
      },
      {
        senderName: 'Carlos Mendoza',
        handle: '+44 7700 900123',
        avatar: AVATAR_CARLOS,
        subject: 'Urgent delivery update',
        body: 'I need to update my delivery address before 5 PM today—please confirm as soon as possible!',
        sentiment: 'urgent',
        score: 45,
      },
    ],
    comments: [
      {
        senderName: 'Sofía Martínez',
        handle: '@sofia.studio',
        avatar: AVATAR_SOFIA,
        subject: 'Comment on recent post',
        body: 'Love this release! Is international shipping available this week?',
        sentiment: 'positive',
        score: 92,
      },
    ],
    emails: [
      {
        senderName: 'Carlos Mendoza',
        handle: 'carlos@studio.io',
        avatar: AVATAR_CARLOS,
        subject: 'PDF invoice request',
        body: 'Hello, could you please share the PDF invoice for our latest renewal? Thanks!',
        sentiment: 'neutral',
        score: 78,
      },
    ],
  };

  const pool = (lang === 'en' ? samplesEn : samplesEs)[channel];
  const sample = pool[Math.floor(Math.random() * pool.length)];

  const lowerBody = sample.body.toLowerCase();
  const matchedRule = faqRules.find(
    (r) =>
      r.isActive &&
      (r.targetChannel === 'all' || r.targetChannel === channel) &&
      r.keywords.some((kw) => lowerBody.includes(kw.toLowerCase())),
  );

  const itemId = makeId('sim');
  const item: InteractionItem = {
    id: itemId,
    ownerId: uid,
    connectionId: matchingConn.id,
    platform: matchingConn.platform,
    senderName: sample.senderName,
    senderHandle: sample.handle,
    senderAvatar: sample.avatar,
    subjectOrContext: sample.subject,
    body: sample.body,
    isRead: matchedRule ? true : false,
    sentiment: sample.sentiment,
    sentimentScore: sample.score,
    aiSuggestedReply: matchedRule ? matchedRule.replyTemplate : '',
    replyText: matchedRule ? matchedRule.replyTemplate : '',
    status: matchedRule ? 'auto_replied' : 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const path = `users/${uid}/${channel}/${itemId}`;
  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'users', uid, channel, itemId), item);
    if (matchedRule) {
      batch.update(doc(db, 'users', uid, 'faqRules', matchedRule.id), {
        triggersCount: (matchedRule.triggersCount || 0) + 1,
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
