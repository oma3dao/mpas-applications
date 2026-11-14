// Normalize captured object allOf intersections before SDK fail-closed
// validation, retaining references to avoid multiplying the schema size.
// The proposer-visible hosted schemas are never modified.
export function normalizeDnsSchema(schema) {
 const defs=schema.$defs;
 function resolve(v){
  if(!v.$ref)return v;
  const key=v.$ref.split('/$defs/')[1];
  if(!defs[key])throw new Error('Unsupported DNS reference');
  const {$ref,...rest}=v;return {...defs[key],...rest};
 }
 function visit(v){
  if(Array.isArray(v))return v.map(visit);
  if(!v||typeof v!=='object')return v;
  const out=Object.fromEntries(Object.entries(v).filter(([k])=>k!=='description').map(([k,x])=>[k,k==='allOf'?x:visit(x)]));
  if(out.allOf){
   const parts=out.allOf.map(x=>visit(resolve(x)));
   if(parts.some(p=>p.type!=='object'||Object.keys(p).some(k=>!['type','properties','required','description'].includes(k))))throw new Error('Unreviewed DNS intersection');
   delete out.allOf;out.type='object';out.properties={};
   const required=new Set(out.required||[]);
   for(const p of parts){for(const [k,s]of Object.entries(p.properties||{}))out.properties[k]=out.properties[k]?{allOf:[out.properties[k],s]}:s;
    for(const k of p.required||[])required.add(k);
   }
   if(required.size)out.required=[...required];
  }
  return out;
 }
 const result=visit(schema);
 const used=new Set();
 function refs(v){
  if(!v||typeof v!=="object")return;
  if(v.$ref){const key=v.$ref.split("/$defs/")[1];if(key&&!used.has(key)){used.add(key);refs(result.$defs[key]);}}
  for(const [k,x]of Object.entries(v))if(k!=="$defs")refs(x);
 }
 refs(result);
 result.$defs=Object.fromEntries(Object.entries(result.$defs).filter(([k])=>used.has(k)));
 return result;
}
