export const $ = id => document.getElementById(id);

export const v = id => $(id) ? $(id).value.trim() : "";
