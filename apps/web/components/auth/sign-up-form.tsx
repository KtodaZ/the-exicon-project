import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authClient, useSession } from '@/lib/auth-client';
import { useRouter } from 'next/router';

export function SignUpForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [f3Name, setF3Name] = useState('');
  const [f3Region, setF3Region] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { refetch } = useSession();

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name,
        f3Name,
        f3Region,
        callbackURL: '/exicon',
      });

      if (error) {
        setError(error.message || 'Sign up failed');
      } else {
        // Refresh session state to update UI immediately
        await refetch();
        router.push('/exicon');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl">Create an account</CardTitle>
        <CardDescription>
          Enter your information to create your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailSignUp} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="f3Name" className="text-sm font-medium">
              F3 Name
            </label>
            <Input
              id="f3Name"
              type="text"
              placeholder="Enter your F3 name"
              value={f3Name}
              onChange={(e) => setF3Name(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="f3Region" className="text-sm font-medium">
              F3 Region
            </label>
            <Input
              id="f3Region"
              type="text"
              placeholder="Enter your F3 region"
              value={f3Region}
              onChange={(e) => setF3Region(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoading}
          >
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Button variant="link" className="p-0" onClick={() => router.push('/auth/sign-in')}>
            Sign in
          </Button>
        </p>
      </CardFooter>
    </Card>
  );
} 