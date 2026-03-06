// app/page.tsx
"use client";

import { useEffect, useState } from "react";
import { listBlogPosts } from "@/lib/appwrite/appwriteProducts";
import BlogPostList from "@/components/BlogPostList";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Link } from "@tanstack/react-router";

export default function Page() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);

  useEffect(() => {
    async function load() {
      console.log("Fetching blog posts on the client…");
      setPosts(await listBlogPosts());
    }
    load();
  }, []);

  if (!posts) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse text-lg text-muted-foreground">Loading blog posts…</div>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-16 max-w-7xl">
        {/* Header Section */}
        <div className="space-y-6 mb-16">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="space-y-3">
              <h1 className="text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Blog
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl">
                Neuigkeiten, Artikel und Updates aus unserem Team
              </p>
            </div>
            <Button asChild size="lg" className="shadow-lg">
              <Link to="/produkte">Zu den Produkten</Link>
            </Button>
          </div>
          <Separator className="bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* Blog Posts */}
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Keine Blog-Posts gefunden.</p>
          </div>
        ) : (
          <BlogPostList initialBlogPosts={posts} />
        )}
      </div>
    </main>
  );
}
