'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormDescription,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { subscribeToStaffeln } from "@/lib/appwrite/appwriteProducts";
import { formatOfferDateRange } from "@/lib/date";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Calendar } from './ui/calendar';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type Resolver } from "react-hook-form";
import { z } from "zod";

// Neuere Zod 4+ Schreibweise mit coerce
const formSchema = z.object({
    produktId: z.string().min(2, {
        message: "produktId must be at least 2 characters.",
    }),
    saatDatum: z.coerce.date(),
    euroPreis: z.coerce
        .number()
        .min(0.01, { message: "euroPreis muss mindestens 0.01 betragen und mit Punkt getrennt sein." }),
    einheit: z.enum(["Gramm", "Stück", "Bund", "Strauß"]),
});

type Input = z.input<typeof formSchema>;
type Output = z.output<typeof formSchema>;

export function StaffelEditForm({ staffel }: { staffel: Staffel }) {
    // 1. Define your form mit korrekten Generics
    const form = useForm<Input, unknown, Output>({
        resolver: zodResolver(formSchema) as Resolver<Input, unknown, Output>,
        defaultValues: {
            produktId: staffel.produktId,
            saatDatum: new Date(staffel.saatPflanzDatum),
            euroPreis: staffel.euroPreis,
            einheit: staffel.einheit as Output['einheit'],
        },
    });

    function onSubmit(values: Output) {
        console.log(format(values.saatDatum, "PPP"));
    }

    console.log(form.formState.errors);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="produktId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Produkt-ID</FormLabel>
                            <FormControl>
                                <Input placeholder="apfel-boskop" {...field} />
                            </FormControl>
                            <FormDescription>ProduktID aus Sortiment.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="saatDatum"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Saatdatum</FormLabel>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button
                                            variant="default"
                                            className={cn(
                                                "w-[240px] pl-3 text-left font-normal",
                                                !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value instanceof Date && !isNaN(field.value.getTime())
                                                ? format(field.value, "PPP")
                                                : <span>Pick a date</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={field.value as Date | undefined}
                                        onSelect={field.onChange}
                                    />
                                </PopoverContent>
                            </Popover>
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="euroPreis"
                    render={({ field }) => (
                        <FormItem className="w-1/2">
                            <FormLabel>Preis in €</FormLabel>
                            <FormControl>
                                <Input
                                    placeholder="4.99"
                                    {...field}
                                    value={field.value !== undefined && field.value !== null ? String(field.value) : ""}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="einheit"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Einheit</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className="w-1/2 text-black">
                                        <SelectValue placeholder="Einheit auswählen..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Gramm">Gramm</SelectItem>
                                    <SelectItem value="Stück">Stück</SelectItem>
                                    <SelectItem value="Bund">Bund</SelectItem>
                                    <SelectItem value="Strauß">Strauß</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit">Submit</Button>
            </form>
        </Form>
    );
}

export function StaffelOrderForm({ staffel }: { staffel: Staffel }) {
    const form = useForm<Input, unknown, Output>({
        resolver: zodResolver(formSchema) as Resolver<Input, unknown, Output>,
        defaultValues: {
            produktId: staffel.produktId,
            saatDatum: new Date(staffel.saatPflanzDatum),
            euroPreis: staffel.euroPreis,
            einheit: staffel.einheit as Output['einheit'],
        },
    });

    function onSubmit(values: Output) {
        console.log(format(values.saatDatum, "PPP"));
    }

    console.log(form.formState.errors);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                <FormField
                    control={form.control}
                    name="produktId"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Produkt-ID</FormLabel>
                            <FormControl>
                                <Input placeholder="apfel-boskop" {...field} />
                            </FormControl>
                            <FormDescription>ProduktID aus Sortiment.</FormDescription>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </form>
        </Form>
    );
}

export default function StaffelAdmin({ initialStaffeln }: { initialStaffeln: Staffel[] }) {
    const [staffeln, setStaffeln] = useState<Staffel[]>(initialStaffeln);

    useEffect(() => {
        const unsubscribe = subscribeToStaffeln(({ type, record }) => {
            if (type === 'create') {
                setStaffeln((prev) => [...prev, record]);
            } else if (type === 'delete') {
                setStaffeln((prev) => prev.filter((s) => s.id !== record.id));
            } else if (type === 'update') {
                setStaffeln((prev) => prev.map((s) => s.id === record.id ? record : s));
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="flex flex-wrap gap-4 justify-center pt-8">
            <Table className="w-full max-w-4xl">
                <TableHeader className="bg-gray-200">
                    <TableRow>
                        <TableCell className="font-bold">Staffel ID</TableCell>
                        <TableCell className="font-bold">Produkt ID</TableCell>
                        <TableCell className="font-bold">Saat Datum</TableCell>
                        <TableCell className="font-bold">Ernte Projektion</TableCell>
                        <TableCell className="font-bold">Menge</TableCell>
                        <TableCell className="font-bold">Einheit</TableCell>
                        <TableCell className="font-bold">Preis (Euro)</TableCell>
                        <TableCell className="font-bold">Menge Verfügbar</TableCell>
                        <TableCell className="font-bold">Menge Abgeholt</TableCell>
                    <TableCell className="font-bold">Bestellen</TableCell>
                </TableRow>
            </TableHeader>
            <TableBody>
                {staffeln.map((staffel) => (
                        <TableRow key={staffel.id}>
                            <TableCell>{staffel.id}</TableCell>
                            <TableCell>{staffel.produktId}</TableCell>
                            <TableCell>{new Date(staffel.saatPflanzDatum).toDateString()}</TableCell>
                            <TableCell>{formatOfferDateRange(staffel.ernteProjektion)}</TableCell>
                            <TableCell>{staffel.menge}</TableCell>
                            <TableCell>{staffel.einheit}</TableCell>
                            <TableCell>{staffel.euroPreis}€</TableCell>
                            <TableCell>{staffel.mengeVerfuegbar}</TableCell>
                            <TableCell>{staffel.mengeAbgeholt}</TableCell>
                            <TableCell>
                                <Dialog>
                                    <DialogTrigger disabled>Bestellen</DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Staffel Bestellen</DialogTitle>
                                            <DialogDescription>
                                                Hier können Sie die Staffel bestellen.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <StaffelOrderForm staffel={staffel} />
                                    </DialogContent>
                                </Dialog>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
