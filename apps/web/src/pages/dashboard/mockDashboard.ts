// Mock data for the dashboard home shell. Will be replaced by real endpoints
// in the bookings dashboard story (#30).

export const dashboardStats = {
  totalReservations: 5,
  pending: 2,
  confirmed: 2,
  revenueColones: 7000,
};

export const reservationsByDay = [
  { label: 'Lun', value: 3 },
  { label: 'Mar', value: 5 },
  { label: 'Mié', value: 2 },
  { label: 'Jue', value: 4 },
  { label: 'Vie', value: 6 },
  { label: 'Sáb', value: 3 },
  { label: 'Dom', value: 1 },
];

export type AvatarColor = 'teal' | 'amber' | 'dark';
export type AppointmentStatus = 'confirmed' | 'pending';

export interface UpcomingAppointment {
  id: string;
  name: string;
  service: string;
  status: AppointmentStatus;
  avatarColor: AvatarColor;
}

export const upcomingAppointments: UpcomingAppointment[] = [
  { id: '1', name: 'Andrea Morera', service: 'Corte y peinado', status: 'confirmed', avatarColor: 'teal' },
  { id: '2', name: 'Luis Rodríguez', service: 'Corte de cabello', status: 'pending', avatarColor: 'amber' },
  { id: '3', name: 'Karla Vega', service: 'Manicure', status: 'confirmed', avatarColor: 'dark' },
];
