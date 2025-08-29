import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
export default function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp } = useAuth();

  // Forgot password / recovery states
  const [isResetRequestMode, setIsResetRequestMode] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Detect recovery link and Supabase recovery events
  useEffect(() => {
    const hash = window.location.hash || '';
    const query = window.location.search || '';
    if ((hash && (hash.includes('type=recovery') || hash.includes('access_token'))) || (query && query.includes('type=recovery'))) {
      setIsRecoveryMode(true);
      setIsResetRequestMode(false);
    }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
        setIsResetRequestMode(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  // Redirect if already authenticated (but not during recovery)
  if (user && !isRecoveryMode) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = isSignUp 
        ? await signUp(email, password, name)
        : await signIn(email, password);

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: isSignUp ? "Account Created" : "Welcome Back",
          description: isSignUp 
            ? "Please check your email to verify your account."
            : "You have been successfully signed in.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email required",
        description: "Please enter your email to reset your password.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth`,
      });
      if (error) {
        toast({ title: "Reset failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Reset email sent", description: "Check your inbox for a link to reset your password." });
        setIsResetRequestMode(false);
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Could not send reset email. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords do not match", description: "Please re-enter matching passwords.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast({ title: "Update failed", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Password updated", description: "Your password has been reset." });
        setIsRecoveryMode(false);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Could not update password. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Trip Pals</CardTitle>
          <CardDescription>
            {isRecoveryMode
              ? "Set a new password to regain access"
              : isResetRequestMode
                ? "Enter your email to reset your password"
                : isSignUp 
                  ? "Create your account to start planning trips" 
                  : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isRecoveryMode ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                  placeholder="Enter new password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  minLength={6}
                  required
                  placeholder="Confirm new password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
              <div className="mt-2 text-center text-sm">
                <Button variant="link" className="p-0 h-auto font-normal" onClick={() => setIsRecoveryMode(false)}>
                  Back to sign in
                </Button>
              </div>
            </form>
          ) : isResetRequestMode ? (
            <form onSubmit={handleResetRequest} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input
                  id="reset-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send reset link
              </Button>
              <div className="mt-2 text-center text-sm">
                <Button variant="link" className="p-0 h-auto font-normal" onClick={() => setIsResetRequestMode(false)}>
                  Back to sign in
                </Button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required={isSignUp}
                      placeholder="Enter your name"
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    minLength={6}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSignUp ? 'Create Account' : 'Sign In'}
                </Button>
              </form>
              {!isSignUp && (
                <div className="mt-2 text-center text-sm">
                  <Button variant="link" className="p-0 h-auto font-normal" onClick={() => setIsResetRequestMode(true)}>
                    Forgot password?
                  </Button>
                </div>
              )}

              <div className="mt-4 text-center text-sm">
                <span className="text-muted-foreground">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                </span>
                <Button
                  variant="link"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="ml-1 p-0 h-auto font-normal"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}