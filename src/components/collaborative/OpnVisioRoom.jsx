import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Video,
  VideoOff,
  Users,
  Loader2,
  ShieldCheck,
  Share2,
  Hand,
  Disc,
  Maximize2,
  Minimize2,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { fetchVisioSignals, postVisioSignal } from '../../services/connectApi';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const POLL_MS = 700;

function attachStream(videoEl, stream) {
  if (!videoEl || !stream) return;
  if (videoEl.srcObject !== stream) {
    videoEl.srcObject = stream;
  }
  const play = () => {
    videoEl.play?.().catch(() => {});
  };
  play();
  videoEl.onloadedmetadata = play;
}

/**
 * Chrome génère parfois des lignes flexfec / repair-window que setRemoteDescription
 * refuse (« Invalid SDP line »). On retire ces codecs avant offer/answer.
 */
function sanitizeSessionDescription(desc) {
  if (!desc) return desc;
  const type = typeof desc === 'object' ? desc.type : undefined;
  let sdp = typeof desc === 'string' ? desc : desc.sdp;
  if (typeof sdp !== 'string' || !sdp) {
    return type ? { type, sdp: '' } : desc;
  }

  sdp = sdp.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const dropPts = new Set();
  const rawLines = sdp.split('\n');

  for (const line of rawLines) {
    const trimmed = line.trim();
    const rtp = trimmed.match(/^a=rtpmap:(\d+)\s+flexfec/i);
    if (rtp) dropPts.add(rtp[1]);
    const fmtp = trimmed.match(/^a=fmtp:(\d+)\s+repair-window=/i);
    if (fmtp) dropPts.add(fmtp[1]);
  }

  const cleaned = rawLines
    .map((line) => line.replace(/\s+$/g, ''))
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed) return false;
      if (/flexfec/i.test(trimmed)) return false;
      if (/^a=fmtp:\d+\s+repair-window=/i.test(trimmed)) return false;
      for (const pt of dropPts) {
        if (new RegExp(`^a=(rtpmap|fmtp|rtcp-fb):${pt}(\\s|$)`).test(trimmed)) {
          return false;
        }
      }
      return true;
    })
    .map((line) => {
      if (!line.startsWith('m=')) return line;
      const parts = line.split(' ');
      if (parts.length < 4 || dropPts.size === 0) return line;
      return parts
        .slice(0, 3)
        .concat(parts.slice(3).filter((pt) => !dropPts.has(pt)))
        .join(' ');
    })
    .join('\r\n');

  const normalized = cleaned.endsWith('\r\n') ? cleaned : `${cleaned}\r\n`;
  if (type) return { type, sdp: normalized };
  return { type: 'offer', sdp: normalized };
}

function toSignalSdp(desc) {
  const fixed = sanitizeSessionDescription(desc);
  return { type: fixed.type, sdp: fixed.sdp };
}

