'use client';

import { useCallback, useState } from 'react';
import { Copy, Check, Link2, Loader2, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { EventRole } from '@/lib/event-access';

/**
 * Generates personalised magic links for the entertainment evening.
 *
 * Admin-gated by middleware (the `/event-access` route) and again by
 * /api/event/invite, which checks the admin cookie for itself — middleware
 * only guards pages, so an unguarded API route would let anyone who found the
 * URL mint themselves an ADMIN session.
 */

type Generated = { name: string; role: EventRole; url: string };

const ROLE_OPTIONS: { value: EventRole; label: string; blurb: string }[] = [
  {
    value: 'EVENT_ONLY_GUEST',
    label: 'Evening only',
    blurb: 'Locked to the hub. Cannot see the wedding pages at all.',
  },
  {
    value: 'MAIN_GUEST',
    label: 'Wedding guest',
    blurb: 'Full access — the hub plus everything wedding-side.',
  },
  { value: 'ADMIN', label: 'Host', blurb: 'Adds moderation controls on the memory wall.' },
];

export default function EventAccessPage() {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [role, setRole] = useState<EventRole>('EVENT_ONLY_GUEST');
  const [busy, setBusy] = useState(false);
  const [links, setLinks] = useState<Generated[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [qrFor, setQrFor] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const res = await fetch('/api/event/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), role }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'Could not generate that link');

      setLinks(current => [{ name: body.name, role: body.role, url: body.url }, ...current]);
      setName('');
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Link failed',
        description: (err as Error).message,
      });
    } finally {
      setBusy(false);
    }
  }, [name, role, toast]);

  const copy = useCallback(
    async (url: string) => {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(url);
        setTimeout(() => setCopied(null), 2000);
      } catch {
        // Clipboard access needs a secure context and can be refused outright;
        // the link is on screen and selectable either way.
        toast({ title: 'Copy it manually', description: url });
      }
    },
    [toast]
  );

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5 px-4 pb-16">
      <div className="text-center">
        <h1 className="font-headline text-3xl italic text-luxe-gradient">Evening Access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Personalised links for the entertainment evening. Guests who cannot use a link can
          join with the 4-digit PIN instead.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-headline text-xl italic">
            <Link2 size={17} /> New magic link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Guest name</Label>
            <Input
              id="invite-name"
              value={name}
              onChange={e => setName(e.target.value.slice(0, 40))}
              onKeyDown={e => {
                if (e.key === 'Enter') void generate();
              }}
              placeholder="e.g. Yusuf Adams"
            />
          </div>

          <div className="space-y-2">
            <Label>Access level</Label>
            <div className="grid gap-2">
              {ROLE_OPTIONS.map(option => (
                <button
                  key={option.value}
                  onClick={() => setRole(option.value)}
                  className={`rounded-lg border p-3 text-left transition ${
                    role === option.value
                      ? 'border-[#d4af37] bg-[#d4af37]/10'
                      : 'border-white/10 hover:border-white/25'
                  }`}
                >
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{option.blurb}</p>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={generate} disabled={!name.trim() || busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Generate link
          </Button>
        </CardContent>
      </Card>

      {links.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="font-headline text-xl italic">
              Generated this session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {links.map(link => (
              <div key={link.url} className="rounded-lg border border-white/10 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{link.name}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                      {ROLE_OPTIONS.find(r => r.value === link.role)?.label}
                    </p>
                    <p className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                      {link.url}
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setQrFor(qrFor === link.url ? null : link.url)}
                      aria-label="Show QR code"
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => copy(link.url)}
                      aria-label="Copy link"
                    >
                      {copied === link.url ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {qrFor === link.url && (
                  <div className="mt-3 flex justify-center rounded-lg bg-white p-4">
                    <QRCode value={link.url} size={160} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Links stay valid for 30 days. They are signed rather than stored, so they cannot be
        listed again after you leave this page — copy the ones you need.
      </p>
    </div>
  );
}
