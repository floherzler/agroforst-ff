// app/page.tsx
"use client";

import { useEffect, useState } from "react";

import {
  EmptyState,
  PageHeader,
  PageShell,
} from "@/components/base/page-shell";
import BlogPostList from "@/components/BlogPostList";
import { listBlogPosts } from "@/lib/appwrite/appwriteProducts";

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
      <PageShell>
        <EmptyState title="Blog lädt" description="Beiträge werden geladen." />
      </PageShell>
    );
  }

  return (
    <PageShell containerClassName="max-w-7xl gap-10 py-10 sm:py-14">
      <PageHeader
        title="Blog"
        description="Neuigkeiten, Artikel und Updates aus unserem Team."
      />

      {posts.length === 0 ? (
        <EmptyState
          title="Keine Blog-Beiträge gefunden"
          description="Sobald neue Beiträge veröffentlicht sind, erscheinen sie hier."
        />
      ) : (
        <BlogPostList initialBlogPosts={posts} />
      )}
    </PageShell>
  );
}
