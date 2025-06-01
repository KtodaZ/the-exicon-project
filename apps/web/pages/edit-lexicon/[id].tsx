import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useSession } from '@/lib/auth-client';
import { usePermissions } from '@/lib/hooks/use-permissions';
import { LexiconItem } from '@/lib/api/lexicon';
import { LexiconForm } from '../../components/lexicon-form';
import { toast } from 'sonner';

export default function EditLexiconPage() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, isPending } = useSession();
  const { data: permissions, isLoading: permissionsLoading } = usePermissions();
  const [loadingLexicon, setLoadingLexicon] = useState(true);
  const [lexicon, setLexicon] = useState<LexiconItem | null>(null);

  // Load lexicon data
  useEffect(() => {
    const loadLexicon = async () => {
      if (!id || typeof id !== 'string') return;

      setLoadingLexicon(true);
      try {
        const response = await fetch(`/api/lexicon/manage?lexiconId=${id}`);
        const data = await response.json();

        if (response.ok && data.success && data.lexicon) {
          setLexicon(data.lexicon);
        } else {
          console.error('Failed to load lexicon item:', data.error);
          toast.error('Failed to load lexicon item');
          router.push('/admin');
        }
      } catch (error) {
        console.error('Error loading lexicon item:', error);
        toast.error('Failed to load lexicon item');
        router.push('/admin');
      } finally {
        setLoadingLexicon(false);
      }
    };

    loadLexicon();
  }, [id, router]);

  // Redirect if not logged in
  useEffect(() => {
    if (!isPending && !session?.user) {
      router.push('/auth/sign-in?redirect=' + encodeURIComponent(router.asPath));
    }
  }, [session, isPending, router]);

  if (isPending || permissionsLoading || loadingLexicon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null; // Will redirect
  }

  if (!permissions?.canEditLexicon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">You don&apos;t have permission to edit lexicon items.</p>
        </div>
      </div>
    );
  }

  if (!lexicon) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Lexicon Item Not Found</h1>
          <p className="text-gray-600">The lexicon item you&apos;re trying to edit doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Edit Lexicon Item - {lexicon.title} - The Exicon Project</title>
        <meta name="description" content={`Edit lexicon item: ${lexicon.title}`} />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Edit Lexicon Item</h1>
            <p className="mt-2 text-gray-600">
              Make changes to the lexicon item details and status.
            </p>
          </div>

          <LexiconForm
            mode="edit"
            lexicon={lexicon}
            permissions={permissions}
            onCancel={() => router.back()}
          />
        </div>
      </div>
    </>
  );
}