'use client'

import { useEffect, useState } from 'react';
import { formatPickupSlotRange } from "@/features/pickup/pickup-schedule";
import { subscribeToBestellungen } from "@/lib/appwrite/appwriteOrders";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

export default function BestellungsList({ initialBestellungen }: { initialBestellungen: Bestellung[] }) {
    const [bestellungen, setBestellung] = useState<Bestellung[]>(initialBestellungen);
    const [pickupFilter, setPickupFilter] = useState("");
    useEffect(() => {
        const unsubscribe = subscribeToBestellungen(({ type, record }) => {
            if (type === 'create') {
                setBestellung((prevBestellung) => [...prevBestellung, record])
            } else if (type === 'delete') {
                setBestellung((prevBestellung) => prevBestellung.filter((bestellung) => bestellung.id !== record.id))
            } else if (type === 'update') {
                setBestellung((prevBestellung) => prevBestellung.map((bestellung) => bestellung.id === record.id ? record : bestellung))
            }
        });
        return () => unsubscribe()
    }, [])

    const filteredBestellungen = bestellungen.filter((bestellung) => {
        const filter = pickupFilter.trim().toLowerCase();
        if (!filter) {
            return true;
        }

        const pickupText = formatPickupSlotRange(
            bestellung.pickupSlotStart,
            bestellung.pickupSlotEnd,
            bestellung.pickupSlotLabel,
        ).toLowerCase();

        return pickupText.includes(filter)
            || String(bestellung.pickupLocation ?? "").toLowerCase().includes(filter)
            || String(bestellung.produktName ?? "").toLowerCase().includes(filter);
    });

    const groupedBestellungen = filteredBestellungen.reduce<Record<string, Bestellung[]>>((groups, bestellung) => {
        const key = formatPickupSlotRange(
            bestellung.pickupSlotStart,
            bestellung.pickupSlotEnd,
            bestellung.pickupSlotLabel,
        );
        groups[key] = [...(groups[key] ?? []), bestellung];
        return groups;
    }, {});

    return (
        <div className="flex flex-col gap-4 pt-8">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">{filteredBestellungen.length} Bestellungen</Badge>
                    <Badge variant="secondary">{Object.keys(groupedBestellungen).length} Abholfenster</Badge>
                </div>
                <Input
                    value={pickupFilter}
                    onChange={(event) => setPickupFilter(event.target.value)}
                    placeholder="Nach Abholung, Ort oder Produkt filtern"
                    className="w-full sm:max-w-sm"
                />
            </div>

            {Object.entries(groupedBestellungen).map(([groupLabel, orders]) => (
                <div key={groupLabel} className="rounded-2xl border border-border/70 bg-background/80 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-base font-semibold text-foreground">{groupLabel}</p>
                            {orders[0]?.pickupLocation ? (
                                <p className="text-sm text-muted-foreground">{orders[0].pickupLocation}</p>
                            ) : null}
                        </div>
                        <Badge variant="outline">{orders.length}</Badge>
                    </div>

                    <Table className="w-full">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Bestellung</TableHead>
                                <TableHead>Nutzer</TableHead>
                                <TableHead>Produkt</TableHead>
                                <TableHead>Menge</TableHead>
                                <TableHead>Gesamt</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders.map((bestellung) => (
                                <TableRow key={bestellung.id}>
                                    <TableCell className="font-mono text-xs">{bestellung.id}</TableCell>
                                    <TableCell>{bestellung.userId}</TableCell>
                                    <TableCell>{bestellung.produktName || bestellung.angebotId}</TableCell>
                                    <TableCell>{bestellung.menge} {bestellung.einheit}</TableCell>
                                    <TableCell>{Number.isFinite(bestellung.preisGesamt) ? `${bestellung.preisGesamt.toFixed(2)} €` : "—"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            ))}
        </div>
    );
};
