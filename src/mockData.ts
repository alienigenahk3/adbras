import { addDays, startOfWeek, nextSunday, nextWednesday, nextSaturday, setHours, setMinutes } from 'date-fns';
import { ChurchEvent } from './types';

const today = new Date();
const startOfCurrentWeek = startOfWeek(today, { weekStartsOn: 0 }); // Sunday as start

function createDate(base: Date, daysToAdd: number, hours: number, minutes: number): Date {
  const date = addDays(base, daysToAdd);
  return setMinutes(setHours(date, hours), minutes);
}

export const mockEvents: ChurchEvent[] = [
  {
    id: '1',
    title: 'Culto de Celebração',
    description: 'Nosso culto principal de domingo. Venha celebrar e adorar conosco!',
    date: createDate(startOfCurrentWeek, 0, 18, 0), // Sunday
    startTime: '18:00',
    endTime: '20:00',
    category: 'culto_normal',
    location: 'Templo Principal',
  },
  {
    id: '2',
    title: 'Culto de Ensino',
    description: 'Estudo aprofundado da palavra de Deus.',
    date: createDate(startOfCurrentWeek, 3, 19, 30), // Wednesday
    startTime: '19:30',
    endTime: '21:00',
    category: 'culto_normal',
    location: 'Templo Principal',
  },
  {
    id: '3',
    title: 'Reunião de Jovens',
    description: 'Encontro semanal dos jovens. Muito louvor, dinâmicas e palavra.',
    date: createDate(startOfCurrentWeek, 6, 19, 0), // Saturday
    startTime: '19:00',
    endTime: '21:30',
    category: 'reuniao',
    location: 'Salão Anexo',
  },
  {
    id: '4',
    title: 'Santa Ceia do Senhor',
    description: 'Culto especial de comunhão e memória do sacrifício de Cristo.',
    date: createDate(startOfCurrentWeek, 7, 18, 0), // Next Sunday
    startTime: '18:00',
    endTime: '20:30',
    category: 'culto_especial',
    location: 'Templo Principal',
  },
  {
    id: '5',
    title: 'Reunião de Liderança',
    description: 'Alinhamento mensal com líderes de ministério.',
    date: createDate(startOfCurrentWeek, 8, 19, 30), // Next Monday
    startTime: '19:30',
    endTime: '21:30',
    category: 'reuniao',
    location: 'Sala 02',
  },
  {
    id: '6',
    title: 'Culto de Missões',
    description: 'Culto dedicado à conscientização e apoio missionário.',
    date: createDate(startOfCurrentWeek, 14, 18, 0), // 2 Sundays from now
    startTime: '18:00',
    endTime: '20:00',
    category: 'culto_especial',
    location: 'Templo Principal',
  },
];
