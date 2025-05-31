import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LexiconTextRenderer } from '@/components/ui/lexicon-text-renderer';
import { LexiconItem, getLexiconItemBySlug } from '@/lib/api/lexicon';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { ArrowLeft, Copy, BookOpen, Edit } from 'lucide-react';

interface LexiconDetailPageProps {
  item: LexiconItem | null;
  slug: string;
}

export default function LexiconDetailPage({ item, slug }: LexiconDetailPageProps) {
  const [copied, setCopied] = useState(false);
  const { data: session } = useSession();
  const { data: permissions } = usePermissions();

  if (!item) {
    return (
      <>
        <Head>
          <title>Term Not Found - F3 Lexicon</title>
        </Head>
        <div className="min-h-screen bg-gray-100 dark:bg-black flex items-center justify-center">
          <div className="text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-4">Term Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              The term &quot;{slug}&quot; was not found in our lexicon.
            </p>
            <Link href="/lexicon">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Lexicon
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  const handleCopy = async () => {
    const textToCopy = `${item.title}: ${item.description}`;
    
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Extract text from HTML for better display
  const extractTextFromHtml = (html: string): string => {
    // Simple HTML tag removal and entity decoding
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  };

  const firstLetter = item.title.charAt(0).toUpperCase();
  const cleanDescription = item.rawHTML ? extractTextFromHtml(item.rawHTML) : item.description;

  return (
    <>
      <Head>
        <title>{item.title} - F3 Lexicon</title>
        <meta name="description" content={item.description} />
      </Head>

      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto py-6 px-4">
          {/* Navigation */}
          <div className="mb-8">
            <Link href="/lexicon">
              <Button variant="ghost" className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ArrowLeft className="h-4 w-4" />
                Back to Lexicon
              </Button>
            </Link>
          </div>

          {/* Main Content */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="relative bg-gradient-to-r from-brand-red to-red-600 p-8 text-white">
                {/* First Letter Badge - larger for detail page */}
                <div className="absolute -top-4 -left-4 w-16 h-16 bg-white text-brand-red rounded-full flex items-center justify-center text-2xl font-bold shadow-lg">
                  {firstLetter}
                </div>
                
                {/* Copy Button */}
                <button
                  onClick={handleCopy}
                  className="absolute top-6 right-6 p-3 bg-white/20 hover:bg-white/30 rounded-full transition-colors duration-200"
                  title="Copy definition"
                >
                  {copied ? (
                    <span className="text-sm font-medium">Copied!</span>
                  ) : (
                    <Copy className="h-5 w-5" />
                  )}
                </button>

                {/* Title */}
                <div className="pl-16">
                  <h1 className="text-3xl lg:text-4xl font-bold leading-tight">
                    {item.title}
                  </h1>
                  {/* Aliases */}
                  {item.aliases && item.aliases.length > 0 && (
                    <p className="text-white/90 text-lg mt-2">
                      Also known as: {item.aliases.map(alias => alias.name).join(', ')}
                    </p>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="p-8">
                {/* Definition */}
                <div className="prose prose-lg dark:prose-invert max-w-none">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                    Definition
                  </h2>
                  <div className="text-gray-700 dark:text-gray-300 leading-relaxed text-lg">
                    <LexiconTextRenderer 
                      text={item.description} 
                      showTooltips={true}
                    />
                  </div>
                </div>

                {/* Metadata */}
                <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
                    {item.updatedAt && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Last Updated:</span>
                        <span>{new Date(item.updatedAt).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-8 flex flex-wrap gap-4">
                  <Button
                    onClick={handleCopy}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    {copied ? 'Copied!' : 'Copy Definition'}
                  </Button>
                  
                  {/* Edit button for admins */}
                  {session?.user && permissions?.canEditLexicon && (
                    <Link href={`/edit-lexicon/${item._id}`}>
                      <Button variant="outline" className="flex items-center gap-2">
                        <Edit className="h-4 w-4" />
                        Edit
                      </Button>
                    </Link>
                  )}
                  
                  <Link href="/lexicon">
                    <Button variant="outline" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Browse More Terms
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { slug } = context.params as { slug: string };

  try {
    const item = await getLexiconItemBySlug(slug);

    return {
      props: {
        item: item ? JSON.parse(JSON.stringify(item)) : null,
        slug,
      },
    };
  } catch (error) {
    console.error('Error fetching lexicon item:', error);

    return {
      props: {
        item: null,
        slug,
      },
    };
  }
}; 