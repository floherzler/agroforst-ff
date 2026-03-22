'use client'

import { useEffect, useState } from 'react';
import { subscribeToProdukte } from "@/lib/appwrite/appwriteProducts";
import { displayValueLabel } from "@/features/zentrale/admin-domain";
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';




// import { z } from "zod";

// const formSchema = z.object({
//     produktId: z.string().min(2, {
//         message: "produktId must be at least 2 characters.",
//     }),
//     saatDatum: z.date(),
//     euroPreis: z.preprocess((val) => parseFloat(String(val).replace(',', '.')), z.number().min(0.01, {
//         message: "euroPreis muss mindestens 0.01 betragen und mit Punkt getrennt sein.",
//     })),
//     einheit: z.enum(["Gramm", "Stück", "Bund", "Strauß"]),
// })

export default function ProduktListe({ initialProdukte }: { initialProdukte: Produkt[] }) {
    const [produkte, setProdukte] = useState<Produkt[]>(initialProdukte);
    useEffect(() => {
        const unsubscribe = subscribeToProdukte(({ type, record }) => {
            if (type === 'create') {
                setProdukte((prevProdukte) => [...prevProdukte, record])
            } else if (type === 'delete') {
                setProdukte((prevProdukte) => prevProdukte.filter((produkt) => produkt.id !== record.id))
            } else if (type === 'update') {
                setProdukte((prevProdukte) => prevProdukte.map((produkt) => produkt.id === record.id ? record : produkt))
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
                        <TableCell className="font-bold">ProduktID</TableCell>
                        <TableCell className="font-bold">Name</TableCell>
                        <TableCell className="font-bold">Sorte</TableCell>
                        <TableCell className="font-bold">Hauptkategorie</TableCell>
                        <TableCell className="font-bold">Unterkategorie</TableCell>
                        <TableCell className="font-bold">Lebensdauer</TableCell>
                        <TableCell className="font-bold">Fruchtfolge Vor</TableCell>
                        <TableCell className="font-bold">Fruchtfolge Nach</TableCell>
                        <TableCell className="font-bold">Bodenansprüche</TableCell>
                        <TableCell className="font-bold">Begleitpflanzen</TableCell>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {produkte.map((produkt) => (
                        <TableRow key={produkt.id} className="hover:bg-gray-100 cursor-pointer">
                            <TableCell>{produkt.id}</TableCell>
                            <TableCell>{produkt.name}</TableCell>
                            <TableCell>{produkt.sorte}</TableCell>
                            <TableCell>{displayValueLabel(produkt.hauptkategorie)}</TableCell>
                            <TableCell>{displayValueLabel(produkt.unterkategorie)}</TableCell>
                            <TableCell>{displayValueLabel(produkt.lebensdauer)}</TableCell>
                            <TableCell>{produkt.fruchtfolgeVor.join(", ")}</TableCell>
                            <TableCell>{produkt.fruchtfolgeNach.join(", ")}</TableCell>
                            <TableCell>{produkt.bodenansprueche}</TableCell>
                            <TableCell>{produkt.begleitpflanzen.join(", ")}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};
