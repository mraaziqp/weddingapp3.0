'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Heart, ChevronDown, Volume2, VolumeX } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface InvitationConfig {
  title: string;
  subtitle: string;
  dateTime: string;
  location: string;
  dressCode: string;
  rsvpDeadline: string;
  extraInfo: string;
  imageUrl?: string;
  musicUrl?: string;
  videoUrl?: string;
}

export default function InvitationPage() {
  const [config, setConfig] = useState<InvitationConfig | null>(null);
  const [status, setStatus] = useState<'viewing' | 'accepted' | 'declined' | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [dietaryRestrictions, setDietaryRestrictions] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<URLSearchParams | null>(null);
  const [isMusicOn, setIsMusicOn] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setParams(new URLSearchParams(window.location.search));
    }
    fetch('/api/invitation/config')
      .then(r => r.json())
      .then(setConfig)
      .finally(() => setLoading(false));
  }, []);

  // Browsers block un-muted autoplay, so try muted-autoplay for ambience,
  // then let the guest opt into full volume with one tap.
  useEffect(() => {
    if (config?.musicUrl && audioRef.current) {
      audioRef.current.volume = 0.4;
      audioRef.current.play().catch(() => {});
    }
  }, [config?.musicUrl]);

  const toggleMusic = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const turningOn = !isMusicOn;
    audio.muted = !turningOn;
    if (turningOn) audio.play().catch(() => {});
    setIsMusicOn(turningOn);
  };

  const handleAccept = async () => {
    if (!guestName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: params?.get('id') || 'guest-' + Date.now(),
          householdId: params?.get('household'),
          guestName,
          status: 'Accepted',
          dietaryRestrictions: dietaryRestrictions || undefined,
          message: message || undefined,
        }),
      });

      if (res.ok) {
        setStatus('accepted');
      } else {
        alert('Failed to submit RSVP. Please try again.');
      }
    } catch (err) {
      alert('Error submitting RSVP');
    }
  };

  const handleDecline = async () => {
    if (!guestName.trim()) {
      alert('Please enter your name');
      return;
    }

    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guestId: params?.get('id') || 'guest-' + Date.now(),
          householdId: params?.get('household'),
          guestName,
          status: 'Declined',
        }),
      });

      if (res.ok) {
        setStatus('declined');
      } else {
        alert('Failed to submit RSVP. Please try again.');
      }
    } catch (err) {
      alert('Error submitting RSVP');
    }
  };

  if (loading || !config) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
            <Heart size={48} className="mx-auto text-pink-500" />
          </motion.div>
          <p className="mt-4 text-lg">Loading your invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 overflow-hidden">
      {/* Background Blobs */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-purple-900/30 blur-[140px] mix-blend-screen animate-pulse" />
        <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-emerald-900/30 blur-[160px] mix-blend-screen" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 max-w-2xl mx-auto p-4 md:p-8 pt-12 pb-12"
      >
        {status ? (
          // Confirmation Screen
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center space-y-8 min-h-screen flex flex-col items-center justify-center"
          >
            {status === 'accepted' ? (
              <>
                {/* Confetti animation */}
                <div className="fixed inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const randomX = Math.random() * 100;
                    const randomDelay = Math.random() * 0.5;
                    const confetti = ['🎉', '💍', '✨', '🎊', '💕'][Math.floor(Math.random() * 5)];
                    return (
                      <motion.div
                        key={i}
                        className="absolute text-2xl pointer-events-none"
                        initial={{
                          opacity: 1,
                          y: 0,
                          x: `${randomX}%`,
                        }}
                        animate={{
                          opacity: 0,
                          y: '100vh',
                        }}
                        transition={{
                          duration: 3,
                          delay: randomDelay,
                          ease: 'easeIn',
                        }}
                      >
                        {confetti}
                      </motion.div>
                    );
                  })}
                </div>

                <motion.div
                  animate={{ y: [0, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Heart size={100} className="mx-auto text-pink-500" fill="currentColor" />
                </motion.div>

                <div className="space-y-4 max-w-2xl">
                  <h1 className="text-5xl md:text-7xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-300 to-emerald-400">
                    We Can't Wait!
                  </h1>
                  <p className="text-white/70 text-xl leading-relaxed">
                    Thank you for accepting, <span className="font-semibold text-emerald-400">{guestName}</span>. We're so excited to celebrate this special day with you on <span className="font-semibold text-amber-400">September 6th!</span>
                  </p>
                  {dietaryRestrictions && (
                    <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mt-4">
                      <p className="text-sm text-emerald-300">
                        ✓ We've noted your dietary restrictions: <strong>{dietaryRestrictions}</strong>
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-white/60 text-sm">Check your inbox for more details</p>
                  <Button
                    onClick={() => {
                      setStatus(null);
                      setGuestName('');
                      setDietaryRestrictions('');
                      setMessage('');
                      setShowForm(false);
                    }}
                    className="bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-semibold"
                  >
                    ← Back to Invitation
                  </Button>
                </div>
              </>
            ) : (
              <>
                <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3 }}>
                  <Heart size={100} className="mx-auto text-gray-400" />
                </motion.div>

                <div className="space-y-4 max-w-2xl">
                  <h1 className="text-5xl md:text-7xl font-light text-white">We'll Miss You</h1>
                  <p className="text-white/70 text-xl leading-relaxed">
                    Thanks for letting us know, <span className="font-semibold text-white">{guestName}</span>. We hope to celebrate with you another time!
                  </p>
                </div>

                <Button
                  onClick={() => {
                    setStatus(null);
                    setGuestName('');
                    setDietaryRestrictions('');
                    setMessage('');
                    setShowForm(false);
                  }}
                  className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold"
                >
                  ← Back to Invitation
                </Button>
              </>
            )}
          </motion.div>
        ) : !showForm ? (
          // Invitation Display
          <Card className="glass-card relative overflow-hidden border-white/10 backdrop-blur-2xl shadow-2xl">
            {config.musicUrl && (
              <>
                <audio ref={audioRef} src={config.musicUrl} loop muted={!isMusicOn} />
                <button
                  onClick={toggleMusic}
                  aria-label={isMusicOn ? 'Mute background music' : 'Play background music'}
                  className="absolute top-3 right-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white/80 backdrop-blur-md hover:bg-black/60 hover:text-white transition-colors"
                >
                  {isMusicOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              </>
            )}

            {/* Video takes priority over the static image when present */}
            {config.videoUrl ? (
              <video
                src={config.videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-64 md:h-96 object-cover"
              />
            ) : config.imageUrl && (
              <motion.img
                src={config.imageUrl}
                alt="Invitation"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="w-full h-64 md:h-96 object-cover"
              />
            )}

            <CardContent className="pt-8 md:pt-12 space-y-8">
              {/* Main Content */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-4"
              >
                <h1 className="text-5xl md:text-7xl font-light text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-pink-300 to-amber-500">
                  {config.title}
                </h1>
                <p className="text-3xl text-white/80">{config.subtitle}</p>
              </motion.div>

              {/* Divider */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="h-px bg-gradient-to-r from-transparent via-amber-400 to-transparent"
              />

              {/* Event Details */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/60 text-sm mb-2">📅 DATE & TIME</p>
                    <p className="text-white font-semibold">{config.dateTime}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/60 text-sm mb-2">📍 LOCATION</p>
                    <p className="text-white font-semibold">{config.location}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/60 text-sm mb-2">👔 DRESS CODE</p>
                    <p className="text-white font-semibold">{config.dressCode}</p>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                    <p className="text-white/60 text-sm mb-2">🔔 RSVP BY</p>
                    <p className="text-white font-semibold">{config.rsvpDeadline}</p>
                  </div>
                </div>
              </motion.div>

              {/* Extra Info */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg"
              >
                <p className="text-white/80 leading-relaxed">{config.extraInfo}</p>
              </motion.div>

              {/* RSVP Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="space-y-4 pt-4"
              >
                {!showForm ? (
                  <div className="space-y-3">
                    <p className="text-white/70 text-center">Will you be celebrating with us?</p>
                    <div className="flex gap-3">
                      <Button
                        onClick={() => setShowForm(true)}
                        className="flex-1 h-14 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-semibold text-lg"
                      >
                        ✓ Accept
                      </Button>
                      <Button
                        onClick={() => setShowForm(true)}
                        variant="outline"
                        className="flex-1 h-14 border-white/20 text-white/70 font-semibold text-lg"
                      >
                        ✕ Decline
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-lg">
                    <div>
                      <Label className="text-white/70">Your Name *</Label>
                      <Input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="How should we address you?"
                        className="mt-2 border-white/20 bg-white/5"
                      />
                    </div>

                    <div>
                      <Label className="text-white/70">Dietary Restrictions (Optional)</Label>
                      <Input
                        value={dietaryRestrictions}
                        onChange={(e) => setDietaryRestrictions(e.target.value)}
                        placeholder="e.g., vegetarian, gluten-free, allergies"
                        className="mt-2 border-white/20 bg-white/5"
                      />
                    </div>

                    <div>
                      <Label className="text-white/70">Message (Optional)</Label>
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Send us a message!"
                        className="mt-2 border-white/20 bg-white/5"
                      />
                    </div>

                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={handleAccept}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                      >
                        ✓ Confirm Accept
                      </Button>
                      <Button
                        onClick={handleDecline}
                        variant="outline"
                        className="flex-1 border-white/20 text-white/70 hover:bg-white/10"
                      >
                        ✕ Confirm Decline
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-center py-4 border-t border-white/10"
              >
                <p className="text-white/60 text-sm">
                  We can't wait to celebrate the union of our love with you! 💍
                </p>
              </motion.div>
            </CardContent>
          </Card>
        ) : (
          // RSVP Form
          <Card className="glass-card overflow-hidden border-white/10 backdrop-blur-2xl shadow-2xl">
            <CardContent className="pt-8 md:pt-12">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-semibold text-white mb-2">RSVP Details</h2>
                  <p className="text-white/60">Please complete your response</p>
                </div>

                <div className="space-y-4 p-6 bg-white/5 border border-white/10 rounded-lg">
                  <div>
                    <Label className="text-white/70">Your Name *</Label>
                    <Input
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder="How should we address you?"
                      className="mt-2 border-white/20 bg-white/5"
                    />
                  </div>

                  <div>
                    <Label className="text-white/70">Dietary Restrictions (Optional)</Label>
                    <Input
                      value={dietaryRestrictions}
                      onChange={(e) => setDietaryRestrictions(e.target.value)}
                      placeholder="e.g., vegetarian, gluten-free, allergies"
                      className="mt-2 border-white/20 bg-white/5"
                    />
                  </div>

                  <div>
                    <Label className="text-white/70">Message (Optional)</Label>
                    <Input
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Send us a message!"
                      className="mt-2 border-white/20 bg-white/5"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={handleAccept}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      ✓ Confirm Accept
                    </Button>
                    <Button
                      onClick={handleDecline}
                      variant="outline"
                      className="flex-1 border-white/20 text-white/70 hover:bg-white/10"
                    >
                      ✕ Confirm Decline
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={() => setShowForm(false)}
                  variant="outline"
                  className="w-full border-white/20 text-white/70"
                >
                  ← Back
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  );
}
