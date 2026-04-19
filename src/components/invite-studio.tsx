
'use client';

import { households } from '@/lib/mock-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import QRCode from 'react-qr-code';
import { Share2, Download, Eye, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import type { Household } from '@/lib/types';

const containerVariants = {
    visible: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' } },
};

const InviteCard = ({ household, onPreview }: { household: Household; onPreview: (household: Household) => void }) => {
    const { toast } = useToast();
    const [inviteUrl, setInviteUrl] = useState('');

    useEffect(() => {
        setInviteUrl(`${window.location.origin}/invite/${household.qrCode}`);
    }, [household.qrCode]);

    const handleWhatsAppShare = () => {
        if (!inviteUrl) return;
        const guestName = household.name.replace("The ", "").replace(" Family", "");
        const message = `Salaam ${guestName}! Razia & Abduraziq would be honored to have you at our wedding on Sept 6. Tap here to view your digital invite and RSVP: ${inviteUrl}`;
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const downloadQR = () => {
        const svgElement = document.getElementById(`qr-code-svg-${household.id}`);
        if (!svgElement) return;

        const clonedSvgElement = svgElement.cloneNode(true) as SVGSVGElement;
        const bgRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bgRect.setAttribute('width', '100%');
        bgRect.setAttribute('height', '100%');
        bgRect.setAttribute('fill', 'white'); // Add white background for non-transparent downloads
        clonedSvgElement.insertBefore(bgRect, clonedSvgElement.firstChild);

        const svgData = new XMLSerializer().serializeToString(clonedSvgElement);
        const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${household.name.replace(/\s+/g, '-')}-Invite-QR.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    if (!inviteUrl) {
        return null;
    }

    return (
        <motion.div variants={itemVariants}>
            <Card className="glass-card flex flex-col items-center text-center">
                <CardHeader>
                    <CardTitle>{household.name}</CardTitle>
                    <CardDescription>{household.guests.length} members</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center gap-4 w-full">
                    <div className="p-2 bg-white rounded-lg">
                        <QRCode
                            id={`qr-code-svg-${household.id}`}
                            value={inviteUrl}
                            size={128}
                            fgColor="#D4AF37"
                            bgColor="transparent"
                            level="H"
                        />
                    </div>
                    <div className="flex justify-center gap-2 w-full pt-2">
                        <Button variant="outline" onClick={() => onPreview(household)}>
                            <Eye className="mr-2 h-4 w-4"/>Preview
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={handleWhatsAppShare}>
                            <Share2 className="mr-2 h-4 w-4" /> WhatsApp
                        </Button>
                        <Button variant="outline" onClick={downloadQR} size="icon" aria-label="Download QR Code">
                            <Download className="h-4 w-4"/>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
};

export function InviteStudio() {
    const [previewingHousehold, setPreviewingHousehold] = useState<Household | null>(null);

    return (
        <>
            <motion.div
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {households.map(household => 
                    <InviteCard key={household.id} household={household} onPreview={setPreviewingHousehold} />
                )}
            </motion.div>

            <AnimatePresence>
                {previewingHousehold && (
                     <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
                        onClick={() => setPreviewingHousehold(null)}
                    >
                        <motion.div
                            initial={{ y: 20, opacity: 0, scale: 0.95 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 20, opacity: 0, scale: 0.95 }}
                            className="relative w-full flex flex-col items-center gap-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <p className="font-headline italic text-aurora-soft-gold">
                                Previewing: {previewingHousehold.name}'s Invitation
                            </p>
                             <div className="relative mx-auto border-gray-900 bg-gray-900 border-[8px] md:border-[12px] rounded-[2.5rem] md:rounded-[3rem] h-auto max-h-[85vh] w-full max-w-[375px] aspect-[375/812] shadow-2xl">
                                <div className="w-[140px] h-[28px] bg-black top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-20"></div>
                                <div className="rounded-[2rem] md:rounded-[2.5rem] overflow-hidden w-full h-full bg-[#FAF9F6]">
                                    <iframe
                                        src={`/invite/${previewingHousehold.qrCode}`}
                                        className="w-full h-full border-none"
                                        title={`Invite Preview for ${previewingHousehold.name}`}
                                    ></iframe>
                                </div>
                            </div>
                            <button className="absolute top-0 right-0 sm:-right-12 text-white h-10 w-10 rounded-full bg-white/10 flex items-center justify-center" onClick={() => setPreviewingHousehold(null)}>
                                <X />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}
