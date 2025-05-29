import { UserProps } from '@/lib/api/user';
import { getGradient } from '@/lib/gradients';
import {
  CheckInCircleIcon,
  CheckIcon,
  EditIcon,
  LoadingDots,
  UploadIcon,
  XIcon
} from '@/components/icons';
import { useSession } from '@/lib/auth-client';
import BlurImage from '../blur-image';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import TextareaAutosize from 'react-textarea-autosize';
import { MDXRemote } from 'next-mdx-remote';
import { toast } from 'sonner';

export const profileWidth = 'max-w-5xl mx-auto px-4 sm:px-6 lg:px-8';

export default function Profile({
  settings,
  user
}: {
  settings?: boolean;
  user: UserProps;
}) {
  const router = useRouter();
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    username: user?.username || '',
    image: user?.image || '/placeholder.png',
    bio: user?.bio || '',
    bioMdx: user?.bioMdx
  });
  const [error, setError] = useState('');
  const settingsPage =
    settings ||
    (router.query.settings === 'true' && router.asPath === '/settings');

  const handleDismiss = useCallback(() => {
    if (settingsPage && user) router.replace(`/${user.username}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, settingsPage, user]);
  
  // Update data if username changes
  useEffect(() => {
    if (user && data.username !== user.username) {
      setData({
        username: user.username,
        image: user.image || '/placeholder.png',
        bio: user.bio || '',
        bioMdx: user.bioMdx
      });
    }
  }, [user, data.username]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const onKeyDown = async (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleDismiss();
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      await handleSave();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onKeyDown]);

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const response = await fetch('/api/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        const bioMdx = await response.json();
        setData({
          ...data,
          bioMdx
        }); // optimistically show updated state for bioMdx
        router.replace(`/${user.username}`);
      } else if (response.status === 401) {
        setError('Not authorized to edit this profile.');
      } else {
        setError('Error saving profile.');
      }
    } catch (error) {
      console.error(error);
    }
    setSaving(false);
  };

  const handleUpload = useCallback(async () => {
    toast.error('Image upload has been disabled for demo purposes.');
  }, []);

  // Ensure user object is not null before rendering content
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white">User profile not found</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen pb-20">
      <div>
        <div
          className={`h-48 w-full lg:h-64 
          ${getGradient(user.username)}`}
        />
        <div
          className={`${profileWidth} -mt-12 sm:-mt-16 sm:flex sm:items-end sm:space-x-5`}
        >
          <div className="relative group h-24 w-24 rounded-full overflow-hidden sm:h-32 sm:w-32">
            {settingsPage && (
              <button
                className="absolute bg-gray-800 bg-opacity-50 hover:bg-opacity-70 w-full h-full z-10 transition-all flex items-center justify-center"
                onClick={handleUpload}
              >
                <UploadIcon className="h-6 w-6 text-white" />
              </button>
            )}
            <BlurImage
              src={user.image}
              alt={user.name}
              width={300}
              height={300}
            />
          </div>
          <div className="mt-6 sm:flex-1 sm:min-w-0 sm:flex sm:items-center sm:justify-end sm:space-x-6 sm:pb-1">
            <div className="flex min-w-0 flex-1 items-center space-x-2">
              <h1 className="text-2xl font-semibold text-white truncate">
                {user.name}
              </h1>
              {user.verified && (
                <CheckInCircleIcon className="w-6 h-6 text-[#0070F3]" />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-6 sm:mt-2 2xl:mt-5">
        <div className="border-b border-gray-800">
          <div className={`${profileWidth} mt-10`}>
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.name}
                  disabled={tab.name !== 'Profile'}
                  className={`${
                    tab.name === 'Profile'
                      ? 'border-white text-white'
                      : 'border-transparent text-gray-400 cursor-not-allowed'
                  }
                    whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm font-mono`}
                >
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Bio */}
      <div className={`${profileWidth} mt-16`}>
        <h2 className="font-semibold font-mono text-2xl text-white">Bio</h2>
        {settingsPage ? (
          <form action={handleSave} className="flex flex-col space-y-3">
            <TextareaAutosize
              name="bio"
              rows={5}
              className="w-full max-w-2xl px-0 text-sm tracking-wider leading-6 text-white bg-black font-mono border-0 border-b border-gray-800 focus:border-white resize-none focus:outline-none focus:ring-0"
              placeholder="Enter a short bio about yourself... (Markdown supported)"
              value={data.bio}
            />
            <div className="flex justify-end w-full max-w-2xl">
              <p className="text-gray-400 font-mono text-sm">
                {data.bio.length}/256
              </p>
            </div>
            <button
              className="rounded-md border border-black bg-black px-4 py-1.5 text-sm text-white transition-all hover:bg-white hover:text-black focus:outline-none focus:ring-4 focus:ring-gray-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-stone-700 dark:hover:border-stone-200 dark:hover:bg-black dark:hover:text-white dark:focus:ring-gray-600"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        ) : (
          <article className="mt-3 max-w-2xl text-sm tracking-wider leading-6 text-white font-mono prose prose-headings:text-white prose-a:text-white">
            <MDXRemote {...data.bioMdx} />
          </article>
        )}
      </div>

      {/* Edit buttons */}
      {settingsPage ? (
        <div className="fixed bottom-10 right-10 flex items-center space-x-3">
          <p className="text-sm text-gray-500">{error}</p>
          <Link href={`/${user.username}`} shallow replace scroll={false} className="rounded-full border border-gray-800 hover:border-white w-12 h-12 flex justify-center items-center transition-all">
            <XIcon className="h-4 w-4 text-white" />
          </Link>
        </div>
      ) : session?.user?.name === user.username ? (
        <Link
          href={{ query: { settings: true } }}
          as="/settings"
          shallow
          replace
          scroll={false}
          className="fixed bottom-10 right-10 rounded-full border bg-black border-gray-800 hover:border-white w-12 h-12 flex justify-center items-center transition-all"
        >
          <EditIcon className="h-4 w-4 text-white" />
        </Link>
      ) : null}
    </div>
  );
}

const tabs = [
  { name: 'Profile' },
  { name: 'Work History' },
  { name: 'Contact' }
];
