/* Code Studio editor (WordPress) — redesigned UI (same as standalone/public/editor.js) on top of the
   unchanged banner engine (data model, embed code, import). Saves through the WordPress REST API. */
(function(){
  var DATA = window.JCS_EDITOR_DATA || {};
  var STUDIO = DATA.settings || {};
  function studioColor(key, fallback){ return STUDIO[key] || fallback; }
  function fontLibrary(){
    var raw = String(STUDIO.fonts || 'Oswald\nInter\nArial\nGeorgia');
    var seen = {};
    return raw.split(/[\r\n,]+/).map(function(x){return x.trim();}).filter(function(x){ if(!x || seen[x.toLowerCase()]) return false; seen[x.toLowerCase()]=1; return true; });
  }
  function populateFontSelects(){
    var fonts=fontLibrary();
    ['fHeadingFont','fBodyFont','fEyebrowFont','fButtonFont'].forEach(function(id){
      var select=document.getElementById(id); if(!select) return; select.innerHTML='';
      fonts.forEach(function(font){ var o=document.createElement('option'); o.value=font; o.textContent=font; o.style.fontFamily='\"'+font+'\",sans-serif'; select.appendChild(o); });
    });
  }
  function googleFontsLink(){
    var system={'arial':1,'georgia':1,'impact':1,'verdana':1,'tahoma':1,'trebuchet ms':1,'times new roman':1,'courier new':1,'system-ui':1};
    var used={};
    slides.forEach(function(s){ ['headingFont','bodyFont','eyebrowFont','buttonFont'].forEach(function(k){ var f=s[k]; if(f && !system[String(f).toLowerCase()]) used[f]=1; }); });
    var families=Object.keys(used).map(function(f){ return 'family='+encodeURIComponent(f)+':wght@400;500;600;700;800;900'; });
    return families.length ? '<link href="https://fonts.googleapis.com/css2?'+families.join('&')+'&display=swap" rel="stylesheet">\n' : '';
  }

  // ---------- data model (mirrors JCS_Render::defaults() in PHP) ----------
  function defaultGradient(){
    return { type:'linear', angle:90, radialX:0, radialY:50, stops:[
      {pos:0, color:'#000000', opacity:0.82},{pos:32, color:'#000000', opacity:0.60},
      {pos:60, color:'#000000', opacity:0.15},{pos:78, color:'#000000', opacity:0}
    ]};
  }
  function defaults(){
    return {
      eyebrow:'', heading:'', subheading:'', buttonText:'', buttonUrl:'#', buttonNewTab:false, altText:'',
      desktopImage:'', mobileImage:'', desktopBgLink:'', mobileBgLink:'', desktopBgNewTab:false, mobileBgNewTab:false, showContent:true, mobileShowContent:true, bgColor:'#ffffff',
      overlayType:'none', overlayColor:'#000000', overlayOpacity:30, overlayBlendMode:'normal', overlayImage:'',
      desktopFit:'width', desktopAttachment:'scroll', contentSide:'left', mobileContentSide:'left',
      desktopX:50, desktopY:50, desktopZoom:100, mobileX:50, mobileY:23, mobileWidth:100,
      gradient:Object.assign(defaultGradient(), {type:'off'}), mobileGradient:Object.assign(defaultGradient(), {type:'off'}),
      headingColor:'#1a1a1a', subColor:'#444444',
      eyebrowBg:studioColor('eyebrow_bg','#3157DF'), eyebrowColor:'#ffffff', eyebrowBgEnabled:true, eyebrowOpacity:100, eyebrowPadX:12, eyebrowPadY:5,
      buttonBg:studioColor('button_bg','#3157DF'), buttonColor:'#ffffff', buttonBgEnabled:true, buttonOpacity:100, buttonPadX:30, buttonHeight:48,
      arrowBg:'#000000', arrowBgOpacity:45, arrowIconColor:'#ffffff', arrowBorderColor:'#ffffff', arrowBorderOpacity:35, dashColor:studioColor('dash_color','#3157DF'),
      headingFont:'Oswald', bodyFont:'Inter', eyebrowFont:'Oswald', buttonFont:'Oswald', headingWeight:700, bodyWeight:400, eyebrowWeight:600, buttonWeight:700, eyebrowSize:12, headingSize:46, subSize:16, buttonFontSize:14, contentWidth:480,
      mobileEyebrowSize:12, mobileHeadingSize:34, mobileSubSize:16, mobileButtonFontSize:14, mobileContentWidth:480,
      textAlign:'left', mobileTextAlign:'left', eyebrowLetterSpacing:2.2, headingLetterSpacing:0, subLetterSpacing:0, buttonLetterSpacing:.6, mobileEyebrowLetterSpacing:2.2, mobileHeadingLetterSpacing:0, mobileSubLetterSpacing:0, mobileButtonLetterSpacing:.6,
      eyebrowShiftX:0, eyebrowShiftY:0, headingShiftX:0, headingShiftY:0, subShiftX:0, subShiftY:0, buttonShiftX:0, buttonShiftY:0, buttonWidth:0,
      mobileEyebrowShiftX:0, mobileEyebrowShiftY:0, mobileHeadingShiftX:0, mobileHeadingShiftY:0, mobileSubShiftX:0, mobileSubShiftY:0, mobileButtonShiftX:0, mobileButtonShiftY:0, mobileButtonWidth:0,
      headingLineHeight:1.1, subLineHeight:1.55, eyebrowRadius:2, buttonRadius:2,
      buttonHoverEnabled:false, buttonHoverBg:'#1a1a1a', buttonHoverColor:'#ffffff',
      eyebrowShadowEnabled:false, eyebrowShadowColor:'#000000', eyebrowShadowOpacity:25, eyebrowShadowBlur:8, eyebrowShadowY:2,
      buttonShadowEnabled:false, buttonShadowColor:'#000000', buttonShadowOpacity:25, buttonShadowBlur:12, buttonShadowY:4,
      contentAlign:'center', contentPadding:64, contentShiftX:0, contentShiftY:0,
      mobileContentAlign:'center', mobileContentPadding:64, mobileContentShiftX:0, mobileContentShiftY:0,
      gapEyebrow:20, gapHeading:16, gapSub:28, mobileGapEyebrow:20, mobileGapHeading:16, mobileGapSub:28,
      contentBgEnabled:false, contentBgColor:'#ffffff', contentBgOpacity:100, contentBgPadding:24, contentBgRadius:8,
      mobileContentBgEnabled:false, mobileContentBgColor:'#ffffff', mobileContentBgOpacity:100, mobileContentBgPadding:24, mobileContentBgRadius:8,
      contentBgShadowEnabled:false, contentBgShadowColor:'#000000', contentBgShadowOpacity:20, contentBgShadowBlur:24, contentBgShadowY:10,
      mobileContentBgShadowEnabled:false, mobileContentBgShadowColor:'#000000', mobileContentBgShadowOpacity:20, mobileContentBgShadowBlur:24, mobileContentBgShadowY:10,
      desktopHeight:490, mobileHeight:620, autoplay:5200, pauseHover:true,
      bannerRadius:0, mobileBannerRadius:null, mobileBreakpoint:900, resetHostPadding:true
    };
  }

  var slides = (Array.isArray(DATA.slides) && DATA.slides.length) ? DATA.slides : [defaults()];
  slides.forEach(function(s){
    var d=defaults();
    Object.keys(d).forEach(function(k){ if(s[k]===undefined || s[k]===null) s[k]=d[k]; });

    // One-time migration for older banners whose mobile view was left at the old blank defaults.
    // If desktop has real design content but mobile has never been intentionally configured,
    // start mobile from the desktop design and give the background a usable portrait framing.
    var hasDesktopDesign = !!(
      s.desktopImage ||
      s.eyebrow ||
      s.heading ||
      s.subheading ||
      s.buttonText ||
      (s.gradient && s.gradient.type && s.gradient.type!=='off')
    );
    var legacyMobileDefaults = !s.mobileSeededFromDesktop &&
      s.mobileGradient && s.mobileGradient.type==='off' &&
      Number(s.mobileX)===50 && Number(s.mobileY)===23 && Number(s.mobileWidth)===100;

    if(hasDesktopDesign && legacyMobileDefaults){
      s.mobileGradient = JSON.parse(JSON.stringify(s.gradient || defaultGradient()));
      s.mobileContentSide = s.contentSide;
      s.mobileTextAlign = s.textAlign;
      s.mobileContentAlign = s.contentAlign;
      s.mobileContentPadding = s.contentPadding;
      s.mobileContentShiftX = s.contentShiftX;
      s.mobileContentShiftY = s.contentShiftY;
      s.mobileGapEyebrow = s.gapEyebrow;
      s.mobileGapHeading = s.gapHeading;
      s.mobileGapSub = s.gapSub;
      s.mobileContentWidth = s.contentWidth;

      s.mobileEyebrowSize = s.eyebrowSize;
      s.mobileHeadingSize = s.headingSize;
      s.mobileSubSize = s.subSize;
      s.mobileButtonFontSize = s.buttonFontSize;
      s.mobileEyebrowLetterSpacing = s.eyebrowLetterSpacing;
      s.mobileHeadingLetterSpacing = s.headingLetterSpacing;
      s.mobileSubLetterSpacing = s.subLetterSpacing;
      s.mobileButtonLetterSpacing = s.buttonLetterSpacing;

      s.mobileEyebrowShiftX = s.eyebrowShiftX;
      s.mobileEyebrowShiftY = s.eyebrowShiftY;
      s.mobileHeadingShiftX = s.headingShiftX;
      s.mobileHeadingShiftY = s.headingShiftY;
      s.mobileSubShiftX = s.subShiftX;
      s.mobileSubShiftY = s.subShiftY;
      s.mobileButtonShiftX = s.buttonShiftX;
      s.mobileButtonShiftY = s.buttonShiftY;
      s.mobileButtonWidth = s.buttonWidth;

      s.mobileContentBgEnabled = s.contentBgEnabled;
      s.mobileContentBgColor = s.contentBgColor;
      s.mobileContentBgOpacity = s.contentBgOpacity;
      s.mobileContentBgPadding = s.contentBgPadding;
      s.mobileContentBgRadius = s.contentBgRadius;
      s.mobileContentBgShadowEnabled = s.contentBgShadowEnabled;
      s.mobileContentBgShadowColor = s.contentBgShadowColor;
      s.mobileContentBgShadowOpacity = s.contentBgShadowOpacity;
      s.mobileContentBgShadowBlur = s.contentBgShadowBlur;
      s.mobileContentBgShadowY = s.contentBgShadowY;

      // Portrait starting point: center the artwork, move it slightly upward,
      // and enlarge contained/width-based desktop artwork so mobile isn't mostly blank.
      s.mobileX = 50;
      s.mobileY = 38;
      s.mobileWidth = (s.desktopFit==='contain' || s.desktopFit==='width') ? 150 : 120;
      s.mobileSeededFromDesktop = true;
    }
  });
  var instanceId = 'jcs' + (DATA.postId || Math.random().toString(36).slice(2,8));
  var bannerRoot = null; // slide that holds banner-wide settings while the canvas renders a single slide
  function bannerSettings(){
    var b = bannerRoot || slides[0] || {};
    var r = Math.max(0, Number(b.bannerRadius) || 0);
    var mr = (b.mobileBannerRadius === null || b.mobileBannerRadius === '' || typeof b.mobileBannerRadius === 'undefined') ? r : Math.max(0, Number(b.mobileBannerRadius) || 0);
    var bp = Math.max(320, Math.min(2000, Number(b.mobileBreakpoint) || 900));
    return { radius:r, mobileRadius:mr, breakpoint:bp, resetHostPadding: b.resetHostPadding !== false };
  }
  // ---------- badges (optional; banners without badges export exactly as before) ----------
  function badgeDefaults(){
    return { label:'New badge', label2:'', bg:studioColor('badge_bg', studioColor('button_bg','#D70015')), bgOpacity:100, color:'#ffffff', font:'Oswald', weight:700,
      size:22, size2:16, mSize:16, mSize2:12, align:'left', radius:0, padX:16, padY:10, rotate:0, shadow:false,
      url:'', newTab:false, showDesktop:true, showPhone:true, x:70, y:70, mx:50, my:80 };
  }
  function hasBadges(list){ return (list||slides).some(function(s){ return s && Array.isArray(s.badges) && s.badges.length; }); }
  function badgeMarkup(s){
    if(!Array.isArray(s.badges) || !s.badges.length) return '';
    return s.badges.map(function(b0, bi){
      var b = Object.assign(badgeDefaults(), b0);
      var tag = b.url ? 'a' : 'div';
      var link = b.url ? ' href="'+esc(b.url)+'"'+(b.newTab?' target="_blank" rel="noopener noreferrer"':'') : '';
      var shadow = b.shadow ? '0 6px 18px rgba(0,0,0,.35)' : 'none';
      return '      <'+tag+' class="csx-badge" data-badge="'+bi+'"'+link+' style="left:'+b.x+'%;top:'+b.y+'%;--jcs-m-left:'+b.mx+'%;--jcs-m-top:'+b.my+'%;' +
        'background:rgba('+hexRgb(b.bg)+','+(b.bgOpacity/100)+')!important;color:'+b.color+'!important;font-family:'+b.font+',sans-serif!important;font-weight:'+b.weight+'!important;' +
        'padding:'+b.padY+'px '+b.padX+'px;border-radius:'+b.radius+'px;text-align:'+b.align+';align-items:'+(b.align==='center'?'center':(b.align==='right'?'flex-end':'flex-start'))+';' +
        'box-shadow:'+shadow+';--jcs-b-rot:'+(Number(b.rotate)||0)+'deg;--jcs-bd:'+(b.showDesktop===false?'none':'flex')+';--jcs-bm:'+(b.showPhone===false?'none':'flex')+';--jcs-m-s1:'+b.mSize+'px;--jcs-m-s2:'+b.mSize2+'px;">' +
        '<span class="csx-badge-1" style="font-size:'+b.size+'px">'+esc(b.label)+'</span>' +
        (b.label2 ? '<span class="csx-badge-2" style="font-size:'+b.size2+'px">'+esc(b.label2)+'</span>' : '') +
        '</'+tag+'>\n';
    }).join('');
  }
  function badgeCss(bs){
    if(!hasBadges()) return '';
    var r = '#'+instanceId;
    return r+' .csx-badge{position:absolute!important;z-index:6!important;display:var(--jcs-bd,flex)!important;flex-direction:column;gap:2px;margin:0!important;line-height:1.1!important;white-space:nowrap;text-decoration:none!important;box-sizing:border-box;transform:translate(-50%,-50%) rotate(var(--jcs-b-rot,0deg));pointer-events:none}\n' +
      r+' a.csx-badge{pointer-events:auto;cursor:pointer}\n' +
      r+' .csx-badge-1,'+r+' .csx-badge-2{display:block;color:inherit!important;font:inherit;line-height:1.1}\n' +
      r+' .csx-badge-2{font-weight:600}\n' +
      '@media(max-width:'+bs.breakpoint+'px){'+r+' .csx-badge{left:var(--jcs-m-left)!important;top:var(--jcs-m-top)!important;display:var(--jcs-bm,flex)!important}'+r+' .csx-badge-1{font-size:var(--jcs-m-s1)!important}'+r+' .csx-badge-2{font-size:var(--jcs-m-s2)!important}}\n';
  }
  // ---------- search engines (optional; off = exports exactly as before) ----------
  function preloadLinks(bs){
    var s0 = bannerRoot || slides[0];
    if(!s0 || !s0.seoPreload || !s0.desktopImage) return '';
    var m = s0.mobileImage || s0.desktopImage;
    return '<link rel="preload" as="image" href="'+esc(s0.desktopImage)+'" media="(min-width:'+(bs.breakpoint+1)+'px)" fetchpriority="high">\n' +
      '<link rel="preload" as="image" href="'+esc(m)+'" media="(max-width:'+bs.breakpoint+'px)" fetchpriority="high">\n';
  }
  function headingOpen(s){ var h = s.headingTag; return (h==='h1'||h==='h2'||h==='h3') ? '<'+h+' class="csx-heading"' : '<div role="heading" aria-level="2" class="csx-heading"'; }
  function headingClose(s){ var h = s.headingTag; return (h==='h1'||h==='h2'||h==='h3') ? '</'+h+'>' : '</div>'; }
  function setBannerSetting(key, value){ slides.forEach(function(sl){ sl[key] = value; }); markDirty(); renderAll(); }
  var active=0, mode='desktop', selectedStop=0, dirty=false, localeOps=[];

  function cur(){ return slides[active]; }
  function deviceKey(base){ return mode==='mobile' ? 'mobile'+base.charAt(0).toUpperCase()+base.slice(1) : base; }
  function curVal(base){ return cur()[deviceKey(base)]; }
  function setVal(base, value){ cur()[deviceKey(base)] = value; markDirty(); }
  function curGradient(){
    var s = cur();
    if(!s.mobileGradient){ s.mobileGradient = JSON.parse(JSON.stringify(s.gradient || defaultGradient())); }
    if(!s.gradient){ s.gradient = defaultGradient(); }
    return mode==='desktop' ? s.gradient : s.mobileGradient;
  }
  function esc(str){ return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function hexRgb(hex){
    var h=(hex||'#000000').replace('#','');
    if(h.length===3) h=h.split('').map(function(x){return x+x;}).join('');
    return parseInt(h.slice(0,2),16)+','+parseInt(h.slice(2,4),16)+','+parseInt(h.slice(4,6),16);
  }
  function gradientCssFromStops(stops){
    var sorted = stops.slice().sort(function(a,b){return a.pos-b.pos;});
    return sorted.map(function(s){ return 'rgba('+hexRgb(s.color)+','+s.opacity.toFixed(2)+') '+s.pos+'%'; }).join(', ');
  }
  function gradientCss(g){
    if(g.type==='off') return 'none';
    var stopsCss = gradientCssFromStops(g.stops);
    if(g.type==='radial') return 'radial-gradient(circle at '+g.radialX+'% '+g.radialY+'%, '+stopsCss+')';
    return 'linear-gradient('+g.angle+'deg, '+stopsCss+')';
  }

  function normalizeStoredText(value){
    var text = value == null ? '' : String(value);
    text = text.replace(/\r\n?/g,'\n');
    // Preserve real line breaks, and recover escaped line breaks from imported JSON/code.
    text = text.replace(/\\n/g,'\n');
    // Repair the specific legacy import corruption where "\n&" was flattened to "n&".
    text = text.replace(/([A-Za-z0-9,.;:!?])n&\s*/g,'$1 & ');
    return text;
  }

  // ---------- portable code export (self-contained — no dependency on this plugin) ----------
  function slideMarkup(s, i){
    var g = s.gradient || defaultGradient();
    var mg = s.mobileGradient || JSON.parse(JSON.stringify(g));
    var scrimD = g.type==='off' ? 'transparent' : gradientCss(g);
    var scrimM = mg.type==='off' ? 'transparent' : gradientCss(mg);
    function justifyOf(side){ return side==='right' ? 'flex-end' : (side==='center' ? 'center' : 'flex-start'); }
    function alignTextOf(side){ return side==='right' ? 'right' : (side==='center' ? 'center' : 'left'); }
    var justifyD = justifyOf(s.contentSide), alignTextD = s.textAlign || alignTextOf(s.contentSide);
    var mSide = s.mobileContentSide != null ? s.mobileContentSide : s.contentSide;
    var justifyM = justifyOf(mSide), alignTextM = s.mobileTextAlign || alignTextOf(mSide);
    var mAlign = s.mobileContentAlign != null ? s.mobileContentAlign : s.contentAlign;
    var mPad = s.mobileContentPadding != null ? s.mobileContentPadding : s.contentPadding;
    var mShiftX = s.mobileContentShiftX || 0, mShiftY = s.mobileContentShiftY || 0;
    var mGapEyebrow = s.mobileGapEyebrow != null ? s.mobileGapEyebrow : s.gapEyebrow;
    var mGapHeading = s.mobileGapHeading != null ? s.mobileGapHeading : s.gapHeading;
    var mGapSub = s.mobileGapSub != null ? s.mobileGapSub : s.gapSub;
    var mHeadingSize = s.mobileHeadingSize != null ? s.mobileHeadingSize : Math.round(s.headingSize*0.74);
    var mSubSize = s.mobileSubSize != null ? s.mobileSubSize : s.subSize;
    var mEyebrowSize = s.mobileEyebrowSize != null ? s.mobileEyebrowSize : s.eyebrowSize;
    var mButtonFontSize = s.mobileButtonFontSize != null ? s.mobileButtonFontSize : s.buttonFontSize;
    var mContentWidth = s.mobileContentWidth != null ? s.mobileContentWidth : s.contentWidth;

    var cBgD = s.contentBgEnabled ? 'rgba('+hexRgb(s.contentBgColor)+','+(s.contentBgOpacity/100)+')' : 'transparent';
    var cPadD = s.contentBgEnabled ? s.contentBgPadding : 0;
    var cRadD = s.contentBgEnabled ? s.contentBgRadius : 0;
    var cShadowD = s.contentBgShadowEnabled ? ('0 '+s.contentBgShadowY+'px '+s.contentBgShadowBlur+'px rgba('+hexRgb(s.contentBgShadowColor)+','+(s.contentBgShadowOpacity/100)+')') : 'none';
    var mBgEnabled = s.mobileContentBgEnabled != null ? s.mobileContentBgEnabled : s.contentBgEnabled;
    var mBgColor = s.mobileContentBgColor != null ? s.mobileContentBgColor : s.contentBgColor;
    var mBgOpacity = s.mobileContentBgOpacity != null ? s.mobileContentBgOpacity : s.contentBgOpacity;
    var mBgPadding = s.mobileContentBgPadding != null ? s.mobileContentBgPadding : s.contentBgPadding;
    var mBgRadius = s.mobileContentBgRadius != null ? s.mobileContentBgRadius : s.contentBgRadius;
    var mShadowEnabled = s.mobileContentBgShadowEnabled != null ? s.mobileContentBgShadowEnabled : s.contentBgShadowEnabled;
    var mShadowColor = s.mobileContentBgShadowColor != null ? s.mobileContentBgShadowColor : s.contentBgShadowColor;
    var mShadowOpacity = s.mobileContentBgShadowOpacity != null ? s.mobileContentBgShadowOpacity : s.contentBgShadowOpacity;
    var mShadowBlur = s.mobileContentBgShadowBlur != null ? s.mobileContentBgShadowBlur : s.contentBgShadowBlur;
    var mShadowY = s.mobileContentBgShadowY != null ? s.mobileContentBgShadowY : s.contentBgShadowY;
    var cBgM = mBgEnabled ? 'rgba('+hexRgb(mBgColor)+','+(mBgOpacity/100)+')' : 'transparent';
    var cPadM = mBgEnabled ? mBgPadding : 0, cRadM = mBgEnabled ? mBgRadius : 0;
    var cShadowM = mShadowEnabled ? ('0 '+mShadowY+'px '+mShadowBlur+'px rgba('+hexRgb(mShadowColor)+','+(mShadowOpacity/100)+')') : 'none';

    var eyebrowShadow = s.eyebrowShadowEnabled ? ('0 '+s.eyebrowShadowY+'px '+s.eyebrowShadowBlur+'px rgba('+hexRgb(s.eyebrowShadowColor)+','+(s.eyebrowShadowOpacity/100)+')') : 'none';
    var buttonShadow = s.buttonShadowEnabled ? ('0 '+s.buttonShadowY+'px '+s.buttonShadowBlur+'px rgba('+hexRgb(s.buttonShadowColor)+','+(s.buttonShadowOpacity/100)+')') : 'none';

    var isFixed = s.desktopAttachment === 'fixed';
    var deskBgSize = s.desktopFit==='width' ? '100% auto' : (s.desktopFit==='contain' ? 'contain' : (s.desktopFit==='custom' ? (s.desktopZoom+'% auto') : 'cover'));
    var pictureStyle = ' style="background-image:url(\''+esc(s.desktopImage)+'\');background-size:'+deskBgSize+';background-position:'+s.desktopX+'% '+s.desktopY+'%;background-attachment:'+(isFixed?'fixed':'scroll')+';background-repeat:no-repeat;--jcs-mobile-bg:url(\''+esc(s.mobileImage||s.desktopImage)+'\');--jcs-mobile-bg-size:'+s.mobileWidth+'% auto;--jcs-mobile-bg-pos:'+s.mobileX+'% '+s.mobileY+'%;"';
    var overlayCss = '';
    if(s.overlayType==='color'){ overlayCss = 'display:block;opacity:'+(s.overlayOpacity/100)+';mix-blend-mode:'+s.overlayBlendMode+';background-color:'+s.overlayColor+';'; }
    else if(s.overlayType==='image' && s.overlayImage){ overlayCss = 'display:block;opacity:'+(s.overlayOpacity/100)+';mix-blend-mode:'+s.overlayBlendMode+';background-image:url(\''+esc(s.overlayImage)+'\');background-size:cover;background-position:center;background-repeat:no-repeat;'; }
    var hoverStyle = s.buttonHoverEnabled
      ? '<style>#'+instanceId+' .'+instanceId+'-slide[data-slide="'+i+'"] .csx-button:hover{background:'+s.buttonHoverBg+'!important;color:'+s.buttonHoverColor+'!important;}</style>\n      '
      : '';

    return '\n    <article class="csx-slide '+instanceId+'-slide'+(i===0?' is-active':'')+'" data-slide="'+i+'" style="background-color:'+(s.bgColor||'#0a0a0a')+';">\n' +
      '      '+hoverStyle+'<div class="csx-bg" data-attachment="'+(isFixed?'fixed':'scroll')+'"'+pictureStyle+'></div>\n' +
      (s.desktopBgLink ? '      <a class="csx-bg-link csx-bg-link-desktop" href="'+esc(s.desktopBgLink)+'"'+(s.desktopBgNewTab?' target="_blank" rel="noopener noreferrer"':'')+' aria-label="'+esc(s.altText||'Open banner link')+'"></a>\n' : '') +
      (s.mobileBgLink ? '      <a class="csx-bg-link csx-bg-link-mobile" href="'+esc(s.mobileBgLink)+'"'+(s.mobileBgNewTab?' target="_blank" rel="noopener noreferrer"':'')+' aria-label="'+esc(s.altText||'Open banner link')+'"></a>\n' : '') +
      '      <div class="csx-overlay" style="'+overlayCss+'"></div>\n' +
      '      <div class="csx-scrim" style="--jcs-scrim-d:'+scrimD+';--jcs-scrim-m:'+scrimM+';background:var(--jcs-scrim-d);"></div>\n' +
      '      <div class="csx-inner" style="justify-content:'+justifyD+';align-items:'+s.contentAlign+';padding-left:'+s.contentPadding+'px;padding-right:'+s.contentPadding+'px;--jcs-m-justify:'+justifyM+';--jcs-m-align:'+mAlign+';--jcs-m-pad:'+mPad+'px;">\n' +
      '        <div class="csx-content" style="display:'+(s.showContent===false?'none':'block')+';--jcs-mobile-display:'+(s.mobileShowContent===false?'none':'block')+';width:min('+s.contentWidth+'px,98%);text-align:'+alignTextD+';transform:translate('+s.contentShiftX+'px,'+s.contentShiftY+'px);background:'+cBgD+';padding:'+cPadD+'px;border-radius:'+cRadD+'px;box-shadow:'+cShadowD+';--jcs-m-text-align:'+alignTextM+';--jcs-m-shiftx:'+mShiftX+'px;--jcs-m-shifty:'+mShiftY+'px;--jcs-m-width:'+mContentWidth+'px;--jcs-m-content-bg:'+cBgM+';--jcs-m-content-pad:'+cPadM+'px;--jcs-m-content-radius:'+cRadM+'px;--jcs-m-content-shadow:'+cShadowM+';">\n' +
      '          <span class="csx-eyebrow" style="background:'+(s.eyebrowBgEnabled===false?'transparent':'rgba('+hexRgb(s.eyebrowBg)+','+(s.eyebrowOpacity/100)+')')+'!important;color:'+s.eyebrowColor+'!important;padding:'+s.eyebrowPadY+'px '+s.eyebrowPadX+'px!important;font-family:'+s.eyebrowFont+',sans-serif!important;font-weight:'+s.eyebrowWeight+'!important;font-size:'+s.eyebrowSize+'px;line-height:1.05!important;letter-spacing:'+s.eyebrowLetterSpacing+'px;transform:translate('+s.eyebrowShiftX+'px,'+s.eyebrowShiftY+'px);--jcs-m-size:'+mEyebrowSize+'px;--jcs-m-letter:'+s.mobileEyebrowLetterSpacing+'px;--jcs-m-shiftx:'+s.mobileEyebrowShiftX+'px;--jcs-m-shifty:'+s.mobileEyebrowShiftY+'px;border-radius:'+s.eyebrowRadius+'px;box-shadow:'+eyebrowShadow+';margin-bottom:'+s.gapEyebrow+'px;--jcs-m-gap:'+mGapEyebrow+'px;">'+esc(s.eyebrow)+'</span>\n' +
      '          '+headingOpen(s)+' style="color:'+s.headingColor+'!important;font-family:'+s.headingFont+',sans-serif!important;font-weight:'+s.headingWeight+'!important;font-size:'+s.headingSize+'px;letter-spacing:'+s.headingLetterSpacing+'px;transform:translate('+s.headingShiftX+'px,'+s.headingShiftY+'px);--jcs-m-letter:'+s.mobileHeadingLetterSpacing+'px;--jcs-m-shiftx:'+s.mobileHeadingShiftX+'px;--jcs-m-shifty:'+s.mobileHeadingShiftY+'px;line-height:'+s.headingLineHeight+';margin-bottom:'+s.gapHeading+'px;--jcs-m-gap:'+mGapHeading+'px;--jcs-m-size:'+mHeadingSize+'px;">'+esc(normalizeStoredText(s.heading)).replace(/\n/g,'<br>')+headingClose(s)+'\n' +
      '          <div class="csx-sub" style="color:'+s.subColor+'!important;font-family:'+s.bodyFont+',sans-serif!important;font-weight:'+s.bodyWeight+'!important;font-size:'+s.subSize+'px;letter-spacing:'+s.subLetterSpacing+'px;transform:translate('+s.subShiftX+'px,'+s.subShiftY+'px);--jcs-m-letter:'+s.mobileSubLetterSpacing+'px;--jcs-m-shiftx:'+s.mobileSubShiftX+'px;--jcs-m-shifty:'+s.mobileSubShiftY+'px;line-height:'+s.subLineHeight+';margin-bottom:'+s.gapSub+'px;--jcs-m-gap:'+mGapSub+'px;--jcs-m-size:'+mSubSize+'px;">'+esc(normalizeStoredText(s.subheading)).replace(/\n/g,'<br>')+'</div>\n' +
      '          <a href="'+esc(s.buttonUrl)+'"'+(s.buttonNewTab?' target="_blank" rel="noopener noreferrer"':'')+' class="csx-button" style="background:'+(s.buttonBgEnabled===false?'transparent':'rgba('+hexRgb(s.buttonBg)+','+(s.buttonOpacity/100)+')')+'!important;color:'+s.buttonColor+'!important;padding:0 '+s.buttonPadX+'px!important;font-family:'+s.buttonFont+',sans-serif!important;font-weight:'+s.buttonWeight+'!important;font-size:'+s.buttonFontSize+'px;line-height:1!important;letter-spacing:'+s.buttonLetterSpacing+'px;transform:translate('+s.buttonShiftX+'px,'+s.buttonShiftY+'px);width:'+(s.buttonWidth>0?s.buttonWidth+'px':'auto')+';--jcs-m-size:'+mButtonFontSize+'px;--jcs-m-letter:'+s.mobileButtonLetterSpacing+'px;--jcs-m-shiftx:'+s.mobileButtonShiftX+'px;--jcs-m-shifty:'+s.mobileButtonShiftY+'px;--jcs-m-width:'+(s.mobileButtonWidth>0?s.mobileButtonWidth+'px':'auto')+';min-height:'+s.buttonHeight+'px;border-radius:'+s.buttonRadius+'px;box-shadow:'+buttonShadow+';transition:background .15s ease, color .15s ease;">'+esc(s.buttonText)+'</a>\n' +
      '        </div>\n' +
      '      </div>\n' + badgeMarkup(s) +
      '    </article>';
  }

  function generateCode(){
    var s0 = slides[0];
    var bs = bannerSettings();
    var slideHtml = slides.map(slideMarkup).join('\n');
    return '<!-- Built with Justinnovate Code Studio — self-contained, paste anywhere -->\n' +
'<!-- JCS-PROJECT-DATA-BEGIN\n'+JSON.stringify(slides).replace(/</g,'\\u003c')+'\nJCS-PROJECT-DATA-END -->\n' +
'<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
googleFontsLink() + preloadLinks(bs) + '\n' +
'<section class="csx-banner-root'+(slides.length<=1?' csx-single-slide':'')+'" id="'+instanceId+'" style="--jcs-desktop-height:'+s0.desktopHeight+'px;--jcs-mobile-height:'+s0.mobileHeight+'px;--jcs-radius-d:'+bs.radius+'px;--jcs-radius-m:'+bs.mobileRadius+'px;" aria-roledescription="carousel" aria-label="Featured">\n' +
'  <div class="csx-track">'+slideHtml+'\n  </div>\n' +
(slides.length>1 ?
'  <button type="button" class="jcsx-nav jcsx-nav-prev" aria-label="Previous slide" style="position:absolute!important;display:flex!important;align-items:center!important;justify-content:center!important;top:50%!important;left:20px!important;right:auto!important;transform:translateY(-50%)!important;z-index:7!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;margin:0!important;padding:0!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;max-width:44px!important;max-height:44px!important;border-radius:9999px!important;background:rgba('+hexRgb(s0.arrowBg)+','+(s0.arrowBgOpacity/100)+')!important;border:1px solid rgba('+hexRgb(s0.arrowBorderColor)+','+(s0.arrowBorderOpacity/100)+')!important;color:'+s0.arrowIconColor+'!important;font:400 28px/1 Arial,sans-serif!important;text-indent:0!important;text-transform:none!important;appearance:none!important;-webkit-appearance:none!important;cursor:pointer!important;">&#8249;</button>\n' +
'  <button type="button" class="jcsx-nav jcsx-nav-next" aria-label="Next slide" style="position:absolute!important;display:flex!important;align-items:center!important;justify-content:center!important;top:50%!important;right:20px!important;left:auto!important;transform:translateY(-50%)!important;z-index:7!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;margin:0!important;padding:0!important;width:44px!important;height:44px!important;min-width:44px!important;min-height:44px!important;max-width:44px!important;max-height:44px!important;border-radius:9999px!important;background:rgba('+hexRgb(s0.arrowBg)+','+(s0.arrowBgOpacity/100)+')!important;border:1px solid rgba('+hexRgb(s0.arrowBorderColor)+','+(s0.arrowBorderOpacity/100)+')!important;color:'+s0.arrowIconColor+'!important;font:400 28px/1 Arial,sans-serif!important;text-indent:0!important;text-transform:none!important;appearance:none!important;-webkit-appearance:none!important;cursor:pointer!important;">&#8250;</button>\n' +
'  <div class="csx-dash-track"></div>\n' : '') +
'</section>\n\n' +
'<style>\n' +
'#'+instanceId+'{position:relative;width:100%;height:var(--jcs-desktop-height,490px);min-height:0!important;overflow:hidden!important;background:#000;font-family:Inter,sans-serif;isolation:isolate;box-sizing:border-box;margin:0!important;padding:0!important;border-radius:var(--jcs-radius-d,0px)!important}\n' +
'#'+instanceId+' *,'+'#'+instanceId+' *::before,'+'#'+instanceId+' *::after{box-sizing:border-box!important}\n' +
'#'+instanceId+' .csx-heading,#'+instanceId+' .csx-sub,#'+instanceId+' .csx-eyebrow,#'+instanceId+' .csx-button{font-style:normal!important;text-indent:0!important;text-transform:none!important;text-decoration:none!important;max-width:none!important;float:none!important;position:relative!important;white-space:normal!important;vertical-align:baseline!important}\n' +
'#'+instanceId+' .csx-heading,#'+instanceId+' .csx-sub{padding:0!important;border:0!important;background:transparent!important}\n' +
   '#'+instanceId+' .csx-eyebrow{line-height:1.05!important}\n' +
   '#'+instanceId+' .csx-button{line-height:1!important}\n' +
'#'+instanceId+' .jcsx-nav{display:flex!important;position:absolute!important;top:50%!important;transform:translateY(-50%)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;z-index:7!important;align-items:center!important;justify-content:center!important;margin:0!important;padding:0!important;min-width:44px!important;max-width:44px!important;width:44px!important;min-height:44px!important;max-height:44px!important;height:44px!important;aspect-ratio:1/1!important;border-style:solid!important;border-width:1px!important;border-radius:9999px!important;font-family:Arial,sans-serif!important;font-weight:400!important;font-size:28px!important;line-height:1!important;letter-spacing:0!important;white-space:nowrap!important;overflow:hidden!important;appearance:none!important;-webkit-appearance:none!important}\n' +
'#'+instanceId+' .jcsx-nav::before,#'+instanceId+' .jcsx-nav::after{content:none!important;display:none!important}\n' +
'#'+instanceId+' .csx-bg-link{position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;text-decoration:none!important;z-index:3!important;cursor:pointer!important}\n' +
'#'+instanceId+' .csx-bg-link::before,#'+instanceId+' .csx-bg-link::after{content:none!important;display:none!important}\n' +
'#'+instanceId+' .csx-track{position:relative;width:100%;height:100%!important;min-height:0!important}\n' +
'#'+instanceId+' .csx-slide{position:absolute;inset:0;opacity:0;visibility:hidden;pointer-events:none;transition:opacity .6s ease}\n' +
'#'+instanceId+' .csx-slide.is-active{opacity:1;visibility:visible;pointer-events:auto}\n' +
'#'+instanceId+' .csx-bg{position:absolute!important;inset:0!important;display:block!important;width:100%!important;height:100%!important;min-height:100%!important;overflow:hidden;background-color:transparent}\n' +
'#'+instanceId+' .csx-bg-link{position:absolute;inset:0;z-index:1;display:block}\n' +
'#'+instanceId+' .csx-bg-link-mobile{display:none}\n' +
'#'+instanceId+' .csx-scrim{position:absolute;inset:0;z-index:1;pointer-events:none}\n' +
'#'+instanceId+' .csx-overlay{position:absolute;inset:0;z-index:1;pointer-events:none;display:none}\n' +
'#'+instanceId+' .csx-inner{position:relative;z-index:4;display:flex;align-items:center;height:100%;max-width:1360px;margin:auto;padding:0 64px}\n' +
'#'+instanceId+' .csx-content{color:#fff}\n' +
'#'+instanceId+' .csx-eyebrow{display:inline-block;margin-bottom:20px;padding:5px 12px;font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase}\n' +
'#'+instanceId+' .csx-heading{margin:0 0 16px!important;text-shadow:0 2px 18px rgba(0,0,0,.4)}\n' +
'#'+instanceId+' .csx-sub{margin:0 0 28px!important}\n' +
'#'+instanceId+' .csx-button{display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 30px;border-radius:2px;font-size:14px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;text-decoration:none}\n' +
'#'+instanceId+' .jcsx-nav{position:absolute!important;top:50%!important;z-index:7!important;width:44px!important;height:44px!important;border-radius:50%!important;font-size:28px!important;line-height:1!important;cursor:pointer!important;transform:translateY(-50%)!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important}\n' +
'#'+instanceId+' .jcsx-nav-prev{left:20px!important;right:auto!important}#'+instanceId+' .jcsx-nav-next{right:20px!important;left:auto!important}\n' +
'#'+instanceId+' .csx-dash-track{position:absolute;left:64px;bottom:24px;z-index:6;display:flex;gap:6px}\n' +
'#'+instanceId+' .csx-dash{width:34px;height:3px;background:rgba(255,255,255,.3);border-radius:2px;overflow:hidden;cursor:pointer}\n' +
'#'+instanceId+' .csx-dash span{display:block;width:100%;height:100%;background:'+s0.dashColor+';transform:scaleX(0);transform-origin:left}\n' +
'#'+instanceId+' .csx-dash.is-active span{transform:scaleX(1)}\n' +
'#'+instanceId+' .csx-dash.is-active.is-animating span{transition:transform '+s0.autoplay+'ms linear}\n' +
'#'+instanceId+' .csx-dash.is-filled span{transform:scaleX(1);transition:none}\n' +
'@media(max-width:'+bs.breakpoint+'px){\n' +
'  #'+instanceId+' .csx-track{height:100%!important}\n' +
'  #'+instanceId+'{height:var(--jcs-mobile-height,620px)!important;border-radius:var(--jcs-radius-m,0px)!important}\n' +
'  #'+instanceId+' .csx-bg{background-image:var(--jcs-mobile-bg)!important;background-size:var(--jcs-mobile-bg-size,100% auto)!important;background-position:var(--jcs-mobile-bg-pos,50% 23%)!important;background-attachment:scroll!important;background-repeat:no-repeat!important}\n' +
'  #'+instanceId+' .csx-bg-link-desktop{display:none!important}\n' +
'  #'+instanceId+' .csx-bg-link-mobile{display:block!important}\n' +
'  #'+instanceId+' .csx-scrim{background:var(--jcs-scrim-m)!important}\n' +
'  #'+instanceId+' .csx-inner{justify-content:var(--jcs-m-justify,flex-start)!important;align-items:var(--jcs-m-align,flex-end)!important;padding-left:var(--jcs-m-pad,26px)!important;padding-right:var(--jcs-m-pad,26px)!important;padding-bottom:60px!important}\n' +
'  #'+instanceId+' .csx-content{display:var(--jcs-mobile-display,block)!important;width:min(var(--jcs-m-width,480px),96%)!important;max-width:none!important;text-align:var(--jcs-m-text-align,left)!important;transform:translate(var(--jcs-m-shiftx,0px),var(--jcs-m-shifty,0px))!important;background:var(--jcs-m-content-bg,transparent)!important;padding:var(--jcs-m-content-pad,0px)!important;border-radius:var(--jcs-m-content-radius,0px)!important;box-shadow:var(--jcs-m-content-shadow,none)!important}\n' +
'  #'+instanceId+' .csx-eyebrow{margin-bottom:var(--jcs-m-gap)!important;font-size:var(--jcs-m-size)!important;letter-spacing:var(--jcs-m-letter)!important;transform:translate(var(--jcs-m-shiftx),var(--jcs-m-shifty))!important}\n' +
'  #'+instanceId+' .csx-heading{margin-bottom:var(--jcs-m-gap)!important;font-size:var(--jcs-m-size)!important;letter-spacing:var(--jcs-m-letter)!important;transform:translate(var(--jcs-m-shiftx),var(--jcs-m-shifty))!important}\n' +
'  #'+instanceId+' .csx-sub{margin-bottom:var(--jcs-m-gap)!important;font-size:var(--jcs-m-size)!important;letter-spacing:var(--jcs-m-letter)!important;transform:translate(var(--jcs-m-shiftx),var(--jcs-m-shifty))!important}\n' +
'  #'+instanceId+' .csx-button{font-size:var(--jcs-m-size)!important;letter-spacing:var(--jcs-m-letter)!important;transform:translate(var(--jcs-m-shiftx),var(--jcs-m-shifty))!important;width:var(--jcs-m-width)!important}\n' +
'  #'+instanceId+' .csx-dash-track{left:26px;bottom:24px}\n' +
'  #'+instanceId+' .jcsx-nav{top:auto!important;bottom:18px!important;transform:none!important}\n' +
'  #'+instanceId+' .jcsx-nav-prev{left:auto!important;right:82px!important}#'+instanceId+' .jcsx-nav-next{right:26px!important;left:auto!important}\n' +
'}\n' +
'#'+instanceId+'.csx-single-slide .jcsx-nav,#'+instanceId+'.csx-single-slide .csx-dash-track{display:none!important}\n' +
badgeCss(bs) +
'</style>\n\n' +
'<script>\n' +
'(function(){\n' +
'  var roots=document.querySelectorAll(\'[id="'+instanceId+'"]\');\n' +
'  for(var r=0;r<roots.length;r++)init(roots[r]);\n' +
'  function init(root){\n' +
'  if(!root||root.dataset.jcsInit)return; root.dataset.jcsInit="1";\n' +
(bs.resetHostPadding ? '  var hostMain=root.closest?root.closest("main#maincontent.page-main-full-width"):null;if(hostMain){hostMain.style.setProperty("padding-top","0","important");hostMain.style.setProperty("padding-bottom","0","important");}\n' : '') +
'  var track=root.querySelector(".csx-track");\n' +
'  var slides=[].slice.call(track.querySelectorAll(".csx-slide"));\n' +
'  var prev=root.querySelector(".jcsx-nav-prev"), next=root.querySelector(".jcsx-nav-next"), dashTrack=root.querySelector(".csx-dash-track");\n' +
'  if(slides.length<2||!dashTrack)return;\n' +
'  var current=0,timer=null,AUTOPLAY='+s0.autoplay+';\n' +
'  slides.forEach(function(_,i){ var d=document.createElement("div"); d.className="csx-dash"; d.innerHTML="<span></span>"; d.onclick=function(){go(i,true)}; dashTrack.appendChild(d); });\n' +
'  var dashes=[].slice.call(dashTrack.querySelectorAll(".csx-dash"));\n' +
'  function render(){\n' +
'    slides.forEach(function(s,i){s.classList.toggle("is-active",i===current)});\n' +
'    dashes.forEach(function(d,i){\n' +
'      d.classList.remove("is-active","is-filled","is-animating");\n' +
'      if(i<current)d.classList.add("is-filled");\n' +
'      else if(i===current){d.classList.add("is-active");void d.offsetWidth;if(slides.length>1)d.classList.add("is-animating")}\n' +
'    });\n' +
'  }\n' +
'  function go(i,user){current=(i+slides.length)%slides.length;render();if(user)restart()}\n' +
'  function restart(){clearInterval(timer);if(slides.length>1)timer=setInterval(function(){go(current+1,false)},AUTOPLAY)}\n' +
'  if(next)next.onclick=function(){go(current+1,true)};\n' +
'  if(prev)prev.onclick=function(){go(current-1,true)};\n' +
'  [prev,next].forEach(function(a){if(a)a.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();a.click()}}});\n' +
(s0.pauseHover ? '  root.addEventListener("mouseenter",function(){clearInterval(timer)});root.addEventListener("mouseleave",restart);\n' : '') +
'  var sx=0;\n' +
'  track.addEventListener("touchstart",function(e){sx=e.touches[0].clientX},{passive:true});\n' +
'  track.addEventListener("touchend",function(e){var dx=e.changedTouches[0].clientX-sx;if(Math.abs(dx)>40)go(dx<0?current+1:current-1,true)},{passive:true});\n' +
'  render();restart();\n' +
'  }\n' +
'})();\n' +
'<\/script>';
  }

  function previewDocument(forceHeight){
    var h = Number(forceHeight || 0);
    var forceCss = h ? '<style>html,body{height:'+h+'px!important;min-height:0!important;overflow:hidden!important;background:transparent!important}body>.csx-banner-root{height:'+h+'px!important;min-height:0!important;margin:0!important}</style>' : '';
    return '<!DOCTYPE html><html><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>Justinnovate Live Preview</title>' +
      '<style>html,body{margin:0!important;padding:0!important;background:#111!important;overflow:hidden!important;min-height:0!important}body{font-family:Inter,Arial,sans-serif}body>.csx-banner-root{margin:0!important}</style>' + forceCss +
      '</head><body>' + generateCode() +
      '<script>document.addEventListener("click",function(e){var a=e.target.closest&&e.target.closest("a[href]");if(!a)return;var h=a.getAttribute("href");if(!h||h.charAt(0)==="#")return;e.preventDefault();window.open(a.href,"_blank","noopener");},true);<\/script>' +
      '</body></html>';
  }

  function textOf(node){ return node ? node.textContent.trim() : ''; }
  function importLegacyCode(raw){
    var doc = new DOMParser().parseFromString(raw, 'text/html');
    var articles = [].slice.call(doc.querySelectorAll('.csx-slide, .jcs-hs-slide, .wa-hs-slide'));
    if(!articles.length) throw new Error('No banner slides found');
    var isWheels = !!doc.querySelector('.wa-hs-slide');
    var prefix = isWheels ? 'wa' : 'jcs';
    var rootNode = doc.querySelector('.'+prefix+'-hero-slider');
    var deskHeight = 490, mobHeight = 620, autoplay = 5200;
    if(rootNode){
      var styleAttr = rootNode.getAttribute('style') || '';
      var dh = styleAttr.match(new RegExp('--'+prefix+'-desktop-height:\\s*(\\d+)px'));
      var mh = styleAttr.match(new RegExp('--'+prefix+'-mobile-height:\\s*(\\d+)px'));
      if(dh) deskHeight = Number(dh[1]);
      if(mh) mobHeight = Number(mh[1]);
    }
    var apMatch = raw.match(/AUTOPLAY=(\d+)/);
    if(apMatch) autoplay = Number(apMatch[1]);
    return articles.map(function(article){
      var s = defaults();
      var img = article.querySelector('.'+prefix+'-hs-bg');
      var source = article.querySelector('source');
      var headingNode = article.querySelector('.'+prefix+'-hs-heading');
      var btn = article.querySelector('.'+prefix+'-hs-btn');
      s.eyebrow = textOf(article.querySelector('.'+prefix+'-hs-eyebrow'));
      s.heading = headingNode ? headingNode.innerHTML.replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,'').trim() : '';
      s.subheading = textOf(article.querySelector('.'+prefix+'-hs-sub'));
      s.buttonText = textOf(btn);
      s.buttonUrl = btn ? (btn.getAttribute('href') || '#') : '#';
      s.altText = img ? (img.getAttribute('alt') || '') : '';
      s.desktopImage = img ? (img.getAttribute('src') || '') : '';
      s.mobileImage = source ? (source.getAttribute('srcset') || s.desktopImage) : s.desktopImage;
      s.desktopHeight = deskHeight; s.mobileHeight = mobHeight; s.autoplay = autoplay;
      return s;
    });
  }

  function renderAll(){ refresh(); }
  // =====================================================================
  // NEW EDITOR UI (redesign). Everything above this line is the unchanged
  // banner engine from the WordPress Code Studio (data model, embed code,
  // import), so exported code is identical to what is already on websites.
  // =====================================================================
  function el(id){ return document.getElementById(id); }
  // ---------- WordPress: save and translate through the plugin's REST routes ----------
  if(!DATA.save && DATA.restUrl){
    DATA.save = function(payload){
      return fetch(DATA.restUrl, {
        method:'POST', credentials:'same-origin',
        headers:{ 'Content-Type':'application/json', 'X-WP-Nonce':DATA.nonce },
        body: JSON.stringify({ data:payload.data, title:payload.title, localeOps:localeOps })
      }).then(function(r){
        return r.text().then(function(text){
          var parsed; try { parsed = JSON.parse(text); } catch(e){ parsed = null; }
          if(!r.ok){ console.error('JCS save failed', r.status, text); throw new Error(parsed && parsed.message ? parsed.message : 'HTTP '+r.status); }
          localeOps = [];
          return parsed;
        });
      });
    };
  }
  if(!DATA.translate && DATA.translateUrl && DATA.language === 'fr'){
    DATA.translate = function(){
      return fetch(DATA.translateUrl, { method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json', 'X-WP-Nonce':DATA.nonce }, body: JSON.stringify({ sourceLanguage:'en' }) })
        .then(function(r){ if(!r.ok) throw new Error('HTTP '+r.status); return r.json(); })
        .then(function(res){ if(!res.data) throw new Error(res.message || 'No translation returned'); return res.data.map(function(x){ return Object.assign(defaults(), x); }); });
    };
  }
  var root = document.getElementById('jcs-root');
  var PW = 345;                 // real phone banner width on wheelsauto.com
  var deskW = 893;              // homepage hero slot; can switch to full width
  var view = 'both'; try { view = localStorage.getItem('cs-view') || 'both'; } catch(e){}
  var sel = 'content', panel = 'piece', links = {}, openGroups = {}, gDev = 'd', badgeIdx = 0;
  function curBadge(){ var b = cur().badges; return (Array.isArray(b) && b[badgeIdx]) ? b[badgeIdx] : null; }
  // the object the right panel edits: the selected badge, or the slide
  function srcObj(){ return (panel === 'piece' && sel === 'badge') ? (curBadge() || {}) : cur(); }
  var FONTS = fontLibrary();
  var WEIGHTS = [['300','300 Light'],['400','400 Regular'],['500','500 Medium'],['600','600 Semi-bold'],['700','700 Bold'],['800','800 Extra-bold'],['900','900 Black']];
  var BLENDS = ['normal','multiply','screen','overlay','darken','lighten','color-dodge','color-burn','hard-light','soft-light','difference','exclusion','hue','saturation','color','luminosity'];
  var LR = [['left','Left'],['center','Center'],['right','Right']], TB = [['flex-start','Top'],['center','Middle'],['flex-end','Bottom']];

  function markDirty(){ dirty = true; var st = el('csStatus'); if(st) st.textContent = 'Unsaved changes'; }
  function cur(){ return slides[active]; }
  function toast(msg){ var t = el('csToast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toast.t); toast.t = setTimeout(function(){ t.style.display = 'none'; }, 2200); }
  function copyText(text, label){
    var done = function(){ toast(label + ' copied'); };
    if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(text).then(done, function(){ fallback(); }); } else fallback();
    function fallback(){ var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){ toast('Copy failed'); } ta.remove(); }
  }

  // ---------- controls, grouped by the piece of the banner you are editing ----------
  // d = desktop key, p = phone key (shown side by side, with a link so Phone can follow Desktop)
  var PIECES = {
    eyebrow:{name:'Red label', hint:'The small label above the heading', groups:[
      ['Text',[{d:'eyebrow',t:'text',l:'Label text'}]],
      ['Font',[{d:'eyebrowFont',t:'font',l:'Font'},{d:'eyebrowWeight',t:'weight',l:'Weight'},{d:'eyebrowSize',p:'mobileEyebrowSize',t:'range',l:'Size',min:8,max:180,u:'px'},{d:'eyebrowLetterSpacing',p:'mobileEyebrowLetterSpacing',t:'range',l:'Letter spacing',min:-5,max:30,step:.5,u:'px'}]],
      ['Colours',[{d:'eyebrowColor',t:'color',l:'Text colour'},{d:'eyebrowBgEnabled',t:'check',l:'Show background'},{d:'eyebrowBg',t:'color',l:'Background colour'},{d:'eyebrowOpacity',t:'range',l:'Background opacity',min:0,max:100,u:'%'}]],
      ['Box',[{d:'eyebrowPadX',t:'range',l:'Padding left / right',min:0,max:40,u:'px'},{d:'eyebrowPadY',t:'range',l:'Padding top / bottom',min:0,max:24,u:'px'},{d:'eyebrowRadius',t:'range',l:'Corner radius',min:0,max:30,u:'px'}]],
      ['Shadow',[{d:'eyebrowShadowEnabled',t:'check',l:'Add drop shadow'},{d:'eyebrowShadowColor',t:'color',l:'Shadow colour'},{d:'eyebrowShadowOpacity',t:'range',l:'Opacity',min:0,max:100,u:'%'},{d:'eyebrowShadowBlur',t:'range',l:'Blur',min:0,max:60,u:'px'},{d:'eyebrowShadowY',t:'range',l:'Offset',min:0,max:30,u:'px'}]],
      ['Spacing',[{d:'gapEyebrow',p:'mobileGapEyebrow',t:'range',l:'Space below',min:0,max:50,u:'px'}]]
    ]},
    heading:{name:'Heading', hint:'The big title', groups:[
      ['Text',[{d:'heading',t:'area',l:'Heading'}]],
      ['Search engines (SEO)',[{d:'headingTag',t:'select',o:[['','Normal (as before)'],['h1','H1: main title of the page'],['h2','H2: section title'],['h3','H3: smaller title']],l:'Tell Google this is a title'},{t:'note',l:'Use H1 on one banner per page only, usually the first slide of the homepage banner. Looks the same either way.'}]],
      ['Font',[{d:'headingFont',t:'font',l:'Font'},{d:'headingWeight',t:'weight',l:'Weight'},{d:'headingColor',t:'color',l:'Colour'},{d:'headingSize',p:'mobileHeadingSize',t:'range',l:'Size',min:8,max:220,u:'px'},{d:'headingLineHeight',t:'range',l:'Line height',min:.7,max:2.4,step:.05},{d:'headingLetterSpacing',p:'mobileHeadingLetterSpacing',t:'range',l:'Letter spacing',min:-5,max:30,step:.5,u:'px'}]],
      ['Spacing',[{d:'gapHeading',p:'mobileGapHeading',t:'range',l:'Space below',min:0,max:50,u:'px'}]]
    ]},
    sub:{name:'Small text', hint:'The line(s) under the heading', groups:[
      ['Text',[{d:'subheading',t:'area',l:'Small text'}]],
      ['Font',[{d:'bodyFont',t:'font',l:'Font'},{d:'bodyWeight',t:'weight',l:'Weight'},{d:'subColor',t:'color',l:'Colour'},{d:'subSize',p:'mobileSubSize',t:'range',l:'Size',min:8,max:140,u:'px'},{d:'subLineHeight',t:'range',l:'Line height',min:.7,max:2.8,step:.05},{d:'subLetterSpacing',p:'mobileSubLetterSpacing',t:'range',l:'Letter spacing',min:-5,max:30,step:.5,u:'px'}]],
      ['Spacing',[{d:'gapSub',p:'mobileGapSub',t:'range',l:'Space below',min:0,max:60,u:'px'}]]
    ]},
    button:{name:'Button', hint:'The button', groups:[
      ['Text & link',[{d:'buttonText',t:'text',l:'Button text'},{d:'buttonUrl',t:'url',l:'Link'},{d:'buttonNewTab',t:'check',l:'Open in a new tab'}]],
      ['Font',[{d:'buttonFont',t:'font',l:'Font'},{d:'buttonWeight',t:'weight',l:'Weight'},{d:'buttonFontSize',p:'mobileButtonFontSize',t:'range',l:'Size',min:8,max:100,u:'px'},{d:'buttonLetterSpacing',p:'mobileButtonLetterSpacing',t:'range',l:'Letter spacing',min:-5,max:30,step:.5,u:'px'}]],
      ['Colours',[{d:'buttonColor',t:'color',l:'Text colour'},{d:'buttonBgEnabled',t:'check',l:'Show background'},{d:'buttonBg',t:'color',l:'Background colour'},{d:'buttonOpacity',t:'range',l:'Background opacity',min:0,max:100,u:'%'}]],
      ['Shape',[{d:'buttonPadX',t:'range',l:'Padding left / right',min:0,max:60,u:'px'},{d:'buttonHeight',t:'range',l:'Height',min:28,max:80,u:'px'},{d:'buttonRadius',t:'range',l:'Corner radius',min:0,max:40,u:'px'},{d:'buttonWidth',p:'mobileButtonWidth',t:'range',l:'Width (0 = fit text)',min:0,max:1000,step:10,u:'px'}]],
      ['Hover',[{d:'buttonHoverEnabled',t:'check',l:'Change colour on hover'},{d:'buttonHoverBg',t:'color',l:'Hover background'},{d:'buttonHoverColor',t:'color',l:'Hover text'}]],
      ['Shadow',[{d:'buttonShadowEnabled',t:'check',l:'Add drop shadow'},{d:'buttonShadowColor',t:'color',l:'Shadow colour'},{d:'buttonShadowOpacity',t:'range',l:'Opacity',min:0,max:100,u:'%'},{d:'buttonShadowBlur',t:'range',l:'Blur',min:0,max:60,u:'px'},{d:'buttonShadowY',t:'range',l:'Offset',min:0,max:30,u:'px'}]]
    ]},
    badge:{name:'Badges', hint:'Price tags and labels you can drag anywhere on the picture', groups:[
      ['Text & link',[{d:'label',t:'text',l:'Main line (e.g. 22\' Gorilla)'},{d:'label2',t:'text',l:'Second line (e.g. $249.99/day), optional'},{d:'url',t:'url',l:'Link (optional)'},{d:'newTab',t:'check',l:'Open in a new tab'}]],
      ['Font',[{d:'font',t:'font',l:'Font'},{d:'weight',t:'weight',l:'Weight'},{d:'size',p:'mSize',t:'range',l:'Main line size',min:8,max:120,u:'px'},{d:'size2',p:'mSize2',t:'range',l:'Second line size',min:6,max:90,u:'px'},{d:'align',t:'select',o:LR,l:'Text alignment'}]],
      ['Colours',[{d:'bg',t:'color',l:'Background colour'},{d:'bgOpacity',t:'range',l:'Background opacity',min:0,max:100,u:'%'},{d:'color',t:'color',l:'Text colour'},{d:'shadow',t:'check',l:'Drop shadow'}]],
      ['Shape',[{d:'padX',t:'range',l:'Padding left / right',min:0,max:60,u:'px'},{d:'padY',t:'range',l:'Padding top / bottom',min:0,max:40,u:'px'},{d:'radius',t:'range',l:'Corner radius',min:0,max:60,u:'px'},{d:'rotate',t:'range',l:'Tilt',min:-30,max:30,u:'°'}]],
      ['Where it shows',[{d:'showDesktop',t:'check',l:'Show on desktop'},{d:'showPhone',t:'check',l:'Show on phone'},{t:'note',l:'Drag the badge on the Desktop and Phone previews to place it. Each one remembers its own spot.'}]]
    ]},
    content:{name:'Text box', hint:'Label, heading, small text and button together', groups:[
      ['Phone shortcut',[{t:'phonePlace'}]],
      ['Placement',[{t:'lineup'},{d:'contentSide',p:'mobileContentSide',t:'seg',o:LR,l:'Box position'},{d:'contentAlign',p:'mobileContentAlign',t:'seg',o:TB,l:'Vertical'},{d:'textAlign',p:'mobileTextAlign',t:'seg',o:LR,l:'Text alignment'},{d:'contentWidth',p:'mobileContentWidth',t:'range',l:'Box width',min:120,max:1900,step:10,u:'px'},{d:'contentPadding',p:'mobileContentPadding',t:'range',l:'Space from edge',min:0,max:140,step:2,u:'px'},{d:'contentShiftX',p:'mobileContentShiftX',t:'range',l:'Move left / right',min:-1000,max:1000,u:'px'},{d:'contentShiftY',p:'mobileContentShiftY',t:'range',l:'Move up / down',min:-1000,max:1000,u:'px'},{d:'showContent',p:'mobileShowContent',t:'check',l:'Show text'}]],
      ['Background panel',[{d:'contentBgEnabled',p:'mobileContentBgEnabled',t:'check',l:'Panel behind the text'},{d:'contentBgColor',p:'mobileContentBgColor',t:'color',l:'Colour'},{d:'contentBgOpacity',p:'mobileContentBgOpacity',t:'range',l:'Opacity',min:0,max:100,u:'%'},{d:'contentBgPadding',p:'mobileContentBgPadding',t:'range',l:'Padding',min:0,max:80,step:2,u:'px'},{d:'contentBgRadius',p:'mobileContentBgRadius',t:'range',l:'Corner radius',min:0,max:40,u:'px'}]],
      ['Panel shadow',[{d:'contentBgShadowEnabled',p:'mobileContentBgShadowEnabled',t:'check',l:'Drop shadow'},{d:'contentBgShadowColor',p:'mobileContentBgShadowColor',t:'color',l:'Shadow colour'},{d:'contentBgShadowOpacity',p:'mobileContentBgShadowOpacity',t:'range',l:'Opacity',min:0,max:100,u:'%'},{d:'contentBgShadowBlur',p:'mobileContentBgShadowBlur',t:'range',l:'Blur',min:0,max:80,step:2,u:'px'},{d:'contentBgShadowY',p:'mobileContentBgShadowY',t:'range',l:'Offset',min:0,max:40,u:'px'}]]
    ]},
    bg:{name:'Background', hint:'Pictures, links, colour, overlay and gradient', groups:[
      ['Pictures',[{t:'imgs'},{d:'altText',t:'text',l:'Picture description (alt text)'}]],
      ['Picture position',[{d:'desktopFit',t:'select',o:[['width','100% width (designed banners)'],['cover','Fill / crop'],['contain','Fit whole picture'],['custom','Custom width %']],l:'Desktop sizing'},{d:'desktopX',t:'range',l:'Desktop: left / right',min:-100,max:200,u:'%'},{d:'desktopY',t:'range',l:'Desktop: up / down',min:-100,max:200,u:'%'},{d:'desktopZoom',t:'range',l:'Desktop: size (Custom width)',min:10,max:400,u:'%'},{d:'mobileX',t:'range',l:'Phone: left / right',min:-100,max:200,u:'%'},{d:'mobileY',t:'range',l:'Phone: up / down',min:-100,max:200,u:'%'},{d:'mobileWidth',t:'range',l:'Phone: picture size',min:10,max:400,u:'%'},{d:'desktopAttachment',t:'select',o:[['scroll','Scroll (normal)'],['fixed','Fixed (parallax)']],l:'Scrolling'}]],
      ['Click anywhere on the banner',[{d:'desktopBgLink',p:'mobileBgLink',t:'urlpair',l:'Banner link'},{d:'desktopBgNewTab',p:'mobileBgNewTab',t:'check',l:'Open in a new tab'}]],
      ['Colour & overlay',[{d:'bgColor',t:'color',l:'Base colour (behind the picture)'},{d:'overlayType',t:'select',o:[['none','Off'],['color','Colour'],['image','Image']],l:'Overlay'},{d:'overlayColor',t:'color',l:'Overlay colour'},{d:'overlayImage',t:'img',l:'Overlay image'},{d:'overlayOpacity',t:'range',l:'Overlay opacity',min:0,max:100,u:'%'},{d:'overlayBlendMode',t:'select',o:BLENDS.map(function(b){return [b,b];}),l:'Blend mode'}]],
      ['Gradient',[{t:'gradient'}]]
    ]}
  };
  var SLIDER = [
    ['Size',[{d:'desktopHeight',t:'number',l:'Desktop height (px)'},{d:'mobileHeight',t:'number',l:'Phone height (px)'},{d:'mobileBreakpoint',t:'number',l:'Use the phone layout at this width or less (px)'}]],
    ['Corners',[{d:'bannerRadius',t:'number',l:'Corner radius, desktop (px)'},{d:'mobileBannerRadius',t:'number',l:'Corner radius, phone (px). Blank = same as desktop'}]],
    ['Autoplay',[{d:'autoplay',t:'number',l:'Time per slide (ms)'},{d:'pauseHover',t:'check',l:'Pause when the mouse is on it'}]],
    ['Arrows & dashes',[{d:'arrowBg',t:'color',l:'Arrow background'},{d:'arrowBgOpacity',t:'range',l:'Arrow background opacity',min:0,max:100,u:'%'},{d:'arrowIconColor',t:'color',l:'Arrow icon'},{d:'arrowBorderColor',t:'color',l:'Arrow border'},{d:'arrowBorderOpacity',t:'range',l:'Arrow border opacity',min:0,max:100,u:'%'},{d:'dashColor',t:'color',l:'Dash / progress colour'}]],
    ['Website',[{d:'resetHostPadding',t:'check',l:'Remove Magento page padding (full-width pages)'}]],
    ['Search engines (SEO)',[{d:'seoPreload',t:'check',l:'Load the first picture early (faster page, better Google page-speed score)'},{t:'note',l:'Best for the banner at the top of a page. Also see Heading > Search engines, and Background > Picture description (alt text).'}]]
  ];
  // Banner-wide settings live on every slide (the exporter reads them from slide 1).
  var SLIDER_KEYS = ['desktopHeight','mobileHeight','mobileBreakpoint','bannerRadius','mobileBannerRadius','autoplay','pauseHover','arrowBg','arrowBgOpacity','arrowIconColor','arrowBorderColor','arrowBorderOpacity','dashColor','resetHostPadding','seoPreload'];

  // ---------- shell ----------
  var LANGS = [['en','EN',DATA.englishUrl],['fr','FR',DATA.frenchUrl],['us','USA',DATA.usaUrl]];
  root.innerHTML =
    '<div class="cs">' +
      '<header class="cs-top">' +
        '<a class="cs-back" href="'+esc(DATA.listUrl||'#')+'" title="Back to banners">&#8592;</a>' +
        '<div class="cs-name"><input id="csTitle" aria-label="Banner name"><div class="cs-status" id="csStatus">All changes saved</div></div>' +
        '<nav class="cs-langs">' + LANGS.map(function(l){ return '<a href="'+esc(l[2]||'#')+'" class="'+(DATA.language===l[0]?'on':'')+'">'+l[1]+'</a>'; }).join('') + '</nav>' +
        ((DATA.language==='fr' && DATA.translate) ? '<button class="cs-tb" id="csTranslate">Translate EN → FR</button>' : '') +
        '<div class="cs-sp"></div>' +
        '<button class="cs-tb" id="csLive">Live preview</button>' +
        '<div class="cs-menu" id="csMore"><button class="cs-tb" id="csMoreBtn">More ▾</button><div class="cs-pop">' +
          '<button id="csNew">New blank</button><button id="csImport">Load code / project</button><button id="csCopyJson">Copy project JSON</button><button id="csHelp">What changed?</button>' +
        '</div></div>' +
        '<button class="cs-tb" id="csCopyCode">Copy embed code</button>' +
        '<button class="cs-tb cs-pri" id="csSave">Save</button>' +
      '</header>' +
      '<div class="cs-app">' +
        '<aside class="cs-rail"><div class="cs-cap">Slides</div><div id="csSlides"></div><button class="cs-add" id="csAdd">+ Add slide</button>' +
          '<div class="cs-cap">Whole slider</div><button class="cs-railbtn" id="csSliderBtn">Slider settings <span>›</span></button></aside>' +
        '<main class="cs-stage" id="csStage">' +
          '<div class="cs-viewbar"><span>Show</span><div class="cs-seg" id="csView"><button data-v="desktop">Desktop</button><button data-v="phone">Phone</button><button data-v="both">Both</button></div></div>' +
          '<div class="cs-pvs">' +
            '<div class="cs-pv" id="csDesk"><div class="cs-pvh"><b>Desktop</b><div class="cs-seg cs-w" id="csDeskW"><button data-w="893">Hero 893</button><button data-w="1290">Full width 1290</button></div><span id="csDLbl"></span></div><div class="cs-box" id="csDBox"><iframe id="csDFrame" title="Desktop preview"></iframe></div></div>' +
            '<div class="cs-pv cs-phone" id="csPhone"><div class="cs-pvh"><b>Phone</b><span id="csPLbl"></span></div><div class="cs-box" id="csPBox"><iframe id="csPFrame" title="Phone preview"></iframe></div></div>' +
          '</div>' +
          '<div class="cs-hint"><b>Click any piece of the banner to edit it. Drag the text box or the picture to move it; drag the blue handles to resize.</b> Desktop and Phone are always both on screen, built from the same code you copy into the website.</div>' +
          '<details class="cs-code"><summary>Embed code</summary><textarea id="csCode" readonly></textarea><button class="cs-tb cs-pri" id="csCopyCode2">Copy embed code</button></details>' +
        '</main>' +
        '<aside class="cs-side" id="csSide"></aside>' +
      '</div>' +
      '<div class="cs-modal" id="csImportM"><div class="cs-mb"><h3>Load code or project</h3><p>Paste embed code from this studio, Wheels Banner Studio code, or project JSON.</p><textarea id="csImportArea"></textarea><div class="cs-msg" id="csImportMsg"></div><div class="cs-acts"><button class="cs-tb" data-close>Cancel</button><button class="cs-tb cs-pri" id="csDoImport">Load into studio</button></div></div></div>' +
      '<div class="cs-modal" id="csHelpM"><div class="cs-mb"><h3>What changed (every control is still here)</h3><ul>' +
        '<li><b>Click the piece you want to change</b> (Red label, Heading, Small text, Button, Text box, Background) and all its controls show in one place.</li>' +
        '<li><b>Drag a piece in either preview to move it.</b></li>' +
        '<li><b>Desktop and Phone side by side</b>, always, at real sizes (phone 345px like on wheelsauto.com). Both are built from the exact embed code.</li>' +
        '<li><b>Size and position controls show Desktop and Phone together.</b> Turn on 🔗 and Phone follows Desktop.</li>' +
        '<li><b>Text box → "Under the picture"</b> puts phone text below the photo in one click.</li>' +
        '<li><b>Apply to all slides</b> copies a piece\'s look (not its text or links) to every slide.</li>' +
        '<li><b>Warning</b> when a slide has no phone picture.</li>' +
        '<li><b>Slider settings</b> (heights, autoplay, corners, breakpoint, arrows) in one place.</li>' +
      '</ul><div class="cs-acts"><button class="cs-tb cs-pri" data-close>Got it</button></div></div></div>' +
      '<div class="cs-toast" id="csToast"></div>' +
    '</div>';

  // ---------- previews: real embed code, one slide, at real sizes ----------
  var FRAME_CSS = '<style>html,body{margin:0;padding:0;background:transparent;overflow:hidden}' +
    '.cs-piece{cursor:pointer}.csx-content{cursor:move}.csx-bg,.csx-scrim{cursor:move}.cs-piece:hover{outline:1px dashed #8aa4ff;outline-offset:2px}.cs-sel{outline:2px solid #2f5bea!important;outline-offset:2px}' +
    '.csx-badge{pointer-events:auto!important;cursor:move!important}' +
    'body.cs-dragging,body.cs-dragging *{cursor:grabbing!important}</style>';
  function singleSlideCode(){
    var all = slides, idx = active;
    bannerRoot = all[0]; slides = [all[idx]]; active = 0;
    var code;
    try { code = generateCode(); } finally { slides = all; active = idx; bannerRoot = null; }
    return code;
  }
  function writeFrame(frame, bodyWidth, phone){
    var doc = frame.contentDocument;
    doc.open();
    doc.write('<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'+FRAME_CSS+'</head><body style="width:'+bodyWidth+'px">'+singleSlideCode()+'</body></html>');
    doc.close();
    wireFrame(frame, phone);
  }
  var PIECE_SEL = [['.csx-badge','badge'],['.csx-eyebrow','eyebrow'],['.csx-heading','heading'],['.csx-sub','sub'],['.csx-button','button'],['.csx-content','content']];
  function pieceOf(target){
    if(!target || !target.closest) return null;
    for(var i=0;i<PIECE_SEL.length;i++){ var n = target.closest(PIECE_SEL[i][0]); if(n) return {key:PIECE_SEL[i][1], node:n}; }
    return null;
  }
  // The area the text really covers (old per-piece nudges can push pieces outside the box itself)
  function textRect(doc){
    var box = doc.querySelector('.csx-content'); if(!box) return null;
    var r = null;
    box.querySelectorAll('.csx-eyebrow,.csx-heading,.csx-sub,.csx-button').forEach(function(n){
      var b = n.getBoundingClientRect(); if(!b.width || !b.height || !n.textContent.trim()) return;
      r = r ? { left:Math.min(r.left,b.left), top:Math.min(r.top,b.top), right:Math.max(r.right,b.right), bottom:Math.max(r.bottom,b.bottom) } : { left:b.left, top:b.top, right:b.right, bottom:b.bottom };
    });
    if(!r){ var bb = box.getBoundingClientRect(); r = { left:bb.left, top:bb.top, right:bb.right, bottom:bb.bottom }; }
    r.width = r.right - r.left; r.height = r.bottom - r.top;
    return r;
  }
  // ---------- picture on the canvas: where it sits and how big it is ----------
  var IMG_SIZE = {};
  function natSize(url){
    if(!url) return null;
    if(IMG_SIZE[url]) return IMG_SIZE[url];
    if(IMG_SIZE[url] === undefined){
      IMG_SIZE[url] = false;
      var im = new Image();
      im.onload = function(){ IMG_SIZE[url] = { w:im.naturalWidth, h:im.naturalHeight }; ['csDFrame','csPFrame'].forEach(function(id){ var d = el(id).contentDocument; if(d && d.querySelector('.csx-banner-root')) markSel(d); }); };
      im.src = url;
    }
    return null;
  }
  function imgGeom(s, phone, W, H){
    var url = phone ? (s.mobileImage || s.desktopImage) : s.desktopImage, nat = natSize(url);
    if(!nat || !nat.w || !nat.h) return null;
    var w, X, Y;
    if(phone){ w = W * (Number(s.mobileWidth)||100) / 100; X = s.mobileX; Y = s.mobileY; }
    else {
      var fit = s.desktopFit;
      if(fit === 'width') w = W;
      else if(fit === 'contain') w = Math.min(W/nat.w, H/nat.h) * nat.w;
      else if(fit === 'custom') w = W * (Number(s.desktopZoom)||100) / 100;
      else w = Math.max(W/nat.w, H/nat.h) * nat.w;
      X = s.desktopX; Y = s.desktopY;
    }
    var h = w * nat.h / nat.w;
    X = Number(X)||0; Y = Number(Y)||0;
    return { W:W, H:H, w:w, h:h, ratio:nat.h/nat.w, left:(W-w)*X/100, top:(H-h)*Y/100, X:X, Y:Y };
  }
  // turn a picture box (left/top/width) back into Code Studio's position % and size %
  function imgValues(g, phone, resized){
    var X = Math.abs(g.W - g.w) > .5 ? g.left / (g.W - g.w) * 100 : g.X;
    var Y = Math.abs(g.H - g.h) > .5 ? g.top / (g.H - g.h) * 100 : g.Y;
    var v = { X:Math.round(Math.max(-500, Math.min(600, X))), Y:Math.round(Math.max(-500, Math.min(600, Y))) };
    if(resized) v.size = Math.max(5, Math.round(g.w / g.W * 100));
    return v;
  }
  function saveImg(s, phone, v){
    if(phone){ s.mobileX = v.X; s.mobileY = v.Y; if(v.size != null) s.mobileWidth = v.size; }
    else { s.desktopX = v.X; s.desktopY = v.Y; if(v.size != null){ s.desktopFit = 'custom'; s.desktopZoom = v.size; } }
  }
  function showImg(node, phone, v){
    if(phone){ node.style.setProperty('--jcs-mobile-bg-pos', v.X+'% '+v.Y+'%'); if(v.size != null) node.style.setProperty('--jcs-mobile-bg-size', v.size+'% auto'); }
    else { node.style.backgroundPosition = v.X+'% '+v.Y+'%'; if(v.size != null) node.style.backgroundSize = v.size+'% auto'; }
  }
  function drawImgFrame(doc, root, g){
    var b = doc.createElement('div');
    b.className = 'cs-selbox';
    b.style.cssText = 'position:absolute;z-index:19;pointer-events:none;outline:2px solid #2f5bea;left:'+g.left+'px;top:'+g.top+'px;width:'+g.w+'px;height:'+g.h+'px';
    [['tl','0','0','nwse'],['tr','100%','0','nesw'],['bl','0','100%','nesw'],['br','100%','100%','nwse']].forEach(function(c){
      var h = doc.createElement('div');
      h.setAttribute('data-corner', c[0]);
      h.style.cssText = 'position:absolute;width:12px;height:12px;margin:-6px 0 0 -6px;background:#fff;border:2px solid #2f5bea;border-radius:2px;pointer-events:auto;cursor:'+c[3]+'-resize;left:'+c[1]+';top:'+c[2];
      b.appendChild(h);
    });
    root.appendChild(b);
  }
  function markSel(doc){
    doc.querySelectorAll('.cs-sel').forEach(function(n){ n.classList.remove('cs-sel'); });
    doc.querySelectorAll('.cs-selbox').forEach(function(n){ n.remove(); });
    if(panel !== 'piece') return;
    if(sel === 'content'){
      var root = doc.querySelector('.csx-banner-root'), r = textRect(doc); if(!root || !r) return;
      var rr = root.getBoundingClientRect(), b = doc.createElement('div');
      b.className = 'cs-selbox';
      b.style.cssText = 'position:absolute;z-index:19;pointer-events:none;outline:2px solid #2f5bea;outline-offset:4px;left:'+(r.left-rr.left)+'px;top:'+(r.top-rr.top)+'px;width:'+r.width+'px;height:'+r.height+'px';
      // edges = box width, corners = text size
      [['l','-4px','50%','ew'],['r','calc(100% + 4px)','50%','ew'],['tl','-4px','-4px','nwse'],['tr','calc(100% + 4px)','-4px','nesw'],['bl','-4px','calc(100% + 4px)','nesw'],['br','calc(100% + 4px)','calc(100% + 4px)','nwse']].forEach(function(c){
        var h = doc.createElement('div'); h.setAttribute('data-tbox', c[0]);
        var edge = c[0].length === 1;
        h.title = edge ? 'Drag to make the text box wider or narrower' : 'Drag to make all the text bigger or smaller';
        h.style.cssText = 'position:absolute;pointer-events:auto;background:#fff;border:2px solid #2f5bea;cursor:'+c[3]+'-resize;left:'+c[1]+';top:'+c[2]+';'+(edge ? 'width:8px;height:22px;margin:-11px 0 0 -4px;border-radius:4px' : 'width:12px;height:12px;margin:-6px 0 0 -6px;border-radius:50%');
        b.appendChild(h);
      });
      root.appendChild(b);
      return;
    }
    if(sel === 'bg'){
      var rootB = doc.querySelector('.csx-banner-root'); if(!rootB) return;
      var gB = imgGeom(cur(), !!doc.__phone, rootB.clientWidth, rootB.clientHeight);
      if(gB) drawImgFrame(doc, rootB, gB);
      return;
    }
    if(sel === 'badge'){ var bn = doc.querySelector('.csx-badge[data-badge="'+badgeIdx+'"]'); if(bn) bn.classList.add('cs-sel'); return; }
    PIECE_SEL.forEach(function(p){ if(p[1] === sel) doc.querySelectorAll(p[0]).forEach(function(n){ n.classList.add('cs-sel'); }); });
  }
  function wireFrame(frame, phone){
    var doc = frame.contentDocument;
    doc.__phone = phone;
    PIECE_SEL.forEach(function(p){ if(p[1] !== 'content') doc.querySelectorAll(p[0]).forEach(function(n){ n.classList.add('cs-piece'); }); });
    markSel(doc);
    // never follow links inside the editor preview
    doc.addEventListener('click', function(e){ if(e.target.closest && e.target.closest('a')) e.preventDefault(); }, true);
    var drag = null, SNAP = 8;
    function guide(root, vertical, pos, on){
      var g = doc.createElement('div');
      g.className = 'cs-guide';
      g.style.cssText = 'position:absolute;z-index:20;pointer-events:none;' + (vertical ? 'top:0;bottom:0;width:0;left:'+pos+'px;border-left:1px '+(on?'solid #ff2d87':'dashed rgba(255,255,255,.55)') : 'left:0;right:0;height:0;top:'+pos+'px;border-top:1px '+(on?'solid #ff2d87':'dashed rgba(255,255,255,.55)')) + ';box-shadow:0 0 0 .5px rgba(0,0,0,.35)';
      root.appendChild(g);
    }
    function clearGuides(){ doc.querySelectorAll('.cs-guide').forEach(function(g){ g.remove(); }); }
    doc.addEventListener('mousedown', function(e){
      if(e.button !== 0) return;
      var root = e.target.closest && e.target.closest('.csx-banner-root');
      if(!root || e.target.closest('.jcsx-nav')) return;
      var tb = e.target.getAttribute && e.target.getAttribute('data-tbox');
      if(tb){
        e.preventDefault();
        var s = cur(), M = function(k){ return phone ? 'mobile'+k.charAt(0).toUpperCase()+k.slice(1) : k; };
        var sizeKeys = ['eyebrowSize','headingSize','subSize','buttonFontSize','gapEyebrow','gapHeading','gapSub'].map(M);
        var start = {}; sizeKeys.forEach(function(k){ start[k] = Number(s[k]) || 0; });
        var tr0 = textRect(doc);
        drag = { tbox:tb, x:e.clientX, y:e.clientY, moved:false, root:root,
          wk:M('contentWidth'), w0:Number(s[M('contentWidth')]) || 480,
          side:(phone ? (s.mobileContentSide != null ? s.mobileContentSide : s.contentSide) : s.contentSide),
          sizeKeys:sizeKeys, start:start, tw0:tr0 ? tr0.width : 300, box:doc.querySelector('.csx-content') };
        return;
      }
      var p = pieceOf(e.target);
      e.preventDefault();
      if(p && p.key === 'badge'){
        var bi = Number(p.node.getAttribute('data-badge')) || 0, bd = (cur().badges || [])[bi];
        if(!bd) return;
        var bdef = badgeDefaults();
        drag = { badge:true, bi:bi, node:p.node, root:root, x:e.clientX, y:e.clientY, moved:false, rr:root.getBoundingClientRect(),
          ox:Number(phone ? (bd.mx != null ? bd.mx : bdef.mx) : (bd.x != null ? bd.x : bdef.x)), oy:Number(phone ? (bd.my != null ? bd.my : bdef.my) : (bd.y != null ? bd.y : bdef.y)) };
        return;
      }
      // empty space inside the text box (it can be much bigger than the visible text) belongs to the picture
      if(p && p.key === 'content'){
        var tr = textRect(doc);
        if(!tr || e.clientX < tr.left - 6 || e.clientX > tr.right + 6 || e.clientY < tr.top - 6 || e.clientY > tr.bottom + 6) p = null;
      }
      if(!p){
        // the picture: drag to move, drag a corner to resize
        var bgNode = root.querySelector('.csx-bg');
        if(sel !== 'bg' || panel !== 'piece') select('bg', true);
        var g0 = imgGeom(cur(), phone, root.clientWidth, root.clientHeight);
        if(!g0 || !bgNode) return;
        var corner = e.target.getAttribute && e.target.getAttribute('data-corner');
        drag = { img:true, corner:corner, x:e.clientX, y:e.clientY, g0:g0, node:bgNode, root:root, moved:false, rr:root.getBoundingClientRect() };
        return;
      }
      var box = doc.querySelector('.csx-content');
      var xk = phone ? 'mobileContentShiftX' : 'contentShiftX', yk = phone ? 'mobileContentShiftY' : 'contentShiftY';
      var rr = root.getBoundingClientRect(), cr = textRect(doc);
      var pad = Number(phone ? (cur().mobileContentPadding != null ? cur().mobileContentPadding : cur().contentPadding) : cur().contentPadding) || 0;
      drag = { x:e.clientX, y:e.clientY, ox:Number(cur()[xk])||0, oy:Number(cur()[yk])||0, xk:xk, yk:yk, box:box, root:root, key:p.key, moved:false,
        rr:rr, cr:cr, pad:pad,
        // the whole box must stay inside the banner
        minX: rr.left - cr.left, maxX: rr.right - cr.right, minY: rr.top - cr.top, maxY: rr.bottom - cr.bottom };
    });
    doc.addEventListener('mousemove', function(e){
      if(!drag) return;
      if(drag.img){ moveImg(e); return; }
      if(drag.tbox){ resizeText(e); return; }
      if(drag.badge){ moveBadge(e); return; }
      var dx = Math.round(e.clientX - drag.x), dy = Math.round(e.clientY - drag.y);
      if(!drag.moved && Math.abs(dx)+Math.abs(dy) < 4) return;
      if(!drag.moved){ drag.moved = true; doc.body.classList.add('cs-dragging'); if(sel !== 'content' || panel !== 'piece') select('content', true); }
      var rr = drag.rr, cr = drag.cr;
      dx = Math.max(drag.minX, Math.min(drag.maxX, dx));
      dy = Math.max(drag.minY, Math.min(drag.maxY, dy));
      // snap targets: banner centre (crosshair) and the side margins
      var cx = cr.left + cr.width/2 + dx, cy = cr.top + cr.height/2 + dy;
      var rcx = rr.left + rr.width/2, rcy = rr.top + rr.height/2;
      var snapV = null, snapH = false;
      if(Math.abs(cx - rcx) < SNAP){ dx = rcx - (cr.left + cr.width/2); snapV = 'center'; }
      else if(Math.abs(cr.left + dx - (rr.left + drag.pad)) < SNAP){ dx = rr.left + drag.pad - cr.left; snapV = 'left'; }
      else if(Math.abs(cr.right + dx - (rr.right - drag.pad)) < SNAP){ dx = rr.right - drag.pad - cr.right; snapV = 'right'; }
      if(Math.abs(cy - rcy) < SNAP){ dy = rcy - (cr.top + cr.height/2); snapH = true; }
      dx = Math.round(dx); dy = Math.round(dy);
      var nx = drag.ox + dx, ny = drag.oy + dy;
      cur()[drag.xk] = nx; cur()[drag.yk] = ny;
      if(phone){ drag.box.style.setProperty('--jcs-m-shiftx', nx+'px'); drag.box.style.setProperty('--jcs-m-shifty', ny+'px'); }
      else drag.box.style.transform = 'translate('+nx+'px,'+ny+'px)';
      markSel(doc);
      clearGuides();
      guide(drag.root, true, rr.width/2, snapV === 'center');
      guide(drag.root, false, rr.height/2, snapH);
      if(snapV === 'left') guide(drag.root, true, drag.pad, true);
      if(snapV === 'right') guide(drag.root, true, rr.width - drag.pad, true);
    });
    function moveBadge(e){
      var d = drag, dx = e.clientX - d.x, dy = e.clientY - d.y;
      if(!d.moved && Math.abs(dx)+Math.abs(dy) < 4) return;
      if(!d.moved){ d.moved = true; doc.body.classList.add('cs-dragging'); badgeIdx = d.bi; if(sel !== 'badge' || panel !== 'piece') select('badge', true); }
      var nx = d.ox + dx / d.rr.width * 100, ny = d.oy + dy / d.rr.height * 100, snapV = false, snapH = false;
      if(Math.abs(nx - 50) < SNAP / d.rr.width * 100){ nx = 50; snapV = true; }
      if(Math.abs(ny - 50) < SNAP / d.rr.height * 100){ ny = 50; snapH = true; }
      nx = Math.round(Math.max(0, Math.min(100, nx)) * 10) / 10; ny = Math.round(Math.max(0, Math.min(100, ny)) * 10) / 10;
      d.nx = nx; d.ny = ny;
      if(phone){ d.node.style.setProperty('--jcs-m-left', nx+'%'); d.node.style.setProperty('--jcs-m-top', ny+'%'); }
      else { d.node.style.left = nx+'%'; d.node.style.top = ny+'%'; }
      markSel(doc);
      clearGuides();
      guide(d.root, true, d.rr.width/2, snapV);
      guide(d.root, false, d.rr.height/2, snapH);
    }
    function resizeText(e){
      var d = drag, s = cur(), dx = e.clientX - d.x;
      if(!d.moved && Math.abs(dx) < 3) return;
      d.moved = true; doc.body.classList.add('cs-dragging');
      var right = d.tbox.indexOf('r') >= 0, signed = right ? dx : -dx;
      if(d.tbox === 'l' || d.tbox === 'r'){
        // box width (a centred box grows on both sides)
        var w = Math.round(Math.max(120, Math.min(1900, d.w0 + signed * (d.side === 'center' ? 2 : 1))));
        s[d.wk] = w;
        if(phone) d.box.style.setProperty('--jcs-m-width', w+'px'); else d.box.style.width = 'min('+w+'px,98%)';
      } else {
        // all text bigger / smaller together
        var f = Math.max(.3, Math.min(4, (d.tw0 + signed) / d.tw0));
        d.sizeKeys.forEach(function(k){ s[k] = Math.max(k.indexOf('ap') > 0 ? 0 : 6, Math.round(d.start[k] * f)); });
        var map = { '.csx-eyebrow':['eyebrowSize','gapEyebrow'], '.csx-heading':['headingSize','gapHeading'], '.csx-sub':['subSize','gapSub'], '.csx-button':['buttonFontSize',null] };
        Object.keys(map).forEach(function(q){ var n = doc.querySelector(q); if(!n) return;
          var sk = phone ? 'mobile'+map[q][0].charAt(0).toUpperCase()+map[q][0].slice(1) : map[q][0];
          var gk = map[q][1] && (phone ? 'mobile'+map[q][1].charAt(0).toUpperCase()+map[q][1].slice(1) : map[q][1]);
          if(phone){ n.style.setProperty('--jcs-m-size', s[sk]+'px'); if(gk) n.style.setProperty('--jcs-m-gap', s[gk]+'px'); }
          else { n.style.fontSize = s[sk]+'px'; if(gk) n.style.marginBottom = s[gk]+'px'; }
        });
      }
      markSel(doc);
    }
    function moveImg(e){
      var d = drag, g0 = d.g0, dx = e.clientX - d.x, dy = e.clientY - d.y;
      if(!d.moved && Math.abs(dx)+Math.abs(dy) < 3) return;
      d.moved = true; doc.body.classList.add('cs-dragging');
      var g = { W:g0.W, H:g0.H, ratio:g0.ratio, X:g0.X, Y:g0.Y, w:g0.w, h:g0.h, left:g0.left, top:g0.top };
      var snapV = null, snapH = null;
      if(d.corner){
        // resize, keeping the opposite corner where it is
        var right = d.corner.charAt(1) === 'r', bottom = d.corner.charAt(0) === 'b';
        g.w = Math.max(40, g0.w + (right ? dx : -dx)); g.h = g.w * g.ratio;
        g.left = right ? g0.left : g0.left + g0.w - g.w;
        g.top = bottom ? g0.top : g0.top + g0.h - g.h;
        // snap the moving edge to the banner edges
        if(right && Math.abs(g.left + g.w - g.W) < SNAP){ g.w = g.W - g.left; g.h = g.w * g.ratio; if(!bottom) g.top = g0.top + g0.h - g.h; snapV = 'right'; }
        if(!right && Math.abs(g.left) < SNAP){ g.w = g0.left + g0.w; g.h = g.w * g.ratio; g.left = 0; if(!bottom) g.top = g0.top + g0.h - g.h; snapV = 'left'; }
      } else {
        g.left = g0.left + dx; g.top = g0.top + dy;
        // crosshair: snap the picture's centre to the banner's centre, and its edges to the banner's edges
        if(Math.abs(g.left + g.w/2 - g.W/2) < SNAP){ g.left = g.W/2 - g.w/2; snapV = 'center'; }
        else if(Math.abs(g.left) < SNAP){ g.left = 0; snapV = 'left'; }
        else if(Math.abs(g.left + g.w - g.W) < SNAP){ g.left = g.W - g.w; snapV = 'right'; }
        if(Math.abs(g.top + g.h/2 - g.H/2) < SNAP){ g.top = g.H/2 - g.h/2; snapH = 'center'; }
        else if(Math.abs(g.top) < SNAP){ g.top = 0; snapH = 'top'; }
        else if(Math.abs(g.top + g.h - g.H) < SNAP){ g.top = g.H - g.h; snapH = 'bottom'; }
      }
      var v = imgValues(g, phone, !!d.corner);
      d.last = v;
      showImg(d.node, phone, v);
      markSel(doc);
      clearGuides();
      guide(d.root, true, g.W/2, snapV === 'center');
      guide(d.root, false, g.H/2, snapH === 'center');
      if(snapV === 'left') guide(d.root, true, 1, true);
      if(snapV === 'right') guide(d.root, true, g.W - 1, true);
      if(snapH === 'top') guide(d.root, false, 1, true);
      if(snapH === 'bottom') guide(d.root, false, g.H - 1, true);
    }
    // mouse wheel over the picture = zoom it, keeping its centre in place
    var wheelTimer = null;
    doc.addEventListener('wheel', function(e){
      var root = e.target.closest && e.target.closest('.csx-banner-root');
      var wp = pieceOf(e.target);
      if(wp && wp.key === 'content'){ var wr = textRect(doc); if(!wr || e.clientX < wr.left || e.clientX > wr.right || e.clientY < wr.top || e.clientY > wr.bottom) wp = null; }
      if(!root || wp || sel !== 'bg' || panel !== 'piece') return;
      var g0 = imgGeom(cur(), phone, root.clientWidth, root.clientHeight), node = root.querySelector('.csx-bg');
      if(!g0 || !node) return;
      e.preventDefault();
      var f = e.deltaY < 0 ? 1.05 : 1/1.05, cx = g0.left + g0.w/2, cy = g0.top + g0.h/2;
      var g = { W:g0.W, H:g0.H, ratio:g0.ratio, X:g0.X, Y:g0.Y, w:Math.max(40, g0.w * f) };
      g.h = g.w * g.ratio; g.left = cx - g.w/2; g.top = cy - g.h/2;
      var v = imgValues(g, phone, true);
      saveImg(cur(), phone, v); showImg(node, phone, v); markSel(doc); markDirty();
      clearTimeout(wheelTimer);
      wheelTimer = setTimeout(function(){ renderSide(); renderPreviews(); renderCode(); }, 350);
    }, { passive:false });
    function endDrag(){
      if(!drag) return;
      var d = drag; drag = null; doc.body.classList.remove('cs-dragging'); clearGuides();
      if(d.tbox){ if(d.moved){ markDirty(); renderSide(); renderPreviews(); renderCode(); } return; }
      if(d.badge){
        var bb = (cur().badges || [])[d.bi];
        if(d.moved && bb && d.nx != null){ if(phone){ bb.mx = d.nx; bb.my = d.ny; } else { bb.x = d.nx; bb.y = d.ny; } markDirty(); renderSide(); renderPreviews(); renderCode(); }
        else if(!d.moved){ badgeIdx = d.bi; links = {}; select('badge'); }
        return;
      }
      if(d.img){ if(d.moved && d.last){ saveImg(cur(), phone, d.last); markDirty(); renderSide(); renderPreviews(); renderCode(); } return; }
      if(d.moved){ markDirty(); renderSide(); renderPreviews(); renderCode(); }
      else select(d.key);   // a click (no drag) opens that piece's controls
    }
    doc.addEventListener('mouseup', endDrag);
    doc.addEventListener('mouseleave', endDrag);
  }
  function scalePreviews(){
    var s0 = slides[0], bs = bannerSettings();
    var dh = Number(cur().desktopHeight || s0.desktopHeight || 490), ph = Number(cur().mobileHeight || s0.mobileHeight || 620);
    var stage = el('csStage');
    var showD = view !== 'phone', showP = view !== 'desktop';
    el('csDesk').style.display = showD ? '' : 'none';
    el('csPhone').style.display = showP ? '' : 'none';
    el('csView').querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', b.getAttribute('data-v') === view); });
    var avail = stage.clientWidth - 40 - 26 - (showP ? PW + 26 + 18 : 0);
    if(avail < 320) avail = stage.clientWidth - 40 - 26; // phone wraps underneath
    var sc = Math.min(1, Math.max(.3, avail / deskW));
    var vw = Math.max(deskW, bs.breakpoint + 1);   // viewport wider than the breakpoint = desktop layout
    var df = el('csDFrame');
    df.style.width = vw+'px'; df.style.height = dh+'px'; df.style.transform = 'scale('+sc+')';
    el('csDBox').style.width = Math.round(deskW*sc)+'px'; el('csDBox').style.height = Math.round(dh*sc)+'px';
    var pf = el('csPFrame');
    pf.style.width = PW+'px'; pf.style.height = ph+'px';
    el('csPBox').style.width = PW+'px'; el('csPBox').style.height = ph+'px';
    el('csDLbl').textContent = deskW+' × '+dh + (sc < 1 ? ' · shown at '+Math.round(sc*100)+'%' : '');
    el('csPLbl').textContent = PW+' × '+ph+' · real phone width';
    el('csDeskW').querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', Number(b.getAttribute('data-w'))===deskW); });
    return { vw:vw };
  }
  var pending = null;
  function renderPreviews(){
    if(pending) return;
    pending = setTimeout(function(){
      pending = null;
      scalePreviews();
      if(view !== 'phone') writeFrame(el('csDFrame'), deskW, false);
      if(view !== 'desktop') writeFrame(el('csPFrame'), PW, true);
    }, 16);
  }
  function renderCode(){ el('csCode').value = generateCode(); }

  // ---------- slides rail ----------
  function noPhonePic(s){ return !s.mobileImage || s.mobileImage === s.desktopImage; }
  function renderRail(){
    el('csSlides').innerHTML = slides.map(function(s, i){
      var title = [s.eyebrow, s.heading].filter(Boolean).join(' · ') || 'Untitled slide';
      return '<div class="cs-sl'+(i===active?' on':'')+'" data-i="'+i+'">' +
        '<div class="cs-th" style="background-color:'+esc(s.bgColor||'#ddd')+';'+(s.desktopImage?'background-image:url(\''+esc(s.desktopImage)+'\')':'')+'"><b>'+(i+1)+'</b></div>' +
        '<div class="cs-t">'+esc(title)+'</div>' + (noPhonePic(s) && s.desktopImage ? '<div class="cs-w">⚠ No phone picture</div>' : '') +
        '<div class="cs-tools"><button data-a="up" title="Move up">↑</button><button data-a="down" title="Move down">↓</button><button data-a="dup">Duplicate</button>'+(slides.length>1?'<button data-a="del">Delete</button>':'')+'</div></div>';
    }).join('');
    el('csSliderBtn').classList.toggle('on', panel === 'slider');
  }

  // ---------- right panel ----------
  function isLinked(c){
    var same = JSON.stringify(srcObj()[c.d]) === JSON.stringify(srcObj()[c.p]);
    // linked only while Phone really matches Desktop; any separate phone change unlinks it
    if(links[c.d] === undefined || !same) links[c.d] = same;
    return links[c.d];
  }
  function rangeInput(c, k, v){
    return '<div class="cs-rng"><input type="range" data-k="'+k+'" min="'+c.min+'" max="'+c.max+'" step="'+(c.step||1)+'" value="'+(v==null?0:v)+'"><input type="number" data-k="'+k+'" step="'+(c.step||1)+'" value="'+(v==null?'':v)+'"><small>'+(c.u||'')+'</small></div>';
  }
  function colorInput(k, v){
    return '<div class="cs-col"><input type="color" data-k="'+k+'" value="'+esc(/^#[0-9a-f]{6}$/i.test(v||'')?v:'#000000')+'"><input type="text" class="cs-hex" data-k="'+k+'" value="'+esc(v||'')+'" maxlength="7"></div>';
  }
  function uploadBtn(k){ return DATA.upload ? '<button class="cs-mini" data-upload="'+k+'">Upload image</button>' : ''; }
  function ctl(c){
    var s = srcObj();
    if(c.t === 'note') return '<p class="cs-note">'+esc(c.l)+'</p>';
    if(c.t === 'phonePlace'){
      return '<div class="cs-f"><span class="cs-lb">Where the text sits on the phone</span><div class="cs-seg" data-place><button data-v="over">On the picture</button><button data-v="under">Under the picture</button></div>' +
        '<p class="cs-note"><b>Under the picture</b>: puts the phone text at the bottom of the banner, centred, and clears the old one-by-one phone nudges. It does not change your picture, gradient or colours (those are under Background).<br><b>On the picture</b>: puts the text back in the middle.</p></div>';
    }
    if(c.t === 'imgs'){
      var warn = noPhonePic(s) && s.desktopImage ? '<div class="cs-warn"><b>No phone picture.</b> Phones get the wide desktop picture squeezed into a tall screen. Add a tall phone picture.</div>' : '';
      return warn +
        '<div class="cs-f"><label>Desktop picture</label><input type="url" data-k="desktopImage" value="'+esc(s.desktopImage)+'" placeholder="https://…">'+uploadBtn('desktopImage')+(s.desktopImage?'<div class="cs-thumb" style="background-image:url(\''+esc(s.desktopImage)+'\')"></div>':'')+'</div>' +
        '<div class="cs-f"><label>Phone picture</label><input type="url" data-k="mobileImage" value="'+esc(s.mobileImage)+'" placeholder="https://…">'+uploadBtn('mobileImage')+((s.mobileImage||s.desktopImage)?'<div class="cs-thumb cs-tall" style="background-image:url(\''+esc(s.mobileImage||s.desktopImage)+'\')"></div>':'')+'</div>';
    }
    if(c.t === 'gradient') return gradientUI();
    if(c.t === 'lineup'){
      var nd = nudged(s, false), np = nudged(s, true);
      if(!nd && !np) return '';
      return '<div class="cs-warn"><b>Some pieces are nudged out of line'+(nd&&np?' on desktop and phone':(nd?' on desktop':' on phone'))+'.</b> Pieces can no longer be moved one by one, only the whole text box.' +
        '<div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap">'+(nd?'<button class="cs-mini" data-lineup="d">Line it all up (desktop)</button>':'')+(np?'<button class="cs-mini" data-lineup="p">Line it all up (phone)</button>':'')+'</div></div>';
    }
    var v = s[c.d];
    if(c.p){
      var lk = isLinked(c);
      var input = function(k){
        var val = s[k];
        if(c.t === 'range') return rangeInput(c, k, val);
        if(c.t === 'color') return colorInput(k, val);
        if(c.t === 'seg') return '<div class="cs-seg">' + c.o.map(function(o){ return '<button data-k="'+k+'" data-v="'+o[0]+'" class="'+(val===o[0]?'on':'')+'">'+o[1]+'</button>'; }).join('') + '</div>';
        if(c.t === 'check') return '<label class="cs-chk"><input type="checkbox" data-k="'+k+'"'+(val?' checked':'')+'> On</label>';
        if(c.t === 'urlpair') return '<input type="url" data-k="'+k+'" value="'+esc(val)+'" placeholder="https://…">';
        return '';
      };
      return '<div class="cs-f cs-dual"><div class="cs-dh"><span class="cs-lb">'+esc(c.l)+'</span><button class="cs-link'+(lk?' on':'')+'" data-link="'+c.d+'" data-p="'+c.p+'" title="When on, Phone follows Desktop">🔗 '+(lk?'Phone follows Desktop':'Separate')+'</button></div>' +
        '<div class="cs-dv"><span>Desktop</span>'+input(c.d)+'</div><div class="cs-dv'+(lk?' off':'')+'"><span>Phone</span>'+input(c.p)+'</div></div>';
    }
    if(c.t === 'text' || c.t === 'url') return '<div class="cs-f"><label>'+esc(c.l)+'</label><input type="'+(c.t==='url'?'url':'text')+'" data-k="'+c.d+'" value="'+esc(v)+'"></div>';
    if(c.t === 'img') return '<div class="cs-f"><label>'+esc(c.l)+'</label><input type="url" data-k="'+c.d+'" value="'+esc(v)+'" placeholder="https://…">'+uploadBtn(c.d)+'</div>';
    if(c.t === 'area') return '<div class="cs-f"><label>'+esc(c.l)+'</label><textarea data-k="'+c.d+'">'+esc(v)+'</textarea></div>';
    if(c.t === 'number') return '<div class="cs-f"><label>'+esc(c.l)+'</label><input type="number" data-k="'+c.d+'" data-num value="'+(v==null?'':v)+'"></div>';
    if(c.t === 'check') return '<label class="cs-chk"><input type="checkbox" data-k="'+c.d+'"'+(v?' checked':'')+'> '+esc(c.l)+'</label>';
    if(c.t === 'color') return '<div class="cs-f"><label>'+esc(c.l)+'</label>'+colorInput(c.d, v)+'</div>';
    if(c.t === 'range') return '<div class="cs-f"><label>'+esc(c.l)+'</label>'+rangeInput(c, c.d, v)+'</div>';
    if(c.t === 'font' || c.t === 'weight' || c.t === 'select'){
      var o = c.t==='font' ? FONTS.concat(FONTS.indexOf(v)<0 && v ? [v] : []).map(function(x){ return [x,x]; }) : (c.t==='weight' ? WEIGHTS : c.o);
      return '<div class="cs-f"><label>'+esc(c.l)+'</label><select data-k="'+c.d+'">' + o.map(function(x){ return '<option value="'+esc(x[0])+'"'+(String(v)===String(x[0])?' selected':'')+(c.t==='font'?' style="font-family:\''+esc(x[0])+'\',sans-serif"':'')+'>'+esc(x[1])+'</option>'; }).join('') + '</select></div>';
    }
    return '';
  }
  var PIECE_NAMES = ['Eyebrow','Heading','Sub','Button'];
  function nudged(s, phone){
    return PIECE_NAMES.some(function(n){ var k = n.charAt(0).toLowerCase()+n.slice(1)+'Shift';
      return phone ? (Number(s['mobile'+n+'ShiftX'])||Number(s['mobile'+n+'ShiftY'])) : (Number(s[k+'X'])||Number(s[k+'Y'])); });
  }
  function curGrad(){
    var s = cur(), key = gDev==='d' ? 'gradient' : 'mobileGradient';
    if(!s.gradient) s.gradient = defaultGradient();
    if(!s[key]) s[key] = JSON.parse(JSON.stringify(s.gradient));
    return s[key];
  }
  function gradientUI(){
    var g = curGrad();
    var h = '<div class="cs-f"><div class="cs-seg" data-gdev><button data-v="d" class="'+(gDev==='d'?'on':'')+'">Desktop gradient</button><button data-v="p" class="'+(gDev==='p'?'on':'')+'">Phone gradient</button></div></div>' +
      '<div class="cs-f"><label>Type</label><select data-g="type"><option value="off"'+(g.type==='off'?' selected':'')+'>Off</option><option value="linear"'+(g.type==='linear'?' selected':'')+'>Linear</option><option value="radial"'+(g.type==='radial'?' selected':'')+'>Radial</option></select></div>';
    if(g.type !== 'off'){
      h += '<div class="cs-gbar"><i style="background:linear-gradient(90deg, '+gradientCssFromStops(g.stops)+')"></i></div>' +
        '<div class="cs-stops"><div class="cs-stop cs-stophd"><span>Colour</span><span>Opacity %</span><span>Position %</span><span></span></div>' +
        g.stops.map(function(st, i){ return '<div class="cs-stop"><input type="color" data-st="'+i+'" data-sk="color" value="'+esc(st.color)+'"><input type="number" data-st="'+i+'" data-sk="opacity" min="0" max="100" value="'+Math.round(st.opacity*100)+'"><input type="number" data-st="'+i+'" data-sk="pos" min="0" max="100" value="'+st.pos+'"><button class="cs-x" data-strm="'+i+'" title="Remove">×</button></div>'; }).join('') +
        '</div><button class="cs-mini" data-stadd>+ Add colour stop</button>';
      if(g.type === 'linear') h += '<div class="cs-f" style="margin-top:10px"><label>Angle</label>'+rangeG('angle', g.angle, 0, 360, '°')+'</div>';
      else h += '<div class="cs-f" style="margin-top:10px"><label>Centre left / right</label>'+rangeG('radialX', g.radialX, 0, 100, '%')+'</div><div class="cs-f"><label>Centre up / down</label>'+rangeG('radialY', g.radialY, 0, 100, '%')+'</div>';
    }
    h += '<button class="cs-mini" data-gcopy>Copy from '+(gDev==='d'?'Phone':'Desktop')+' gradient</button>';
    return h;
  }
  function rangeG(k, v, min, max, u){ return '<div class="cs-rng"><input type="range" data-g="'+k+'" min="'+min+'" max="'+max+'" value="'+v+'"><input type="number" data-g="'+k+'" value="'+v+'"><small>'+u+'</small></div>'; }

  function renderSide(){
    var side = el('csSide'), h;
    if(panel === 'slider'){
      h = '<div class="cs-who"><div class="cs-row1"><div><h2>Slider settings</h2><div class="cs-sub">Applies to every slide in this slider</div></div></div></div>';
      SLIDER.forEach(function(gp, i){ var id='slider'+i, o = openGroups[id] !== undefined ? openGroups[id] : false;
        h += '<details class="cs-grp" data-grp="'+id+'"'+(o?' open':'')+'><summary>'+gp[0]+'</summary><div class="cs-gb">'+gp[1].map(ctl).join('')+'</div></details>'; });
    } else {
      var P = PIECES[sel];
      h = '<div class="cs-who"><div class="cs-row1"><div><h2>'+P.name+'</h2><div class="cs-sub">Slide '+(active+1)+' · '+P.hint+'</div></div>'+(slides.length>1 && sel !== 'badge'?'<button class="cs-all" id="csApplyAll" title="Copy this look (not text or links) to every slide">Apply to all slides</button>':'')+'</div>' +
        '<div class="cs-chips">' + Object.keys(PIECES).map(function(k){ return '<button data-pick="'+k+'" class="'+(k===sel?'on':'')+'">'+PIECES[k].name+'</button>'; }).join('') + '</div></div>';
      var groups = P.groups;
      if(sel === 'badge'){
        var bl = Array.isArray(cur().badges) ? cur().badges : [];
        if(badgeIdx >= bl.length) badgeIdx = Math.max(0, bl.length - 1);
        h += '<div class="cs-f cs-badges"><div class="cs-seg">' + bl.map(function(b, i){ return '<button data-badge-pick="'+i+'" class="'+(i===badgeIdx?'on':'')+'">'+esc(b.label || ('Badge '+(i+1)))+'</button>'; }).join('') + '</div>' +
          '<div style="display:flex;gap:10px;margin-top:8px"><button class="cs-mini" data-badge-add>+ Add badge</button>'+(bl.length?'<button class="cs-mini" data-badge-del>Delete this badge</button>':'')+'</div></div>';
        if(!bl.length){ groups = []; h += '<p class="cs-note">No badges on this slide yet. Press <b>+ Add badge</b>, then drag it where you want it on the Desktop and Phone previews.</p>'; }
      }
      groups.forEach(function(gp, i){ var id = sel+i, o = openGroups[id] !== undefined ? openGroups[id] : (sel === 'badge' && i === 0);
        h += '<details class="cs-grp" data-grp="'+id+'"'+(o?' open':'')+'><summary>'+gp[0]+'</summary><div class="cs-gb">'+gp[1].map(ctl).join('')+'</div></details>'; });
    }
    var top = side.scrollTop; side.innerHTML = h; side.scrollTop = top;
    var place = side.querySelector('[data-place]');
    if(place){ var under = cur().mobileContentAlign === 'flex-end'; place.querySelectorAll('button').forEach(function(b){ b.classList.toggle('on', (b.getAttribute('data-v')==='under') === under); }); }
  }
  function linkedPhoneKey(k){
    var found = null;
    Object.keys(PIECES).forEach(function(p){ if((p === 'badge') !== (sel === 'badge' && panel === 'piece')) return; PIECES[p].groups.forEach(function(g){ g[1].forEach(function(c){ if(c.p && c.d === k && links[c.d]) found = c.p; }); }); });
    return found;
  }
  function setVal(k, v){
    if(panel === 'piece' && sel === 'badge'){ var bb = curBadge(); if(!bb) return; bb[k] = v; var bpk = linkedPhoneKey(k); if(bpk) bb[bpk] = v; markDirty(); return; }
    var s = cur(); s[k] = v;
    var pk = linkedPhoneKey(k); if(pk) s[pk] = v;
    if(SLIDER_KEYS.indexOf(k) >= 0) slides.forEach(function(x){ x[k] = v; });
    markDirty();
  }
  function select(k, keepPreview){
    panel = 'piece'; sel = k; renderRail(); renderSide();
    if(!keepPreview) renderPreviews();
    else ['csDFrame','csPFrame'].forEach(function(id){ var d = el(id).contentDocument; if(!d) return;
      markSel(d); });
  }
  function refresh(){ renderRail(); renderSide(); renderPreviews(); renderCode(); }

  // ---------- panel events ----------
  var side = el('csSide');
  side.addEventListener('input', function(e){
    var t = e.target, k = t.getAttribute('data-k');
    if(k){
      var v = t.type === 'checkbox' ? t.checked : t.value;
      if(t.type === 'range' || t.type === 'number') v = (v === '' ? null : Number(v));
      if(t.classList.contains('cs-hex')){ if(!/^#[0-9a-f]{6}$/i.test(v)) return; }
      setVal(k, v);
      // keep the twin inputs (slider + number box, colour + hex) in step
      var box = t.closest('.cs-rng, .cs-col');
      if(box) box.querySelectorAll('[data-k="'+k+'"]').forEach(function(x){ if(x !== t) x.value = v == null ? '' : v; });
      var pk = linkedPhoneKey(k);
      if(pk) side.querySelectorAll('[data-k="'+pk+'"]').forEach(function(x){ if(x.type==='checkbox') x.checked = v; else x.value = v == null ? '' : v; });
      if(k === 'desktopImage' || k === 'mobileImage' || k === 'eyebrow' || k === 'heading') renderRail();
      if(sel === 'badge' && k === 'label'){ var bt = side.querySelector('[data-badge-pick="'+badgeIdx+'"]'); if(bt) bt.textContent = v || ('Badge '+(badgeIdx+1)); }
      if(k === 'overlayType' || k === 'desktopImage' || k === 'mobileImage') renderSide();
      renderPreviews(); renderCode(); return;
    }
    var gk = t.getAttribute('data-g');
    if(gk){
      var g = curGrad(); g[gk] = gk === 'type' ? t.value : Number(t.value);
      markDirty();
      if(gk === 'type') renderSide(); else side.querySelectorAll('[data-g="'+gk+'"]').forEach(function(x){ if(x !== t) x.value = t.value; });
      renderPreviews(); renderCode(); return;
    }
    var st = t.getAttribute('data-st');
    if(st != null){
      var sk = t.getAttribute('data-sk'), sv = sk === 'color' ? t.value : Number(t.value);
      if(sk === 'opacity') sv = Math.max(0, Math.min(1, sv/100));
      if(sk === 'pos') sv = Math.max(0, Math.min(100, sv));
      curGrad().stops[Number(st)][sk] = sv; markDirty();
      var bar = side.querySelector('.cs-gbar i'); if(bar) bar.style.background = 'linear-gradient(90deg, '+gradientCssFromStops(curGrad().stops)+')';
      renderPreviews(); renderCode();
    }
  });
  side.addEventListener('click', function(e){
    var t = e.target;
    var pick = t.closest('[data-pick]'); if(pick){ select(pick.getAttribute('data-pick')); return; }
    var bp = t.closest('[data-badge-pick]'); if(bp){ badgeIdx = Number(bp.getAttribute('data-badge-pick')); links = {}; renderSide(); renderPreviews(); return; }
    if(t.closest('[data-badge-add]')){ var sb = cur(); if(!Array.isArray(sb.badges)) sb.badges = []; sb.badges.push(badgeDefaults()); badgeIdx = sb.badges.length - 1; links = {}; markDirty(); renderSide(); renderPreviews(); renderCode(); toast('Badge added. Drag it on the previews to place it.'); return; }
    if(t.closest('[data-badge-del]')){ var sd = cur(); if(Array.isArray(sd.badges) && sd.badges[badgeIdx] && window.confirm('Delete this badge?')){ sd.badges.splice(badgeIdx, 1); if(!sd.badges.length) delete sd.badges; badgeIdx = 0; markDirty(); renderSide(); renderPreviews(); renderCode(); } return; }
    var sg = t.closest('.cs-seg button[data-k]'); if(sg){ setVal(sg.getAttribute('data-k'), sg.getAttribute('data-v')); renderSide(); renderPreviews(); renderCode(); return; }
    var ln = t.closest('[data-link]');
    if(ln){ var d = ln.getAttribute('data-link'), p = ln.getAttribute('data-p'); links[d] = !links[d]; if(links[d]) srcObj()[p] = JSON.parse(JSON.stringify(srcObj()[d])); markDirty(); renderSide(); renderPreviews(); renderCode(); return; }
    var pl = t.closest('[data-place] button');
    if(pl){
      var s = cur();
      if(pl.getAttribute('data-v') === 'under'){
        ['Eyebrow','Heading','Sub','Button'].forEach(function(n){ s['mobile'+n+'ShiftX'] = 0; s['mobile'+n+'ShiftY'] = 0; });
        s.mobileContentShiftX = 0; s.mobileContentShiftY = 0;
        s.mobileContentAlign = 'flex-end'; s.mobileContentSide = 'center'; s.mobileTextAlign = 'center';
        toast('Phone: text moved to the bottom, centred. Picture and colours unchanged.');
      } else { s.mobileContentAlign = 'center'; toast('Phone: text on the picture'); }
      markDirty(); renderSide(); renderPreviews(); renderCode(); return;
    }
    var lu = t.closest('[data-lineup]');
    if(lu){ var sx = cur(), ph = lu.getAttribute('data-lineup') === 'p';
      PIECE_NAMES.forEach(function(n){ var k = n.charAt(0).toLowerCase()+n.slice(1)+'Shift';
        if(ph){ sx['mobile'+n+'ShiftX'] = 0; sx['mobile'+n+'ShiftY'] = 0; } else { sx[k+'X'] = 0; sx[k+'Y'] = 0; } });
      markDirty(); renderSide(); renderPreviews(); renderCode(); toast('Lined up on '+(ph?'phone':'desktop')+'. Drag the text box to place it.'); return; }
    var gd = t.closest('[data-gdev] button'); if(gd){ gDev = gd.getAttribute('data-v'); renderSide(); return; }
    if(t.closest('[data-stadd]')){ curGrad().stops.push({pos:100, color:'#000000', opacity:0}); markDirty(); renderSide(); renderPreviews(); renderCode(); return; }
    var rm = t.closest('[data-strm]'); if(rm){ var g = curGrad(); if(g.stops.length > 2){ g.stops.splice(Number(rm.getAttribute('data-strm')), 1); markDirty(); renderSide(); renderPreviews(); renderCode(); } else toast('A gradient needs at least 2 stops'); return; }
    if(t.closest('[data-gcopy]')){ var s2 = cur(), mine = gDev==='d' ? 'gradient' : 'mobileGradient', other = gDev==='d' ? 'mobileGradient' : 'gradient'; s2[mine] = JSON.parse(JSON.stringify(s2[other] || s2.gradient || defaultGradient())); markDirty(); renderSide(); renderPreviews(); renderCode(); return; }
    var up = t.closest('[data-upload]');
    if(up){
      var key = up.getAttribute('data-upload'), file = document.createElement('input');
      file.type = 'file'; file.accept = 'image/png,image/jpeg,image/webp,image/gif';
      file.onchange = function(){
        var f = file.files && file.files[0]; if(!f) return;
        up.disabled = true; up.textContent = 'Uploading…';
        Promise.resolve(DATA.upload(f)).then(function(url){ setVal(key, url); refresh(); toast('Image added'); })
          .catch(function(err){ toast('Upload failed: ' + err.message); })
          .then(function(){ up.disabled = false; up.textContent = 'Upload image'; });
      };
      file.click(); return;
    }
    if(t.id === 'csApplyAll'){
      var keys = [];
      PIECES[sel].groups.forEach(function(g){ g[1].forEach(function(c){ if(c.d && ['text','area','url','urlpair','img'].indexOf(c.t) < 0){ keys.push(c.d); if(c.p) keys.push(c.p); } }); });
      if(sel === 'bg') keys = keys.concat(['gradient','mobileGradient']);
      slides.forEach(function(x, i){ if(i !== active) keys.forEach(function(k){ x[k] = JSON.parse(JSON.stringify(cur()[k])); }); });
      markDirty(); renderCode(); toast(PIECES[sel].name+' look copied to all '+slides.length+' slides (text and links not changed)'); return;
    }
  });
  side.addEventListener('toggle', function(e){ var g = e.target.getAttribute && e.target.getAttribute('data-grp'); if(g) openGroups[g] = e.target.open; }, true);

  // ---------- slides rail events ----------
  el('csSlides').addEventListener('click', function(e){
    var card = e.target.closest('.cs-sl'); if(!card) return;
    var i = Number(card.getAttribute('data-i')), a = e.target.getAttribute('data-a');
    if(a === 'up'){ if(i > 0){ slides.splice(i-1, 0, slides.splice(i,1)[0]); active = i-1; markDirty(); } }
    else if(a === 'down'){ if(i < slides.length-1){ slides.splice(i+1, 0, slides.splice(i,1)[0]); active = i+1; markDirty(); } }
    else if(a === 'dup'){ slides.splice(i+1, 0, JSON.parse(JSON.stringify(slides[i]))); active = i+1; if(DATA.language === 'en') localeOps.push({ type:'duplicate', sourceIndex:i, targetIndex:i+1 }); markDirty(); }
    else if(a === 'del'){ if(slides.length > 1 && window.confirm('Delete slide '+(i+1)+'?')){ slides.splice(i,1); active = Math.max(0, Math.min(active, slides.length-1)); markDirty(); } }
    else active = i;
    links = {}; if(panel === 'slider') panel = 'piece';
    refresh();
  });
  el('csAdd').onclick = function(){
    var n = defaults();
    SLIDER_KEYS.forEach(function(k){ n[k] = JSON.parse(JSON.stringify(slides[0][k])); });
    n.heading = 'New slide'; n.headingColor = '#ffffff'; n.bgColor = '#222222';
    slides.push(n); active = slides.length-1; links = {}; markDirty(); select('heading'); renderCode();
  };
  el('csSliderBtn').onclick = function(){ panel = panel === 'slider' ? 'piece' : 'slider'; renderRail(); renderSide(); renderPreviews(); };
  el('csView').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; view = b.getAttribute('data-v'); try { localStorage.setItem('cs-view', view); } catch(err){} renderPreviews(); });
  el('csDeskW').addEventListener('click', function(e){ var b = e.target.closest('button'); if(!b) return; deskW = Number(b.getAttribute('data-w')); renderPreviews(); });

  // ---------- top bar ----------
  el('csTitle').value = DATA.title || '';
  el('csTitle').addEventListener('input', markDirty);
  el('csMoreBtn').onclick = function(e){ e.stopPropagation(); el('csMore').classList.toggle('open'); };
  document.addEventListener('click', function(e){
    if(!e.target.closest('#csMore')) el('csMore').classList.remove('open');
    if(e.target.closest('[data-close]')) root.querySelectorAll('.cs-modal').forEach(function(m){ m.classList.remove('open'); });
  });
  root.querySelectorAll('.cs-modal').forEach(function(m){ m.addEventListener('click', function(e){ if(e.target === m) m.classList.remove('open'); }); });
  el('csCopyCode').onclick = function(){ copyText(generateCode(), 'Embed code'); };
  el('csCopyCode2').onclick = function(){ copyText(generateCode(), 'Embed code'); };
  el('csCopyJson').onclick = function(){ el('csMore').classList.remove('open'); copyText(JSON.stringify(slides), 'Project JSON'); };
  el('csHelp').onclick = function(){ el('csMore').classList.remove('open'); el('csHelpM').classList.add('open'); };
  el('csNew').onclick = function(){
    el('csMore').classList.remove('open');
    if(!window.confirm('Start a new blank banner in this project? Unsaved changes will be replaced.')) return;
    slides = [defaults()]; active = 0; links = {}; markDirty(); select('heading'); renderCode();
  };
  el('csImport').onclick = function(){ el('csMore').classList.remove('open'); el('csImportArea').value = ''; el('csImportMsg').textContent = ''; el('csImportM').classList.add('open'); };
  el('csDoImport').onclick = function(){
    var raw = el('csImportArea').value.trim(), msg = el('csImportMsg');
    if(!raw){ msg.textContent = 'Paste code or project JSON first.'; return; }
    try{
      var parsed, marker = raw.match(/(?:JCS-PROJECT-DATA|WABB-DATA)-BEGIN\s*([\s\S]*?)\s*(?:JCS-PROJECT-DATA|WABB-DATA)-END/);
      if(marker) parsed = JSON.parse(marker[1]);
      else { try { parsed = JSON.parse(raw); } catch(jsonError){ parsed = importLegacyCode(raw); } }
      if(parsed && !Array.isArray(parsed) && Array.isArray(parsed.slides)) parsed = parsed.slides;
      if(!Array.isArray(parsed) || !parsed.length) throw new Error('Empty project');
      slides = parsed.map(function(slide){ var m = Object.assign(defaults(), slide); m.heading = normalizeStoredText(m.heading); m.subheading = normalizeStoredText(m.subheading); m.eyebrow = normalizeStoredText(m.eyebrow); m.buttonText = normalizeStoredText(m.buttonText); return m; });
      active = 0; links = {}; markDirty(); refresh();
      msg.className = 'cs-msg ok'; msg.textContent = 'Loaded '+slides.length+' slide(s). Click Save to keep them.';
      setTimeout(function(){ el('csImportM').classList.remove('open'); }, 1100);
    } catch(err){ msg.className = 'cs-msg err'; msg.textContent = "Couldn't read that. Paste code exported by this studio, Wheels Banner Studio code, or project JSON."; }
  };
  el('csLive').onclick = function(){
    var w = window.open('', 'cs-live-preview');
    if(!w){ toast('Allow pop-ups to open the live preview'); return; }
    var bs = bannerSettings(), dh = Number(slides[0].desktopHeight||490), ph = Number(slides[0].mobileHeight||620), vw = Math.max(deskW, bs.breakpoint+1);
    var doc = previewDocument();
    w.document.open();
    w.document.write('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Live preview · '+esc(el('csTitle').value||'Banner')+'</title><style>body{margin:0;background:#e9e9e9;font:13px system-ui,sans-serif;color:#222}.bar{position:sticky;top:0;background:#141414;color:#ddd;padding:9px 16px;z-index:2}.bar b{color:#fff}.wrap{display:flex;flex-wrap:wrap;gap:24px;justify-content:center;padding:24px 16px}.box{overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.18);background:#fff}iframe{border:0;display:block}h4{margin:0 0 6px;font-weight:600}</style></head><body>' +
      '<div class="bar"><b>Live preview</b> · '+esc(el('csTitle').value||'Banner')+' · '+esc(DATA.languageLabel||'English')+' · all '+slides.length+' slides, autoplay on · links open in a new tab</div>' +
      '<div class="wrap"><div><h4>Desktop · '+deskW+' × '+dh+'</h4><div class="box" style="width:'+deskW+'px;max-width:calc(100vw - 32px)"><iframe id="d" style="width:'+vw+'px;height:'+dh+'px"></iframe></div></div>' +
      '<div><h4>Phone · '+PW+' × '+ph+'</h4><div class="box" style="width:'+PW+'px"><iframe id="p" style="width:'+PW+'px;height:'+ph+'px"></iframe></div></div></div></body></html>');
    w.document.close();
    var bodyFix = function(width){ return doc.replace('<body>', '<body style="width:'+width+'px">'); };
    w.document.getElementById('d').srcdoc = bodyFix(deskW);
    w.document.getElementById('p').srcdoc = bodyFix(PW);
  };
  if(el('csTranslate')) el('csTranslate').onclick = function(){
    var btn = this;
    if(!window.confirm('Translate the English text into French? You can edit the French wording afterwards.')) return;
    btn.disabled = true; btn.textContent = 'Translating…';
    Promise.resolve(DATA.translate()).then(function(result){
      if(Array.isArray(result) && result.length){ slides = result; active = 0; links = {}; markDirty(); refresh(); toast('Translated. Check the French wording, then Save.'); }
    }).catch(function(err){ toast('Translation failed: ' + err.message); }).then(function(){ btn.disabled = false; btn.textContent = 'Translate EN → FR'; });
  };

  function doSave(){
    var status = el('csStatus'), btn = el('csSave');
    btn.disabled = true; status.textContent = 'Saving…';
    Promise.resolve().then(function(){ return DATA.save({ data: slides, title: el('csTitle').value, code: generateCode(), localeOps: localeOps }); })
      .then(function(){ localeOps = []; dirty = false; status.textContent = 'All changes saved'; btn.disabled = false; toast('Saved'); })
      .catch(function(err){ status.textContent = 'Save failed: ' + err.message; btn.disabled = false; });
  }
  el('csSave').onclick = doSave;
  window.addEventListener('beforeunload', function(e){ if(!dirty) return; e.preventDefault(); e.returnValue = ''; });
  document.addEventListener('keydown', function(e){
    if((e.ctrlKey || e.metaKey) && e.key === 's'){ e.preventDefault(); doSave(); }
    if(e.key === 'Escape') root.querySelectorAll('.cs-modal.open').forEach(function(m){ m.classList.remove('open'); });
  });
  window.addEventListener('resize', renderPreviews);

  // ---------- init ----------
  // Wait for the empty preview frames to finish loading once; writing into them earlier
  // gets wiped by their own first load (and with it the click/drag wiring).
  renderRail(); renderSide(); renderCode();
  var framesLeft = 2, started = false;
  function startPreviews(){ if(started) return; started = true; renderPreviews(); }
  ['csDFrame','csPFrame'].forEach(function(id){
    var f = el(id);
    f.addEventListener('load', function once(){ f.removeEventListener('load', once); if(--framesLeft === 0) startPreviews(); });
    f.src = 'about:blank';
  });
  setTimeout(startPreviews, 800);

})();
