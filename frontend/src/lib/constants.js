// The single source of truth for the literal strings the API returns.
export const STATUSES = {
    'new': {label:'New', dot:'bg-blue-500', text:'text-blue-700', soft:'bg-blue-50'},
    'in-progress':{label:'In Progress', dot:'bg-amber-500', text:'text-amber-700', soft:'bg-amber-50'},
    'ready-for-test':{label:'Ready for Test', dot:'bg-violet-500', text:'text-violet-700', soft:'bg-violet-50'},
    'closed':{label:'Closed', dot:'bg-green-500', text:'text-green-700', soft:'bg-green-50'},
}

// Kanban column order, left to right.
export const STATUS_ORDER = ['new','in-progress','ready-for-test','closed'];

// Note the underscore: the API uses 'no_priority' while statuses are
// hyphenated. This map is where that inconsistency stops.

export const PRIORITIES = {
    'urgent': {label:'Urgent', text:'text-red-700', soft:'bg-red-50', dot:'bg-red-500'},
    'high': {label:'High', text:'text-orange-700', soft:'bg-orange-50', dot:'bg-orange-500'},
    'medium': {label:'Medium', text:'text-amber-700', soft:'bg-amber-50', dot:'bg-amber-500'},
    'low': {label:'Low', text:'text-ink-soft', soft:'bg-gray-100', dot:'bg-gray-400'},
    'no_priority': {label:'No priority', text:'text-ink-muted', soft:'bg-gray-50', dot:'bg-gray-300'},
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

const UNKNOWN = {label:'Unknown', text:'text-ink-muted', soft:'bg-gray-50', dot:'bg-gray-300'};

export const statusMeta = (value) => STATUSES[value] || {...UNKNOWN, label:value || 'Unknown'};
export const priorityMeta = (value) => PRIORITIES[value] || {...UNKNOWN, label:value || 'Unknown'};