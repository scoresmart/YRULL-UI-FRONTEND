import { useCallback, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Lock, Mail, User, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useAuthStore } from '../../store/authStore';

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  workspaceName: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export function RegisterForm() {
  const navigate = useNavigate();
  const signUp = useAuthStore((s) => s.signUp);
  const [show, setShow] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', workspaceName: '', email: '', password: '' },
  });

  const onSubmit = useCallback(
    async (values) => {
      try {
        const result = await signUp(values);
        if (result?.needsConfirmation) {
          toast.success('Check your email to confirm your account.');
          navigate('/login', { replace: true });
        } else {
          navigate('/onboarding', { replace: true });
        }
      } catch (e) {
        toast.error(e?.message ?? 'Unable to create account');
      }
    },
    [signUp, navigate],
  );

  const toggleIcon = useMemo(() => (show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />), [show]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1.5">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Full Name</div>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="John Doe" className="pl-9" autoComplete="name" {...register('fullName')} />
        </div>
        {errors.fullName && <p className="text-sm text-red-500">{errors.fullName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Company Name</div>
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Your Company" className="pl-9" {...register('workspaceName')} />
        </div>
        {errors.workspaceName && <p className="text-sm text-red-500">{errors.workspaceName.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Email</div>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input placeholder="you@company.com" className="pl-9" autoComplete="email" {...register('email')} />
        </div>
        {errors.email && <p className="text-sm text-red-500">{errors.email.message}</p>}
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium uppercase tracking-wide text-gray-400">Password</div>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="••••••••"
            type={show ? 'text' : 'password'}
            className="pl-9 pr-10"
            autoComplete="new-password"
            {...register('password')}
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
            onClick={() => setShow((s) => !s)}
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {toggleIcon}
          </button>
        </div>
        {errors.password && <p className="text-sm text-red-500">{errors.password.message}</p>}
      </div>

      <p className="text-center text-xs leading-relaxed text-gray-500">
        By creating an account, you agree to our{' '}
        <Link to="/terms" className="font-medium text-green-600 hover:text-green-700 hover:underline">
          Terms of Service
        </Link>{' '}
        and{' '}
        <Link to="/privacy" className="font-medium text-green-600 hover:text-green-700 hover:underline">
          Privacy Policy
        </Link>
        .
      </p>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </Button>
    </form>
  );
}
