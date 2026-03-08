export const _users        = new Map(); // username int a volunteer user object
export const _emails       = new Set(); // all registered emails (volunteers)
export const _orgUsernames = new Map(); // username into an org object
export const _orgEmails    = new Set(); // all registered emails (orgs)

// delay cause we are so snazzy and fancy 
export const delay = (ms = 350) => new Promise((r) => setTimeout(r, ms));