'use client'

import env from "@/app/env";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { client, functions } from '@/models/client/config';
import { FormEvent, useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
// import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHeader, TableRow } from './ui/table';

const hauptkategorieValues = ["Obst", "Gemüse", "Kräuter", "Blumen", "Maschine", "Dienstleistung", "Sonstiges"] as const;
const unterkategorieValues = [
    "Hülsenfrüchte",
    "Kohlgemüse",
    "Wurzel-/Knollengemüse",
    "Blattgemüse/Salat",
    "Fruchtgemüse",
    "Zwiebelgemüse",
    "Kernobst",
    "Steinobst",
    "Beeren",
    "Zitrusfrüchte",
    "Schalenfrüchte"
] as const;
const lebensdauerValues = ["einjährig", "zweijährig", "mehrjährig"] as const;

type FunctionStatus = { state: "idle" | "loading" | "success" | "error"; message?: string };
type PaymentFormState = {
    paymentId: string;
    membershipId: string;
    status: string;
    amount: string;
    note: string;
};
type AngebotFormState = {
    produktID: string;
    menge: string;
    mengeVerfuegbar: string;
    einheit: string;
    euroPreis: string;
    saatPflanzDatum: string;
    ernteProjektion: string;
    mengeAbgeholt: string;
    beschreibung: string;
};
type AppwriteExecution = {
    status?: string;
    response?: string;
    stderr?: string;
};
type ExecutionPayload = Record<string, unknown> & {
    success?: boolean;
    error?: string;
};

const formSchema = z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    sorte: z.string().optional(),
    hauptkategorie: z.enum(hauptkategorieValues).optional(),
    unterkategorie: z.enum(unterkategorieValues).optional(),
    lebensdauer: z.enum(lebensdauerValues).optional(),
    fruchtfolge_vor: z.array(z.string()).optional(),
    fruchtfolge_nach: z.array(z.string()).optional(),
    bodenansprueche: z.array(z.string()).optional(),
    begleitpflanzen: z.array(z.string()).optional(),
})

// function ArrayInput({ field, label }: { field: any, label: string }) {
//     const [inputValue, setInputValue] = useState('');

//     const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//         setInputValue(e.target.value);
//     };

//     const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//         if (e.key === 'Enter') {
//             e.preventDefault();
//             if (inputValue.trim() !== '') {
//                 field.onChange([...(field.value || []), inputValue.trim()]);
//                 setInputValue('');
//             }
//         }
//     };

//     const removeItem = (index: number) => {
//         const newValue = [...(field.value || [])];
//         newValue.splice(index, 1);
//         field.onChange(newValue);
//     };

//     return (
//         <FormItem>
//             <FormLabel>{label}</FormLabel>
//             <FormControl>
//                 <Input
//                     value={inputValue}
//                     onChange={handleInputChange}
//                     onKeyDown={handleInputKeyDown}
//                 />
//             </FormControl>
//             <div className="flex flex-wrap gap-2 mt-2">
//                 {(field.value || []).map((item: string, index: number) => (
//                     <Badge key={index} variant="secondary">
//                         {item}
//                         <button type="button" onClick={() => removeItem(index)} className="ml-2 text-red-500">x</button>
//                     </Badge>
//                 ))}
//             </div>
//             <FormMessage />
//         </FormItem>
//     );
// }

