import useSWR from 'swr';
import { api, useMockFor } from '@/lib/api';
import { MOCK_STAFF } from '@/lib/mock-data';
import type { Staff } from '@/lib/types';

const MOCK = useMockFor('staff');

/** Fetch all staff */
export function useStaff() {
  return useSWR<Staff[]>(
    'staff',
    async () => {
      if (MOCK) return MOCK_STAFF;
      return api.staff.list();
    },
    { dedupingInterval: 5000 }
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
  return useSWR<Staff | null>(
    id ? `staff-${id}` : null,
    async () => {
      if (!id) return null;
      if (MOCK) return MOCK_STAFF.find((s) => s.id === id) ?? null;
      return api.staff.get(id);
    },
    { dedupingInterval: 5000 }
  );
}
