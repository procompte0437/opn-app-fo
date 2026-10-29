import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  MessageSquare,
  Video,
  Send,
  Smile,
  Users,
  Download,
  FolderOpen,
  Plus,
  Loader2,
  AlertTriangle,
  Lock,
  X,
  CheckCheck,
  Calendar,
  Phone,
  Circle,
} from 'lucide-react';
import { getAuthToken } from '../../services/api';
import {
  ensureSanctumSessionForPersona,
  isRealSanctumToken,
} from '../../services/sanctumSession';
import {
  fetchConversations,
  createConversation,
  fetchMessages,
  sendMessage,
  sendAudioMessage,
  markConversationRead,
  fetchDirectory,
  fetchJitsiRoom,
  startVisioCall,
  publishVisioRing,
  parseVisioInvite,
  reactToMessage,
} from '../../services/connectApi';
import { sendPresenceHeartbeat } from '../../services/presenceApi';
import { getEcho, disconnectEcho, isRealtimeAvailable } from '../../services/echo';
import { OFFICIAL_DOCUMENTS_GED, VIRTUAL_MEETINGS } from '../../data/collaborativeData';
import { resolveEmojiDisplay } from '../../data/connectEmojis';
import { openPrintableHtml } from '../../utils/downloadHelpers';
import EmojiPicker from './EmojiPicker';
import MessageReactions from './MessageReactions';
import OpnVisioRoom from './OpnVisioRoom';
import VoiceRecorder from './VoiceRecorder';
import '../../styles/connect-emojis.css';

function conversationTitle(conv) {
  return (
    conv?.title ||
    conv?.name ||
    conv?.nom ||
    conv?.label ||
    `Discussion #${conv?.id ?? ''}`
  );
}

function membersCount(conv) {
  return (
    conv?.members_count ??
    conv?.membresCount ??
    conv?.members?.length ??
    conv?.users?.length ??
    0
  );
}

function unreadCount(conv) {
  return conv?.unread_count ?? conv?.unreadCount ?? 0;
}

function lastPreview(conv) {
  const last = conv?.last_message || conv?.lastMessage;
  if (!last) return conv?.description || 'Aucun message';
  if (last.type === 'audio' || last.type === 'AUDIO') return 'Note vocale';
  if (last.type === 'emoji' || last.type === 'EMOJI') {
    return last.body || last.emoji_code || 'Émoji';
  }
  if (last.type === 'system' && last.meta?.kind === 'visio_invite') {
    return 'Invitation visioconférence';
  }
  if (last.type === 'system') return last.body || 'Notification système';
  return last.body || last.texte || last.content || 'Message';
}

function messageType(msg) {
  return String(msg?.type || 'text').toLowerCase();
}

function messageBody(msg) {
  return msg?.body ?? msg?.texte ?? msg?.content ?? '';
}

function senderName(msg) {
  return (
    msg?.user?.name ||
    msg?.user?.nom ||
    msg?.sender?.name ||
    msg?.expediteurNom ||
    msg?.user_name ||
    'Agent OPN'
  );
}

function senderId(msg) {
  return (
    msg?.user_id ??
    msg?.user?.id ??
    msg?.sender_id ??
    msg?.expediteurId ??
    null
  );
}

function audioUrl(msg) {
  return (
    msg?.audio_url ||
    msg?.audioUrl ||
    msg?.url ||
    msg?.file_url ||
    msg?.media_url ||
    null
  );
}

function formatMsgTime(msg) {
  const raw = msg?.created_at || msg?.createdAt || msg?.date;
  if (!raw) return '';
  try {
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return String(raw);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(raw);
  }
}

function directoryLabel(user) {
  return user?.name || user?.nom || user?.full_name || user?.email || `User #${user?.id}`;
}

function directorySub(user) {
  const parts = [
    user?.entite || user?.code_role || user?.role || user?.poste,
    user?.email,
  ].filter(Boolean);
  return parts.join(' · ');
}

