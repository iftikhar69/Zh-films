import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.journalPost.findUnique({ where: { slug } });
  if (!post) return { title: "Note not found" };
  return { title: post.title, description: post.excerpt };
}

export default async function JournalPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.journalPost.findUnique({ where: { slug } });
  if (!post) notFound();

  return (
    <article className="mx-auto max-w-3xl px-4 pb-24 pt-28 sm:px-6 sm:pt-32">
      <Link href="/journal" className="text-xs uppercase tracking-[0.3em] text-zh-gold hover:text-white">
        ← Back to journal
      </Link>
      <header className="mt-6">
        <p className="text-[10px] uppercase tracking-[0.35em] text-zinc-500">
          {post.publishedAt.toLocaleDateString()}
        </p>
        <h1 className="mt-3 font-serif text-3xl text-white sm:text-4xl">{post.title}</h1>
        <p className="mt-4 text-sm text-zinc-400">{post.excerpt}</p>
      </header>
      {post.coverImage && (
        <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl border border-white/10">
          <Image src={post.coverImage} alt={post.title} fill className="object-cover" priority />
        </div>
      )}
      <div className="mt-10 space-y-5 text-base leading-relaxed text-zinc-300">
        {post.content.split("\n\n").map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  );
}
