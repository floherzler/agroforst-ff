"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser, type AuthUser } from "@/lib/appwrite/appwriteAuth";

const Page = () => {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const productIds = ['67101ee80002ac89b9f9', '67101ef300253ca391c2', '67101efe003dd6525840', '67101f08000502784a8d'];
  const productNames = ['Karotten', 'Lavendel', 'Kartoffeln', 'Kürbis'];
  const productURLs = [
    'https://cloud.appwrite.io/v1/storage/buckets/productStorage/files/67101ee80002ac89b9f9/view?project=670b925800275a11d5c1&project=670b925800275a11d5c1&mode=admin',
    'https://cloud.appwrite.io/v1/storage/buckets/productStorage/files/67101ef300253ca391c2/view?project=670b925800275a11d5c1&project=670b925800275a11d5c1&mode=admin',
    'https://cloud.appwrite.io/v1/storage/buckets/productStorage/files/67101efe003dd6525840/view?project=670b925800275a11d5c1&project=670b925800275a11d5c1&mode=admin',
    'https://cloud.appwrite.io/v1/storage/buckets/productStorage/files/67101f08000502784a8d/view?project=670b925800275a11d5c1&project=670b925800275a11d5c1&mode=admin',
  ];

  React.useEffect(() => {
    let cancelled = false;

    async function loadUser() {
      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Nutzer konnte nicht geladen werden.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <main className="p-8 text-center">Profil wird geladen...</main>;
  }

  if (error || !user) {
    return <main className="p-8 text-center text-red-700">{error ?? "Nutzer konnte nicht geladen werden."}</main>;
  }

  return (
    <main>
      <h1 className="text-2xl font-bold text-center">Willkommen, {user.name}! 👋🏼</h1>
      <div className="p-8 grid grid-cols-2 gap-8 max-w-(--breakpoint-lg) mx-auto px-4">
        {
          productIds.map((productId, index) => (
            <Card key={productId} className="flex flex-col justify-between">
              <CardHeader className="flex-row gap-4 items-center">
                <Avatar>
                  <AvatarImage src={productURLs[index]} alt={productNames[index]} className="rounded-md" />
                  <AvatarFallback>
                    {productNames[index].charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <CardTitle>{productNames[index]}</CardTitle>
              </CardHeader>
              <CardContent>

                <CardDescription>Preis: 2€/kg</CardDescription>
                <CardDescription>Verfügbar: 10kg</CardDescription>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Badge variant={index % 2 === 0 ? "available" : "destructive"}>
                  {index % 2 === 0 ? "Verfügbar" : "Nicht verfügbar"}
                </Badge>
                <Button variant={"ghost"} disabled={index % 2 !== 0}>Bestellen</Button>
              </CardFooter>
            </Card>
          ))}
      </div>
    </main>
  );
};

export default Page;
