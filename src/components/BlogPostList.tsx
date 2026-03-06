'use client'

import { useEffect, useState } from 'react';
import { subscribeToBlogPosts } from "@/lib/appwrite/appwriteProducts";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { CalendarIcon } from 'lucide-react';

export default function BlogPostList({ initialBlogPosts }: { initialBlogPosts: BlogPost[] }) {
    const [posts, setBlogPost] = useState<BlogPost[]>(initialBlogPosts);

    useEffect(() => {
        const unsubscribe = subscribeToBlogPosts(({ type, record }) => {
            if (type === 'create') {
                setBlogPost((prevBlogPost) => [...prevBlogPost, record])
            } else if (type === 'delete') {
                setBlogPost((prevBlogPost) => prevBlogPost.filter((post) => post.id !== record.id))
            } else if (type === 'update') {
                setBlogPost((prevBlogPost) => prevBlogPost.map((post) => post.id === record.id ? record : post))
            }
        });
        return () => unsubscribe()
    }, [])

    const formatDate = (date: string) => {
        return new Date(date).toLocaleDateString('de-DE', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
                <Card
                    key={post.id}
                    className="flex flex-col bg-white border-2 shadow-md hover:shadow-2xl hover:scale-[1.02] hover:border-primary/50 transition-all duration-300 cursor-pointer overflow-hidden group"
                >
                    <CardHeader className="space-y-3 pb-4">
                        <div className="flex flex-wrap gap-2">
                            {post.tags.map((tag, index) => (
                                <Badge
                                    key={index}
                                    variant="secondary"
                                    className="shadow-sm"
                                >
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                        <CardTitle className="line-clamp-2 text-2xl group-hover:text-primary transition-colors">
                            {post.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-3 text-base">
                            {post.description}
                        </CardDescription>
                    </CardHeader>
                    <CardFooter className="mt-auto pt-4 border-t bg-muted/30">
                        <div className="flex items-center justify-between w-full text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8 border-2 border-background shadow-sm">
                                    <AvatarFallback className="text-xs font-semibold">
                                        {getInitials(post.writtenBy)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">{post.writtenBy}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CalendarIcon className="h-4 w-4" />
                                <span className="text-xs">{formatDate(post.writtenAt)}</span>
                            </div>
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
};
