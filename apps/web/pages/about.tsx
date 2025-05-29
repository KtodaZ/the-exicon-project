import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AboutPage() {
  return (
    <>
      <Head>
        <title>About - The Exicon Project</title>
        <meta name="description" content="Learn about The Exicon Project - an open source exercise lexicon for F3 Qs, built by the PAX, for the PAX." />
      </Head>
      
      <div className="min-h-screen bg-gray-100 dark:bg-black">
        <div className="container mx-auto py-8">
          <div className="mb-12 pt-8">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              About The Exicon Project
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              An open source exercise lexicon for F3 Qs — built by the PAX, for the PAX.
            </p>
          </div>

          <div className="grid gap-8 max-w-4xl">
            {/* Mission */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Our Mission</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed mb-4">
                  The Exicon Project is a community-driven effort to build, refine, and maintain an up-to-date exercise lexicon for F3 workouts. 
                  This platform enables Qs across regions to contribute new routines, update existing entries, and share the creative fitness traditions of the F3 Nation.
                </p>
                <p className="text-lg leading-relaxed">
                  We're not just building an exercise database — we're preserving and growing the culture, stories, and spirit that make F3 special.
                </p>
              </CardContent>
            </Card>

            {/* What is the Exicon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">What is the Exicon?</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed mb-4">
                  The Exicon is a collection of named exercises used in F3 workouts, often paired with a unique story, method, or tradition. 
                  It helps Qs (leaders) bring consistency, creativity, and fun to beatdowns while honoring F3's culture and mission.
                </p>
                <p className="text-lg leading-relaxed mb-4">
                  You can view the official Exicon at <Link href="https://f3nation.com/Exicon" target="_blank" rel="noopener noreferrer" className="text-brand-red hover:underline">f3nation.com/Exicon</Link>.
                </p>
                <p className="text-lg leading-relaxed">
                  This project aims to build an open, extensible version of that resource — one that can grow and evolve with the community.
                </p>
              </CardContent>
            </Card>

            {/* The Lexicon */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">The F3 Lexicon</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed mb-4">
                  Beyond exercises, F3 has developed its own rich vocabulary and terminology. From PAX to Qs, from beatdowns to mumblechatter, 
                  F3 language creates bonds and shared understanding across the nation.
                </p>
                <p className="text-lg leading-relaxed">
                  We're also building a comprehensive lexicon of F3 terms to help new PAX understand the culture and language that makes F3 unique.
                </p>
              </CardContent>
            </Card>

            {/* Community Driven */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">Built by the PAX, for the PAX</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed mb-4">
                  This is an open source project, which means it belongs to the community. Every exercise submission, every story shared, 
                  every piece of feedback helps make this resource better for all PAX.
                </p>
                <p className="text-lg leading-relaxed mb-4">
                  Whether you're a Q looking to contribute your favorite exercises, a developer wanting to improve the platform, 
                  or just someone passionate about F3 culture — there's a place for you in this project.
                </p>
                <div className="flex gap-4 mt-6">
                  <Link href="https://discord.gg/qUKbvs7cx2" target="_blank" rel="noopener noreferrer">
                    <Button variant="default">
                      Join Our Discord
                    </Button>
                  </Link>
                  <Link href="https://github.com/f3-nation/the-exicon-project" target="_blank" rel="noopener noreferrer">
                    <Button variant="outline">
                      View on GitHub
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* F3 Spirit */}
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">The F3 Spirit</CardTitle>
              </CardHeader>
              <CardContent className="prose dark:prose-invert max-w-none">
                <p className="text-lg leading-relaxed mb-4">
                  This project is rooted in the core values of F3: leave no man behind, but leave no man where you found him. 
                  We're here to support each other, share knowledge, and grow together as a community.
                </p>
                <p className="text-lg leading-relaxed">
                  Every contribution, no matter how small, helps strengthen the bonds that connect PAX across regions and backgrounds. 
                  Together, we're building something bigger than just an exercise database — we're preserving and growing the heart of F3.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}