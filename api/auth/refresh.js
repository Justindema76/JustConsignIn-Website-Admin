import { customerAppEnabled, getProfile, supabaseAnon, supabaseUrl } from '../_lib/supabase.js';
import { isWebsiteOwner } from '../_lib/websiteAdmin.js';
import { rateLimit } from '../_lib/rateLimit.js';

export default async function handler(req,res){
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const adminRequest=String(req.query?.admin||'')==='1';
  if(!adminRequest&&!customerAppEnabled()) return res.status(404).json({error:'Not found'});
  if(!rateLimit(req,res,{key:'refresh',limit:30,windowMs:10*60_000})) return;
  const refreshToken=String(req.body?.refreshToken||'');
  if(!refreshToken) return res.status(400).json({error:'Refresh token required'});
  try{
    const response=await fetch(`${supabaseUrl()}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',headers:{apikey:supabaseAnon(),'Content-Type':'application/json'},body:JSON.stringify({refresh_token:refreshToken}),
    });
    const payload=await response.json();
    if(!response.ok) return res.status(401).json({error:'Session expired'});
    if(adminRequest){
      if(!isWebsiteOwner(payload.user)) return res.status(404).json({error:'Not found'});
      let profile=null;
      try{profile=await getProfile(payload.user.id)}catch{}
      return res.status(200).json({accessToken:payload.access_token,refreshToken:payload.refresh_token,user:{id:payload.user.id,name:profile?.full_name||payload.user.user_metadata?.name||payload.user.user_metadata?.full_name||'Admin',businessName:profile?.business_name||payload.user.user_metadata?.businessName||'JustConsignIn',email:payload.user.email,workspaceId:profile?.workspace_id||null,isAdmin:true}});
    }
    const profile=await getProfile(payload.user.id);
    if(profile?.suspended) return res.status(403).json({error:'Account suspended'});
    const status=profile?.subscription_status||'checkout_pending';
    if(!['trialing','active'].includes(status)) return res.status(402).json({error:'A valid trial or subscription is required.',billingRequired:true});
    return res.status(200).json({accessToken:payload.access_token,refreshToken:payload.refresh_token,user:{id:payload.user.id,name:profile?.full_name||'',businessName:profile?.business_name||'',email:payload.user.email,workspaceId:profile?.workspace_id,subscriptionStatus:status,trialEndsAt:profile?.trial_ends_at||null}});
  }catch(error){return res.status(500).json({error:error.message||'Unable to refresh session'})}
}