function ProduktForm({ produkt, onSubmit }: { produkt?: Produkt, onSubmit: (values: z.infer<typeof formSchema>) => void }) {
    const form = useForm<z.infer<typeof formSchema>>({
        defaultValues: produkt
            ? {
                // **Text/ID fields** always controlled with ""
                id: produkt.$id ?? "",
                name: produkt.name ?? "",
                sorte: produkt.sorte ?? "",
                // **Selects** must be either one of the allowed strings or undefined
                hauptkategorie: hauptkategorieValues.includes(
                    produkt.hauptkategorie as typeof hauptkategorieValues[number],
                )
                    ? (produkt.hauptkategorie as typeof hauptkategorieValues[number])
                    : undefined,
                unterkategorie: unterkategorieValues.includes(
                    produkt.unterkategorie as typeof unterkategorieValues[number],
                )
                    ? (produkt.unterkategorie as typeof unterkategorieValues[number])
                    : undefined,
                lebensdauer: lebensdauerValues.includes(
                    produkt.lebensdauer as typeof lebensdauerValues[number],
                )
                    ? (produkt.lebensdauer as typeof lebensdauerValues[number])
                    : undefined,
                // **Arrays** stay as `[]` if missing
                fruchtfolge_vor: produkt.fruchtfolge_vor ?? [],
                fruchtfolge_nach: produkt.fruchtfolge_nach ?? [],
                bodenansprueche: Array.isArray(produkt.bodenansprueche)
                    ? produkt.bodenansprueche
                    : [],
                begleitpflanzen: produkt.begleitpflanzen ?? [],
            }
            : {
                // **New** → text/ID = ""; selects = undefined; arrays = []
                id: "",
                name: "",
                sorte: "",
                hauptkategorie: undefined,
                unterkategorie: undefined,
                lebensdauer: undefined,
                fruchtfolge_vor: [],
                fruchtfolge_nach: [],
                bodenansprueche: [],
                begleitpflanzen: [],
            },
    });



    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="bg-white space-y-8">
                <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="sorte" render={({ field }) => (<FormItem><FormLabel>Sorte</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="id" render={({ field }) => (<FormItem><FormLabel>ID (name-sorte)</FormLabel><FormControl><Input {...field} placeholder="zB. name-sorte" /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="hauptkategorie" render={({ field }) => (<FormItem><FormLabel>Hauptkategorie</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="text-black">
                    <SelectValue placeholder="Wähle eine Kategorie" /></SelectTrigger></FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white">
                        <SelectItem value="Obst">Obst</SelectItem>
                        <SelectItem value="Gemüse">Gemüse</SelectItem>
                        <SelectItem value="Kräuter">Kräuter</SelectItem>
                        <SelectItem value="Blumen">Blumen</SelectItem>
                        <SelectItem value="Maschine">Maschine</SelectItem>
                        <SelectItem value="Dienstleistung">Dienstleistung</SelectItem>
                        <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                    </SelectContent></Select><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="unterkategorie" render={({ field }) => (<FormItem><FormLabel>Unterkategorie</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className="text-black"><SelectValue placeholder="Wähle eine Unterkategorie" /></SelectTrigger></FormControl>
                    <SelectContent className="max-h-60 overflow-y-auto bg-white">
                        <SelectItem value="Hülsenfrüchte">Hülsenfrüchte</SelectItem>
                        <SelectItem value="Kohlgemüse">Kohlgemüse</SelectItem>
                        <SelectItem value="Wurzel-/Knollengemüse">Wurzel-/Knollengemüse</SelectItem>
                        <SelectItem value="Blattgemüse/Salat">Blattgemüse/Salat</SelectItem>
                        <SelectItem value="Fruchtgemüse">Fruchtgemüse</SelectItem>
                        <SelectItem value="Zwiebelgemüse">Zwiebelgemüse</SelectItem>
                        <SelectItem value="Kernobst">Kernobst</SelectItem>
                        <SelectItem value="Steinobst">Steinobst</SelectItem>
                        <SelectItem value="Beeren">Beeren</SelectItem>
                        <SelectItem value="Zitrusfrüchte">Zitrusfrüchte</SelectItem>
                        <SelectItem value="Schalenfrüchte">Schalenfrüchte</SelectItem>
                    </SelectContent></Select><FormMessage /></FormItem>)} />
                {/* <FormField control={form.control} name="lebensdauer" render={({ field }) => (<FormItem><FormLabel>Lebensdauer</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="text-black"><SelectValue placeholder="Wähle Dauer" /></SelectTrigger></FormControl><SelectContent>
                    <SelectItem value="einjährig">einjährig</SelectItem>
                    <SelectItem value="zweijährig">zweijährig</SelectItem>
                    <SelectItem value="mehrjährig">mehrjährig</SelectItem></SelectContent></Select><FormMessage />
                </FormItem>)} />
                <FormField control={form.control} name="fruchtfolge_vor" render={({ field }) => <ArrayInput field={field} label="Fruchtfolge Vor" />} />
                <FormField control={form.control} name="fruchtfolge_nach" render={({ field }) => <ArrayInput field={field} label="Fruchtfolge Nach" />} />
                <FormField control={form.control} name="bodenansprueche" render={({ field }) => <ArrayInput field={field} label="Bodenansprüche" />} />
                <FormField control={form.control} name="begleitpflanzen" render={({ field }) => <ArrayInput field={field} label="Begleitpflanzen" />} /> */}
                <DialogClose asChild>
                    <Button type="submit" className="bg-permdal-800 text-white">Abschicken</Button>
                </DialogClose>
            </form>
        </Form>
    )
}

export default function ZentraleAdmin({ initialStaffeln, initialProdukte }: { initialStaffeln: Staffel[], initialProdukte: Produkt[] }) {
    const [, setStaffeln] = useState<Staffel[]>(initialStaffeln);
    const [produkte, setProdukte] = useState<Produkt[]>(initialProdukte);
    const paymentVerifyFunctionId = env.appwrite.payment_verify_function_id;
    const addProduktFunctionId = env.appwrite.add_produkt_function_id;
    const addAngebotFunctionId = env.appwrite.add_angebot_function_id;
    const [paymentForm, setPaymentForm] = useState<PaymentFormState>({
        paymentId: "",
        membershipId: "",
        status: "bezahlt",
        amount: "",
        note: "",
    });
    const [paymentResult, setPaymentResult] = useState<FunctionStatus>({ state: "idle" });
    const [angebotForm, setAngebotForm] = useState<AngebotFormState>({
        produktID: "",
        menge: "",
        mengeVerfuegbar: "",
        einheit: "",
        euroPreis: "",
        saatPflanzDatum: "",
        ernteProjektion: "",
        mengeAbgeholt: "",
        beschreibung: "",
    });
    const [angebotResult, setAngebotResult] = useState<FunctionStatus>({ state: "idle" });
    const db = env.appwrite.db;
    const staffelCollection = env.appwrite.angebote_collection_id;
    const produktCollection = env.appwrite.produce_collection_id;
    const staffelChannel = `databases.${db}.collections.${staffelCollection}.documents`;
    const produktChannel = `databases.${db}.collections.${produktCollection}.documents`;
    const executeAdminFunction = async (functionId: string, payload: Record<string, unknown>) => {
        if (!functionId || functionId === "undefined") {
            throw new Error("Die Cloud Function ist nicht konfiguriert");
        }
        const execution = (await functions.createExecution(functionId, JSON.stringify(payload))) as AppwriteExecution;
        const statusText = String(execution.status ?? "").toLowerCase();
        const rawResponse = execution.response;
        let parsedResponse: Record<string, unknown> | string | null = null;
        if (typeof rawResponse === "string" && rawResponse.trim().length > 0) {
            try {
                parsedResponse = JSON.parse(rawResponse);
            } catch {
                parsedResponse = rawResponse;
            }
        }
        const parsedPayload =
            typeof parsedResponse === "object" && parsedResponse !== null
                ? (parsedResponse as ExecutionPayload)
                : null;
        if (statusText !== "completed" || (parsedPayload && parsedPayload.success === false)) {
            const errMsg =
                parsedPayload?.error ??
                execution.stderr ??
                "Die Funktion konnte nicht ausgeführt werden";
            throw new Error(errMsg);
        }
        return parsedPayload ?? execution;
    };

    async function createProdukt(values: z.infer<typeof formSchema>) {
        try {
            await executeAdminFunction(addProduktFunctionId, {
                ...values,
                id: values.id || undefined,
            });
        } catch (rawError: unknown) {
            console.error("Error creating document:", rawError);
        }
    }

    async function updateProdukt(id: string, values: z.infer<typeof formSchema>) {
        try {
            await executeAdminFunction(addProduktFunctionId, {
                ...values,
                id,
            });
        } catch (rawError: unknown) {
            console.error("Error updating document:", rawError);
        }
    }

    const handleVerifyPayment = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setPaymentResult({ state: "loading" });
        try {
            const payload: Record<string, unknown> = {
                paymentId: paymentForm.paymentId.trim(),
                status: paymentForm.status,
            };
            if (paymentForm.membershipId.trim()) {
                payload.membershipId = paymentForm.membershipId.trim();
            }
            if (paymentForm.note.trim()) {
                payload.note = paymentForm.note.trim();
            }
            const amountValue = Number(paymentForm.amount);
            if (paymentForm.amount.trim() && !Number.isNaN(amountValue)) {
                payload.amount = amountValue;
            }
            await executeAdminFunction(paymentVerifyFunctionId, payload);
            setPaymentResult({ state: "success", message: "Zahlung wurde validiert." });
            setPaymentForm({
                paymentId: "",
                membershipId: "",
                status: "bezahlt",
                amount: "",
                note: "",
            });
        } catch (rawError: unknown) {
            const message =
                rawError instanceof Error
                    ? rawError.message
                    : String(rawError ?? "Die Funktion konnte nicht ausgeführt werden.");
            setPaymentResult({
                state: "error",
                message,
            });
        }
    };

    const handleAddAngebot = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAngebotResult({ state: "loading" });
        try {
            const mengeValue = Number(angebotForm.menge);
            if (!Number.isFinite(mengeValue) || mengeValue <= 0) {
                throw new Error("Die Menge muss größer als 0 sein.");
            }
            const availableCandidate = Number(angebotForm.mengeVerfuegbar);
            const euroPreisCandidate = Number(angebotForm.euroPreis);
            const payload: Record<string, unknown> = {
                produktID: angebotForm.produktID.trim(),
                menge: mengeValue,
                mengeVerfuegbar: Number.isFinite(availableCandidate) ? availableCandidate : mengeValue,
                einheit: angebotForm.einheit.trim(),
                euroPreis: Number.isFinite(euroPreisCandidate) ? euroPreisCandidate : 0,
            };
            if (angebotForm.saatPflanzDatum.trim()) {
                payload.saatPflanzDatum = angebotForm.saatPflanzDatum;
            }
            const harvest = angebotForm.ernteProjektion
                .split(/[,\n;]/)
                .map((segment) => segment.trim())
                .filter(Boolean);
            if (harvest.length) {
                payload.ernteProjektion = harvest;
            }
            if (angebotForm.mengeAbgeholt.trim()) {
                payload.mengeAbgeholt = Number(angebotForm.mengeAbgeholt);
            }
            if (angebotForm.beschreibung.trim()) {
                payload.beschreibung = angebotForm.beschreibung.trim();
            }
            await executeAdminFunction(addAngebotFunctionId, payload);
            setAngebotResult({ state: "success", message: "Angebot wurde gespeichert." });
            setAngebotForm({
                produktID: "",
                menge: "",
                mengeVerfuegbar: "",
                einheit: "",
                euroPreis: "",
                saatPflanzDatum: "",
                ernteProjektion: "",
                mengeAbgeholt: "",
                beschreibung: "",
            });
        } catch (rawError: unknown) {
            const message =
                rawError instanceof Error
                    ? rawError.message
                    : String(rawError ?? "Die Funktion konnte nicht ausgeführt werden.");
            setAngebotResult({
                state: "error",
                message,
            });
        }
    };

    useEffect(() => {
        const staffelUnsubscribe = client.subscribe(staffelChannel, (response) => {
            const eventType = response.events[0];
            const changedStaffel = response.payload as Staffel

            if (eventType.includes('create')) {
                setStaffeln((prevStaffeln) => [...prevStaffeln, changedStaffel])
            } else if (eventType.includes('delete')) {
                setStaffeln((prevStaffeln) => prevStaffeln.filter((staffel) => staffel.$id !== changedStaffel.$id))
            } else if (eventType.includes('update')) {
                setStaffeln((prevStaffeln) => prevStaffeln.map((staffel) => staffel.$id === changedStaffel.$id ? changedStaffel : staffel))
            }
        });

        const produktUnsubscribe = client.subscribe(produktChannel, (response) => {
            const eventType = response.events[0];
            const changedProdukt = response.payload as Produkt

            if (eventType.includes('create')) {
                setProdukte((prevProdukte) => [...prevProdukte, changedProdukt])
            } else if (eventType.includes('delete')) {
                setProdukte((prevProdukte) => prevProdukte.filter((produkt) => produkt.$id !== changedProdukt.$id))
            } else if (eventType.includes('update')) {
                setProdukte((prevProdukte) => prevProdukte.map((produkt) => produkt.$id === changedProdukt.$id ? changedProdukt : produkt))
            }
        });

        return () => {
            staffelUnsubscribe();
            produktUnsubscribe();
        }
    }, [staffelChannel, produktChannel])

    return (
        <div className="flex gap-8 justify-center pt-8">
            <div>
                <h2 className="text-2xl font-bold text-center mb-4">Produkte</h2>
                <Dialog>
                    <DialogTrigger asChild>
                        <Button className="bg-permdal-800 text-white hover:bg-permdal-700">
                            Produkt zum Katalog hinzufügen
                        </Button>
                    </DialogTrigger>

                    <DialogContent
                        className="
                        bg-white            /* make the panel white */
                        p-6                 /* add some padding */
                        rounded-lg          /* soften the corners */
                        shadow-lg           /* lift it off the page */
                        max-h-[90vh]
                        overflow-y-auto
                        "
                    >
                        <DialogHeader>
                            <DialogTitle>Neues Produkt erstellen</DialogTitle>
                        </DialogHeader>
                        <ProduktForm onSubmit={createProdukt} />
                    </DialogContent>
                </Dialog>

                <Table className="w-full table-fixed">
                    <TableHeader className="bg-gray-200">
                        <TableRow>
                            <TableCell className="font-bold">ProduktID</TableCell>
                            <TableCell className="font-bold">Name</TableCell>
                            <TableCell className="font-bold">Sorte</TableCell>
                            <TableCell className="font-bold">Hauptkategorie</TableCell>
                            <TableCell className="font-bold">Unterkategorie</TableCell>
                            <TableCell className="font-bold">Aktionen</TableCell>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {produkte.map((produkt) => (
                            <TableRow key={produkt.$id} className="hover:bg-gray-100 cursor-pointer">
                                <TableCell>{produkt.$id}</TableCell>
                                <TableCell>{produkt.name}</TableCell>
                                <TableCell>{produkt.sorte}</TableCell>
                                <TableCell>{produkt.hauptkategorie}</TableCell>
                                <TableCell>{produkt.unterkategorie}</TableCell>
                                <TableCell>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button>Bearbeiten</Button>
                                        </DialogTrigger>
                                        <DialogContent
                                            className="
                                            bg-white            /* make the panel white */
                                            p-6                 /* add some padding */
                                            rounded-lg          /* soften the corners */
                                            shadow-lg           /* lift it off the page */
                                            max-h-[90vh]
                                            overflow-y-auto
                                            "
                                        >
                                            <DialogHeader>
                                                <DialogTitle>Produkt Bearbeiten</DialogTitle>
                                            </DialogHeader>
                                            <ProduktForm produkt={produkt} onSubmit={(values) => updateProdukt(produkt.$id, values)} />
                                        </DialogContent>
                                    </Dialog>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <div className="mt-10 grid gap-6 lg:grid-cols-2">
                    <section className="rounded-2xl border border-permdal-100 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Zahlung verifizieren</h3>
                        <form className="mt-4 space-y-4" onSubmit={handleVerifyPayment}>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Payment ID
                                </label>
                                <Input
                                    value={paymentForm.paymentId}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentId: event.target.value }))}
                                    placeholder="z.B. 670bacff12345"
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Mitgliedschaft (optional)
                                </label>
                                <Input
                                    value={paymentForm.membershipId}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, membershipId: event.target.value }))}
                                    placeholder="Mitgliedschaft ID"
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Status
                                    </label>
                                    <Select
                                        value={paymentForm.status}
                                        onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, status: value }))}
                                    >
                                        <SelectTrigger className="text-sm">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["offen", "teilbezahlt", "bezahlt", "fehler"].map((status) => (
                                                <SelectItem key={status} value={status}>
                                                    {status}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        Betrag (€)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        value={paymentForm.amount}
                                        onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                                        placeholder="z.B. 59.90"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Notiz
                                </label>
                                <Input
                                    value={paymentForm.note}
                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
                                    placeholder="Optionaler Kommentar"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={paymentResult.state === "loading"}>
                                {paymentResult.state === "loading" ? "Wird geprüft…" : "Prüfung starten"}
                            </Button>
                        </form>
                        {paymentResult.message && (
                            <p
                                className={`mt-4 text-sm ${paymentResult.state === "success"
                                        ? "text-emerald-600"
                                        : paymentResult.state === "error"
                                            ? "text-rose-600"
                                            : "text-muted-foreground"
                                    }`}
                            >
                                {paymentResult.message}
                            </p>
                        )}
                    </section>
                    <section className="rounded-2xl border border-permdal-100 bg-white p-6 shadow-sm">
                        <h3 className="text-lg font-semibold">Neues Angebot anlegen</h3>
                        <form className="mt-4 space-y-4" onSubmit={handleAddAngebot}>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Produkt ID
                                </label>
                                <Input
                                    value={angebotForm.produktID}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, produktID: event.target.value }))}
                                    placeholder="z.B. tomate-san-marzano"
                                    required
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    type="number"
                                    min="0"
                                    value={angebotForm.menge}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, menge: event.target.value }))}
                                    placeholder="Menge"
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    value={angebotForm.mengeVerfuegbar}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, mengeVerfuegbar: event.target.value }))}
                                    placeholder="Verfügbar"
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    value={angebotForm.einheit}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, einheit: event.target.value }))}
                                    placeholder="Einheit (z.B. Stück)"
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={angebotForm.euroPreis}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, euroPreis: event.target.value }))}
                                    placeholder="Preis (€)"
                                />
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <Input
                                    type="date"
                                    value={angebotForm.saatPflanzDatum}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, saatPflanzDatum: event.target.value }))}
                                />
                                <Input
                                    type="number"
                                    min="0"
                                    value={angebotForm.mengeAbgeholt}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, mengeAbgeholt: event.target.value }))}
                                    placeholder="Bereits abgeholt"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Ernteprognose (neue Zeile / Komma getrennt)
                                </label>
                                <textarea
                                    className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-permdal-500"
                                    rows={3}
                                    value={angebotForm.ernteProjektion}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, ernteProjektion: event.target.value }))}
                                    placeholder="2025-05-10, 2025-05-25"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    Beschreibung
                                </label>
                                <Input
                                    value={angebotForm.beschreibung}
                                    onChange={(event) => setAngebotForm((prev) => ({ ...prev, beschreibung: event.target.value }))}
                                    placeholder="Kurze Erläuterung"
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={angebotResult.state === "loading"}>
                                {angebotResult.state === "loading" ? "Speichern…" : "Angebot anlegen"}
                            </Button>
                        </form>
                        {angebotResult.message && (
                            <p
                                className={`mt-4 text-sm ${angebotResult.state === "success"
                                        ? "text-emerald-600"
                                        : angebotResult.state === "error"
                                            ? "text-rose-600"
                                            : "text-muted-foreground"
                                    }`}
                            >
                                {angebotResult.message}
                            </p>
                        )}
                    </section>
                </div>
            </div>
            {/* <div>
                <h2 className="text-2xl font-bold text-center mb-4">Staffeln</h2>
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
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {staffeln.map((staffel) => (
                            <TableRow key={staffel.$id}>
                                <TableCell>{staffel.$id}</TableCell>
                                <TableCell>{staffel.produktID}</TableCell>
                                <TableCell>{new Date(staffel.saatPflanzDatum).toDateString()}</TableCell>
                                <TableCell>{new Date(staffel.ernteProjektion[0]).toDateString()} - {new Date(staffel.ernteProjektion[staffel.ernteProjektion.length - 1]).toDateString()}</TableCell>
                                <TableCell>{staffel.menge}</TableCell>
                                <TableCell>{staffel.einheit}</TableCell>
                                <TableCell>{staffel.euroPreis}€</TableCell>
                                <TableCell>{staffel.mengeVerfuegbar}</TableCell>
                                <TableCell>{staffel.mengeAbgeholt}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div> */}
        </div>
    );
};