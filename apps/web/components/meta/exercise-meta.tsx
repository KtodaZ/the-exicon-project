import Head from 'next/head';
import { stripMarkdownForMeta } from '@/lib/utils';

interface ExerciseMetaProps {
  name: string;
  description: string;
  urlSlug: string;
}

export function ExerciseMeta({ 
  name, 
  description, 
  urlSlug
}: ExerciseMetaProps) {
  const cleanDescription = stripMarkdownForMeta(description);
  const title = `${name} | Exicon`;
  const url = `https://the-exicon-project-web.vercel.app/exicon/${urlSlug}`;

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={cleanDescription} />
      
      {/* Open Graph meta tags for social media sharing */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={cleanDescription} />
      <meta property="og:type" content="article" />
      <meta property="og:url" content={url} />
      
      {/* Twitter Card meta tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={cleanDescription} />
    </Head>
  );
} 