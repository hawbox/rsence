
HClass=function(){if(arguments.length){if(this===window){HClass.prototype.extend.call(arguments[0],arguments.callee.prototype);}
else{this.extend(arguments[0]);}}};HClass.prototype={extend:function(_s0,_1){var _h0=HClass.prototype.extend;if(arguments.length===2){var _73=this[_s0];if((_73 instanceof Function)&&(_1 instanceof Function)&&_73.valueOf()!==_1.valueOf()&&(/\bbase\b/).test(_1)){var _e0=_1;_1=function(){var _z8=this.base;this.base=_73;var _y8=_e0.apply(this,arguments);this.base=_z8;return _y8;};_1.valueOf=function(){return _e0;};_1.toString=function(){return String(_e0);};}
return this[_s0]=_1;}else if(_s0){var _c0={toSource:null};var _r4=["toString","valueOf"];if(HClass._83){_r4.push("constructor");}
for(var i=0;(_i=_r4[i]);i++){if(_s0[_i]!==_c0[_i]){_h0.call(this,_i,_s0[_i]);}}
for(var _i in _s0){if(!_c0[_i]){_h0.call(this,_i,_s0[_i]);}}}
this.nu=function(){return new(this.extend({constructor:function(args){this.base.apply(this,args);}}))(arguments);};return this;},base:function(){}};HClass.extend=function(_Q,_93){var _h0=HClass.prototype.extend;if(!_Q){_Q={};}
HClass._83=true;var _c0=new this;_h0.call(_c0,_Q);var _l1=_c0.constructor;_c0.constructor=this;delete HClass._83;var _F0=function(){if(!HClass._83){_l1.apply(this,arguments);}
this.constructor=_F0;};_F0.prototype=_c0;_F0.extend=this.extend;_F0.implement=this.implement;_F0.toString=function(){return String(_l1);};_h0.call(_F0,_93);var _a3=(_l1!==null)?_F0:_c0;if(_a3.init instanceof Function){_a3.init();}
return _a3;};HClass.implement=function(_I1){if(_I1 instanceof Function){_I1=_I1.prototype;}
this.prototype.extend(_I1);};var Base=HClass;if([]['indexOf']===undefined){Object.extend=function(destination,source){for(property in source){destination[property]=source[property];}
return destination;};Object.extend(Array.prototype,{indexOf:function(_w8){var i=0,l=this.length;for(;i<l;i++){if(this[i]===_w8){return i;}}
return-1;}});}
COMM={_Na:function(){alert("'ERROR: This web browser doesn't support XMLHttpRequest. Please upgrade; unable to continue.");},_w4:function(_0){if(_0.X.readyState===4){var _i2=_0.X.status,_A4='on'+_i2,_x8=((_i2>=200&&_i2<300)||(_i2===0));_0[_A4]?_0[_A4](_0):_x8?_0.onSuccess(_0):_0.onFailure(_0);}},_b3:function(_D1){var i=0,_w0=_D1.length,_c3='';for(;i<_w0;i++){_c3+=encodeURIComponent(_D1[i]);_c3+=(i===_w0-1)?'':(i%2===0)?'=':'&';}
return _c3;},request:function(_y,_4){var _b2=COMM,_0=_4?_4:{},_e0=_4.method?_4.method.toUpperCase():'GET',_a1=(_4.async===undefined)?true:_4.async,_D1=_4.params?_4.params:[],_d3=_4.headers?_4.headers:{},_V0=_4.contentType?_4.contentType:'application/x-www-form-urlencoded',_B8=_4.charset?_4.charset:'UTF-8',_C8=_4.username?_4.username:null,_D8=_4.username?_4.password:null;if(!_4.onFailure){_0.onFailure=function(resp){console.log('No failure handler specified, response: ',resp);};}
if(!_4.onSuccess){_0.onSuccess=function(resp){console.log('No success handler specified, response: ',resp);};}
_0.url=_y;_0.options=_4;_0.X=_b2._e3();if(_e0==='GET'&&_D1.length!==0){_y+=((_y.indexOf('?')!==-1)?'&':'?')+_b2._b3(_D1);}
if(!_a1){console.log("WARNING: Synchronous "+_e0+" request to "+_y+", these will fail on the Symbian web browser.");}
_0.X.open(_e0,_y,_a1,_C8,_D8);_0.X.onreadystatechange=function(){_b2._w4(_0);};if(_e0==='POST'){_d3['Content-Type']=_V0+'; charset='+_B8;var _54=_4.body?_4.body:'';for(var _D4 in _d3){_0.X.setRequestHeader(_D4,_d3[_D4]);}
_0.X.send(_54);}
else if(_e0==='GET'){_0.X.send(null);}
if(!_a1){_b2._w4(_0);}
return _0;}};if(window['XMLHttpRequest']!==undefined){COMM._e3=function(){return new XMLHttpRequest();};}
else if(BROWSER_TYPE.ie){COMM._e3=function(){return new ActiveXObject("Msxml2.XMLHTTP");};}
else{COMM._e3=function(){console.log("No XMLHttpRequest object types known. Can't Communicate.");return new COMM._Ga();};}
HSystem=HClass.extend({windowFocusBehaviour:1,constructor:null,apps:[],appPriorities:[],busyApps:[],freeAppIds:[],defaultInterval:10,defaultPriority:20,viewsZOrder:[],ticks:0,maxAppRunTime:5000,scheduler:function(){for(var _l=0;_l<this.apps.length;_l++){if(this.apps[_l]){if(!this.busyApps[_l]){if((this.ticks%this.appPriorities[_l])===0){if(HSystem.apps[_l]){HSystem.apps[_l]._x4();}}}}}
if(this._j1.length!==0){this._G8();}},ticker:function(){this.ticks++;this.scheduler();this._Ha=setTimeout(function(){HSystem.ticker();},this.defaultInterval);},addApp:function(_y0,_S){var _l;if(this.freeAppIds.length!==0){_l=this.freeAppIds.unshift();this.apps[_l]=_y0;}else{this.apps.push(_y0);_l=this.apps.length-1;}
_y0.parent=this;_y0.parents=[this];_y0.appId=_l;this.startApp(_l,_S);return _l;},startApp:function(_l,_S){if(_S===undefined){_S=this.defaultInterval;}
this.appPriorities[_l]=_S;this.busyApps[_l]=false;},stopApp:function(_l){this.busyApps[_l]=true;},reniceApp:function(_l,_S){this.appPriorities[_l]=_S;},killApp:function(_l,_V4){if(!_V4){var _q6=new Date().getTime();while(this.busyApps[_l]===true){if(new Date().getTime()>_q6+this.maxAppRunTime){break;}}}
this.busyApps[_l]=true;this.apps[_l].destroyAllViews();this.apps[_l]=null;this.freeAppIds.push(_l);},views:[],_f3:[],addView:function(_c){var _f2;if(this._f3.length===0){_f2=this.views.length;this.views.push(_c);}
else{_f2=this._f3.pop();this.views[_f2]=_c;}
return _f2;},delView:function(_e){this.views[_e]=null;this._f3.push(_e);},activeWindowId:0,windowFocus:function(_c){if(!_c){this.activeWindowId=0;return;}
var _K2=this.activeWindowId,_R=this.views,_e=_c.viewId;if(_R[_K2]){if(_R[_K2]["windowBlur"]){_R[_K2].windowBlur();}}
this.activeWindowId=_e;_c.bringToFront();_c.windowFocus();},_j1:[],updateZIndexOfChildren:function(_e){if(this._j1.indexOf(_e)===-1){this._j1.push(_e);}},_G8:function(){var j=0,_0=HSystem,_W4=this._j1,_36=_W4.length;for(;j<_36;j++){var _e=_W4.shift(),_R=((_e===null)?(_0.viewsZOrder):(_0.views[_e].viewsZOrder)),_46=_R.length,_v1=ELEM.setStyle,_P3=_0.views,_P4,_c,_56='elemId',_66='z-index',i=0,_6;for(;i<_46;i++){_P4=_R[i];_c=_P3[_P4];_6=_c[_56];_v1(_6,_66,i);}}}});LOAD(function(){HSystem.ticker();});HApplication=HClass.extend({componentBehaviour:['app'],constructor:function(_S,_f){this.viewId=null;this.views=[];this.markupElemIds=[];this.viewsZOrder=HSystem.viewsZOrder;HSystem.addApp(this,_S);if(_f){this.label=_f;}
else{this.label='ProcessID='+this.appId;}},buildParents:function(_e){var _c=HSystem.views[_e],i=0;_c.parent=this;_c.parents=[];for(;i<this.parents.length;i++){_c.parents.push(this.parents[i]);}
_c.parents.push(this);},addView:function(_c){var _e=HSystem.addView(_c);this.views.push(_e);this.buildParents(_e);this.viewsZOrder.push(_e);return _e;},removeView:function(_e){HSystem.views[_e].remove();},destroyView:function(_e){HSystem.views[_e].die();},die:function(){HSystem.killApp(this.appId,false);},destroyAllViews:function(){for(var i=0;i<this.views.length;i++){HSystem.views[this.views[i]].die();}},_76:function(){var i,_e,_c;for(i=0;i<this.views.length;i++){_e=this.views[i];_c=HSystem.views[_e];if((_c!==null)&&(_c['onIdle']!==undefined)){_c.onIdle();}}},_x4:function(){HSystem.busyApps[this.appId]=true;this.onIdle();this._76();HSystem.busyApps[this.appId]=false;},onIdle:function(){}});LOAD(function(){COMM.URLResponder.implement(HValueResponder);COMM.urlResponder=COMM.URLResponder.nu();urlResponder=COMM.urlResponder;COMM.Transporter.url=HCLIENT_HELLO;COMM.Transporter.stop=false;COMM.Transporter.sync();});HValue=HClass.extend({constructor:function(_2,_1){this.id=_2;this.type='[HValue]';this.value=_1;this.views=[];if(_2){COMM.Values.add(_2,this);}},die:function(){for(var _U=0;_U<this.views.length;_U++){var _g3=this.views[_U];_g3.setValueObj(HDummyValue.nu());this.views.splice(_U,1);}
if(this.id){COMM.Values.del(this.id);}},set:function(_1){if(this.differs(_1)){this.value=_1;if(this.id){COMM.Values.changed(this);}
this.refresh();}},differs:function(_1){return(COMM.Values.encode(_1)!==COMM.Values.encode(this.value));},s:function(_1){this.value=_1;this.refresh();},get:function(){return this.value;},bind:function(_K){if(_K===undefined){throw("HValueBindError: responder is undefined!");}
if(this.views.indexOf(_K)===-1){this.views.push(_K);_K.setValueObj(this);}},unbind:function(_K){for(var _U=0;_U<this.views.length;_U++){var _g3=this.views[_U];if(_g3===_K){this.views.splice(_U,1);return;}}},release:function(_K){return this.unbind(_K);},refresh:function(){for(var _U=0;_U<this.views.length;_U++){var _K=this.views[_U];if(_K.value!==this.value){if(!_K._K4){_K._K4=true;_K.setValue(this.value);_K._K4=false;}}}}});COMM.JSLoader=HClass.extend({constructor:function(_86){var _0=this;_0._L4=[];_0.uri=_86;_0._Ka=false;},_96:function(_0,_f0){console.log("failed to load js: "+_f0.url);},load:function(_x1){var _0=this;if((_0._L4.indexOf(_x1)!==-1)){return;}
COMM.Queue.pause();_0._L4.push(_x1);if(BROWSER_TYPE.ie||BROWSER_TYPE.symbian){_0._Ma=COMM.request(_0.uri+_x1+'.js',{onSuccess:function(_f0){COMM.Queue.unshiftEval(_f0.X.responseText);COMM.Queue.resume();},onFailure:_0._96,method:'GET',async:true});}
else{var _J1=document.createElement('script');_J1.onload=function(){COMM.Queue.resume();};_J1.src=_0.uri+_x1+'.js';_J1.type='text/javascript';document.getElementsByTagName('head')[0].appendChild(_J1);}}});JSLoader=COMM.JSLoader;LOAD(function(){COMM.jsLoader=COMM.JSLoader.nu(HCLIENT_BASE+'/js/');jsLoader=COMM.jsLoader;});