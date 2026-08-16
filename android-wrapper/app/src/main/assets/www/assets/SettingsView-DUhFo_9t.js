import{a as fe,l as be,c as te,b as i,o as oe,e as G,n as y,aj as ie,d as pe,au as X,h as c,r as z,s as ge,a0 as me,f as we,u as ae,z as ye,w as M,x as xe,i as ke,j as H,C as Q,k as A,a5 as Z,av as x,D as _e,_ as Se,E as Ce,F as Re,G as Be,I as h,K as k,H as n,aw as $e,ax as Ve,T as ze,Z as Ae,Q as Me,R as Ie,U as j,Y as Ue,ay as Le,az as Oe}from"./index-CDXgW5FJ.js";import{g as Fe,s as ee,c as Ke}from"./ai-DKlSbhC7.js";import{c as Pe}from"./useTasks-D-tgx2ES.js";const We={buttonHeightSmall:"14px",buttonHeightMedium:"18px",buttonHeightLarge:"22px",buttonWidthSmall:"14px",buttonWidthMedium:"18px",buttonWidthLarge:"22px",buttonWidthPressedSmall:"20px",buttonWidthPressedMedium:"24px",buttonWidthPressedLarge:"28px",railHeightSmall:"18px",railHeightMedium:"22px",railHeightLarge:"26px",railWidthSmall:"32px",railWidthMedium:"40px",railWidthLarge:"48px"};function je(t){const{primaryColor:r,opacityDisabled:b,borderRadius:u,textColor3:p}=t;return Object.assign(Object.assign({},We),{iconColor:p,textColor:"white",loadingColor:r,opacityDisabled:b,railColor:"rgba(0, 0, 0, .14)",railColorActive:r,buttonBoxShadow:"0 1px 4px 0 rgba(0, 0, 0, 0.3), inset 0 0 1px 0 rgba(0, 0, 0, 0.05)",buttonColor:"#FFF",railBorderRadiusSmall:u,railBorderRadiusMedium:u,railBorderRadiusLarge:u,buttonBorderRadiusSmall:u,buttonBorderRadiusMedium:u,buttonBorderRadiusLarge:u,boxShadowFocus:`0 0 0 2px ${be(r,{alpha:.2})}`})}const Te={common:fe,self:je},Ne=te("switch",`
 height: var(--n-height);
 min-width: var(--n-width);
 vertical-align: middle;
 user-select: none;
 -webkit-user-select: none;
 display: inline-flex;
 outline: none;
 justify-content: center;
 align-items: center;
`,[i("children-placeholder",`
 height: var(--n-rail-height);
 display: flex;
 flex-direction: column;
 overflow: hidden;
 pointer-events: none;
 visibility: hidden;
 `),i("rail-placeholder",`
 display: flex;
 flex-wrap: none;
 `),i("button-placeholder",`
 width: calc(1.75 * var(--n-rail-height));
 height: var(--n-rail-height);
 `),te("base-loading",`
 position: absolute;
 top: 50%;
 left: 50%;
 transform: translateX(-50%) translateY(-50%);
 font-size: calc(var(--n-button-width) - 4px);
 color: var(--n-loading-color);
 transition: color .3s var(--n-bezier);
 `,[oe({left:"50%",top:"50%",originalTransform:"translateX(-50%) translateY(-50%)"})]),i("checked, unchecked",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 box-sizing: border-box;
 position: absolute;
 white-space: nowrap;
 top: 0;
 bottom: 0;
 display: flex;
 align-items: center;
 line-height: 1;
 `),i("checked",`
 right: 0;
 padding-right: calc(1.25 * var(--n-rail-height) - var(--n-offset));
 `),i("unchecked",`
 left: 0;
 justify-content: flex-end;
 padding-left: calc(1.25 * var(--n-rail-height) - var(--n-offset));
 `),G("&:focus",[i("rail",`
 box-shadow: var(--n-box-shadow-focus);
 `)]),y("round",[i("rail","border-radius: calc(var(--n-rail-height) / 2);",[i("button","border-radius: calc(var(--n-button-height) / 2);")])]),ie("disabled",[ie("icon",[y("rubber-band",[y("pressed",[i("rail",[i("button","max-width: var(--n-button-width-pressed);")])]),i("rail",[G("&:active",[i("button","max-width: var(--n-button-width-pressed);")])]),y("active",[y("pressed",[i("rail",[i("button","left: calc(100% - var(--n-offset) - var(--n-button-width-pressed));")])]),i("rail",[G("&:active",[i("button","left: calc(100% - var(--n-offset) - var(--n-button-width-pressed));")])])])])])]),y("active",[i("rail",[i("button","left: calc(100% - var(--n-button-width) - var(--n-offset))")])]),i("rail",`
 overflow: hidden;
 height: var(--n-rail-height);
 min-width: var(--n-rail-width);
 border-radius: var(--n-rail-border-radius);
 cursor: pointer;
 position: relative;
 transition:
 opacity .3s var(--n-bezier),
 background .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 background-color: var(--n-rail-color);
 `,[i("button-icon",`
 color: var(--n-icon-color);
 transition: color .3s var(--n-bezier);
 font-size: calc(var(--n-button-height) - 4px);
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 display: flex;
 justify-content: center;
 align-items: center;
 line-height: 1;
 `,[oe()]),i("button",`
 align-items: center; 
 top: var(--n-offset);
 left: var(--n-offset);
 height: var(--n-button-height);
 width: var(--n-button-width-pressed);
 max-width: var(--n-button-width);
 border-radius: var(--n-button-border-radius);
 background-color: var(--n-button-color);
 box-shadow: var(--n-button-box-shadow);
 box-sizing: border-box;
 cursor: inherit;
 content: "";
 position: absolute;
 transition:
 background-color .3s var(--n-bezier),
 left .3s var(--n-bezier),
 opacity .3s var(--n-bezier),
 max-width .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 `)]),y("active",[i("rail","background-color: var(--n-rail-color-active);")]),y("loading",[i("rail",`
 cursor: wait;
 `)]),y("disabled",[i("rail",`
 cursor: not-allowed;
 opacity: .5;
 `)])]),He=Object.assign(Object.assign({},ae.props),{size:String,value:{type:[String,Number,Boolean],default:void 0},loading:Boolean,defaultValue:{type:[String,Number,Boolean],default:!1},disabled:{type:Boolean,default:void 0},round:{type:Boolean,default:!0},"onUpdate:value":[Function,Array],onUpdateValue:[Function,Array],checkedValue:{type:[String,Number,Boolean],default:!0},uncheckedValue:{type:[String,Number,Boolean],default:!1},railStyle:Function,rubberBand:{type:Boolean,default:!0},spinProps:Object,onChange:[Function,Array]});let T;const De=pe({name:"Switch",props:He,slots:Object,setup(t){T===void 0&&(typeof CSS<"u"?typeof CSS.supports<"u"?T=CSS.supports("width","max(1px)"):T=!1:T=!0);const{mergedClsPrefixRef:r,inlineThemeDisabled:b,mergedComponentPropsRef:u}=we(t),p=ae("Switch","-switch",Ne,Te,t,r),f=ye(t,{mergedSize(o){var _,S;if(t.size!==void 0)return t.size;if(o)return o.mergedSize.value;const V=(S=(_=u==null?void 0:u.value)===null||_===void 0?void 0:_.Switch)===null||S===void 0?void 0:S.size;return V||"medium"}}),{mergedSizeRef:m,mergedDisabledRef:s}=f,B=M(t.defaultValue),I=_e(t,"value"),w=xe(I,B),U=H(()=>w.value===t.checkedValue),l=M(!1),v=M(!1),$=H(()=>{const{railStyle:o}=t;if(o)return o({focused:v.value,checked:U.value})});function L(o){const{"onUpdate:value":_,onChange:S,onUpdateValue:V}=t,{nTriggerFormInput:D,nTriggerFormChange:E}=f;_&&Q(_,o),V&&Q(V,o),S&&Q(S,o),B.value=o,D(),E()}function a(){const{nTriggerFormFocus:o}=f;o()}function e(){const{nTriggerFormBlur:o}=f;o()}function O(){t.loading||s.value||(w.value!==t.checkedValue?L(t.checkedValue):L(t.uncheckedValue))}function g(){v.value=!0,a()}function K(){v.value=!1,e(),l.value=!1}function P(o){t.loading||s.value||o.key===" "&&(w.value!==t.checkedValue?L(t.checkedValue):L(t.uncheckedValue),l.value=!1)}function F(o){t.loading||s.value||o.key===" "&&(o.preventDefault(),l.value=!0)}const N=H(()=>{const{value:o}=m,{self:{opacityDisabled:_,railColor:S,railColorActive:V,buttonBoxShadow:D,buttonColor:E,boxShadowFocus:ne,loadingColor:le,textColor:se,iconColor:re,[A("buttonHeight",o)]:C,[A("buttonWidth",o)]:de,[A("buttonWidthPressed",o)]:ue,[A("railHeight",o)]:R,[A("railWidth",o)]:W,[A("railBorderRadius",o)]:ce,[A("buttonBorderRadius",o)]:he},common:{cubicBezierEaseInOut:ve}}=p.value;let J,Y,q;return T?(J=`calc((${R} - ${C}) / 2)`,Y=`max(${R}, ${C})`,q=`max(${W}, calc(${W} + ${C} - ${R}))`):(J=Z((x(R)-x(C))/2),Y=Z(Math.max(x(R),x(C))),q=x(R)>x(C)?W:Z(x(W)+x(C)-x(R))),{"--n-bezier":ve,"--n-button-border-radius":he,"--n-button-box-shadow":D,"--n-button-color":E,"--n-button-width":de,"--n-button-width-pressed":ue,"--n-button-height":C,"--n-height":Y,"--n-offset":J,"--n-opacity-disabled":_,"--n-rail-border-radius":ce,"--n-rail-color":S,"--n-rail-color-active":V,"--n-rail-height":R,"--n-rail-width":W,"--n-width":q,"--n-box-shadow-focus":ne,"--n-loading-color":le,"--n-text-color":se,"--n-icon-color":re}}),d=b?ke("switch",H(()=>m.value[0]),N,t):void 0;return{handleClick:O,handleBlur:K,handleFocus:g,handleKeyup:P,handleKeydown:F,mergedRailStyle:$,pressed:l,mergedClsPrefix:r,mergedValue:w,checked:U,mergedDisabled:s,cssVars:b?void 0:N,themeClass:d==null?void 0:d.themeClass,onRender:d==null?void 0:d.onRender}},render(){const{mergedClsPrefix:t,mergedDisabled:r,checked:b,mergedRailStyle:u,onRender:p,$slots:f}=this;p==null||p();const{checked:m,unchecked:s,icon:B,"checked-icon":I,"unchecked-icon":w}=f,U=!(X(B)&&X(I)&&X(w));return c("div",{role:"switch","aria-checked":b,class:[`${t}-switch`,this.themeClass,U&&`${t}-switch--icon`,b&&`${t}-switch--active`,r&&`${t}-switch--disabled`,this.round&&`${t}-switch--round`,this.loading&&`${t}-switch--loading`,this.pressed&&`${t}-switch--pressed`,this.rubberBand&&`${t}-switch--rubber-band`],tabindex:this.mergedDisabled?void 0:0,style:this.cssVars,onClick:this.handleClick,onFocus:this.handleFocus,onBlur:this.handleBlur,onKeyup:this.handleKeyup,onKeydown:this.handleKeydown},c("div",{class:`${t}-switch__rail`,"aria-hidden":"true",style:u},z(m,l=>z(s,v=>l||v?c("div",{"aria-hidden":!0,class:`${t}-switch__children-placeholder`},c("div",{class:`${t}-switch__rail-placeholder`},c("div",{class:`${t}-switch__button-placeholder`}),l),c("div",{class:`${t}-switch__rail-placeholder`},c("div",{class:`${t}-switch__button-placeholder`}),v)):null)),c("div",{class:`${t}-switch__button`},z(B,l=>z(I,v=>z(w,$=>c(ge,null,{default:()=>this.loading?c(me,Object.assign({key:"loading",clsPrefix:t,strokeWidth:20},this.spinProps)):this.checked&&(v||l)?c("div",{class:`${t}-switch__button-icon`,key:v?"checked-icon":"icon"},v||l):!this.checked&&($||l)?c("div",{class:`${t}-switch__button-icon`,key:$?"unchecked-icon":"icon"},$||l):null})))),z(m,l=>l&&c("div",{key:"checked",class:`${t}-switch__checked`},l)),z(s,l=>l&&c("div",{key:"unchecked",class:`${t}-switch__unchecked`},l)))))}}),Ee={class:"settings"},Je={class:"field"},Ye={class:"field"},qe={class:"field"},Ge={class:"field"},Xe={class:"field"},Qe={class:"field"},Ze={class:"btn-row"},et={class:"field"},tt={class:"field"},ot={__name:"SettingsView",setup(t){const r=Ce(),{settings:b,ensureLoaded:u,updateSettings:p}=$e(),f=M(25),m=M(!0),s=M({baseURL:"",apiKey:"",model:"",useMock:!0});Re(async()=>{try{await u(),f.value=b.value.pomodoroMinutes,m.value=b.value.vibrateOnComplete}catch{}const a=Fe();s.value={baseURL:a.baseURL,apiKey:a.apiKey,model:a.model,useMock:a.useMock}});function B(a){a&&(p({pomodoroMinutes:a}),r.success("已保存"))}function I(a){p({vibrateOnComplete:a}),r.success(a?"完成提醒已开启":"完成提醒已关闭")}function w(){ee({...s.value}),r.success("AI 配置已保存")}function U(a){ee({...s.value}),!a&&!s.value.apiKey.trim()?r.warning("已关闭模拟模式，但 API Key 为空——AI 调用将报错，请填写 Key"):r.success(a?"模拟模式已开启（返回本地样例）":"模拟模式已关闭（AI 将真实调用接口）")}const l=M(!1);async function v(){ee({...s.value}),l.value=!0;try{await Ke('【AGENT_ID: focus】只输出 JSON：{"state":"normal"}',"连接测试"),r.success("连接正常")}catch(a){r.error(a.message||"连接失败")}finally{l.value=!1}}async function $(){await Pe(),await Le(),r.success("本地数据已清空")}async function L(){try{const a=await Oe();if(!a.length){r.info("暂无错误日志");return}const e=new Blob([JSON.stringify(a,null,2)],{type:"application/json"}),O=URL.createObjectURL(e),g=document.createElement("a");g.href=O,g.download=`番茄AI-错误日志-${new Date().toISOString().slice(0,10)}.json`,document.body.appendChild(g),g.click(),g.remove(),URL.revokeObjectURL(O),r.success(`已导出 ${a.length} 条错误日志`)}catch(a){r.error("导出失败："+(a.message||"未知错误"))}}return(a,e)=>{const O=Ae,g=De,K=Ve,P=Me,F=Ie,N=Ue;return ze(),Be("div",Ee,[h(K,{title:"专注设置",bordered:!1},{default:k(()=>[n("div",Je,[e[6]||(e[6]=n("div",{class:"field-label"},"单次番茄时长",-1)),h(O,{value:f.value,"onUpdate:value":[e[0]||(e[0]=d=>f.value=d),B],min:1,max:180,style:{width:"120px"}},null,8,["value"]),e[7]||(e[7]=n("div",{class:"field-hint"},"分钟；计时中修改将在下一个番茄生效",-1))]),n("div",Ye,[e[8]||(e[8]=n("div",{class:"field-label"},"完成提醒（震动）",-1)),h(g,{value:m.value,"onUpdate:value":[e[1]||(e[1]=d=>m.value=d),I]},null,8,["value"]),e[9]||(e[9]=n("div",{class:"field-hint"},"番茄完成时震动 + 提示",-1))])]),_:1}),h(K,{title:"AI 配置",bordered:!1},{default:k(()=>[n("div",qe,[e[10]||(e[10]=n("div",{class:"field-label"},"接口地址（OpenAI 兼容）",-1)),h(P,{value:s.value.baseURL,"onUpdate:value":e[2]||(e[2]=d=>s.value.baseURL=d),placeholder:"https://api.openai.com/v1"},null,8,["value"])]),n("div",Ge,[e[11]||(e[11]=n("div",{class:"field-label"},"API Key",-1)),h(P,{value:s.value.apiKey,"onUpdate:value":e[3]||(e[3]=d=>s.value.apiKey=d),type:"password","show-password-on":"click",placeholder:"sk-..."},null,8,["value"])]),n("div",Xe,[e[12]||(e[12]=n("div",{class:"field-label"},"模型",-1)),h(P,{value:s.value.model,"onUpdate:value":e[4]||(e[4]=d=>s.value.model=d),placeholder:"gpt-4o-mini"},null,8,["value"])]),n("div",Qe,[e[13]||(e[13]=n("div",{class:"field-label"},"模拟模式（无 Key 联调）",-1)),h(g,{value:s.value.useMock,"onUpdate:value":[e[5]||(e[5]=d=>s.value.useMock=d),U]},null,8,["value"]),e[14]||(e[14]=n("div",{class:"field-hint"},"关闭后 AI 将真实调用接口（切换即保存，无需点保存按钮）",-1))]),e[17]||(e[17]=n("div",{class:"field-hint"},"配置仅保存在本机浏览器，不上云；AI 调用只发送任务文本与统计摘要",-1)),n("div",Ze,[h(F,{type:"primary",onClick:w},{default:k(()=>[...e[15]||(e[15]=[j("保存 AI 配置",-1)])]),_:1}),h(F,{loading:l.value,onClick:v},{default:k(()=>[...e[16]||(e[16]=[j("测试连接",-1)])]),_:1},8,["loading"])])]),_:1}),h(K,{title:"数据管理",bordered:!1},{default:k(()=>[n("div",et,[e[20]||(e[20]=n("div",{class:"field-label"},"清空本地数据",-1)),h(N,{"positive-text":"清空","negative-text":"取消","positive-button-props":{type:"error"},onPositiveClick:$},{trigger:k(()=>[h(F,{type:"error",quaternary:""},{default:k(()=>[...e[18]||(e[18]=[j("清空任务与番茄记录",-1)])]),_:1})]),default:k(()=>[e[19]||(e[19]=j(" 将删除全部任务和番茄记录，且无法恢复，确定吗？ ",-1))]),_:1})]),n("div",tt,[e[22]||(e[22]=n("div",{class:"field-label"},"错误日志",-1)),h(F,{quaternary:"",onClick:L},{default:k(()=>[...e[21]||(e[21]=[j("导出错误日志",-1)])]),_:1}),e[23]||(e[23]=n("div",{class:"field-hint"},"测试期问题定位用；运行时错误自动记录在本地",-1))])]),_:1}),e[24]||(e[24]=n("p",{class:"about"},"番茄AI v0.1.0 · 数据仅存本地 · 零广告零社交",-1))])}}},lt=Se(ot,[["__scopeId","data-v-27d5cd68"]]);export{lt as default};
