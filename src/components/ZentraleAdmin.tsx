'use client'

import env from "@/app/env";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { client, functions, databases } from '@/models/client/config';
import { FormEvent, useEffect, useState } from 'react';
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Query } from "appwrite";

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

function ProduktForm({ produkt, onSubmit }: { produkt?: Produkt, onSubmit: (values: z.infer<typeof formSchema>) => Promise<void> }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<z.infer<typeof formSchema>>({
        defaultValues: produkt
            ? {
                id: produkt.$id ?? "",
                name: produkt.name ?? "",
                sorte: produkt.sorte ?? "",
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
                fruchtfolge_vor: produkt.fruchtfolge_vor ?? [],
                fruchtfolge_nach: produkt.fruchtfolge_nach ?? [],
                bodenansprueche: Array.isArray(produkt.bodenansprueche)
                    ? produkt.bodenansprueche
                    : [],
                begleitpflanzen: produkt.begleitpflanzen ?? [],
            }
            : {
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

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        const trimmed = {
            ...values,
            name: values.name?.trim() ?? "",
            sorte: values.sorte?.trim() ?? "",
        };

        if (!trimmed.name) {
            form.setError("name", { message: "Name ist erforderlich" });
            return;
        }
        if (!trimmed.hauptkategorie) {
            form.setError("hauptkategorie", { message: "Hauptkategorie ist erforderlich" });
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(trimmed);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (<FormItem><FormLabel>Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="sorte" render={({ field }) => (<FormItem><FormLabel>Sorte</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                </div>
                <FormField control={form.control} name="id" render={({ field }) => (<FormItem><FormLabel>ID (name-sorte)</FormLabel><FormControl><Input {...field} placeholder="zB. name-sorte" /></FormControl><FormMessage /></FormItem>)} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="hauptkategorie" render={({ field }) => (<FormItem><FormLabel>Hauptkategorie</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className="text-black">
                        <SelectValue placeholder="WÃ¤hle eine Kategorie" /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-60 overflow-y-auto bg-white">
                            {hauptkategorieValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent></Select><FormMessage /></FormItem>)} />
                    <FormField control={form.control} name="unterkategorie" render={({ field }) => (<FormItem><FormLabel>Unterkategorie</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger className="text-black"><SelectValue placeholder="Wähle eine Unterkategorie" /></SelectTrigger></FormControl>
                        <SelectContent className="max-h-60 overflow-y-auto bg-white">
                            {unterkategorieValues.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent></Select><FormMessage /></FormItem>)} />
                </div>
                <Button type="submit" className="w-full bg-permdal-800 text-white hover:bg-permdal-700" disabled={isSubmitting}>
                    {isSubmitting ? "Wird gesendet..." : "Abschicken"}
                </Button>
            </form>
        </Form>
    )
}

export default function ZentraleAdmin({ initialStaffeln, initialProdukte }: { initialStaffeln: Staffel[], initialProdukte: Produkt[] }) {
    const [staffeln, setStaffeln] = useState<Staffel[]>(initialStaffeln);
    const [produkte, setProdukte] = useState<Produkt[]>(initialProdukte);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
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
    const [refSearchValue, setRefSearchValue] = useState("");
    const [refSearchStatus, setRefSearchStatus] = useState<FunctionStatus>({ state: "idle" });
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
    const paymentCollection = env.appwrite.payment_collection_id;
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
                "Die Funktion konnte nicht ausgefÃ¼hrt werden";
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
            setIsCreateOpen(false);
        } catch (rawError: unknown) {
            console.error("Error creating document:", rawError);
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
                    : String(rawError ?? "Die Funktion konnte nicht ausgefÃ¼hrt werden.");
            setPaymentResult({
                state: "error",
                message,
            });
        }
    };

    const handleFindPaymentByRef = async () => {
        const ref = refSearchValue.trim();
        if (!ref) {
            setRefSearchStatus({ state: "error", message: "Bitte eine Ref eingeben." });
            return;
        }
        if (!paymentCollection) {
            setRefSearchStatus({ state: "error", message: "Zahlungssammlung nicht konfiguriert." });
            return;
        }
        setRefSearchStatus({ state: "loading" });
        try {
            const response = await databases.listDocuments(db, paymentCollection, [
                Query.equal("ref", ref),
                Query.limit(1),
            ]);
            if (response.documents.length === 0) {
                setRefSearchStatus({ state: "error", message: "Keine Zahlung mit dieser Ref gefunden." });
                return;
            }
            const payment = response.documents[0];
            setPaymentForm((prev) => ({ ...prev, paymentId: payment.$id }));
            setRefSearchStatus({ state: "success", message: `ID gesetzt: ${payment.$id}` });
        } catch (rawError: unknown) {
            const message =
                rawError instanceof Error
                    ? rawError.message
                    : String(rawError ?? "Die Ref konnte nicht geladen werden.");
            setRefSearchStatus({ state: "error", message });
        }
    };

    const handleAddAngebot = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setAngebotResult({ state: "loading" });
        try {
            const mengeValue = Number(angebotForm.menge);
            if (!Number.isFinite(mengeValue) || mengeValue <= 0) {
                throw new Error("Die Menge muss grÃ¶ÃŸer als 0 sein.");
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
                    : String(rawError ?? "Die Funktion konnte nicht ausgefÃ¼hrt werden.");
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
        <div className="w-full p-4">
            <Tabs defaultValue="produkte" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 bg-white/50 backdrop-blur-sm border border-gray-200/50">
                    <TabsTrigger value="produkte">Produkte</TabsTrigger>
                    <TabsTrigger value="angebote">Angebote & Staffeln</TabsTrigger>
                    <TabsTrigger value="finanzen">Finanzen & Zahlungen</TabsTrigger>
                </TabsList>

                <TabsContent value="produkte">
                    <Card className="bg-white shadow-md border-gray-200">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Produktkatalog</CardTitle>
                                <CardDescription>Verwalte alle verfügbaren Produkte.</CardDescription>
                            </div>
                            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                                <DialogTrigger asChild>
                                    <Button className="bg-permdal-800 text-white hover:bg-permdal-700">
                                        + Neues Produkt
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-white sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                                    <DialogHeader>
                                        <DialogTitle>Neues Produkt erstellen</DialogTitle>
                                    </DialogHeader>
                                    <ProduktForm onSubmit={createProdukt} />
                                </DialogContent>
                            </Dialog>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Sorte</TableHead>
                                        <TableHead>Kategorie</TableHead>
                                        <TableHead>Unterkategorie</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {produkte.map((produkt) => (
                                        <TableRow key={produkt.$id}>
                                            <TableCell className="font-mono text-xs">{produkt.$id}</TableCell>
                                            <TableCell className="font-medium">{produkt.name}</TableCell>
                                            <TableCell>{produkt.sorte}</TableCell>
                                            <TableCell><Badge variant="outline">{produkt.hauptkategorie}</Badge></TableCell>
                                            <TableCell className="text-muted-foreground">{produkt.unterkategorie}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="angebote" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="bg-white shadow-md border-gray-200">
                            <CardHeader>
                                <CardTitle>Neues Angebot anlegen</CardTitle>
                                <CardDescription>Erstelle ein neues Angebot fÃ¼r ein existierendes Produkt.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form className="space-y-4" onSubmit={handleAddAngebot}>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Produkt ID</label>
                                        <Select
                                            value={angebotForm.produktID}
                                            onValueChange={(value) => setAngebotForm((prev) => ({ ...prev, produktID: value }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Produkt wÃ¤hlen" />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60 bg-white">
                                                {produkte.map(p => (
                                                    <SelectItem key={p.$id} value={p.$id}>{p.name} - {p.sorte}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Menge</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={angebotForm.menge}
                                                onChange={(event) => setAngebotForm((prev) => ({ ...prev, menge: event.target.value }))}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">VerfÃ¼gbar</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={angebotForm.mengeVerfuegbar}
                                                onChange={(event) => setAngebotForm((prev) => ({ ...prev, mengeVerfuegbar: event.target.value }))}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Einheit</label>
                                            <Input
                                                value={angebotForm.einheit}
                                                onChange={(event) => setAngebotForm((prev) => ({ ...prev, einheit: event.target.value }))}
                                                placeholder="z.B. kg, StÃ¼ck"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Preis (â‚¬)</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={angebotForm.euroPreis}
                                                onChange={(event) => setAngebotForm((prev) => ({ ...prev, euroPreis: event.target.value }))}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Saat/Pflanz Datum</label>
                                            <Input
                                                type="date"
                                                value={angebotForm.saatPflanzDatum}
                                                onChange={(event) => setAngebotForm((prev) => ({ ...prev, saatPflanzDatum: event.target.value }))}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Bereits abgeholt</label>
                                            <Input
                                                type="number"
                                                min="0"
                                                value={angebotForm.mengeAbgeholt}
                                                onChange={(event) => setAngebotForm((prev) => ({ ...prev, mengeAbgeholt: event.target.value }))}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Ernteprognose (Komma getrennt)</label>
                                        <Input
                                            value={angebotForm.ernteProjektion}
                                            onChange={(event) => setAngebotForm((prev) => ({ ...prev, ernteProjektion: event.target.value }))}
                                            placeholder="YYYY-MM-DD, YYYY-MM-DD"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Beschreibung</label>
                                        <Input
                                            value={angebotForm.beschreibung}
                                            onChange={(event) => setAngebotForm((prev) => ({ ...prev, beschreibung: event.target.value }))}
                                            placeholder="Kurze Beschreibung"
                                        />
                                    </div>
                                    <Button type="submit" className="w-full bg-permdal-800 hover:bg-permdal-700 text-white" disabled={angebotResult.state === "loading"}>
                                        {angebotResult.state === "loading" ? "Speichernâ€¦" : "Angebot anlegen"}
                                    </Button>
                                    {angebotResult.message && (
                                        <p className={`text-sm text-center ${angebotResult.state === "success" ? "text-green-600" : "text-red-600"}`}>
                                            {angebotResult.message}
                                        </p>
                                    )}
                                </form>
                            </CardContent>
                        </Card>

                        <Card className="h-fit bg-white shadow-md border-gray-200">
                            <CardHeader>
                                <CardTitle>Aktive Angebote (Staffeln)</CardTitle>
                                <CardDescription>Ãœbersicht aller aktiven Angebote.</CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-[600px] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Produkt</TableHead>
                                            <TableHead>Menge</TableHead>
                                            <TableHead>Preis</TableHead>
                                            <TableHead>VerfÃ¼gbar</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {staffeln.map((staffel) => (
                                            <TableRow key={staffel.$id}>
                                                <TableCell className="font-medium">{staffel.produktID}</TableCell>
                                                <TableCell>{staffel.menge} {staffel.einheit}</TableCell>
                                                <TableCell>{staffel.euroPreis}â‚¬</TableCell>
                                                <TableCell>
                                                    <Badge variant={Number(staffel.mengeVerfuegbar) > 0 ? "default" : "secondary"}>
                                                        {staffel.mengeVerfuegbar}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="finanzen">
                    <div className="max-w-2xl mx-auto">
                        <Card className="bg-white shadow-md border-gray-200">
                            <CardHeader>
                                <CardTitle>Zahlung verifizieren</CardTitle>
                                <CardDescription>ÃœberprÃ¼fe und bestÃ¤tige eingehende Zahlungen.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form className="space-y-6" onSubmit={handleVerifyPayment}>
                                    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Rechnungsreferenz suchen</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={refSearchValue}
                                                    onChange={(event) => setRefSearchValue(event.target.value)}
                                                    placeholder="Ref eingeben (z.B. REF-123)"
                                                    autoComplete="off"
                                                />
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    onClick={handleFindPaymentByRef}
                                                    disabled={refSearchStatus.state === "loading"}
                                                >
                                                    {refSearchStatus.state === "loading" ? "..." : "Suchen"}
                                                </Button>
                                            </div>
                                            {refSearchStatus.message && (
                                                <p className={`text-xs ${refSearchStatus.state === "success" ? "text-green-600" : "text-red-600"}`}>
                                                    {refSearchStatus.message}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Payment ID</label>
                                            <Input
                                                value={paymentForm.paymentId}
                                                onChange={(event) => setPaymentForm((prev) => ({ ...prev, paymentId: event.target.value }))}
                                                placeholder="ID der Zahlung"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Mitgliedschaft ID (Optional)</label>
                                            <Input
                                                value={paymentForm.membershipId}
                                                onChange={(event) => setPaymentForm((prev) => ({ ...prev, membershipId: event.target.value }))}
                                                placeholder="ID der Mitgliedschaft"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Status</label>
                                                <Select
                                                    value={paymentForm.status}
                                                    onValueChange={(value) => setPaymentForm((prev) => ({ ...prev, status: value }))}
                                                >
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-white">
                                                        {["offen", "teilbezahlt", "bezahlt", "fehler"].map((status) => (
                                                            <SelectItem key={status} value={status}>
                                                                {status}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Betrag (â‚¬)</label>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={paymentForm.amount}
                                                    onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))}
                                                    placeholder="0.00"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Notiz</label>
                                            <Input
                                                value={paymentForm.note}
                                                onChange={(event) => setPaymentForm((prev) => ({ ...prev, note: event.target.value }))}
                                                placeholder="Interne Notiz"
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full bg-permdal-800 hover:bg-permdal-700 text-white" disabled={paymentResult.state === "loading"}>
                                        {paymentResult.state === "loading" ? "Verarbeite..." : "Zahlung bestÃ¤tigen"}
                                    </Button>
                                    {paymentResult.message && (
                                        <p className={`text-sm text-center ${paymentResult.state === "success" ? "text-green-600" : "text-red-600"}`}>
                                            {paymentResult.message}
                                        </p>
                                    )}
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
