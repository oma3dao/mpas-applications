// Credential-side boundary, loaded by the adapter-owned transport only.
// Do not move this into the proposer bridge: raw results must never leave CA.
const scalarKeys=new Set(['id','name','status','created_on','modified_on','created_at','updated_on','environment','production_branch','subdomain','url','is_skipped','uses_functions','build_stage','deployment_trigger','type','stage','started_on','ended_on','success','code','page','per_page','count','total_count','total_pages']);
const objectKeys=new Set(['result','result_info','latest_stage','stages','latest_deployment','canonical_deployment','validation_data','verification_data']);
export const blocked=()=>({isError:true,content:[{type:'text',text:'Cloudflare response withheld by credential-side guard; consult the operator.'}]});
// Positive projection: unknown fields, config/env maps, tokens, logs, messages,
// error text, annotations, resource links and _meta are never forwarded.
export function projectPages(value,depth=0) {
 if(depth>32)throw new Error('Response depth');
 if(Array.isArray(value))return value.map(x=>projectPages(x,depth+1));
 if(!value||typeof value!=='object')return null;
 const out={};
 for(const [k,v] of Object.entries(value)){
  if(scalarKeys.has(k)&&(v===null||['string','boolean','number'].includes(typeof v)))out[k]=v;
  else if(objectKeys.has(k)&&v&&typeof v==='object')out[k]=projectPages(v,depth+1);
  else if(k==='aliases'&&Array.isArray(v))out.aliases=v.filter(x=>typeof x==='string');
 }
 return out;
}
export function filterResult(name,result) {
 if(!result||result.isError)return blocked();
 if(!name.startsWith('pages_'))return result;
 try {
  // Official hosted server returns JSON text. Never forward an unparsed block.
  if(!Array.isArray(result.content)||result.content.length!==1||result.content[0].type!=='text')return blocked();
  const raw=JSON.parse(result.content[0].text);
  if(!raw||typeof raw!=='object')return blocked();
  if(raw.success===false)return blocked();
  return {content:[{type:'text',text:JSON.stringify(projectPages(raw))}]};
 }catch{return blocked();}
}
export function assertSafeArguments(name,args) {
 if(!name.startsWith('pages_'))return;
 function visit(v){
  if(!v||typeof v!=='object')return;
  for(const [k,x] of Object.entries(v)){
   // Shell commands cannot be made non-exfiltrating by an approval or a regex.
   // Reject command changes, including empty strings, rather than claiming a
   // command allowlist controls scripts/dependencies subsequently executed.
   if(['build_command','env_vars','web_analytics_token'].includes(k)||x==='secret_text')throw new Error('Server-only configuration');
   visit(x);
  }
 }
 visit(args?.body);
}
