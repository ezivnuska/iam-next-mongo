import SigninForm from '@/app/ui/auth/signin-form';
import SignupForm from '@/app/ui/auth/signup-form';

export default function AuthPanel({ initialMode = 'signin' }: { initialMode?: 'signin' | 'signup' }) {
  if (initialMode === 'signup') {
    return <SignupForm />;
  }
  return <SigninForm />;
}
