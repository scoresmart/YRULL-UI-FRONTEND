import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { Phone, PhoneOff, X, Mic, MicOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { whatsappApi } from '../../lib/api';
import { useContacts } from '../../lib/dataHooks';
import { cn, formatPhone, initialsFromName, pastelClassFromString } from '../../lib/utils';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';

/**
 * IncomingCallNotification - Full incoming call handler with WebRTC audio
 * 1. Polls /whatsapp/calls/pending for calls with SDP offers
 * 2. Falls back to call history detection for notification
 * 3. On Accept: creates WebRTC peer, sends SDP answer to backend
 * 4. On Reject: calls /whatsapp/call/reject
 */
export function IncomingCallNotification() {
  const [dismissedCallIds, setDismissedCallIds] = useState(new Set());
  const [callState, setCallState] = useState('idle'); // idle | ringing | connecting | active | ended
  const [activeCallId, setActiveCallId] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);

  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const callTimerRef = useRef(null);
  const ringtoneRef = useRef(null);
  const waCallIdRef = useRef(null); // The actual WhatsApp call_id (NOT the phone number)

  // Define cleanupCall FIRST before any useEffects that might use it
  const cleanupCall = useCallback(() => {
    // Debug logging only (not shown by default in console)
    console.debug('[Call] Cleaning up call resources');

    // Close peer connection
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close();
      } catch (e) {
        console.error('[Call] Error closing peer connection:', e);
      }
      peerConnectionRef.current = null;
    }

    // Stop local stream tracks
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((t) => {
          t.stop();
          t.enabled = false;
        });
      } catch (e) {
        console.error('[Call] Error stopping local stream:', e);
      }
      localStreamRef.current = null;
    }

    // Clear call timer
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }

    // Reset call duration
    setCallDuration(0);

    // Reset mute state
    setIsMuted(false);

    // Clear remote audio
    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.srcObject = null;
        remoteAudioRef.current.pause();
      } catch (e) {
        console.error('[Call] Error clearing remote audio:', e);
      }
    }
  }, []);

  const contactsQ = useContacts();

  // Poll for pending calls with SDP (every 2 seconds)
  const pendingCallsQ = useQuery({
    queryKey: ['whatsapp_pending_calls'],
    queryFn: () => whatsappApi.getPendingCalls(),
    refetchInterval: 2000,
    refetchIntervalInBackground: true,
    enabled: callState === 'idle' || callState === 'ringing',
  });

  // Also poll call history for detection fallback
  // Poll more frequently when active to detect when other person hangs up
  const callHistoryQ = useQuery({
    queryKey: ['whatsapp_active_calls'],
    queryFn: () => whatsappApi.getCallHistory({ limit: 20 }),
    refetchInterval: callState === 'ringing' ? 2000 : callState === 'active' ? 2000 : 5000, // Poll every 2s when ringing or active
    refetchIntervalInBackground: true,
    enabled: true, // Always enabled to detect call end
  });

  // Find the current incoming call (prefer pending calls with SDP)
  const incomingCall = useMemo(() => {
    // Don't look for new calls if we're already in a call
    if (callState === 'active' || callState === 'connecting') return null;

    // Check pending calls first (has SDP for WebRTC) - these are definitely active incoming calls
    const pending = pendingCallsQ.data?.pending || [];
    const pendingCall = pending.find((c) => {
      // Only show if not dismissed and is actually incoming
      return !dismissedCallIds.has(c.call_id) && (c.direction === 'USER_INITIATED' || c.direction === 'inbound');
    });
    if (pendingCall) {
      return {
        id: pendingCall.call_id,
        call_id: pendingCall.call_id,
        from_number: pendingCall.from,
        direction: pendingCall.direction,
        sdp: pendingCall.sdp,
        sdp_type: pendingCall.sdp_type,
        source: 'pending',
        status: 'RINGING', // Pending calls are definitely ringing
      };
    }

    // Fallback: check call history for recent incoming calls
    // Only show for calls that are ACTUALLY ringing/active, not completed ones
    if (!callHistoryQ.data) return null;
    const now = Date.now();
    const recentCalls = callHistoryQ.data
      .filter((call) => {
        const callTime = new Date(call.created_at || call.timestamp || 0).getTime();
        const isRecent = callTime > now - 30000; // Last 30 seconds (more lenient)

        // Check if call is actually ringing (not completed/ended)
        const status = (call.status || '').toUpperCase();
        const event = (call.event || '').toLowerCase();

        // Definitely ringing states
        const isRinging = status === 'RINGING' || event === 'ringing' || event === 'initiate';

        // Definitely ended states - exclude these
        const isEnded =
          status === 'COMPLETED' ||
          status === 'ENDED' ||
          status === 'MISSED' ||
          event === 'disconnect' ||
          event === 'end' ||
          event === 'missed' ||
          event === 'connect'; // 'connect' means call was answered, not ringing

        return (
          call.direction === 'USER_INITIATED' &&
          isRinging &&
          !isEnded &&
          isRecent &&
          !dismissedCallIds.has(call.call_id || call.id)
        );
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (recentCalls[0]) {
      const c = recentCalls[0];
      return {
        id: c.call_id || c.id,
        call_id: c.call_id || c.id,
        from_number: c.from_number,
        direction: c.direction,
        sdp: '',
        sdp_type: '',
        source: 'history',
        status: c.status,
        event: c.event,
      };
    }

    return null;
  }, [pendingCallsQ.data, callHistoryQ.data, dismissedCallIds, callState]);

  // Resolve caller contact
  const callerContact = useMemo(() => {
    const waId = incomingCall?.from_number || (callState !== 'idle' ? activeCallId : null);
    if (!waId) return null;
    return (contactsQ.data ?? []).find((c) => c.wa_id === waId) ?? null;
  }, [incomingCall, contactsQ.data, callState, activeCallId]);

  const displayPhone = incomingCall?.from_number || activeCallId || '';
  const callerName = callerContact?.name || formatPhone(displayPhone) || 'Unknown';
  const callerPhoneFormatted = formatPhone(displayPhone);
  const avatarCls = pastelClassFromString(displayPhone);

  // Track the last call ID to prevent flickering
  const lastCallIdRef = useRef(null);
  const stateChangeTimerRef = useRef(null);

  // Set ringing state when we detect an incoming call
  // Only set to ringing if we actually have a new incoming call
  useEffect(() => {
    // Clear any pending state changes
    if (stateChangeTimerRef.current) {
      clearTimeout(stateChangeTimerRef.current);
      stateChangeTimerRef.current = null;
    }

    const currentCallId = incomingCall?.call_id || incomingCall?.id;

    // If we already have this call active, don't change state (prevents flickering)
    if (currentCallId === lastCallIdRef.current && callState === 'ringing') {
      return;
    }

    if (incomingCall && callState === 'idle') {
      // Double-check that this is actually a ringing call, not a completed one
      const callStatus = incomingCall.status || incomingCall.event || '';
      const isActuallyRinging =
        callStatus === 'RINGING' ||
        callStatus === 'ringing' ||
        callStatus === 'initiate' ||
        incomingCall.source === 'pending'; // Pending calls are definitely ringing

      // Make sure it's NOT completed/ended
      const isNotEnded =
        callStatus !== 'COMPLETED' &&
        callStatus !== 'ENDED' &&
        callStatus !== 'MISSED' &&
        callStatus !== 'ACCEPTED' &&
        callStatus !== 'connect' &&
        callStatus !== 'disconnect' &&
        callStatus !== 'end' &&
        callStatus !== 'missed';

      if (isActuallyRinging && isNotEnded) {
        // Set state immediately for pending calls (they're definitely real), debounce for history calls
        if (incomingCall.source === 'pending') {
          // Pending calls are definitely real - show immediately
          lastCallIdRef.current = currentCallId;
          waCallIdRef.current = incomingCall.call_id; // Store the actual WA call_id
          setCallState('ringing');
          setActiveCallId(incomingCall.from_number);
        } else {
          // History calls - small debounce to prevent flickering
          stateChangeTimerRef.current = setTimeout(() => {
            // Double-check call still exists before setting state
            if (incomingCall && (incomingCall.call_id === currentCallId || incomingCall.id === currentCallId)) {
              lastCallIdRef.current = currentCallId;
              waCallIdRef.current = incomingCall.call_id; // Store the actual WA call_id
              setCallState('ringing');
              setActiveCallId(incomingCall.from_number);
            }
          }, 50); // Small debounce for history calls only
        }
      }
    } else if (!incomingCall && callState === 'ringing') {
      // If call disappears or ends, reset to idle after a delay to prevent flickering
      stateChangeTimerRef.current = setTimeout(() => {
        // Double-check call is still gone
        if (!incomingCall) {
          lastCallIdRef.current = null;
          setCallState('idle');
          setActiveCallId(null);
        }
      }, 300); // Delay to prevent rapid toggling
    }

    return () => {
      if (stateChangeTimerRef.current) {
        clearTimeout(stateChangeTimerRef.current);
        stateChangeTimerRef.current = null;
      }
    };
  }, [incomingCall, callState]);

  // Monitor call history to detect when calls end and auto-dismiss
  // Use a ref to track if we've already dismissed to prevent flickering
  const dismissedInThisCycleRef = useRef(new Set());
  const activeCallIdRef = useRef(null);

  // Track the active call ID
  useEffect(() => {
    if (activeCallId) {
      activeCallIdRef.current = activeCallId;
    }
  }, [activeCallId]);

  useEffect(() => {
    // Check for ended calls when ringing OR active
    if (
      (callState === 'ringing' || callState === 'active' || callState === 'connecting') &&
      activeCallIdRef.current &&
      callHistoryQ.data
    ) {
      // Check if the active call has ended by looking for calls from the same number
      const recentCallsFromNumber = callHistoryQ.data.filter((call) => {
        const callFrom = call.from_number || call.from;
        const callTo = call.to_number || call.to;
        return callFrom === activeCallIdRef.current || callTo === activeCallIdRef.current;
      });

      // Check the most recent call from this number
      const mostRecentCall = recentCallsFromNumber.sort(
        (a, b) => new Date(b.created_at || b.timestamp || 0) - new Date(a.created_at || a.timestamp || 0),
      )[0];

      if (mostRecentCall) {
        const callId = mostRecentCall.call_id || mostRecentCall.id;
        const status = (mostRecentCall.status || '').toUpperCase();
        const event = (mostRecentCall.event || '').toLowerCase();

        // Skip if we've already dismissed this call in this cycle
        if (callId && dismissedInThisCycleRef.current.has(callId)) {
          return;
        }

        // Check if call has ended
        const isEnded =
          status === 'COMPLETED' ||
          status === 'ENDED' ||
          status === 'MISSED' ||
          event === 'disconnect' ||
          event === 'end' ||
          event === 'missed' ||
          event === 'hangup';

        if (isEnded && callState !== 'ended' && callState !== 'idle') {
          // Call has ended, clean up and dismiss
          console.debug('[Call] Detected call end from history:', { callId, status, event });

          if (callId) {
            dismissedInThisCycleRef.current.add(callId);
            setDismissedCallIds((prev) => new Set([...prev, callId]));
          }

          cleanupCall();
          setCallState('ended');
          setActiveCallId(null);
          activeCallIdRef.current = null;
          lastCallIdRef.current = null;
          waCallIdRef.current = null;

          // Auto-dismiss after 2 seconds
          setTimeout(() => {
            setCallState('idle');
            if (callId) {
              setTimeout(() => {
                dismissedInThisCycleRef.current.delete(callId);
              }, 5000);
            }
          }, 2000);
        }
      }
    }
  }, [callHistoryQ.data, callState, cleanupCall]);

  // Play ringtone sound when ringing
  useEffect(() => {
    if (callState === 'ringing') {
      try {
        // Use a simple oscillator as ringtone
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 440;
        osc.type = 'sine';
        gain.gain.value = 0.1;
        osc.start();

        // Ring pattern: 1s on, 2s off
        let ringing = true;
        const interval = setInterval(
          () => {
            ringing = !ringing;
            gain.gain.value = ringing ? 0.1 : 0;
          },
          ringing ? 1000 : 2000,
        );

        ringtoneRef.current = { ctx, osc, interval };
      } catch (e) {
        // Audio context may not be available
      }
    } else {
      // Stop ringtone
      if (ringtoneRef.current) {
        try {
          clearInterval(ringtoneRef.current.interval);
          ringtoneRef.current.osc.stop();
          ringtoneRef.current.ctx.close();
        } catch (e) {}
        ringtoneRef.current = null;
      }
    }
    return () => {
      if (ringtoneRef.current) {
        try {
          clearInterval(ringtoneRef.current.interval);
          ringtoneRef.current.osc.stop();
          ringtoneRef.current.ctx.close();
        } catch (e) {}
        ringtoneRef.current = null;
      }
    };
  }, [callState]);

  // Call timer
  useEffect(() => {
    if (callState === 'active') {
      setCallDuration(0);
      callTimerRef.current = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    }
    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [callState]);

  // Cleanup on unmount only (don't re-run when cleanupCall changes)
  useEffect(() => {
    return () => {
      cleanupCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount/unmount, not when cleanupCall changes

  const handleAccept = useCallback(async () => {
    if (!incomingCall) return;
    const callId = incomingCall.call_id;
    waCallIdRef.current = callId; // Ensure we have the call_id stored for hangup

    // If no SDP available, we can't do WebRTC — just acknowledge
    if (!incomingCall.sdp) {
      toast('No audio stream available — accept in WhatsApp app', { icon: '📱', duration: 5000 });
      setDismissedCallIds((prev) => new Set([...prev, callId]));
      setCallState('idle');
      return;
    }

    setCallState('connecting');
    try {
      // 1. Get microphone access
      const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = localStream;

      // 2. Create WebRTC peer connection
      const pc = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }],
      });
      peerConnectionRef.current = pc;

      // 3. Add local audio tracks
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      // 4. Handle remote audio
      pc.ontrack = (event) => {
        if (remoteAudioRef.current && event.streams[0]) {
          remoteAudioRef.current.srcObject = event.streams[0];
          remoteAudioRef.current.play().catch(() => {});
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        console.debug('[WebRTC] ICE connection state:', state);
        if (state === 'connected' || state === 'completed') {
          setCallState('active');
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          console.debug('[WebRTC] Connection lost, ending call');
          setCallState('ended');
          cleanupCall();
          setActiveCallId(null);
          activeCallIdRef.current = null;
          setTimeout(() => {
            setCallState('idle');
            setDismissedCallIds((prev) => new Set([...prev, callId]));
          }, 2000);
        }
      };

      // Also listen for connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.debug('[WebRTC] Connection state:', state);
        if (state === 'connected') {
          setCallState('active');
        } else if (state === 'disconnected' || state === 'failed' || state === 'closed') {
          console.debug('[WebRTC] Connection closed, ending call');
          setCallState('ended');
          cleanupCall();
          setActiveCallId(null);
          activeCallIdRef.current = null;
          setTimeout(() => {
            setCallState('idle');
            setDismissedCallIds((prev) => new Set([...prev, callId]));
          }, 2000);
        }
      };

      // 5. Set remote SDP offer
      await pc.setRemoteDescription(
        new RTCSessionDescription({
          type: incomingCall.sdp_type || 'offer',
          sdp: incomingCall.sdp,
        }),
      );

      // 6. Create SDP answer
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      // 7. Wait for ICE gathering to complete (or timeout after 3s)
      await new Promise((resolve) => {
        if (pc.iceGatheringState === 'complete') {
          resolve();
          return;
        }
        const timeout = setTimeout(resolve, 3000);
        pc.onicegatheringstatechange = () => {
          if (pc.iceGatheringState === 'complete') {
            clearTimeout(timeout);
            resolve();
          }
        };
      });

      // 8. Send SDP answer to backend → Meta API
      const finalSdp = pc.localDescription.sdp;
      const result = await whatsappApi.acceptCall({
        call_id: callId,
        sdp: finalSdp,
        sdp_type: 'answer',
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setCallState('active');
      toast.success('Call connected!');
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast.error(`Call failed: ${error.message}`);
      cleanupCall();
      setCallState('idle');
      setDismissedCallIds((prev) => new Set([...prev, callId]));
    }
  }, [incomingCall, cleanupCall]);

  const handleReject = useCallback(async () => {
    const callId = waCallIdRef.current || incomingCall?.call_id;
    if (callId) {
      try {
        await whatsappApi.rejectCall(callId);
        toast('Call rejected');
      } catch (e) {
        console.error('Reject failed:', e);
      }
      setDismissedCallIds((prev) => new Set([...prev, callId]));
    }
    cleanupCall();
    setCallState('idle');
  }, [incomingCall, activeCallId, cleanupCall]);

  const handleHangup = useCallback(async () => {
    console.debug('[Call] Hangup requested');
    // Use the stored WA call_id first (NOT the phone number from activeCallId)
    const callId = waCallIdRef.current || incomingCall?.call_id || lastCallIdRef.current;
    console.debug('[Call] Hangup call_id:', callId);

    // Clean up immediately
    cleanupCall();
    setCallState('ended');
    setActiveCallId(null);
    activeCallIdRef.current = null;
    lastCallIdRef.current = null;
    waCallIdRef.current = null;

    // Try to hangup via API if we have a call ID
    if (callId) {
      try {
        console.debug('[Call] Sending hangup request for call:', callId);
        await whatsappApi.hangupCall(callId);
        toast.success('Call ended');
      } catch (e) {
        console.error('[Call] Hangup API failed:', e);
        toast('Call ended');
      }
      setDismissedCallIds((prev) => new Set([...prev, callId]));
    } else {
      toast('Call ended');
    }

    // Auto-dismiss after a short delay
    setTimeout(() => {
      setCallState('idle');
    }, 1000);
  }, [incomingCall, activeCallId, cleanupCall]);

  const handleDismiss = useCallback(() => {
    const callId = incomingCall?.call_id || incomingCall?.id;
    if (callId) {
      setDismissedCallIds((prev) => new Set([...prev, callId]));
    }
    if (callState === 'ringing') {
      setCallState('idle');
    }
  }, [incomingCall, callState]);

  const toggleMute = useCallback(() => {
    console.debug('[Call] Toggle mute, current state:', isMuted);
    if (localStreamRef.current) {
      const tracks = localStreamRef.current.getAudioTracks();
      const newMutedState = !isMuted;

      tracks.forEach((track) => {
        track.enabled = !newMutedState; // enabled = true means unmuted
        console.debug('[Call] Track enabled:', track.enabled, 'muted:', newMutedState);
      });

      setIsMuted(newMutedState);

      if (newMutedState) {
        toast('Microphone muted', { icon: '🔇', duration: 2000 });
      } else {
        toast('Microphone unmuted', { icon: '🎤', duration: 2000 });
      }
    } else {
      // If stream isn't available, just toggle the UI state
      setIsMuted((prev) => !prev);
      toast('Audio stream not available', { icon: '⚠️', duration: 2000 });
    }
  }, [isMuted]);

  const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Auto-dismiss ringing after 45 seconds
  useEffect(() => {
    if (callState !== 'ringing') return;
    const timer = setTimeout(() => {
      handleDismiss();
    }, 45000);
    return () => clearTimeout(timer);
  }, [callState, handleDismiss]);

  // Nothing to show - only show when actually ringing or in an active call state
  // Use memo to prevent flickering from rapid state changes
  const shouldShow = useMemo(() => {
    // Show if we're in a call state OR if we have a pending incoming call (show immediately)
    return callState !== 'idle' || (incomingCall && incomingCall.source === 'pending');
  }, [callState, incomingCall]);

  if (!shouldShow) return null;

  return (
    <>
      {/* Hidden audio element for remote audio playback */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top notification banner (always visible during call states) */}
      {callState === 'ringing' && (
        <div className="fixed right-4 top-4 z-50 animate-in slide-in-from-right-4 fade-in">
          <div className="flex items-center gap-3 rounded-xl bg-green-600 px-4 py-3 text-white shadow-2xl">
            <Phone className="h-5 w-5 animate-pulse" />
            <span className="font-medium">Incoming call from {callerName}</span>
          </div>
        </div>
      )}

      {/* Main call modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 rounded-2xl bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Caller info */}
              <div className="mb-4 flex items-center gap-4">
                <div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold',
                    avatarCls,
                    callState === 'ringing' && 'animate-pulse ring-4 ring-green-300',
                  )}
                >
                  {initialsFromName(callerName)}
                </div>
                <div className="flex-1">
                  <div className="text-lg font-semibold text-gray-900">{callerName}</div>
                  <div className="text-sm text-gray-500">{callerPhoneFormatted}</div>
                  <div className="mt-1 text-xs text-gray-400">
                    {callState === 'ringing' && 'Incoming call...'}
                    {callState === 'connecting' && 'Connecting...'}
                    {callState === 'active' && formatDuration(callDuration)}
                    {callState === 'ended' && 'Call ended'}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                {callState === 'ringing' && (
                  <>
                    <Button
                      onClick={handleReject}
                      variant="outline"
                      className="flex-1 border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <PhoneOff className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                    <Button onClick={handleAccept} className="flex-1 bg-green-500 hover:bg-green-600">
                      <Phone className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                  </>
                )}
                {callState === 'connecting' && (
                  <Button disabled className="flex-1 bg-yellow-500">
                    <Phone className="mr-2 h-4 w-4 animate-pulse" />
                    Connecting...
                  </Button>
                )}
                {(callState === 'active' || callState === 'connecting') && (
                  <>
                    {callState === 'active' && (
                      <Button
                        onClick={toggleMute}
                        variant="outline"
                        className={cn('flex-1', isMuted && 'border-orange-200 bg-orange-50 text-orange-600')}
                      >
                        {isMuted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
                        {isMuted ? 'Unmute' : 'Mute'}
                      </Button>
                    )}
                    <Button
                      onClick={handleHangup}
                      className={cn('flex-1 bg-red-500 hover:bg-red-600', callState === 'connecting' && 'w-full')}
                      disabled={callState === 'connecting'}
                    >
                      <PhoneOff className="mr-2 h-4 w-4" />
                      {callState === 'connecting' ? 'Hanging up...' : 'Hang Up'}
                    </Button>
                  </>
                )}
                {callState === 'ended' && (
                  <Button
                    onClick={() => {
                      setCallState('idle');
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Close
                  </Button>
                )}
              </div>

              {/* Info text */}
              {callState === 'ringing' && !incomingCall?.sdp && (
                <p className="mt-4 text-center text-xs text-gray-500">
                  Audio may not be available — you can also accept in the WhatsApp app
                </p>
              )}
            </div>
            {(callState === 'ringing' || callState === 'ended') && (
              <button
                onClick={handleDismiss}
                className="ml-4 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Dismiss"
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
