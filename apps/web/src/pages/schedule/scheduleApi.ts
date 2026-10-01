import {
  createBusinessScheduleException,
  deleteBusinessScheduleException,
  listBusinessHours,
  listBusinessScheduleExceptions,
  replaceBusinessHours,
  type components,
} from '@spot/shared';
import { authClient } from '../../api/client';
import { mockScheduleApi } from './mockScheduleApi';

type BusinessHour = components['schemas']['BusinessHour'];
type BusinessHourInput = components['schemas']['BusinessHourInput'];
type BusinessScheduleException = components['schemas']['BusinessScheduleException'];
type BusinessScheduleExceptionCreateRequest = components['schemas']['BusinessScheduleExceptionCreateRequest'];

/** What the Horarios view needs from the hours/schedule-exceptions endpoints. */
export interface ScheduleApi {
  listHours(businessId: string): Promise<BusinessHour[]>;
  replaceHours(businessId: string, hours: BusinessHourInput[]): Promise<BusinessHour[]>;
  /** Exceptions dated `from` (YYYY-MM-DD) onwards. */
  listExceptions(businessId: string, from: string): Promise<BusinessScheduleException[]>;
  createException(businessId: string, data: BusinessScheduleExceptionCreateRequest): Promise<BusinessScheduleException>;
  deleteException(businessId: string, exceptionId: string): Promise<void>;
}

// The contract's max pageSize; a business has far fewer upcoming exceptions, so one page is the whole list.
const EXCEPTIONS_PAGE_SIZE = 100;

const remoteScheduleApi: ScheduleApi = {
  listHours: (businessId) => listBusinessHours(authClient, businessId).then((page) => page.data),
  replaceHours: (businessId, hours) =>
    replaceBusinessHours(authClient, businessId, hours).then((result) => result.data),
  listExceptions: (businessId, from) =>
    listBusinessScheduleExceptions(authClient, businessId, { from, pageSize: EXCEPTIONS_PAGE_SIZE }).then(
      (page) => page.data,
    ),
  createException: (businessId, data) => createBusinessScheduleException(authClient, businessId, data),
  deleteException: (businessId, exceptionId) => deleteBusinessScheduleException(authClient, businessId, exceptionId),
};

/** True when VITE_SCHEDULE_MOCK=true — see mockScheduleApi. */
export const isScheduleMock = import.meta.env.VITE_SCHEDULE_MOCK === 'true';

export const scheduleApi: ScheduleApi = isScheduleMock ? mockScheduleApi : remoteScheduleApi;
