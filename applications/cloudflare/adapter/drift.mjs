import {isDeepStrictEqual} from 'node:util';
// Diagnostics contain ONLY reviewed names and constant reason codes, never
// upstream descriptions, schemas, values, or unrelated names.
export function selectedDrift(reviewed,live) {
 return reviewed.flatMap(expected=>{
  const matches=live.filter(t=>t?.name===expected.name);
  if(!matches.length)return [{tool:expected.name,reason:'missing'}];
  if(matches.length!==1)return [{tool:expected.name,reason:'duplicate'}];
  return isDeepStrictEqual(expected,matches[0])?[]:[{tool:expected.name,reason:'changed'}];
 });
}
