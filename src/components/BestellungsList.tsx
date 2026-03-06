'use client'

import env from "@/app/env";
import { client } from '@/models/client/config';
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';

export default function BestellungsList({ initialBestellungen }: { initialBestellungen: Bestellung[] }) {
    const [bestellungen, setBestellung] = useState<Bestellung[]>(initialBestellungen);
    const db = env.appwrite.db;
    const bestellungCollection = env.appwrite.order_collection_id;
    const channel = `databases.${db}.collections.${bestellungCollection}.documents`;
    useEffect(() => {
        const unsubscribe = client.subscribe(channel, (response) => {
            const eventType = response.events[0];
            console.log(response.events)
            const changedBestellung = response.payload as Bestellung

            if (eventType.includes('create')) {
                setBestellung((prevBestellung) => [...prevBestellung, changedBestellung])
            } else if (eventType.includes('delete')) {
                setBestellung((prevBestellung) => prevBestellung.filter((bestellung) => bestellung.$id !== changedBestellung.$id))
            } else if (eventType.includes('update')) {
                setBestellung((prevBestellung) => prevBestellung.map((bestellung) => bestellung.$id === changedBestellung.$id ? changedBestellung : bestellung))
            }
        });
        return () => unsubscribe()
    }, [channel])

    return (
        <div className="flex flex-wrap gap-4 justify-center pt-8">
            {/* {user && <h1 className="text-2xl font-bold text-center">Willkommen {user.name}</h1>} */}
            <Table className="w-full max-w-4xl">
                <TableHeader className="bg-gray-200">
                    <TableRow>
                        <TableCell className="font-bold">Bestellungs-ID</TableCell>
                        <TableCell className="font-bold">User-ID</TableCell>
                        <TableCell className="font-bold">Staffel-ID</TableCell>
                        <TableCell className="font-bold">Menge</TableCell>
                        <TableCell className="font-bold">Abholdatum</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {bestellungen.map((bestellung) => (
                        <TableRow key={bestellung.$id} className="hover:bg-gray-100 cursor-pointer">
                            <TableCell>{bestellung.$id}</TableCell>
                            <TableCell>{bestellung.userID}</TableCell>
                            <TableCell>{bestellung.angebotID}</TableCell>
                            <TableCell>{bestellung.menge}</TableCell>
                            <TableCell>{bestellung.abholung}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