export default function OpnVisioRoom({
  conversationId = null,
  room,
  displayName = 'Agent OPN',
  conversationTitle = 'Visioconférence OPN',
  isCaller = true,
  onQuit,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const afterTsRef = useRef(null);
  const makingOfferRef = useRef(false);
  const politeRef = useRef(!isCaller);
  const ignoreOfferRef = useRef(false);
  const seenSignalIdsRef = useRef(new Set());
  const peerReadyRef = useRef(false);
  const startedOfferRef = useRef(false);
  const aliveRef = useRef(true);
  const displayNameRef = useRef(displayName);
  const pendingIceRef = useRef([]);

  const [status, setStatus] = useState(
    isCaller ? 'Appel en cours — en attente du correspondant…' : 'Connexion à la salle…'
  );
  const [error, setError] = useState('');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [remoteName, setRemoteName] = useState('');
  const [connected, setConnected] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mediaReady, setMediaReady] = useState(false);

  displayNameRef.current = displayName;

  useEffect(() => {
    politeRef.current = !isCaller;
  }, [isCaller]);

  useEffect(() => {
    let interval = null;
    if (recording) {
      interval = setInterval(() => setRecordSeconds((prev) => prev + 1), 1000);
    } else {
      setRecordSeconds(0);
    }
    return () => clearInterval(interval);
  }, [recording]);

  /** Session WebRTC complète : média + peer + polling signalisation */
  useEffect(() => {
    if (!conversationId) {
      setError('Conversation requise pour la visioconférence WebRTC.');
      return undefined;
    }

    aliveRef.current = true;
    afterTsRef.current = null;
    seenSignalIdsRef.current = new Set();
    peerReadyRef.current = false;
    startedOfferRef.current = false;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    pendingIceRef.current = [];
    politeRef.current = !isCaller;

    let pollTimer = null;
    let stopped = false;

    const postSignal = async (type, payload = {}, targetUserId = null) => {
      if (stopped || !conversationId) return;
      const body = { type, payload };
      if (targetUserId != null) body.target_user_id = targetUserId;
      await postVisioSignal(conversationId, body);
    };

    const flushPendingIce = async (pc) => {
      if (!pc?.remoteDescription) return;
      const queued = pendingIceRef.current.splice(0, pendingIceRef.current.length);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* candidat obsolète */
        }
      }
    };

    const createAndSendOffer = async () => {
      const pc = pcRef.current;
      if (!pc || makingOfferRef.current || stopped) return;
      if (pc.signalingState !== 'stable') return;
      try {
        makingOfferRef.current = true;
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return;
        const fixedOffer = sanitizeSessionDescription(offer);
        await pc.setLocalDescription(fixedOffer);
        startedOfferRef.current = true;
        await postSignal('offer', { sdp: toSignalSdp(pc.localDescription || fixedOffer) });
        if (!stopped) setStatus('Offre envoyée — négociation WebRTC…');
      } catch (err) {
        if (!stopped) setError(err?.message || 'Échec création offre WebRTC');
      } finally {
        makingOfferRef.current = false;
      }
    };

    const ensureLocalTracksOnPc = (pc) => {
      if (!localStreamRef.current || !pc) return;
      const senders = pc.getSenders();
      const hasAudio = senders.some((s) => s.track?.kind === 'audio');
      const hasVideo = senders.some((s) => s.track?.kind === 'video');
      localStreamRef.current.getTracks().forEach((track) => {
        if (track.kind === 'audio' && !hasAudio) {
          pc.addTrack(track, localStreamRef.current);
        }
        if (track.kind === 'video' && !hasVideo) {
          pc.addTrack(track, localStreamRef.current);
        }
      });
    };

    const ensurePeer = () => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection(ICE_SERVERS);
      pcRef.current = pc;
      ensureLocalTracksOnPc(pc);

      pc.ontrack = (ev) => {
        const stream = ev.streams?.[0] || new MediaStream([ev.track]);
        attachStream(remoteVideoRef.current, stream);
        if (!stopped) {
          setHasRemoteVideo(true);
          setConnected(true);
          setStatus('En communication — OPN Visio HD');
        }
      };

      pc.onicecandidate = (ev) => {
        if (!ev.candidate || stopped) return;
        postSignal('ice', { candidate: ev.candidate.toJSON() }).catch(() => {});
      };

      pc.onconnectionstatechange = () => {
        if (stopped) return;
        const state = pc.connectionState;
        if (state === 'connected') {
          setConnected(true);
          setStatus('En communication — OPN Visio HD');
        } else if (state === 'connecting') {
          setStatus('Établissement du canal multimédia…');
        } else if (state === 'disconnected') {
          setConnected(false);
          setStatus('Connexion interrompue — reconnexion…');
        } else if (state === 'failed') {
          setConnected(false);
          setStatus('Échec liaison — nouvel essai…');
          if (!politeRef.current) {
            startedOfferRef.current = false;
            createAndSendOffer().catch(() => {});
          }
        }
      };

      pc.onnegotiationneeded = () => {
        if (stopped || politeRef.current || !peerReadyRef.current) return;
        createAndSendOffer().catch(() => {});
      };

      return pc;
    };

    const handleSignal = async (signal) => {
      if (!signal?.id || seenSignalIdsRef.current.has(signal.id) || stopped) return;
      seenSignalIdsRef.current.add(signal.id);

      const type = signal.type;
      const payload = signal.payload || {};
      const fromName = signal.from_name || 'Collègue OPN';

      if (type === 'hangup') {
        setStatus(`${fromName} a quitté l'appel`);
        setConnected(false);
        setHasRemoteVideo(false);
        peerReadyRef.current = false;
        startedOfferRef.current = false;
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
        return;
      }

      if (type === 'join') {
        setRemoteName(payload.displayName || fromName);
        peerReadyRef.current = true;
        setStatus(`${payload.displayName || fromName} a rejoint — connexion…`);
        ensurePeer();
        if (!politeRef.current) {
          await createAndSendOffer();
        }
        return;
      }

      const pc = ensurePeer();

      if (type === 'offer' && payload.sdp) {
        const offerCollision =
          makingOfferRef.current || pc.signalingState !== 'stable';
        ignoreOfferRef.current = !politeRef.current && offerCollision;
        if (ignoreOfferRef.current) return;

        try {
          const remoteOffer = sanitizeSessionDescription(payload.sdp);
          await pc.setRemoteDescription(remoteOffer);
          await flushPendingIce(pc);
          ensureLocalTracksOnPc(pc);
          const answer = await pc.createAnswer();
          const fixedAnswer = sanitizeSessionDescription(answer);
          await pc.setLocalDescription(fixedAnswer);
          await postSignal(
            'answer',
            { sdp: toSignalSdp(pc.localDescription || fixedAnswer) },
            signal.from_user_id
          );
          peerReadyRef.current = true;
          setRemoteName(fromName);
          setStatus('Réponse envoyée — liaison multimédia…');
        } catch (err) {
          if (!stopped) setError(err?.message || 'Échec traitement offre');
        }
        return;
      }

      if (type === 'answer' && payload.sdp) {
        try {
          if (pc.signalingState === 'have-local-offer') {
            const remoteAnswer = sanitizeSessionDescription(payload.sdp);
            await pc.setRemoteDescription(remoteAnswer);
            await flushPendingIce(pc);
            setStatus('Réponse reçue — canal en cours…');
          }
        } catch (err) {
          if (!stopped) setError(err?.message || 'Échec traitement réponse');
        }
        return;
      }

      if (type === 'ice' && payload.candidate) {
        try {
          if (ignoreOfferRef.current) return;
          if (!pc.remoteDescription) {
            pendingIceRef.current.push(payload.candidate);
            return;
          }
          await pc.addIceCandidate(payload.candidate);
        } catch {
          /* candidat obsolète */
        }
      }
    };

    const poll = async () => {
      if (stopped) return;
      try {
        const result = await fetchVisioSignals(conversationId, {
          afterTs: afterTsRef.current,
        });
        const signals = result?.signals || [];
        for (const signal of signals) {
          if (signal?.created_at) afterTsRef.current = signal.created_at;
          await handleSignal(signal);
        }
        if (
          !politeRef.current &&
          peerReadyRef.current &&
          !startedOfferRef.current &&
          pcRef.current?.connectionState !== 'connected'
        ) {
          await createAndSendOffer();
        }
      } catch {
        /* soft fail */
      } finally {
        if (!stopped) pollTimer = setTimeout(poll, POLL_MS);
      }
    };

    const boot = async () => {
      try {
        let stream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
            video: {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (mediaErr) {
          // Repli audio seul
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          if (!stopped) {
            setCamOn(false);
            setError(
              mediaErr?.name === 'NotAllowedError'
                ? 'Caméra refusée — audio seul. Autorisez la caméra pour la vidéo.'
                : 'Caméra indisponible — audio seul.'
            );
          }
        }

        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        attachStream(localVideoRef.current, stream);
        setMediaReady(true);
        ensurePeer();

        await postSignal('join', {
          displayName: displayNameRef.current,
          room: room || null,
          role: isCaller ? 'caller' : 'callee',
        });

        if (!stopped) {
          setStatus(
            isCaller
              ? 'Caméra prête — en attente du correspondant…'
              : 'Caméra prête — négociation avec l’appelant…'
          );
        }

        poll();
      } catch (err) {
        if (!stopped) {
          setMediaReady(false);
          setError(
            err?.name === 'NotAllowedError'
              ? 'Autorisez le micro et la caméra pour la visioconférence.'
              : 'Média local indisponible sur cet appareil.'
          );
          setStatus('Média local indisponible');
        }
      }
    };

    boot();

    return () => {
      stopped = true;
      aliveRef.current = false;
      if (pollTimer) clearTimeout(pollTimer);
      try {
        pcRef.current?.close();
      } catch {
        /* ignore */
      }
      pcRef.current = null;
      localStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      localStreamRef.current = null;
      screenStreamRef.current?.getTracks?.().forEach((t) => t.stop());
      screenStreamRef.current = null;
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    };
    // Intentionnellement limité : une session = une conversation / rôle
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, room, isCaller]);

  // Ré-attacher le flux local si le <video> remonte (plein écran)
  useEffect(() => {
    if (localStreamRef.current) {
      attachStream(localVideoRef.current, localStreamRef.current);
    }
  }, [expanded, mediaReady]);

  const handleQuit = useCallback(async () => {
    try {
      if (conversationId) {
        await postVisioSignal(conversationId, { type: 'hangup', payload: {} });
      }
    } catch {
      /* ignore */
    }
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    localStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    screenStreamRef.current = null;
    onQuit?.();
  }, [conversationId, onQuit]);

  const toggleMic = () => {
    const track = localStreamRef.current?.getAudioTracks?.()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setMicOn(track.enabled);
    } else {
      setMicOn((prev) => !prev);
    }
  };

  const toggleCam = () => {
    const track = localStreamRef.current?.getVideoTracks?.()?.[0];
    if (track) {
      track.enabled = !track.enabled;
      setCamOn(track.enabled);
    } else {
      setCamOn((prev) => !prev);
    }
  };

  const stopScreenShare = useCallback(async () => {
    const pc = pcRef.current;
    const camTrack = localStreamRef.current?.getVideoTracks?.()?.[0] || null;
    const sender = pc?.getSenders?.().find((s) => s.track?.kind === 'video' || !s.track);
    if (sender && camTrack) {
      try {
        await sender.replaceTrack(camTrack);
      } catch {
        /* ignore */
      }
    }
    screenStreamRef.current?.getTracks?.().forEach((t) => t.stop());
    screenStreamRef.current = null;
    if (camTrack && localStreamRef.current) {
      attachStream(localVideoRef.current, localStreamRef.current);
    }
    setScreenSharing(false);
  }, []);

  const toggleScreenShare = async () => {
    const pc = pcRef.current;
    if (!pc) return;

    if (screenSharing) {
      await stopScreenShare();
      return;
    }

    try {
      const display = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
      const screenTrack = display.getVideoTracks()[0];
      if (!screenTrack) return;
      screenStreamRef.current = display;
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(screenTrack);
      } else {
        pc.addTrack(screenTrack, display);
      }
      attachStream(localVideoRef.current, display);
      setScreenSharing(true);
      screenTrack.onended = () => {
        stopScreenShare();
      };
    } catch {
      /* annulé */
    }
  };

  const formatSecs = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const shellClass = expanded
    ? 'fixed inset-0 z-[120] rounded-none'
    : 'rounded-xl h-[min(78vh,720px)]';

  return (
    <div
      className={`bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden flex flex-col text-white relative animate-in fade-in duration-200 ${shellClass}`}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 border-b border-slate-800 bg-slate-900 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider">
              OPN VISIO SOUVERAINE
            </span>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              <ShieldCheck className="w-3 h-3 text-cyan-400" />
              Signalisation OPN · WebRTC
            </span>
            {recording && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800 animate-pulse">
                <Disc className="w-3 h-3 text-rose-500" />
                REC {formatSecs(recordSeconds)}
              </span>
            )}
          </div>
          <h3 className="text-sm sm:text-base font-black text-white truncate mt-0.5">
            {conversationTitle || 'Conférence OPN Connect'}
          </h3>
          <p className="text-[11px] text-slate-400 truncate flex items-center gap-1.5">
            {connected ? (
              <Wifi className="w-3 h-3 text-emerald-400" />
            ) : (
              <WifiOff className="w-3 h-3 text-amber-400" />
            )}
            {status}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer"
            title={expanded ? 'Réduire' : 'Plein écran'}
          >
            {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={handleQuit}
            className="px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Quitter</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-2 bg-rose-950/80 border-b border-rose-800 text-xs text-rose-200">
          {error}
        </div>
      )}

      <div className="relative flex-1 bg-black min-h-0 overflow-hidden">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`absolute inset-0 w-full h-full object-cover bg-black ${
            hasRemoteVideo ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {!hasRemoteVideo && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-6 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              {mediaReady ? (
                <Loader2 className="w-7 h-7 text-emerald-400 animate-spin" />
              ) : (
                <Video className="w-7 h-7 text-slate-500" />
              )}
            </div>
            <p className="text-sm font-bold text-white">
              {remoteName
                ? `Connexion avec ${remoteName}…`
                : isCaller
                  ? 'En attente que le correspondant rejoigne'
                  : 'Connexion à l’appelant…'}
            </p>
            <p className="text-xs text-slate-400 max-w-sm">
              Autorisez caméra et micro sur les deux postes. La vidéo s’affiche dès que le canal
              WebRTC est établi dans les deux sens.
            </p>
            {room && (
              <p className="text-[10px] font-mono text-slate-600 truncate max-w-full">
                Salle {room}
              </p>
            )}
          </div>
        )}

        {hasRemoteVideo && remoteName && (
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg bg-slate-950/75 border border-slate-700 text-[11px] font-bold text-white">
            {remoteName}
          </div>
        )}

        <div className="absolute bottom-4 right-4 w-28 sm:w-40 aspect-video rounded-xl overflow-hidden border-2 border-emerald-400/80 shadow-2xl bg-slate-900 z-20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover mirror ${!camOn && !screenSharing ? 'hidden' : ''}`}
          />
          {!camOn && !screenSharing && (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 text-xs">
              <VideoOff className="w-5 h-5 mb-1 text-slate-500" />
              <span className="text-[10px] font-bold">Caméra off</span>
            </div>
          )}
          <div className="absolute bottom-1 left-1 right-1 flex items-center justify-between text-[9px] font-black text-white drop-shadow bg-slate-950/70 px-1.5 py-0.5 rounded">
            <span className="truncate">{displayName} (Moi)</span>
            {handRaised && <Hand className="w-3.5 h-3.5 text-amber-400" />}
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 py-3 border-t border-slate-800 bg-slate-900 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1.5 font-bold text-slate-200">
            <Users className="w-4 h-4 text-emerald-400" />
            {hasRemoteVideo ? '2 participants' : '1 participant'}
          </span>
          <span className="hidden sm:inline text-slate-600">|</span>
          <span className="hidden sm:inline font-mono text-[11px] text-cyan-400 font-bold">
            {isCaller ? 'Appelant' : 'Correspondant'} · {connected ? 'HD' : 'négociation'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMic}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              micOn
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-950'
            }`}
            title={micOn ? 'Couper le micro' : 'Activer le micro'}
          >
            {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleCam}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              camOn
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-950'
            }`}
            title={camOn ? 'Couper la caméra' : 'Activer la caméra'}
          >
            {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={toggleScreenShare}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              screenSharing
                ? 'bg-cyan-600 text-white shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title="Partager l'écran"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setHandRaised((prev) => !prev)}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              handRaised
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={handRaised ? 'Baisser la main' : 'Demander la parole'}
          >
            <Hand className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setRecording((prev) => !prev)}
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              recording
                ? 'bg-rose-600 text-white animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={recording ? "Arrêter l'enregistrement" : 'Marquer la séance'}
          >
            <Disc className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleQuit}
            className="p-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer ml-1"
            title="Quitter la visioconférence"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      <style>{`
        .mirror { transform: scaleX(-1); }
      `}</style>
    </div>
  );
}
