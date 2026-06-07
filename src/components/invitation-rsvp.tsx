'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Check, Heart, Calendar, MapPin, Users, ChevronDown, Sparkles } from 'lucide-react';
import type { Household } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const rsvpSchema = z.object({
  status: z.enum(['accepted', 'declined']),
  dietaryRestrictions: z.string().optional(),
});

type RSVPData = z.infer<typeof rsvpSchema>;

export function InvitationRSVP({ household }: { household: Household }) {
  const [submitted, setSubmitted] = useState(false);
  const [expandedGuest, setExpandedGuest] = useState<number | null>(0);
  const [rsvpStatus, setRsvpStatus] = useState<Record<number, 'accepted' | 'declined' | null>>({});
  const { register, handleSubmit, formState: { errors }, reset } = useForm({ resolver: zodResolver(rsvpSchema) });

  const weddingDate = new Date('2026-09-06');
  const daysUntil = Math.ceil((weddingDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const onSubmit = async (data: RSVPData) => {
    // Simulate saving RSVP
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-50 via-white to-emerald-50">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          className="absolute top-0 left-0 w-96 h-96 bg-amber-200/10 rounded-full blur-3xl"
          animate={{ y: [0, -50, 0], x: [0, 30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-200/10 rounded-full blur-3xl"
          animate={{ y: [0, 50, 0], x: [0, -30, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="absolute top-1/2 left-1/3 w-64 h-64 bg-pink-100/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 100 }}
            className="flex justify-center mb-6"
          >
            <Sparkles className="text-amber-500" size={32} />
          </motion.div>

          <h1 className="font-headline text-5xl md:text-7xl font-light mb-3 text-transparent bg-clip-text bg-gradient-to-r from-amber-600 via-pink-500 to-emerald-600">
            Together in Love
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-light mb-6">
            Abduraziq & Razia
          </p>
          <p className="text-gray-500 text-base mb-8">
            Request the honor of your presence at our wedding celebration
          </p>

          {/* Key Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-amber-200/20"
            >
              <Calendar className="text-amber-500" size={20} />
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Date</p>
                <p className="font-semibold text-gray-800">6 September 2026</p>
                <p className="text-xs text-amber-600">{daysUntil} days away</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-200/20"
            >
              <MapPin className="text-emerald-500" size={20} />
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Location</p>
                <p className="font-semibold text-gray-800">Tuscany in Rylands</p>
                <p className="text-xs text-emerald-600">Cape Town, South Africa</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-3 p-4 bg-white/60 backdrop-blur-sm rounded-xl border border-pink-200/20"
            >
              <Heart className="text-pink-500" size={20} />
              <div className="text-left">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Reception</p>
                <p className="font-semibold text-gray-800">6:00 PM</p>
                <p className="text-xs text-pink-600">Dinner & Dancing</p>
              </div>
            </motion.div>
          </div>

          {/* Divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="h-px bg-gradient-to-r from-transparent via-amber-300 to-transparent mb-12"
          />
        </motion.div>

        {/* RSVP Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
        >
          <Card className="border-amber-200/30 bg-white/80 backdrop-blur-xl shadow-2xl mb-8">
            <CardHeader className="border-b border-amber-100/20 pb-6">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Users className="text-amber-500" size={28} />
                Your RSVP
              </CardTitle>
              <CardDescription>
                We can't wait to celebrate with {household.name}!
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
              <div className="space-y-6">
                {/* Guest List */}
                <div>
                  <h3 className="font-semibold text-gray-800 mb-4">Celebrating with us:</h3>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {household.guests && household.guests.length > 0 ? (
                        household.guests.map((guest, idx) => (
                          <motion.div
                            key={idx}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ delay: idx * 0.1 }}
                          >
                            <button
                              onClick={() => setExpandedGuest(expandedGuest === idx ? null : idx)}
                              className="w-full p-4 bg-gradient-to-r from-amber-50/50 to-emerald-50/50 border border-amber-200/20 rounded-xl hover:border-amber-300/50 transition-all cursor-pointer text-left"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <p className="font-semibold text-gray-800">{guest.name || `Guest ${idx + 1}`}</p>
                                  {guest.dietaryRestrictions && (
                                    <p className="text-xs text-gray-500 mt-1">📌 {guest.dietaryRestrictions}</p>
                                  )}
                                </div>
                                <motion.div
                                  animate={{ rotate: expandedGuest === idx ? 180 : 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="flex items-center gap-2 ml-4"
                                >
                                  {rsvpStatus[idx] === 'accepted' && (
                                    <Badge className="bg-emerald-500/20 text-emerald-700 border-emerald-200">
                                      ✓ Confirmed
                                    </Badge>
                                  )}
                                  {rsvpStatus[idx] === 'declined' && (
                                    <Badge className="bg-gray-200 text-gray-700">Declined</Badge>
                                  )}
                                  <ChevronDown size={20} className="text-gray-400" />
                                </motion.div>
                              </div>

                              {/* Expanded Guest Form */}
                              <AnimatePresence>
                                {expandedGuest === idx && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-4 pt-4 border-t border-amber-200/20 space-y-4"
                                  >
                                    <div className="space-y-3">
                                      <p className="text-sm text-gray-600 font-medium">Will you be attending?</p>
                                      <div className="flex gap-3">
                                        <button
                                          onClick={() => setRsvpStatus({ ...rsvpStatus, [idx]: 'accepted' })}
                                          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                                            rsvpStatus[idx] === 'accepted'
                                              ? 'bg-emerald-500 text-white shadow-lg'
                                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                          }`}
                                        >
                                          ✓ Joyfully Accept
                                        </button>
                                        <button
                                          onClick={() => setRsvpStatus({ ...rsvpStatus, [idx]: 'declined' })}
                                          className={`flex-1 py-2 px-4 rounded-lg font-semibold transition-all ${
                                            rsvpStatus[idx] === 'declined'
                                              ? 'bg-gray-400 text-white shadow-lg'
                                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                          }`}
                                        >
                                          Decline
                                        </button>
                                      </div>
                                    </div>

                                    {rsvpStatus[idx] === 'accepted' && (
                                      <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="space-y-3 p-3 bg-emerald-50/50 rounded-lg border border-emerald-200/30"
                                      >
                                        <div>
                                          <Label className="text-gray-700 text-sm">Dietary Restrictions (optional)</Label>
                                          <Input
                                            placeholder="e.g., vegetarian, gluten-free, allergies"
                                            className="mt-2 border-amber-200/50"
                                            defaultValue={guest.dietaryRestrictions || ''}
                                          />
                                        </div>
                                      </motion.div>
                                    )}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </button>
                          </motion.div>
                        ))
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="p-4 bg-amber-50/50 border border-amber-200/30 rounded-xl text-center text-gray-600"
                        >
                          <Users size={24} className="mx-auto mb-2 text-amber-400" />
                          <p className="font-medium">{household.name}</p>
                          <p className="text-sm text-gray-500">We look forward to celebrating with you!</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Submit Button */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1 }}
                  className="pt-6 border-t border-amber-100/20"
                >
                  <Button
                    onClick={handleSubmit(onSubmit)}
                    className="w-full bg-gradient-to-r from-amber-500 to-pink-500 hover:from-amber-600 hover:to-pink-600 text-white font-semibold py-6 rounded-xl shadow-lg transition-all"
                  >
                    <Heart className="mr-2" size={20} />
                    {submitted ? 'RSVP Received! Thank You! ♥' : 'Confirm Your Attendance'}
                  </Button>
                </motion.div>
              </div>
            </CardContent>
          </Card>

          {/* Important Details Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9 }}
          >
            <Card className="border-emerald-200/30 bg-gradient-to-br from-emerald-50/50 to-transparent">
              <CardHeader>
                <CardTitle className="text-xl">Before the Big Day</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Check className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">Dress Code</p>
                    <p className="text-gray-600 text-sm">Formal Attire • Black Tie Optional</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">Transportation</p>
                    <p className="text-gray-600 text-sm">Parking available on-site • Shuttle service from selected hotels</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">Accommodations</p>
                    <p className="text-gray-600 text-sm">Room blocks available at nearby hotels with special rates</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Check className="text-emerald-600 flex-shrink-0 mt-1" size={20} />
                  <div>
                    <p className="font-semibold text-gray-800">RSVP Deadline</p>
                    <p className="text-gray-600 text-sm">Please respond by August 20, 2026</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.1 }}
            className="text-center mt-12 py-8"
          >
            <p className="text-gray-600 font-light">
              Questions? {' '}
              <a href="mailto:hello@raziaraaziq.co.za" className="text-amber-600 hover:text-amber-700 font-semibold">
                Get in touch with us
              </a>
            </p>
            <p className="text-gray-500 text-sm mt-2">We can't wait to celebrate with you! 💍</p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
