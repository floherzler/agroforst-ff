"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface CopyMailButtonProps {
    mailAddress: string;
}

export default function CopyMailButton({ mailAddress }: CopyMailButtonProps) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        try {
            await navigator.clipboard.writeText(mailAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000); // reset after 2s
        } catch (err) {
            console.error("Clipboard copy failed", err);
        }
    }

    return (
        <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-2"
        >
            {copied ? (
                <>
                    <Check className="h-4 w-4 text-permdal-600" />
                    <span>Kopiert!</span>
                </>
            ) : (
                <>
                    <Copy className="h-4 w-4" />
                    <span>{mailAddress}</span>
                </>
            )}
        </Button>
    );
}
