'use client'

import { useEffect, useState } from 'react';
import { subscribeToBestellungen } from "@/lib/appwrite/appwriteOrders";
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';

export default function BestellungsList({ initialBestellungen }: { initialBestellungen: Bestellung[] }) {
    const [bestellungen, setBestellung] = useState<Bestellung[]>(initialBestellungen);
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
                        <TableRow key={bestellung.id} className="hover:bg-gray-100 cursor-pointer">
                            <TableCell>{bestellung.id}</TableCell>
                            <TableCell>{bestellung.userId}</TableCell>
                            <TableCell>{bestellung.angebotId}</TableCell>
                            <TableCell>{bestellung.menge}</TableCell>
                            <TableCell>{bestellung.abholung}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
