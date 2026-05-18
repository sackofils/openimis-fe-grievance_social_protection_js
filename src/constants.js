export const TICKET_STATUSES = {
  RECEIVED: 'RECEIVED',
  // OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
  CLOSED: 'CLOSED',
};
export const TICKET_STATUS = [
  TICKET_STATUSES.RECEIVED,
  // TICKET_STATUSES.OPEN,
  TICKET_STATUSES.IN_PROGRESS,
  TICKET_STATUSES.RESOLVED,
  TICKET_STATUSES.CLOSED,
];

export const TICKET_PRIORITY = ['Critical', 'High', 'Normal', 'Low'];

export const RIGHT_TICKET = 127000;
export const RIGHT_TICKET_SEARCH = 127000;
export const RIGHT_TICKET_ADD = 127001;
export const RIGHT_TICKET_EDIT = 127002;
export const RIGHT_TICKET_DELETE = 127003;

export const MODULE_NAME = 'grievanceSocialProtection';
export const FETCH_INDIVIDUAL_REF = 'individual.actions.fetchIndividuals';

export const EMPTY_STRING = '';
export const GRIEVANT_TYPE_LIST = ['individual', 'beneficiary', 'user'];
export const GRIEVANCE_MAIN_MENU_CONTRIBUTION_KEY = 'grievance.MainMenu';
