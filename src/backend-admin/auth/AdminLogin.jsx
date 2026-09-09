import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useAuth } from './AdminAuthContext';

const ADMIN_HOME = '/admin';

export default function AdminLogin(){
  const {user,accessToken,checking,startGoogleSignIn,completeGoogleSession}=useAuth();
  const navigate=useNavigate();
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);

  useEffect(()=>{
    const params=new URLSearchParams(window.location.hash.replace(/^#/,''));
    const oauthAccessToken=params.get('access_token');
    const oauthRefreshToken=params.get('refresh_token');
    const oauthError=params.get('error_description') || params.get('error');

    if(oauthError && !oauthAccessToken){
      setError(decodeURIComponent(oauthError));
      window.history.replaceState({},document.title,window.location.pathname);
      return;
    }
    if(!oauthAccessToken) return;

    setLoading(true);
    setError('');
    completeGoogleSession({accessToken:oauthAccessToken,refreshToken:oauthRefreshToken})
      .then(()=>{
        window.history.replaceState({},document.title,ADMIN_HOME);
        navigate(ADMIN_HOME,{replace:true});
      })
      .catch(err=>{
        window.history.replaceState({},document.title,'/admin-login');
        setError(err.message||'Unable to open the website admin session.');
        setLoading(false);
      });
  },[]);

  if(checking) return <div className="site-admin-login-page" aria-label="Checking admin access"/>;
  if(user?.isAdmin && accessToken) return <Navigate to={ADMIN_HOME} replace/>;

  const loginWithGoogle=()=>{
    setError('');
    setLoading(true);
    startGoogleSignIn();
  };

  return <div className="site-admin-login-page">
    <div className="site-admin-login-shell">
      <Link className="site-admin-login-back" to="/"><ArrowLeft size={16}/> Back to JustConsignIn</Link>
      <div className="site-admin-login-card">
        <div className="site-admin-login-heading">
          <span className="site-admin-brand-mark"><ShieldCheck size={22}/></span>
          <div><h1>Private Website Admin</h1><p>Owner access only.</p></div>
        </div>
        {error&&<div className="site-admin-alert error">This Google account is not authorized.</div>}
        <button className="site-admin-btn site-admin-login-button" type="button" disabled={loading} onClick={loginWithGoogle}>
          {loading?'Opening Google…':<><span aria-hidden="true" className="site-admin-google-mark">G</span> Continue with Google</>}
        </button>
        <p className="site-admin-login-note">Only the verified owner account can open this area.</p>
      </div>
    </div>
  </div>;
}