function meetingJitsiRoom(meeting) {
  if (meeting?.jitsiRoom) return meeting.jitsiRoom;
  const link = String(meeting?.lienWebRTC || '');
  const fromOpn = link.match(/opn-visio:\/\/([^/?#]+)/i);
  if (fromOpn?.[1]) return decodeURIComponent(fromOpn[1]);
  const fromJitsi = link.match(/meet\.jit\.si\/([^/?#]+)/i);
  if (fromJitsi?.[1]) return decodeURIComponent(fromJitsi[1]);
  const fromRoom = link.match(/\/room\/([^/?#]+)/i);
  if (fromRoom?.[1]) return fromRoom[1];
  return `opn-meet-${meeting?.id || 'session'}`;
}

function meetingStatusLabel(statut) {
  if (statut === 'EN_DIRECT') return 'En direct';
  if (statut === 'TERMINEE') return 'Terminée';
  return 'Programmée';
}

function meetingStatusClass(statut) {
  if (statut === 'EN_DIRECT') return 'bg-emerald-50 text-[#00A651] border-emerald-200';
  if (statut === 'TERMINEE') return 'bg-slate-100 text-slate-500 border-slate-200';
  return 'bg-amber-50 text-amber-700 border-amber-200';
}

export default function OpnConnect({
  activePersona,
  sanctumReady = false,
  initialTab = 'chat',
  autoJoinVisio = null,
  onAutoJoinConsumed,
}) {
  const [hasToken, setHasToken] = useState(() => isRealSanctumToken(getAuthToken()));
  const [activatingSession, setActivatingSession] = useState(false);

  const [activeTab, setActiveTab] = useState(
    initialTab === 'ged' ? 'ged' : initialTab === 'reunions' ? 'reunions' : 'chat'
  );

  useEffect(() => {
    if (initialTab === 'ged') setActiveTab('ged');
    else if (initialTab === 'reunions') setActiveTab('reunions');
    else setActiveTab('chat');
  }, [initialTab]);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [errorBanner, setErrorBanner] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  // Nouvelle discussion / appel équipe
  const [showNewModal, setShowNewModal] = useState(false);
  const [modalMode, setModalMode] = useState('chat'); // 'chat' | 'visio'
  const [directory, setDirectory] = useState([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [onlineOnly, setOnlineOnly] = useState(false);

  // Visio native OPN (WebRTC)
  const [jitsiSession, setJitsiSession] = useState(null);
  const [jitsiLoading, setJitsiLoading] = useState(false);
  const [isVoiceRecording, setIsVoiceRecording] = useState(false);
  const [realtimeLive, setRealtimeLive] = useState(false);
  const [incomingVisio, setIncomingVisio] = useState(null);

  const messagesEndRef = useRef(null);
  const pollAfterIdRef = useRef(null);
  const selectedIdRef = useRef(null);
  const displayName = activePersona?.nom || activePersona?.name || 'Agent OPN';

  const openJitsiSession = useCallback(async (conversationId, {
    title,
    room: knownRoom = null,
    announce = false,
    isCaller = true,
  } = {}) => {
    setJitsiLoading(true);
    setErrorBanner('');
    try {
      let room = knownRoom;
      let sessionTitle = title || 'Visioconférence OPN';
      let ringTargets = [];

      if (announce && conversationId) {
        try {
          const started = await startVisioCall(conversationId, { title: sessionTitle });
          room =
            started?.room ||
            started?.room_name ||
            started?.jitsi_room ||
            room;
          sessionTitle = started?.title || sessionTitle;
          ringTargets = Array.isArray(started?.targets) ? started.targets : [];
          publishVisioRing({
            conversation_id: started?.conversation_id || conversationId,
            room,
            title: sessionTitle,
            caller_name: displayName,
            caller_email: activePersona?.email || null,
            targets: ringTargets,
            message_id: started?.invite?.id || started?.invite?.data?.id || null,
            started_at: new Date().toISOString(),
          });
        } catch (announceErr) {
          console.warn('startVisioCall échoué, repli salle:', announceErr?.message);
          setErrorBanner(
            announceErr?.message ||
              'Invitation non délivrée au destinataire — vérifiez la session API.'
          );
        }
      }

      if (!room && conversationId) {
        const info = await fetchJitsiRoom(conversationId);
        room =
          info?.room ||
          info?.room_name ||
          info?.jitsi_room ||
          info?.data?.room;
      }
      if (!room) throw new Error('Salle visio OPN non fournie par le serveur.');

      if (announce && ringTargets.length === 0) {
        publishVisioRing({
          conversation_id: conversationId,
          room,
          title: sessionTitle,
          caller_name: displayName,
          caller_email: activePersona?.email || null,
          targets: [],
          started_at: new Date().toISOString(),
        });
      }

      setJitsiSession({
        room,
        conversationId,
        title: sessionTitle,
        isCaller: Boolean(isCaller),
      });
      setIncomingVisio(null);
      setActiveTab('chat');
      if (conversationId) setSelectedId(conversationId);
      return true;
    } catch (err) {
      if (err?.status === 403) {
        setAccessDenied(true);
        setErrorBanner('Accès refusé — vous n’êtes pas membre');
      } else {
        setErrorBanner(err?.message || 'Impossible de lancer la visio OPN.');
      }
      return false;
    } finally {
      setJitsiLoading(false);
    }
  }, [displayName, activePersona?.email]);

  // Active / rafraîchit Sanctum dès qu’un persona intranet est présent
  useEffect(() => {
    let cancelled = false;

    const syncAuthFlag = () => {
      const ok = isRealSanctumToken(getAuthToken());
      if (!cancelled) setHasToken(ok);
      return ok;
    };

    const activateIfNeeded = async () => {
      if (syncAuthFlag()) return;
      if (!activePersona?.email) {
        if (!cancelled) setHasToken(false);
        return;
      }

      if (!cancelled) setActivatingSession(true);
      try {
        const res = await ensureSanctumSessionForPersona(activePersona, { preferQuick: true });
        if (cancelled) return;
        const ok = Boolean(res?.success && isRealSanctumToken(res.token || getAuthToken()));
        setHasToken(ok);
        if (!ok && !res?.backendUnavailable) {
          setErrorBanner(res?.message || 'Session inactive. Utilisez Accès Intranet.');
        } else {
          setErrorBanner('');
        }
      } catch (err) {
        if (!cancelled) {
          setHasToken(false);
          setErrorBanner(err?.backendUnavailable ? '' : (err?.message || 'Impossible d’activer la session.'));
        }
      } finally {
        if (!cancelled) setActivatingSession(false);
      }
    };

    activateIfNeeded();
    const timer = setInterval(syncAuthFlag, 2000);
    window.addEventListener('focus', syncAuthFlag);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener('focus', syncAuthFlag);
    };
  }, [activePersona?.email, sanctumReady]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => String(c.id) === String(selectedId)) || null,
    [conversations, selectedId]
  );

  const onlineDirectoryCount = useMemo(
    () => directory.filter((u) => Boolean(u?.online)).length,
    [directory]
  );

  const filteredDirectory = useMemo(() => {
    const q = directoryQuery.trim().toLowerCase();
    let list = directory;
    if (onlineOnly) {
      list = list.filter((u) => Boolean(u?.online));
    }
    if (q) {
      list = list.filter((u) => {
        const hay = `${u.name || ''} ${u.nom || ''} ${u.email || ''} ${u.entite || ''} ${u.code_role || ''}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const onlineDelta = Number(Boolean(b?.online)) - Number(Boolean(a?.online));
      if (onlineDelta !== 0) return onlineDelta;
      return String(directoryLabel(a)).localeCompare(String(directoryLabel(b)), 'fr');
    });
  }, [directory, directoryQuery, onlineOnly]);

  selectedIdRef.current = selectedId;

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    if (!isRealSanctumToken(getAuthToken())) return;
    if (!silent) {
      setLoadingList(true);
      setErrorBanner('');
    }
    try {
      const list = await fetchConversations();
      setConversations(Array.isArray(list) ? list : []);
      setSelectedId((prev) => {
        if (prev && list.some((c) => String(c.id) === String(prev))) return prev;
        return list[0]?.id ?? null;
      });
    } catch (err) {
      if (!silent) {
        setConversations([]);
        setErrorBanner(err?.message || 'Impossible de charger vos discussions.');
      }
    } finally {
      if (!silent) setLoadingList(false);
    }
  }, []);

  const mergeMessages = useCallback((incoming, { replace = false } = {}) => {
    setMessages((prev) => {
      const base = replace ? [] : prev;
      const map = new Map();
      [...base, ...incoming].forEach((m) => {
        if (m?.id != null) map.set(String(m.id), m);
      });
      const merged = Array.from(map.values()).sort((a, b) => {
        const ia = Number(a.id) || 0;
        const ib = Number(b.id) || 0;
        if (ia && ib) return ia - ib;
        return String(a.created_at || '').localeCompare(String(b.created_at || ''));
      });
      const last = merged[merged.length - 1];
      pollAfterIdRef.current = last?.id ?? pollAfterIdRef.current;
      return merged;
    });
  }, []);

  const loadMessages = useCallback(
    async (conversationId, { silent = false } = {}) => {
      if (!conversationId || !isRealSanctumToken(getAuthToken())) return;
      if (!silent) {
        setLoadingMessages(true);
        setAccessDenied(false);
        setErrorBanner('');
      }
      try {
        const list = await fetchMessages(conversationId);
        mergeMessages(list, { replace: true });
        try {
          await markConversationRead(conversationId);
          setConversations((prev) =>
            prev.map((c) =>
              String(c.id) === String(conversationId)
                ? { ...c, unread_count: 0, unreadCount: 0 }
                : c
            )
          );
        } catch {
          /* read receipt optional */
        }
      } catch (err) {
        if (err?.status === 403) {
          setAccessDenied(true);
          setMessages([]);
        } else if (!silent) {
          setErrorBanner(err?.message || 'Impossible de charger les messages.');
        }
      } finally {
        if (!silent) setLoadingMessages(false);
      }
    },
    [mergeMessages]
  );

  // Auth + conversations bootstrap
  useEffect(() => {
    if (!hasToken) {
      setConversations([]);
      setMessages([]);
      setSelectedId(null);
      return;
    }
    loadConversations();
  }, [hasToken, loadConversations]);

  // Rafraîchir la liste (invitations / nouveaux fils) même si Connect reste ouvert
  useEffect(() => {
    if (!hasToken) return undefined;
    const timer = setInterval(() => {
      loadConversations({ silent: true });
    }, 20000);
    return () => clearInterval(timer);
  }, [hasToken, loadConversations]);

  // Détecter invitations visio sur last_message (destinataire déjà dans Connect)
  useEffect(() => {
    if (!hasToken || jitsiSession) {
      setIncomingVisio(null);
      return;
    }
    const myEmail = activePersona?.email || null;
    for (const conv of conversations) {
      const parsed = parseVisioInvite(conv?.last_message || conv?.lastMessage, { myEmail });
      if (parsed) {
        setIncomingVisio({
          ...parsed,
          conversationTitle: conversationTitle(conv) || parsed.title,
        });
        return;
      }
    }
    setIncomingVisio(null);
  }, [conversations, hasToken, jitsiSession, activePersona?.email]);

  // Rejoindre depuis la bannière globale App
  useEffect(() => {
    if (!autoJoinVisio?.conversationId && !autoJoinVisio?.room) return undefined;
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await openJitsiSession(autoJoinVisio.conversationId, {
        title: autoJoinVisio.title,
        room: autoJoinVisio.room,
        announce: false,
        isCaller: false,
      });
      onAutoJoinConsumed?.();
    })();
    return () => {
      cancelled = true;
    };
  }, [autoJoinVisio, openJitsiSession, onAutoJoinConsumed]);

  // Load thread when selection changes
  useEffect(() => {
    pollAfterIdRef.current = null;
    setMessages([]);
    setShowEmojiPicker(false);
    if (selectedId && hasToken) {
      loadMessages(selectedId);
    }
  }, [selectedId, hasToken, loadMessages]);

  // Poll after_id every 3s (filet de sécurité si Reverb indisponible)
  useEffect(() => {
    if (!hasToken || !selectedId) return undefined;
    const intervalMs = realtimeLive ? 20000 : 8000;
    let ticks = 0;

    const tick = async () => {
      const id = selectedIdRef.current;
      if (!id || !getAuthToken()) return;
      ticks += 1;
      try {
        // Toutes les ~4 polls : recharger le fil pour synchroniser les réactions
        if (ticks % 4 === 0) {
          await loadMessages(id, { silent: true });
          return;
        }
        const afterId = pollAfterIdRef.current;
        const list = await fetchMessages(id, { afterId });
        if (list.length > 0) {
          mergeMessages(list);
          try {
            await markConversationRead(id);
          } catch {
            /* ignore */
          }
        }
      } catch (err) {
        if (err?.status === 403) {
          setAccessDenied(true);
        }
      }
    };

    const timer = setInterval(tick, intervalMs);
    return () => clearInterval(timer);
  }, [hasToken, selectedId, realtimeLive, mergeMessages, loadMessages]);

  // WebSocket Reverb / Echo — messages instantanés (y compris pendant la visio)
  useEffect(() => {
    if (!hasToken || !selectedId) {
      setRealtimeLive(false);
      return undefined;
    }

    const echo = getEcho();
    if (!echo) {
      setRealtimeLive(false);
      return undefined;
    }

    const channelName = `connect.conversation.${selectedId}`;
    let subscribed = true;

    const channel = echo.private(channelName);
    channel.listen('.connect.message.created', (payload) => {
      if (!subscribed) return;
      const msg = payload?.message;
      if (!msg) return;
      if (String(payload?.conversation_id) !== String(selectedIdRef.current)) return;
      mergeMessages([msg]);
      markConversationRead(selectedIdRef.current).catch(() => {});
      setConversations((prev) =>
        prev.map((c) =>
          String(c.id) === String(selectedIdRef.current)
            ? {
                ...c,
                last_message: msg,
                unread_count: 0,
                unreadCount: 0,
              }
            : c
        )
      );
    });

    channel.subscribed(() => {
      if (subscribed) setRealtimeLive(true);
    });
    channel.error(() => {
      if (subscribed) setRealtimeLive(false);
    });

    return () => {
      subscribed = false;
      setRealtimeLive(false);
      try {
        echo.leave(channelName);
      } catch {
        /* ignore */
      }
    };
  }, [hasToken, selectedId, mergeMessages]);

  useEffect(() => {
    if (!hasToken) {
      disconnectEcho();
      setRealtimeLive(false);
    }
  }, [hasToken]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  async function openNewDiscussion(mode = 'chat') {
    setModalMode(mode === 'visio' ? 'visio' : 'chat');
    setShowNewModal(true);
    setSelectedMemberIds([]);
    setDirectoryQuery('');
    setOnlineOnly(false);
    setNewTitle(mode === 'visio' ? 'Appel vidéo équipe OPN' : '');
    setLoadingDirectory(true);
    try {
      // Heartbeat pour apparaître soi-même en ligne, puis annuaire enrichi
      try {
        await sendPresenceHeartbeat();
      } catch {
        /* présence optionnelle */
      }
      const users = await fetchDirectory();
      setDirectory(Array.isArray(users) ? users : []);
    } catch (err) {
      setErrorBanner(err?.message || 'Annuaire indisponible.');
      setDirectory([]);
    } finally {
      setLoadingDirectory(false);
    }
  }

  function joinScheduledMeeting(meeting) {
    // WebRTC exige une conversation membre pour la signalisation offer/answer.
    // On ouvre le flux « Nouvelle visio » prérempli plutôt qu'une salle orpheline.
    setActiveTab('chat');
    openNewDiscussion('visio');
    setNewTitle(meeting?.titre || 'Réunion visio OPN');
  }

  function toggleMember(userId) {
    setSelectedMemberIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  }

  async function handleCreateConversation(e) {
    e.preventDefault();
    if (selectedMemberIds.length === 0 || creating) return;
    setCreating(true);
    setErrorBanner('');
    try {
      const type = selectedMemberIds.length === 1 ? 'direct' : 'group';
      const created = await createConversation({
        type,
        title:
          newTitle.trim() ||
          (modalMode === 'visio' ? 'Appel vidéo équipe OPN' : undefined),
        member_ids: selectedMemberIds,
      });
      setShowNewModal(false);
      await loadConversations();
      if (created?.id != null) {
        setSelectedId(created.id);
        setActiveTab('chat');
        if (modalMode === 'visio') {
          await openJitsiSession(created.id, {
            title: conversationTitle(created) || newTitle || 'Appel vidéo équipe OPN',
            announce: true,
            isCaller: true,
          });
        }
      }
    } catch (err) {
      setErrorBanner(err?.message || 'Création de discussion impossible.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSendText(e) {
    e?.preventDefault?.();
    const body = inputMessage.trim();
    if (!body || !selectedId || sending) return;
    setSending(true);
    setErrorBanner('');
    try {
      const msg = await sendMessage(selectedId, { type: 'text', body });
      if (msg) mergeMessages([msg]);
      else await loadMessages(selectedId, { silent: true });
      setInputMessage('');
      setShowEmojiPicker(false);
      await loadConversations();
    } catch (err) {
      if (err?.status === 403) setAccessDenied(true);
      setErrorBanner(err?.message || 'Envoi impossible.');
    } finally {
      setSending(false);
    }
  }

  async function handleSendEmoji(emoji) {
    if (!selectedId || sending) return;
    setSending(true);
    setShowEmojiPicker(false);
    try {
      const msg = await sendMessage(selectedId, {
        type: 'emoji',
        emoji_code: emoji.code,
        body: emoji.unicode,
      });
      if (msg) mergeMessages([msg]);
      else await loadMessages(selectedId, { silent: true });
      await loadConversations({ silent: true });
    } catch (err) {
      if (err?.status === 403) setAccessDenied(true);
      setErrorBanner(err?.message || 'Envoi de l’émoji impossible.');
    } finally {
      setSending(false);
    }
  }

  /** WhatsApp : insère l'émoji dans le texte ; si champ vide → envoie l'émoji seul */
  function handlePickEmoji(emoji) {
    if (!emoji?.unicode) return;
    if (inputMessage.trim()) {
      setInputMessage((prev) => `${prev}${emoji.unicode}`);
      setShowEmojiPicker(false);
      return;
    }
    handleSendEmoji(emoji);
  }

  async function handleReactToMessage(messageId, emoji) {
    if (!messageId || !emoji || accessDenied) return;
    try {
      const updated = await reactToMessage(messageId, emoji);
      if (updated) mergeMessages([updated]);
      else await loadMessages(selectedId, { silent: true });
    } catch (err) {
      if (err?.status === 403) setAccessDenied(true);
      setErrorBanner(err?.message || 'Réaction impossible.');
    }
  }

  async function handleSendAudio(blob, durationSec) {
    if (!selectedId) return;
    setErrorBanner('');
    try {
      const msg = await sendAudioMessage(selectedId, blob, durationSec);
      if (msg) mergeMessages([msg]);
      else await loadMessages(selectedId, { silent: true });
      await loadConversations();
    } catch (err) {
      if (err?.status === 403) setAccessDenied(true);
      throw err;
    }
  }

  async function handleLaunchVisio() {
    if (!selectedId) return;
    await openJitsiSession(selectedId, {
      title: conversationTitle(selectedConversation),
      announce: true,
      isCaller: true,
    });
  }

  const chatDisabled = !hasToken || !selectedId || accessDenied || sending;

  /* —— Visio plein écran conversation (Echo reste abonné via effects parents) —— */
  if (jitsiSession) {
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className="flex items-center justify-between gap-3 bg-white px-4 py-2 rounded-md border border-slate-200 text-xs text-slate-600">
          <span className="inline-flex items-center gap-2 font-semibold">
            <span
              className={`w-2 h-2 rounded-full ${realtimeLive ? 'bg-[#00A651] animate-pulse' : 'bg-amber-400'}`}
            />
            {realtimeLive
              ? 'Chat temps réel actif pendant la visioconférence OPN'
              : 'Chat en secours (polling) pendant la visioconférence OPN'}
          </span>
          <button
            type="button"
            onClick={() => setJitsiSession(null)}
            className="text-[#2E68B4] font-bold hover:underline"
          >
            Retour messagerie
          </button>
        </div>
        <OpnVisioRoom
          conversationId={jitsiSession.conversationId}
          room={jitsiSession.room}
          displayName={displayName}
          conversationTitle={jitsiSession.title}
          isCaller={jitsiSession.isCaller !== false}
          onQuit={() => setJitsiSession(null)}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {incomingVisio && !jitsiSession && (
        <div className="rounded-md border border-emerald-300 bg-emerald-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm">
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Appel entrant
            </p>
            <p className="text-sm font-bold text-slate-900">
              {incomingVisio.callerName} vous invite en visioconférence
            </p>
            <p className="text-xs text-slate-600 truncate">
              {incomingVisio.conversationTitle || incomingVisio.title || 'Appel vidéo OPN'}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled={jitsiLoading}
              onClick={() =>
                openJitsiSession(incomingVisio.conversationId, {
                  title: incomingVisio.conversationTitle || incomingVisio.title,
                  room: incomingVisio.room,
                  announce: false,
                  isCaller: false,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-[#00A651] hover:bg-[#008f45] px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              <Video className="w-3.5 h-3.5" />
              Rejoindre
            </button>
            <button
              type="button"
              onClick={() => setIncomingVisio(null)}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
            >
              Ignorer
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-md border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                realtimeLive || isRealtimeAvailable() ? 'bg-[#00A651]' : 'bg-amber-400'
              }`}
            />
            <span
              className={`text-[11px] font-bold uppercase tracking-wider ${
                realtimeLive || isRealtimeAvailable() ? 'text-[#00A651]' : 'text-amber-600'
              }`}
            >
              PLATEFORME COLLABORATIVE & VISIO GABON
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-[#2E68B4]">
            OPN Connect (Chat Pro & Visioconférence)
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            Messagerie instantanée sécurisée, notes vocales pour le terrain et réunions
            virtuelles des 9 provinces.
            {realtimeLive ? ' · Temps réel Reverb actif.' : ' · Connexion temps réel en cours…'}
          </p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-md border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'chat'
                ? 'bg-white text-[#2E68B4] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Messagerie
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reunions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'reunions'
                ? 'bg-white text-[#2E68B4] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Video className="w-4 h-4" />
            Réunions & Visio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ged')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'ged'
                ? 'bg-white text-[#2E68B4] shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderOpen className="w-4 h-4" />
            Documents GED
          </button>
        </div>
      </div>

      {/* Auth gate */}
      {!hasToken && (
        <div className="flex items-start gap-3 p-4 rounded-md bg-amber-50 border border-amber-200 text-amber-900">
          <Lock className="w-5 h-5 shrink-0 mt-0.5 text-amber-700" />
          <div className="flex-1">
            <p className="text-sm font-bold">
              {activatingSession
                ? 'Activation de la session Sanctum…'
                : 'Connectez-vous via Accès Intranet pour utiliser OPN Connect en temps réel'}
            </p>
            <p className="text-xs mt-1 text-amber-800/90">
              {activatingSession
                ? `Connexion API en cours pour ${displayName}…`
                : 'Vos discussions privées, notes vocales et salles OPN Visio nécessitent une session Sanctum active. Aucun salon public n’est affiché hors authentification.'}
            </p>
            {activatingSession && (
              <div className="mt-2 inline-flex items-center gap-2 text-xs font-semibold text-amber-800">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Authentification Laravel…
              </div>
            )}
            {!activatingSession && activePersona?.email && (
              <button
                type="button"
                onClick={async () => {
                  setActivatingSession(true);
                  setErrorBanner('');
                  try {
                    const res = await ensureSanctumSessionForPersona(activePersona, {
                      preferQuick: true,
                    });
                    const ok = Boolean(
                      res?.success && isRealSanctumToken(res.token || getAuthToken())
                    );
                    setHasToken(ok);
                    if (!ok && !res?.backendUnavailable) {
                      setErrorBanner(res?.message || 'Session inactive. Utilisez Accès Intranet.');
                    }
                  } catch (err) {
                    setHasToken(false);
                    if (!err?.backendUnavailable) {
                      setErrorBanner(err?.message || 'Impossible d’activer la session.');
                    }
                  } finally {
                    setActivatingSession(false);
                  }
                }}
                className="mt-3 px-3 py-1.5 rounded-md bg-[#2E68B4] hover:bg-[#215091] text-white text-xs font-bold"
              >
                Activer la session maintenant
              </button>
            )}
          </div>
        </div>
      )}

      {errorBanner && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <p className="text-xs font-medium flex-1">{errorBanner}</p>
          <button
            type="button"
            onClick={() => setErrorBanner('')}
            className="text-rose-500 hover:text-rose-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* CHAT */}
      {activeTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 h-[600px] bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
          {/* Sidebar */}
          <div className="lg:col-span-4 bg-slate-50 border-r border-slate-200 flex flex-col">
            <div className="p-3.5 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Mes discussions
                </h3>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Uniquement vos adhésions
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={!hasToken}
                  onClick={() => openNewDiscussion('visio')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#00A651] hover:bg-[#008f45] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm"
                  title="Organiser un appel vidéo d'équipe"
                >
                  <Video className="w-3.5 h-3.5" />
                  Visio
                </button>
                <button
                  type="button"
                  disabled={!hasToken}
                  onClick={() => openNewDiscussion('chat')}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#2E68B4] hover:bg-[#24589a] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nouvelle
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!hasToken && (
                <div className="p-6 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-medium">Discussions désactivées</p>
                  <p className="text-[11px] mt-1">Authentification requise</p>
                </div>
              )}

              {hasToken && loadingList && (
                <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-xs">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Chargement…
                </div>
              )}

              {hasToken && !loadingList && conversations.length === 0 && (
                <div className="p-6 text-center text-slate-500">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-xs font-semibold">Aucune discussion</p>
                  <p className="text-[11px] mt-1">
                    Créez une conversation privée avec l’annuaire OPN.
                  </p>
                </div>
              )}

              {hasToken &&
                conversations.map((ch) => {
                  const isSelected = String(ch.id) === String(selectedId);
                  const unread = unreadCount(ch);
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        setAccessDenied(false);
                        setSelectedId(ch.id);
                      }}
                      className={`w-full p-2.5 rounded-md text-left transition-all flex items-start justify-between ${
                        isSelected
                          ? 'bg-white text-[#2E68B4] border border-slate-200 shadow-sm font-semibold'
                          : 'hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs truncate">{conversationTitle(ch)}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate mt-0.5 font-normal">
                          {membersCount(ch)} membre{membersCount(ch) > 1 ? 's' : ''} ·{' '}
                          {lastPreview(ch)}
                        </p>
                      </div>
                      {unread > 0 && (
                        <span className="ml-2 min-w-[1rem] h-4 px-1 rounded-full bg-[#00A651] text-white font-bold text-[9px] flex items-center justify-center shrink-0">
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          {/* Thread */}
          <div className="lg:col-span-8 flex flex-col bg-white min-h-0">
            {!hasToken ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center bg-slate-50/50">
                <div>
                  <Lock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                  <p className="text-sm font-semibold text-slate-600">
                    Espace de discussion verrouillé
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Connectez-vous via Accès Intranet pour utiliser OPN Connect en temps réel.
                  </p>
                </div>
              </div>
            ) : !selectedConversation ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center bg-slate-50/40">
                <p className="text-xs text-slate-500 font-medium">
                  Sélectionnez ou créez une discussion privée.
                </p>
              </div>
            ) : (
              <>
                <div className="p-3.5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-[#2E68B4] truncate">
                      {conversationTitle(selectedConversation)}
                    </h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      {membersCount(selectedConversation)} participant
                      {membersCount(selectedConversation) > 1 ? 's' : ''}
                      {accessDenied && (
                        <span className="text-rose-600 font-semibold">
                          · Accès refusé — vous n’êtes pas membre
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={jitsiLoading || accessDenied}
                    onClick={handleLaunchVisio}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-[#00A651] hover:bg-[#008f45] disabled:opacity-40 text-white text-[11px] font-bold shadow-sm"
                    title="Lancer une visioconférence OPN (membres uniquement)"
                  >
                    {jitsiLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Video className="w-3.5 h-3.5" />
                    )}
                    Lancer visio
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/40">
                  {loadingMessages && (
                    <div className="flex justify-center py-8 text-slate-500 text-xs gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement des messages…
                    </div>
                  )}

                  {accessDenied && (
                    <div className="p-4 rounded-md bg-rose-50 border border-rose-200 text-center">
                      <p className="text-xs font-bold text-rose-700">
                        Accès refusé — vous n’êtes pas membre
                      </p>
                    </div>
                  )}

                  {!loadingMessages && !accessDenied && messages.length === 0 && (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      Aucun message pour l’instant. Envoyez le premier.
                    </div>
                  )}

                  {messages.map((msg) => {
                    const type = messageType(msg);
                    const sid = senderId(msg);
                    const name = senderName(msg);
                    const isMe =
                      (activePersona?.id != null &&
                        String(sid) === String(activePersona.id)) ||
                      (activePersona?.nom &&
                        name &&
                        String(name).toLowerCase() ===
                          String(activePersona.nom).toLowerCase()) ||
                      (activePersona?.email &&
                        msg?.sender?.email &&
                        String(msg.sender.email).toLowerCase() ===
                          String(activePersona.email).toLowerCase());
                    const initial =
                      name.split(' ').filter(Boolean).pop()?.charAt(0)?.toUpperCase() ||
                      'O';

                    const visioInvite = parseVisioInvite(msg, {
                      myEmail: isMe ? activePersona?.email : null,
                    });
                    // Afficher aussi les invitations que j'ai envoyées (sans bouton Rejoindre pour moi)
                    const isVisioSystem =
                      type === 'system' &&
                      (msg?.meta?.kind === 'visio_invite' || Boolean(visioInvite));

                    if (isVisioSystem) {
                      const inviteForJoin = parseVisioInvite(msg, { myEmail: activePersona?.email });
                      return (
                        <div
                          key={msg.id}
                          className="flex justify-center py-1"
                        >
                          <div className="max-w-[90%] rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-center space-y-2">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              Invitation visioconférence
                            </p>
                            <p className="text-xs text-slate-800 font-semibold">
                              {messageBody(msg) ||
                                `${name} a lancé un appel vidéo`}
                            </p>
                            <p className="text-[10px] text-slate-500">{formatMsgTime(msg)}</p>
                            {inviteForJoin && !jitsiSession && (
                              <button
                                type="button"
                                disabled={jitsiLoading}
                                onClick={() =>
                                  openJitsiSession(inviteForJoin.conversationId || selectedId, {
                                    title: inviteForJoin.title || conversationTitle(selectedConversation),
                                    room: inviteForJoin.room,
                                    announce: false,
                                    isCaller: false,
                                  })
                                }
                                className="inline-flex items-center gap-1.5 rounded-md bg-[#00A651] px-3 py-1.5 text-[11px] font-bold text-white disabled:opacity-50"
                              >
                                <Video className="w-3.5 h-3.5" />
                                Rejoindre l&apos;appel
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    }

                    if (type === 'system') {
                      return (
                        <div key={msg.id} className="flex justify-center py-1">
                          <p className="text-[11px] text-slate-500 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 max-w-[90%] text-center">
                            {messageBody(msg)}
                          </p>
                        </div>
                      );
                    }

                    if (type === 'emoji') {
                      const emoji = resolveEmojiDisplay(msg);
                      return (
                        <div
                          key={msg.id}
                          className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          <div className="w-7 h-7 rounded-md bg-[#2E68B4] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                            {initial}
                          </div>
                          <div className={`space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                            <div
                              className={`flex items-center gap-2 text-[10px] ${
                                isMe ? 'justify-end text-[#2E68B4]' : 'text-slate-500'
                              }`}
                            >
                              <span className="font-bold">{name}</span>
                              <span>•</span>
                              <span>{formatMsgTime(msg)}</span>
                            </div>
                            <div className="inline-flex items-center justify-center px-2 py-1">
                              <span className="opn-emoji text-3xl sm:text-4xl" title={emoji.label}>
                                {emoji.unicode}
                              </span>
                            </div>
                            {!accessDenied && (
                              <MessageReactions
                                message={msg}
                                myUserId={isMe ? sid : null}
                                disabled={sending}
                                onReact={(emojiChar) => handleReactToMessage(msg.id, emojiChar)}
                              />
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        <div className="w-7 h-7 rounded-md bg-[#2E68B4] text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          {initial}
                        </div>
                        <div className={`max-w-[75%] space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                          <div
                            className={`flex items-center gap-2 text-[10px] ${
                              isMe ? 'justify-end text-[#2E68B4]' : 'text-slate-500'
                            }`}
                          >
                            <span className="font-bold">{name}</span>
                            <span>•</span>
                            <span>{formatMsgTime(msg)}</span>
                          </div>

                          <div
                            className={`p-3 rounded-md text-xs leading-relaxed ${
                              isMe
                                ? 'bg-[#2E68B4] text-white shadow-sm'
                                : 'bg-white text-slate-800 border border-slate-200 shadow-sm'
                            }`}
                          >
                            {type === 'audio' ? (
                              <div className="space-y-2">
                                <p className="text-[11px] opacity-90">
                                  Note vocale
                                  {msg.duration_sec
                                    ? ` (${msg.duration_sec}s)`
                                    : ''}
                                </p>
                                {audioUrl(msg) ? (
                                  <audio
                                    controls
                                    src={audioUrl(msg)}
                                    className="w-full max-w-xs h-8"
                                    preload="metadata"
                                  />
                                ) : (
                                  <p className="text-[10px] opacity-75">
                                    Fichier audio indisponible
                                  </p>
                                )}
                              </div>
                            ) : (
                              <>
                                <p>{messageBody(msg)}</p>
                                {Boolean(msg.documentPartage || msg.fichierJoint) && (
                                  <div className="mt-2.5 p-2.5 rounded-lg bg-slate-50 text-slate-800 border border-slate-200 text-xs flex items-center justify-between gap-3 shadow-2xs">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="px-2 py-1 rounded bg-rose-100 text-rose-700 font-bold text-[10px] uppercase shrink-0 border border-rose-200">
                                        PDF
                                      </div>
                                      <div className="min-w-0">
                                        <p className="font-bold text-slate-900 truncate text-[11px]">
                                          {msg.documentPartage?.titre || msg.fichierJoint?.nom}
                                        </p>
                                        <p className="text-[10px] text-slate-500">
                                          {msg.documentPartage?.badge || msg.fichierJoint?.type || 'Document Officiel OPN'} • {msg.documentPartage?.taille || msg.fichierJoint?.taille || '2.4 Mo'}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded bg-[#2E68B4] text-white text-[10px] font-bold shrink-0">
                                      Certifié A4
                                    </span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {!accessDenied && type !== 'system' && (
                            <MessageReactions
                              message={msg}
                              myUserId={isMe ? sid : null}
                              disabled={sending}
                              onReact={(emojiChar) => handleReactToMessage(msg.id, emojiChar)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="p-3 border-t border-slate-200 bg-white relative">
                  {showEmojiPicker && !accessDenied && (
                    <EmojiPicker
                      onSelect={handlePickEmoji}
                      onClose={() => setShowEmojiPicker(false)}
                      title="Émojis"
                    />
                  )}

                  <div className="flex items-center gap-2">
                    {!accessDenied && (
                      <div className={isVoiceRecording ? 'flex-1 min-w-0' : 'shrink-0'}>
                        <VoiceRecorder
                          disabled={!hasToken || !selectedId || sending}
                          onSend={handleSendAudio}
                          onRecordingChange={setIsVoiceRecording}
                        />
                      </div>
                    )}

                    {!isVoiceRecording && (
                      <>
                        <button
                          type="button"
                          disabled={chatDisabled}
                          onClick={() => setShowEmojiPicker((v) => !v)}
                          className="p-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all disabled:opacity-40 shrink-0"
                          title="Émojis"
                        >
                          <Smile className="w-4 h-4" />
                        </button>

                        <form
                          onSubmit={handleSendText}
                          className="flex-1 flex items-center gap-2 min-w-0"
                        >
                          <input
                            type="text"
                            placeholder={
                              accessDenied
                                ? 'Accès refusé'
                                : `Écrire à ${conversationTitle(selectedConversation)}…`
                            }
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            disabled={chatDisabled}
                            className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#2E68B4] focus:bg-white font-medium disabled:opacity-50"
                          />
                          <button
                            type="submit"
                            disabled={chatDisabled || !inputMessage.trim()}
                            className="p-2 rounded-md bg-[#2E68B4] hover:bg-[#24589a] disabled:opacity-40 text-white transition-all shadow-sm shrink-0"
                          >
                            {sending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Send className="w-4 h-4" />
                            )}
                          </button>
                        </form>
                      </>
                    )}
                  </div>

                  <p className="mt-1.5 text-[10px] text-slate-400 flex items-center gap-1">
                    <CheckCheck className="w-3 h-3" />
                    {realtimeLive
                      ? 'Temps réel Reverb actif — polling de secours toutes les 15 s'
                      : 'Actualisation toutes les 3 s (après_id) — Reverb non connecté'}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* RÉUNIONS & VISIO ÉQUIPE / HIÉRARCHIE */}
      {activeTab === 'reunions' && (
        <div className="bg-white rounded-md p-5 border border-slate-200 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-[#2E68B4]">
                Réunions virtuelles & appels vidéo
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Conseils des 9 provinces, points Appro, COD crise et comités visas DIR/DAF/DG
              </p>
            </div>
            <button
              type="button"
              disabled={!hasToken}
              onClick={() => openNewDiscussion('visio')}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-[#00A651] hover:bg-[#008f45] disabled:opacity-40 text-white text-xs font-bold shadow-sm"
            >
              <Phone className="w-3.5 h-3.5" />
              Organiser un appel d&apos;équipe
            </button>
          </div>

          {!hasToken && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <Lock className="w-4 h-4 shrink-0 mt-0.5" />
              Connectez-vous via Accès Intranet pour organiser un appel privé avec l’annuaire.
              Les salles planifiées restent rejoignables ci-dessous.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {VIRTUAL_MEETINGS.map((meet) => (
              <div
                key={meet.id}
                className="rounded-md border border-slate-200 bg-slate-50/60 p-4 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${meetingStatusClass(meet.statut)}`}
                      >
                        {meetingStatusLabel(meet.statut)}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {meet.niveau || 'OPN'}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {meet.titre}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      {meet.date} · {meet.heure}
                    </p>
                    <p className="text-[11px] text-slate-600 mt-1">
                      Hôte : <span className="font-semibold">{meet.hote}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Participants
                  </p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    {(meet.participants || []).join(' · ')}
                  </p>
                </div>

                {Array.isArray(meet.ordreDuJour) && meet.ordreDuJour.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Ordre du jour
                    </p>
                    <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc pl-4">
                      {meet.ordreDuJour.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => joinScheduledMeeting(meet)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold text-white shadow-sm ${
                      meet.statut === 'EN_DIRECT'
                        ? 'bg-[#00A651] hover:bg-[#008f45]'
                        : 'bg-[#2E68B4] hover:bg-[#24589a]'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5" />
                    {meet.statut === 'EN_DIRECT' ? 'Rejoindre en direct' : 'Ouvrir la salle visio'}
                  </button>
                  <span className="text-[10px] text-slate-400 font-mono truncate">
                    {meetingJitsiRoom(meet)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-700 mb-1">
              Appel depuis une discussion privée
            </p>
            <p className="text-[11px] text-slate-500 mb-3">
              Dans l’onglet Messagerie, ouvrez une conversation puis cliquez sur « Lancer visio »
              pour une salle réservée aux membres.
            </p>
            <button
              type="button"
              onClick={() => setActiveTab('chat')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs font-semibold text-[#2E68B4] hover:bg-slate-100"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Aller à la messagerie
            </button>
          </div>
        </div>
      )}

      {/* Gestion Électronique des Documents (GED Nationale OPN) */}
      {activeTab === 'ged' && (
        <div className="bg-white rounded-md p-5 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-[#2E68B4]">
                Bibliothèque documentaire OPN
              </h3>
              <p className="text-xs text-slate-500">
                Documents de référence (consultation locale — hors messagerie temps réel)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {OFFICIAL_DOCUMENTS_GED.map((doc) => (
              <div
                key={doc.id}
                className="p-4 rounded-md bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3 hover:border-[#2E68B4] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-[#2E68B4] border border-blue-200">
                      {doc.categorie}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {doc.format} • {doc.taille}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 leading-snug">
                    {doc.titre}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1.5">{doc.description}</p>
                </div>

                <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">{doc.datePublication}</span>
                  <button
                    type="button"
                    onClick={() => {
                      openPrintableHtml({
                        title: doc.titre,
                        subtitle: `${doc.categorie} · ${doc.format} · ${doc.taille}${
                          doc.montantEstimeXAF
                            ? ` · Estimé ${(doc.montantEstimeXAF / 1e9).toFixed(1)} Md FCFA`
                            : ''
                        }`,
                        bodyLines: [
                          doc.description || '',
                          `<strong>Référence GED :</strong> ${doc.id}`,
                          `<strong>Publication :</strong> ${doc.datePublication}`,
                          'Document issu du référentiel GED national OPN (consultation locale). Imprimez ou enregistrez en PDF depuis le navigateur.',
                        ].filter(Boolean),
                      });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-[#2E68B4] hover:bg-[#24589a] text-white text-xs font-semibold transition-all shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Ouvrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal nouvelle discussion */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
          <div className="w-full max-w-lg bg-white rounded-md border border-slate-200 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h3 className="text-sm font-bold text-[#2E68B4]">
                {modalMode === 'visio'
                  ? 'Organiser un appel vidéo d’équipe'
                  : 'Nouvelle discussion'}
              </h3>
              <button
                type="button"
                onClick={() => setShowNewModal(false)}
                className="p-1 rounded-md hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateConversation} className="p-4 space-y-4">
              {modalMode === 'visio' && (
                <p className="text-[11px] text-slate-600 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
                  Sélectionnez les participants (hiérarchie, Appro, antennes…). La discussion
                  privée est créée puis la salle OPN Visio s’ouvre immédiatement.
                </p>
              )}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1.5">
                  {modalMode === 'visio' ? 'Titre de la réunion' : 'Titre (optionnel)'}
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder={
                    modalMode === 'visio'
                      ? 'Ex. Point visas DIR/DAF/DG'
                      : 'Ex. Point stock Franceville'
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-md px-3 py-2 text-xs focus:outline-none focus:border-[#2E68B4]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-600 uppercase">
                    Participants (annuaire)
                  </label>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                    <Circle className="w-2 h-2 fill-emerald-500 text-emerald-500" />
                    {onlineDirectoryCount} en ligne
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="search"
                    value={directoryQuery}
                    onChange={(e) => setDirectoryQuery(e.target.value)}
                    placeholder="Rechercher : Chantal, daf@opn.ga, DAF…"
                    className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:border-[#2E68B4]"
                  />
                  <button
                    type="button"
                    onClick={() => setOnlineOnly((v) => !v)}
                    className={`shrink-0 rounded-md border px-2.5 py-2 text-[10px] font-bold transition-colors ${
                      onlineOnly
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                    title="Afficher uniquement les profils en ligne"
                  >
                    En ligne
                  </button>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-md border border-slate-200 divide-y divide-slate-100">
                  {loadingDirectory && (
                    <div className="p-4 text-xs text-slate-500 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Chargement de l’annuaire…
                    </div>
                  )}
                  {!loadingDirectory && filteredDirectory.length === 0 && (
                    <div className="p-4 text-xs text-slate-500">
                      {onlineOnly
                        ? 'Aucun collègue en ligne pour le moment (activité < 3 min).'
                        : 'Aucun utilisateur disponible.'}
                    </div>
                  )}
                  {filteredDirectory.map((user) => {
                    const uid = user.id;
                    const checked = selectedMemberIds.includes(uid);
                    const isOnline = Boolean(user?.online);
                    return (
                      <label
                        key={uid}
                        className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-slate-50 ${
                          checked ? 'bg-blue-50/60' : ''
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleMember(uid)}
                          className="rounded border-slate-300 text-[#2E68B4] focus:ring-[#2E68B4]"
                        />
                        <span
                          className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white ${
                            isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                          title={isOnline ? 'En ligne' : 'Hors ligne'}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 min-w-0">
                            <p className="text-xs font-semibold text-slate-800 truncate">
                              {directoryLabel(user)}
                            </p>
                            {isOnline && (
                              <span className="shrink-0 text-[9px] font-black uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                En ligne
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">
                            {directorySub(user)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500">
                  {selectedMemberIds.length} sélectionné
                  {selectedMemberIds.length > 1 ? 's' : ''}
                  {onlineDirectoryCount > 0
                    ? ` · ${onlineDirectoryCount} profil${onlineDirectoryCount > 1 ? 's' : ''} actif${onlineDirectoryCount > 1 ? 's' : ''}`
                    : ''}
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="px-3 py-2 rounded-md border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating || selectedMemberIds.length === 0}
                  className={`px-3 py-2 rounded-md disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 ${
                    modalMode === 'visio'
                      ? 'bg-[#00A651] hover:bg-[#008f45]'
                      : 'bg-[#2E68B4] hover:bg-[#24589a]'
                  }`}
                >
                  {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {modalMode === 'visio' ? (
                    <>
                      <Video className="w-3.5 h-3.5" />
                      Créer et lancer la visio
                    </>
                  ) : (
                    'Créer'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
