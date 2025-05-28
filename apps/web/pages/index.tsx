import { Button } from "@/components/ui/button";
import Link from "next/link";
import Head from "next/head";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GetStaticProps } from 'next';

interface HomeProps {
  isConnected?: boolean;
}

export default function Home({ isConnected }: HomeProps) {
  return (
    <>
      <Head>
        <title>The Exicon Project</title>
        <meta name="description" content="A comprehensive collection of exercises and terminology" />
      </Head>
      
      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto pt-16">
          <div className="text-center mb-8 pt-12">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
              The Exicon Project
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
              Your comprehensive resource for exercise knowledge and terminology
            </p>
          </div>

          <div className="grid grid-cols-12 gap-6 lg:gap-8 px-[5%] pb-16">
            <div className="col-span-12 md:col-span-6 lg:col-span-5 lg:col-start-2">
              <Card className="hover:shadow-lg transition-shadow duration-300 border-2 border-transparent hover:border-brand-red h-full flex flex-col">
                <Link href="/exicon" className="flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl">Exicon</CardTitle>
                    <CardDescription>
                      Browse our extensive collection of exercises
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="h-40 md:h-60 bg-gray-200 dark:bg-gray-800 rounded-md mb-4 flex items-center justify-center">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-20 w-20 text-gray-400 dark:text-gray-600" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" 
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 flex-1">
                      Find detailed instructions, videos, and tips for hundreds of exercises to enhance your workout routine.
                    </p>
                    <div className="mt-6">
                      <Button variant="red" className="w-full">
                        Browse Exercises
                      </Button>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-5">
              <Card className="hover:shadow-lg transition-shadow duration-300 border-2 border-transparent hover:border-gray-300 h-full flex flex-col">
                <div className="flex flex-col h-full">
                  <CardHeader>
                    <CardTitle className="text-2xl md:text-3xl">Lexicon</CardTitle>
                    <CardDescription>
                      Learn the terminology and language
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="h-40 md:h-60 bg-gray-200 dark:bg-gray-800 rounded-md mb-4 flex items-center justify-center">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-20 w-20 text-gray-400 dark:text-gray-600" 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={1.5} 
                          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
                        />
                      </svg>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 flex-1">
                      Understand the specific terms and language used in fitness and training contexts.
                    </p>
                    <div className="mt-6">
                      <Button variant="outline" className="w-full" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps<HomeProps> = async () => {
  return {
    props: {
      isConnected: true
    },
    revalidate: 10
  };
}