import { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from 'sonner';

export function DefaultProviders({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster position="top-center" richColors />
    </AuthProvider>
  );
}
