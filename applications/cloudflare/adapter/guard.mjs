// Response-only security boundary. Authorization is the CA's plugin/policy job.
const scalarKeys=new Set(['id','name','status','created_on','modified_on','created_at','updated_on','environment','production_branch','subdomain','url','is_skipped','uses_functions','build_stage','deployment_trigger','type','stage','started_on','ended_on','success','code','page','per_page','count','total_count','total_pages']);
const objectKeys=new Set(['result','result_info','latest_stage','stages','latest_deployment','canonical_deployment','validation_data','verification_data','deployment_configs','production','preview']);
const marker='--- TRUNCATED ---';
export const blocked=()=>({isError:true,content:[{type:'text',text:'Cloudflare response withheld by credential-side guard; consult the operator.'}]});
const isMarker=s=>typeof s==='string'&&(s.includes(marker)||(s.length>=3&&marker.startsWith(s)));
function hasTruncation(v,depth=0){
 if(depth>64)throw new Error('Response depth');
 if(isMarker(v))return true;
 if(!v||typeof v!=='object')return false;
 return Object.entries(v).some(([k,x])=>isMarker(k)||hasTruncation(x,depth+1));
}
function plaintextVars(value) {
 if(!value||typeof value!=='object'||Array.isArray(value))return {};
 const pairs=[];
 for(const [name,item] of Object.entries(value)) {
  if(isMarker(name))continue; // Never forward a formatter's list of omitted keys.
  if(item===null){pairs.push([name,null]);continue;}
  if(item&&typeof item==='object'&&!Array.isArray(item)&&item.type==='plain_text'&&typeof item.value==='string') {
   pairs.push([name,{type:'plain_text',value:isMarker(item.value)?'[TRUNCATED]':item.value}]);
  }else if(item&&typeof item==='object'&&item.type==='secret_text') {
   pairs.push([name,{type:'secret_text'}]); // Name/classification only, never value.
  }
 }
 return Object.fromEntries(pairs);
}
export function projectPages(value,depth=0) {
 if(depth>32)throw new Error('Response depth');
 if(Array.isArray(value))return value.filter(x=>!isMarker(x)).map(x=>projectPages(x,depth+1));
 if(!value||typeof value!=='object')return null;
 if(value.type==='secret_text')return {type:'secret_text'};
 const pairs=[];
 for(const [k,v] of Object.entries(value)){
  if(isMarker(k))continue;
  if(k==='env_vars')pairs.push([k,plaintextVars(v)]);
  else if(scalarKeys.has(k)&&(v===null||['string','boolean','number'].includes(typeof v)))pairs.push([k,isMarker(v)?'[TRUNCATED]':v]);
  else if(objectKeys.has(k)&&v&&typeof v==='object')pairs.push([k,projectPages(v,depth+1)]);
  else if(k==='aliases'&&Array.isArray(v))pairs.push([k,v.filter(x=>typeof x==='string'&&!isMarker(x))]);
 }
 return Object.fromEntries(pairs);
}
export function filterResult(name,result) {
 if(!result||result.isError)return blocked();
 if(!name.startsWith('pages_'))return result;
 try {
  // Raw error text, resource blocks, structuredContent, _meta and annotations
  // never pass through. Only the official JSON text result is projected.
  if(!Array.isArray(result.content)||result.content.length!==1||result.content[0].type!=='text')return blocked();
  const raw=JSON.parse(result.content[0].text);
  if(!raw||typeof raw!=='object'||raw.success===false)return blocked();
  const content=[{type:'text',text:JSON.stringify(projectPages(raw))}];
  if(hasTruncation(raw))content.push({type:'text',text:'Warning: the upstream response was truncated. This is a partial result; narrow the query or request another page. Withheld content is not included.'});
  return {content};
 }catch{return blocked();}
}
