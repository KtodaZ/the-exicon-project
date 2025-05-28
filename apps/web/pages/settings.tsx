import { GetServerSideProps } from 'next';
import Profile from '@/components/profile';
import { defaultMetaProps } from '@/components/layout/meta';
import { getUser, getAllUsers, UserProps, getUserCount } from '@/lib/api/user';
import { createAuth } from '@/lib/auth';

export default function Settings({ user }: { user: UserProps }) {
  return <Profile settings={true} user={user} />;
}

export const getServerSideProps: GetServerSideProps = async ({ req }) => {
  const auth = await createAuth();
  
  // Convert Next.js headers to Web API Headers format
  const headers = new Headers();
  Object.entries(req.headers).forEach(([key, value]) => {
    if (value) {
      headers.set(key, Array.isArray(value) ? value[0] : value);
    }
  });
  
  const session = await auth.api.getSession({
    headers
  });
  
  if (!session) {
    return {
      redirect: {
        permanent: false,
        destination: '/'
      }
    };
  }

  const results = await getAllUsers();
  const totalUsers = await getUserCount();

  const user = await getUser(session.user.name as string);

  const meta = {
    ...defaultMetaProps,
    title: `Settings | MongoDB Starter Kit`
  };

  return {
    props: {
      meta,
      results,
      totalUsers,
      user
    }
  };
};
