export interface School {
  id: string;
  name: string;
  subdomain: string;
  stage: string;
  students: number;
  status: 'Active' | 'Inactive' | 'Pending';
}

export interface Stat {
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down';
  icon: string;
}
