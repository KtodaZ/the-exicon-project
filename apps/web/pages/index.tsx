import { GetStaticProps } from 'next';
import clientPromise from '@/lib/mongodb';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h1 className="text-4xl font-bold text-white">The Exicon Project</h1>
      <p className="mt-4 text-xl text-gray-300">A blank canvas for your next great idea.</p>
      <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        <div className="p-6 border border-gray-800 rounded-lg bg-black hover:border-gray-700 transition-all">
          <h2 className="text-2xl font-semibold text-white">MongoDB Ready</h2>
          <p className="mt-2 text-gray-400">Connected and ready for your data models.</p>
        </div>
        <div className="p-6 border border-gray-800 rounded-lg bg-black hover:border-gray-700 transition-all">
          <h2 className="text-2xl font-semibold text-white">Next.js Powered</h2>
          <p className="mt-2 text-gray-400">Set up with the latest Next.js features.</p>
        </div>
      </div>
    </div>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  // Test MongoDB connection
  try {
    await clientPromise;
    
    return {
      props: {
        isConnected: true,
      },
      revalidate: 10
    };
  } catch (e) {
    console.error("Failed to connect to MongoDB", e);
    return {
      props: {
        isConnected: false,
      },
      revalidate: 10
    };
  }
};