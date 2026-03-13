import useSWR from 'swr';
import { api } from '@/lib/api';
import { MOCK_STAFF } from '@/lib/mock-data';
import { useDemoMode } from '@/context/MockDataContext';
import type { Staff } from '@/lib/types';

/** Fetch all staff */
export function useStaff() {
  const { isDemoMode } = useDemoMode();

  return useSWR<Staff[]>(
    isDemoMode ? 'demo-staff' : 'staff',
    async () => {
      if (isDemoMode) return MOCK_STAFF;
      return api.staff.list();
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}

/** Fetch active staff only */
export function useActiveStaff() {
  const { data: staff, ...rest } = useStaff();
  const active = staff?.filter((s) => s.status === 'Active');
  return { data: active, ...rest };
}

/** Fetch a single staff member by ID */
export function useStaffMember(id: number | null) {
  const { isDemoMode } = useDemoMode();

  return useSWR<Staff | null>(
    id ? (isDemoMode ? `demo-staff-${id}` : `staff-${id}`) : null,
    async () => {
      if (!id) return null;
      if (isDemoMode) return MOCK_STAFF.find((s) => s.id === id) || null;
      return api.staff.get(id);
    },
    { dedupingInterval: isDemoMode ? 60000 : 5000, revalidateOnFocus: !isDemoMode }
  );
}
