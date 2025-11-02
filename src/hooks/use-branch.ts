import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

export function useBranch() {
  const { user } = useAuth();
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchName, setBranchName] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setBranchId(user.branchId || null);
      setBranchName(user.branchName || null);
    }
  }, [user]);

  function selectBranch(id: string, name: string) {
    setBranchId(id);
    setBranchName(name);
  }

  return {
    branchId,
    branchName,
    selectBranch,
    isSelected: branchId !== null,
  };
}
