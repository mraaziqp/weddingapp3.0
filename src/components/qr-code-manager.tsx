'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'react-qr-code';
import type { Household } from '@/lib/types';
import { Download, Copy, Share2, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface QRModalProps {
  household: Household;
  isOpen: boolean;
  onClose: () => void;
}

export function QRCodeModal({
  household,
  isOpen,
  onClose,
}: QRModalProps) {
  const { toast } = useToast();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://raziaraaziq.co.za';
  
  // Detect side (Bride vs Groom) based on guest tags
  const isBrideSide = household.guests?.some(g => g.tags?.some(t => t.includes("Bride's")));
  const isGroomSide = household.guests?.some(g => g.tags?.some(t => t.includes("Groom's")));
  let sideParam = '';
  if (isBrideSide) sideParam = '&side=bride';
  else if (isGroomSide) sideParam = '&side=groom';

  const invitationUrl = `${baseUrl}/invitation?id=${household.id}&household=${household.id}${sideParam}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(invitationUrl);
    toast({
      title: 'Copied!',
      description: 'Invitation link copied to clipboard',
    });
  };

  const handleDownloadQR = async () => {
    const svg = document.getElementById(`qr-${household.id}`);
    if (!svg) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const _url = new URL('data:image/svg+xml', window.location.origin);
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 400);
      ctx.drawImage(img, 0, 0, 400, 400);

      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `qr-${household.name.toLowerCase().replace(/\s/g, '-')}.png`;
      link.click();

      toast({
        title: 'Downloaded!',
        description: `QR code saved for ${household.name}`,
      });
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${household.name} at Our Wedding!`,
          text: 'Please RSVP to our wedding invitation',
          url: invitationUrl,
        });
      } catch (_err) {
        // Sharing was cancelled or failed
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="glass-card max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            QR Code for {household.name}
          </DialogTitle>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="space-y-6"
        >
          {/* QR Code */}
          <div className="flex justify-center p-6 bg-white rounded-lg">
            <QRCode
              id={`qr-${household.id}`}
              value={invitationUrl}
              size={200}
              level="H"
            />
          </div>

          {/* Info */}
          <div className="space-y-2">
            <p className="text-sm text-white/70">
              <strong>Household:</strong> {household.name}
            </p>
            <p className="text-sm text-white/70">
              <strong>Guests:</strong> {household.guests?.length || 0} person(s)
            </p>
            <p className="text-xs text-white/60 break-all">
              {invitationUrl}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="flex-1 border-white/20 text-white/70 hover:bg-white/10"
              size="sm"
            >
              <Copy size={16} className="mr-2" />
              Copy Link
            </Button>
            <Button
              onClick={handleDownloadQR}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              size="sm"
            >
              <Download size={16} className="mr-2" />
              Download
            </Button>
            <Button
              onClick={handleShare}
              variant="outline"
              className="flex-1 border-white/20 text-white/70 hover:bg-white/10"
              size="sm"
            >
              <Share2 size={16} />
            </Button>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-xs text-blue-300">
              💡 <strong>Tip:</strong> Print or share this QR code with your guests to send them directly to the RSVP page.
            </p>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}

interface QRCodeManagerProps {
  households: Household[];
}

export function QRCodeManager({ households }: QRCodeManagerProps) {
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);

  return (
    <>
      <Card className="glass-card border-amber-500/20 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📱</span> QR Code Manager
          </CardTitle>
          <CardDescription>Generate and download personalized QR codes for each household</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {households.slice(0, 6).map((household) => (
              <motion.div
                key={household.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <button
                  onClick={() => setSelectedHousehold(household)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-lg hover:border-amber-500/30 transition-all"
                >
                  <div className="text-left space-y-2">
                    <p className="font-semibold text-white text-sm">{household.name}</p>
                    <p className="text-xs text-white/60">
                      {household.guests?.length || 0} guests
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedHousehold(household);
                        }}
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 border-white/20 text-white/70 text-xs hover:bg-white/10"
                      >
                        <Eye size={12} className="mr-1" />
                        View QR
                      </Button>
                    </div>
                  </div>
                </button>
              </motion.div>
            ))}
          </div>

          {households.length > 6 && (
            <p className="text-center text-white/60 text-sm mt-4">
              ... and {households.length - 6} more households
            </p>
          )}
        </CardContent>
      </Card>

      <AnimatePresence>
        {selectedHousehold && (
          <QRCodeModal
            isOpen={!!selectedHousehold}
            onClose={() => setSelectedHousehold(null)}
            household={selectedHousehold}
          />
        )}
      </AnimatePresence>
    </>
  );
}
