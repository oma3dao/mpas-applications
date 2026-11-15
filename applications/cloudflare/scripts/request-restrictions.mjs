// Default request authorization restrictions belong in the plugin, not transport.
// Deliberate overrides must update this generation source AND deployment policy.
export const DIRECT_UPLOAD_FIELDS = [
  '_headers', '_redirects', '_routes.json', '_worker.bundle', '_worker.js',
  'functions-filepath-routing-config.json', 'manifest',
  'pages_build_output_dir', 'wrangler_config_hash',
];
// The source spec bounds these opaque identifiers at 32 characters; it does
// not promise a hexadecimal-only grammar. Restrict to URL-safe token characters.
const resourceId = {minLength:1,maxLength:32,pattern:'^[A-Za-z0-9_-]{1,32}$'+ '(?![\\s\\S])'};
const end = '(?![\\s\\S])';
export const PATH_CONSTRAINTS = {
  account_id:resourceId, zone_id:resourceId, dns_record_id:resourceId,
  deployment_id:{minLength:36,maxLength:36,pattern:'^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$'},
  project_name:{minLength:1,pattern:'^[a-z0-9][a-z0-9-]*$'+end},
  domain_name:{minLength:1,maxLength:253,pattern:'^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\\.?$'+end},
};
export function restrictRequests(plugin) {
  for (const [name,op] of Object.entries(plugin.operations)) {
    const args=op.executionPayloadSchema.properties.arguments;
    for(const [key,schema] of Object.entries(args.properties.path?.properties||{})) {
      if(!PATH_CONSTRAINTS[key])throw new Error('Unreviewed path parameter: '+key);
      Object.assign(schema,PATH_CONSTRAINTS[key]);
    }
    if(name==='pages_deployments_create') {
      for(const field of DIRECT_UPLOAD_FIELDS) {
        if(!Object.hasOwn(args.properties.body.properties,field))throw new Error('Missing upload field: '+field);
        args.properties.body.properties[field]=false;
      }
    }
    if(name==='pages_create'||name==='pages_edit') {
      const build=args.properties.body.properties.build_config.properties;
      build.build_command=false;build.web_analytics_token=false;
      // The captured schema has nested oneOf(null) alternatives that overlap.
      // One explicit union supports plaintext and null deletion unambiguously.
      args.$defs.pages_deployment_config_values_request.properties.env_vars.additionalProperties={
        anyOf:[{type:'object',additionalProperties:false,required:['type','value'],properties:{type:{const:'plain_text'},value:{type:'string'}}},{type:'null'}],
      };
      delete args.$defs.pages_plain_text_env_var;
      delete args.$defs.pages_secret_text_env_var;
    }
  }
}
