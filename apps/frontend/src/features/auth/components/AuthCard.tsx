import { Card, CardContent } from '@fe/shared/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@fe/shared/components/ui/tabs';
import { useState } from 'react';

import { AuthDivider } from './AuthDivider';
import { ErrorMessage } from './ErrorMessage';
import { GoogleSignInButton } from './GoogleSignInButton';
import { SignInForm } from './SignInForm';
import { SignUpForm } from './SignUpForm';

import type { SignInFormData, SignUpFormData } from '../utils/validation';

interface AuthCardProps {
  onSignIn: (data: SignInFormData) => Promise<void>;
  onSignUp: (data: SignUpFormData) => Promise<void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onGoogleSuccess: (credentialResponse: any) => void;
  onGoogleError: () => void;
  isSubmitting: boolean;
  authError: string | null;
}

export const AuthCard = ({
  onSignIn,
  onSignUp,
  onGoogleSuccess,
  onGoogleError,
  isSubmitting,
  authError,
}: AuthCardProps) => {
  const [activeTab, setActiveTab] = useState('signin');

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl shadow-2xl">
      <CardContent className="p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-800/50">
            <TabsTrigger
              value="signin"
              className="relative data-[state=active]:bg-blue-500 data-[state=active]:text-blue-100 hover:bg-blue-900"
            >
              Sign In
            </TabsTrigger>
            <TabsTrigger
              value="signup"
              className="relative data-[state=active]:bg-blue-500 data-[state=active]:text-blue-100 hover:bg-blue-900"
            >
              Sign Up
            </TabsTrigger>
          </TabsList>

          <ErrorMessage error={authError} />

          <TabsContent value="signin" className="space-y-4 mt-0">
            <SignInForm onSubmit={onSignIn} isSubmitting={isSubmitting} />
            <AuthDivider />
            <GoogleSignInButton
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
            />
          </TabsContent>

          <TabsContent value="signup" className="space-y-4 mt-0">
            <SignUpForm onSubmit={onSignUp} isSubmitting={isSubmitting} />
            <AuthDivider />
            <GoogleSignInButton
              onSuccess={onGoogleSuccess}
              onError={onGoogleError}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
