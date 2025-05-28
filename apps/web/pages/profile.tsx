import { GetServerSideProps } from 'next';
import { createAuth } from '@/lib/auth';

export default function Profile() {
  return <div>Profile</div>;
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
  return {
    redirect: {
      permanent: false,
      destination: `/${session.user.name}`
    }
  };
};
