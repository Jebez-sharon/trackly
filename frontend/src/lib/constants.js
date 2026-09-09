// The single source of truth for the literal strings the API returns.
// Colours are token names from index.css, never raw Tailwind palette hues, so
// a rebrand means editing the theme rather than this file.
export const STATUSES = {
    'new': {label:'New', dot:'bg-status-new', text:'text-status-new-text', soft:'bg-status-new-soft'},
    'in-progress': {label:'In Progress', dot:'bg-status-progress', text:'text-status-progress-text', soft:'bg-status-progress-soft'},
    'ready-for-test': {label:'Ready for Test', dot:'bg-status-test', text:'text-status-test-text', soft:'bg-status-test-soft'},
    'closed': {label:'Closed', dot:'bg-status-done', text:'text-status-done-text', soft:'bg-status-done-soft'},
}

// Workflow order, earliest stage first.
export const STATUS_ORDER = ['new','in-progress','ready-for-test','closed'];

// Note the underscore: the API uses 'no_priority' while statuses are
// hyphenated. This map is where that inconsistency stops.
// No soft variant - priorities render as a dot and a label, never as a pill.
export const PRIORITIES = {
    'urgent': {label:'Urgent', text:'text-priority-urgent-text', dot:'bg-priority-urgent'},
    'high': {label:'High', text:'text-priority-high-text', dot:'bg-priority-high'},
    'medium': {label:'Medium', text:'text-priority-medium-text', dot:'bg-priority-medium'},
    'low': {label:'Low', text:'text-priority-low-text', dot:'bg-priority-low'},
    'no_priority': {label:'No priority', text:'text-priority-none-text', dot:'bg-priority-none'},
};

// Sorted most urgent first, for dropdowns and sorting.
export const PRIORITY_ORDER = ['urgent','high','medium','low','no_priority'];

export const SEVERITIES = {
    'critical':{label:'Critical'},
    'high':{label:'High'},
    'medium':{label:'Medium'},
    'low':{label:'Low'},
}
export const SEVERITY_ORDER = ['critical','high','medium','low'];

export const ISSUE_TYPES ={
    'bug':{label:'Bug'},
    'feature':{label:'Feature'},
    'task':{label:'Task'},
};

export const ISSUE_TYPE_ORDER = ['bug','feature','task'];

// The API does not validate every field perfectly, and older rows may
// carry values these maps do not know. Never let that crash a render.
const UNKNOWN = {label:'Unknown', text:'text-ink-muted', soft:'bg-canvas', dot:'bg-line-strong'};

export const statusMeta = (value) => STATUSES[value] || {...UNKNOWN, label:value || 'Unknown'};
export const priorityMeta = (value) => PRIORITIES[value] || {...UNKNOWN, label:value || 'Unknown'};