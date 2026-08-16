import{d as G,h as s,a as J,c as d,b as C,e as w,u as K,N as ke,f as Q,g as xe,i as X,j as B,k as O,l as ge,m as Ce,n as L,o as ye,p as _e,q as ze,r as we,s as Se,t as Re,v as De,w as H,x as Te,y as $e,z as Me,A as Ve,B as Le,C as Z,D as Pe,_ as Be,E as He,F as Ie,G as j,H as U,I as z,J as Ee,K as V,L as q,M as je,O as Ue,P as Fe,Q as Oe,R as Ke,S as Ne,T as E,U as P,V as Y,W,X as Ae,Y as Ze,Z as qe}from"./index-CDXgW5FJ.js";import{u as We}from"./useTasks-D-tgx2ES.js";const Ge=G({name:"Empty",render(){return s("svg",{viewBox:"0 0 28 28",fill:"none",xmlns:"http://www.w3.org/2000/svg"},s("path",{d:"M26 7.5C26 11.0899 23.0899 14 19.5 14C15.9101 14 13 11.0899 13 7.5C13 3.91015 15.9101 1 19.5 1C23.0899 1 26 3.91015 26 7.5ZM16.8536 4.14645C16.6583 3.95118 16.3417 3.95118 16.1464 4.14645C15.9512 4.34171 15.9512 4.65829 16.1464 4.85355L18.7929 7.5L16.1464 10.1464C15.9512 10.3417 15.9512 10.6583 16.1464 10.8536C16.3417 11.0488 16.6583 11.0488 16.8536 10.8536L19.5 8.20711L22.1464 10.8536C22.3417 11.0488 22.6583 11.0488 22.8536 10.8536C23.0488 10.6583 23.0488 10.3417 22.8536 10.1464L20.2071 7.5L22.8536 4.85355C23.0488 4.65829 23.0488 4.34171 22.8536 4.14645C22.6583 3.95118 22.3417 3.95118 22.1464 4.14645L19.5 6.79289L16.8536 4.14645Z",fill:"currentColor"}),s("path",{d:"M25 22.75V12.5991C24.5572 13.0765 24.053 13.4961 23.5 13.8454V16H17.5L17.3982 16.0068C17.0322 16.0565 16.75 16.3703 16.75 16.75C16.75 18.2688 15.5188 19.5 14 19.5C12.4812 19.5 11.25 18.2688 11.25 16.75L11.2432 16.6482C11.1935 16.2822 10.8797 16 10.5 16H4.5V7.25C4.5 6.2835 5.2835 5.5 6.25 5.5H12.2696C12.4146 4.97463 12.6153 4.47237 12.865 4H6.25C4.45507 4 3 5.45507 3 7.25V22.75C3 24.5449 4.45507 26 6.25 26H21.75C23.5449 26 25 24.5449 25 22.75ZM4.5 22.75V17.5H9.81597L9.85751 17.7041C10.2905 19.5919 11.9808 21 14 21L14.215 20.9947C16.2095 20.8953 17.842 19.4209 18.184 17.5H23.5V22.75C23.5 23.7165 22.7165 24.5 21.75 24.5H6.25C5.2835 24.5 4.5 23.7165 4.5 22.75Z",fill:"currentColor"}))}}),Ye={iconSizeTiny:"28px",iconSizeSmall:"34px",iconSizeMedium:"40px",iconSizeLarge:"46px",iconSizeHuge:"52px"};function Je(e){const{textColorDisabled:r,iconColor:c,textColor2:u,fontSizeTiny:k,fontSizeSmall:S,fontSizeMedium:h,fontSizeLarge:f,fontSizeHuge:v}=e;return Object.assign(Object.assign({},Ye),{fontSizeTiny:k,fontSizeSmall:S,fontSizeMedium:h,fontSizeLarge:f,fontSizeHuge:v,textColor:r,iconColor:c,extraTextColor:u})}const Qe={common:J,self:Je},Xe=d("empty",`
 display: flex;
 flex-direction: column;
 align-items: center;
 font-size: var(--n-font-size);
`,[C("icon",`
 width: var(--n-icon-size);
 height: var(--n-icon-size);
 font-size: var(--n-icon-size);
 line-height: var(--n-icon-size);
 color: var(--n-icon-color);
 transition:
 color .3s var(--n-bezier);
 `,[w("+",[C("description",`
 margin-top: 8px;
 `)])]),C("description",`
 transition: color .3s var(--n-bezier);
 color: var(--n-text-color);
 `),C("extra",`
 text-align: center;
 transition: color .3s var(--n-bezier);
 margin-top: 12px;
 color: var(--n-extra-text-color);
 `)]),eo=Object.assign(Object.assign({},K.props),{description:String,showDescription:{type:Boolean,default:!0},showIcon:{type:Boolean,default:!0},size:{type:String,default:"medium"},renderIcon:Function}),oo=G({name:"Empty",props:eo,slots:Object,setup(e){const{mergedClsPrefixRef:r,inlineThemeDisabled:c,mergedComponentPropsRef:u}=Q(e),k=K("Empty","-empty",Xe,Qe,e,r),{localeRef:S}=xe("Empty"),h=B(()=>{var t,a,m;return(t=e.description)!==null&&t!==void 0?t:(m=(a=u==null?void 0:u.value)===null||a===void 0?void 0:a.Empty)===null||m===void 0?void 0:m.description}),f=B(()=>{var t,a;return((a=(t=u==null?void 0:u.value)===null||t===void 0?void 0:t.Empty)===null||a===void 0?void 0:a.renderIcon)||(()=>s(Ge,null))}),v=B(()=>{const{size:t}=e,{common:{cubicBezierEaseInOut:a},self:{[O("iconSize",t)]:m,[O("fontSize",t)]:$,textColor:p,iconColor:y,extraTextColor:M}}=k.value;return{"--n-icon-size":m,"--n-font-size":$,"--n-bezier":a,"--n-text-color":p,"--n-icon-color":y,"--n-extra-text-color":M}}),i=c?X("empty",B(()=>{let t="";const{size:a}=e;return t+=a[0],t}),v,e):void 0;return{mergedClsPrefix:r,mergedRenderIcon:f,localizedDescription:B(()=>h.value||S.value.description),cssVars:c?void 0:v,themeClass:i==null?void 0:i.themeClass,onRender:i==null?void 0:i.onRender}},render(){const{$slots:e,mergedClsPrefix:r,onRender:c}=this;return c==null||c(),s("div",{class:[`${r}-empty`,this.themeClass],style:this.cssVars},this.showIcon?s("div",{class:`${r}-empty__icon`},e.icon?e.icon():s(ke,{clsPrefix:r},{default:this.mergedRenderIcon})):null,this.showDescription?s("div",{class:`${r}-empty__description`},e.default?e.default():this.localizedDescription):null,e.extra?s("div",{class:`${r}-empty__extra`},e.extra()):null)}}),no={sizeSmall:"14px",sizeMedium:"16px",sizeLarge:"18px",labelPadding:"0 8px",labelFontWeight:"400"};function ro(e){const{baseColor:r,inputColorDisabled:c,cardColor:u,modalColor:k,popoverColor:S,textColorDisabled:h,borderColor:f,primaryColor:v,textColor2:i,fontSizeSmall:t,fontSizeMedium:a,fontSizeLarge:m,borderRadiusSmall:$,lineHeight:p}=e;return Object.assign(Object.assign({},no),{labelLineHeight:p,fontSizeSmall:t,fontSizeMedium:a,fontSizeLarge:m,borderRadius:$,color:r,colorChecked:v,colorDisabled:c,colorDisabledChecked:c,colorTableHeader:u,colorTableHeaderModal:k,colorTableHeaderPopover:S,checkMarkColor:r,checkMarkColorDisabled:h,checkMarkColorDisabledChecked:h,border:`1px solid ${f}`,borderDisabled:`1px solid ${f}`,borderDisabledChecked:`1px solid ${f}`,borderChecked:`1px solid ${v}`,borderFocus:`1px solid ${v}`,boxShadowFocus:`0 0 0 2px ${ge(v,{alpha:.3})}`,textColor:i,textColorDisabled:h})}const to={common:J,self:ro},lo=Ce("n-checkbox-group"),io=()=>s("svg",{viewBox:"0 0 64 64",class:"check-icon"},s("path",{d:"M50.42,16.76L22.34,39.45l-8.1-11.46c-1.12-1.58-3.3-1.96-4.88-0.84c-1.58,1.12-1.95,3.3-0.84,4.88l10.26,14.51  c0.56,0.79,1.42,1.31,2.38,1.45c0.16,0.02,0.32,0.03,0.48,0.03c0.8,0,1.57-0.27,2.2-0.78l30.99-25.03c1.5-1.21,1.74-3.42,0.52-4.92  C54.13,15.78,51.93,15.55,50.42,16.76z"})),ao=()=>s("svg",{viewBox:"0 0 100 100",class:"line-icon"},s("path",{d:"M80.2,55.5H21.4c-2.8,0-5.1-2.5-5.1-5.5l0,0c0-3,2.3-5.5,5.1-5.5h58.7c2.8,0,5.1,2.5,5.1,5.5l0,0C85.2,53.1,82.9,55.5,80.2,55.5z"})),co=w([d("checkbox",`
 font-size: var(--n-font-size);
 outline: none;
 cursor: pointer;
 display: inline-flex;
 flex-wrap: nowrap;
 align-items: flex-start;
 word-break: break-word;
 line-height: var(--n-size);
 --n-merged-color-table: var(--n-color-table);
 `,[L("show-label","line-height: var(--n-label-line-height);"),w("&:hover",[d("checkbox-box",[C("border","border: var(--n-border-checked);")])]),w("&:focus:not(:active)",[d("checkbox-box",[C("border",`
 border: var(--n-border-focus);
 box-shadow: var(--n-box-shadow-focus);
 `)])]),L("inside-table",[d("checkbox-box",`
 background-color: var(--n-merged-color-table);
 `)]),L("checked",[d("checkbox-box",`
 background-color: var(--n-color-checked);
 `,[d("checkbox-icon",[w(".check-icon",`
 opacity: 1;
 transform: scale(1);
 `)])])]),L("indeterminate",[d("checkbox-box",[d("checkbox-icon",[w(".check-icon",`
 opacity: 0;
 transform: scale(.5);
 `),w(".line-icon",`
 opacity: 1;
 transform: scale(1);
 `)])])]),L("checked, indeterminate",[w("&:focus:not(:active)",[d("checkbox-box",[C("border",`
 border: var(--n-border-checked);
 box-shadow: var(--n-box-shadow-focus);
 `)])]),d("checkbox-box",`
 background-color: var(--n-color-checked);
 border-left: 0;
 border-top: 0;
 `,[C("border",{border:"var(--n-border-checked)"})])]),L("disabled",{cursor:"not-allowed"},[L("checked",[d("checkbox-box",`
 background-color: var(--n-color-disabled-checked);
 `,[C("border",{border:"var(--n-border-disabled-checked)"}),d("checkbox-icon",[w(".check-icon, .line-icon",{fill:"var(--n-check-mark-color-disabled-checked)"})])])]),d("checkbox-box",`
 background-color: var(--n-color-disabled);
 `,[C("border",`
 border: var(--n-border-disabled);
 `),d("checkbox-icon",[w(".check-icon, .line-icon",`
 fill: var(--n-check-mark-color-disabled);
 `)])]),C("label",`
 color: var(--n-text-color-disabled);
 `)]),d("checkbox-box-wrapper",`
 position: relative;
 width: var(--n-size);
 flex-shrink: 0;
 flex-grow: 0;
 user-select: none;
 -webkit-user-select: none;
 `),d("checkbox-box",`
 position: absolute;
 left: 0;
 top: 50%;
 transform: translateY(-50%);
 height: var(--n-size);
 width: var(--n-size);
 display: inline-block;
 box-sizing: border-box;
 border-radius: var(--n-border-radius);
 background-color: var(--n-color);
 transition: background-color 0.3s var(--n-bezier);
 `,[C("border",`
 transition:
 border-color .3s var(--n-bezier),
 box-shadow .3s var(--n-bezier);
 border-radius: inherit;
 position: absolute;
 left: 0;
 right: 0;
 top: 0;
 bottom: 0;
 border: var(--n-border);
 `),d("checkbox-icon",`
 display: flex;
 align-items: center;
 justify-content: center;
 position: absolute;
 left: 1px;
 right: 1px;
 top: 1px;
 bottom: 1px;
 `,[w(".check-icon, .line-icon",`
 width: 100%;
 fill: var(--n-check-mark-color);
 opacity: 0;
 transform: scale(0.5);
 transform-origin: center;
 transition:
 fill 0.3s var(--n-bezier),
 transform 0.3s var(--n-bezier),
 opacity 0.3s var(--n-bezier),
 border-color 0.3s var(--n-bezier);
 `),ye({left:"1px",top:"1px"})])]),C("label",`
 color: var(--n-text-color);
 transition: color .3s var(--n-bezier);
 user-select: none;
 -webkit-user-select: none;
 padding: var(--n-label-padding);
 font-weight: var(--n-label-font-weight);
 `,[w("&:empty",{display:"none"})])]),_e(d("checkbox",`
 --n-merged-color-table: var(--n-color-table-modal);
 `)),ze(d("checkbox",`
 --n-merged-color-table: var(--n-color-table-popover);
 `))]),so=Object.assign(Object.assign({},K.props),{size:String,checked:{type:[Boolean,String,Number],default:void 0},defaultChecked:{type:[Boolean,String,Number],default:!1},value:[String,Number],disabled:{type:Boolean,default:void 0},indeterminate:Boolean,label:String,focusable:{type:Boolean,default:!0},checkedValue:{type:[Boolean,String,Number],default:!0},uncheckedValue:{type:[Boolean,String,Number],default:!1},"onUpdate:checked":[Function,Array],onUpdateChecked:[Function,Array],privateInsideTable:Boolean,onChange:[Function,Array]}),uo=G({name:"Checkbox",props:so,setup(e){const r=De(lo,null),c=H(null),{mergedClsPrefixRef:u,inlineThemeDisabled:k,mergedRtlRef:S,mergedComponentPropsRef:h}=Q(e),f=H(e.defaultChecked),v=Pe(e,"checked"),i=Te(v,f),t=$e(()=>{if(r){const o=r.valueSetRef.value;return o&&e.value!==void 0?o.has(e.value):!1}else return i.value===e.checkedValue}),a=Me(e,{mergedSize(o){var x,g;const{size:_}=e;if(_!==void 0)return _;if(r){const{value:T}=r.mergedSizeRef;if(T!==void 0)return T}if(o){const{mergedSize:T}=o;if(T!==void 0)return T.value}const D=(g=(x=h==null?void 0:h.value)===null||x===void 0?void 0:x.Checkbox)===null||g===void 0?void 0:g.size;return D||"medium"},mergedDisabled(o){const{disabled:x}=e;if(x!==void 0)return x;if(r){if(r.disabledRef.value)return!0;const{maxRef:{value:g},checkedCountRef:_}=r;if(g!==void 0&&_.value>=g&&!t.value)return!0;const{minRef:{value:D}}=r;if(D!==void 0&&_.value<=D&&t.value)return!0}return o?o.disabled.value:!1}}),{mergedDisabledRef:m,mergedSizeRef:$}=a,p=K("Checkbox","-checkbox",co,to,e,u);function y(o){if(r&&e.value!==void 0)r.toggleCheckbox(!t.value,e.value);else{const{onChange:x,"onUpdate:checked":g,onUpdateChecked:_}=e,{nTriggerFormInput:D,nTriggerFormChange:T}=a,l=t.value?e.uncheckedValue:e.checkedValue;g&&Z(g,l,o),_&&Z(_,l,o),x&&Z(x,l,o),D(),T(),f.value=l}}function M(o){m.value||y(o)}function I(o){if(!m.value)switch(o.key){case" ":case"Enter":y(o)}}function N(o){switch(o.key){case" ":o.preventDefault()}}const A={focus:()=>{var o;(o=c.value)===null||o===void 0||o.focus()},blur:()=>{var o;(o=c.value)===null||o===void 0||o.blur()}},b=Ve("Checkbox",S,u),n=B(()=>{const{value:o}=$,{common:{cubicBezierEaseInOut:x},self:{borderRadius:g,color:_,colorChecked:D,colorDisabled:T,colorTableHeader:l,colorTableHeaderModal:F,colorTableHeaderPopover:ee,checkMarkColor:oe,checkMarkColorDisabled:ne,border:re,borderFocus:te,borderDisabled:le,borderChecked:ie,boxShadowFocus:ae,textColor:ce,textColorDisabled:se,checkMarkColorDisabledChecked:de,colorDisabledChecked:ue,borderDisabledChecked:be,labelPadding:ve,labelLineHeight:he,labelFontWeight:fe,[O("fontSize",o)]:me,[O("size",o)]:pe}}=p.value;return{"--n-label-line-height":he,"--n-label-font-weight":fe,"--n-size":pe,"--n-bezier":x,"--n-border-radius":g,"--n-border":re,"--n-border-checked":ie,"--n-border-focus":te,"--n-border-disabled":le,"--n-border-disabled-checked":be,"--n-box-shadow-focus":ae,"--n-color":_,"--n-color-checked":D,"--n-color-table":l,"--n-color-table-modal":F,"--n-color-table-popover":ee,"--n-color-disabled":T,"--n-color-disabled-checked":ue,"--n-text-color":ce,"--n-text-color-disabled":se,"--n-check-mark-color":oe,"--n-check-mark-color-disabled":ne,"--n-check-mark-color-disabled-checked":de,"--n-font-size":me,"--n-label-padding":ve}}),R=k?X("checkbox",B(()=>$.value[0]),n,e):void 0;return Object.assign(a,A,{rtlEnabled:b,selfRef:c,mergedClsPrefix:u,mergedDisabled:m,renderedChecked:t,mergedTheme:p,labelId:Le(),handleClick:M,handleKeyUp:I,handleKeyDown:N,cssVars:k?void 0:n,themeClass:R==null?void 0:R.themeClass,onRender:R==null?void 0:R.onRender})},render(){var e;const{$slots:r,renderedChecked:c,mergedDisabled:u,indeterminate:k,privateInsideTable:S,cssVars:h,labelId:f,label:v,mergedClsPrefix:i,focusable:t,handleKeyUp:a,handleKeyDown:m,handleClick:$}=this;(e=this.onRender)===null||e===void 0||e.call(this);const p=we(r.default,y=>v||y?s("span",{class:`${i}-checkbox__label`,id:f},v||y):null);return s("div",{ref:"selfRef",class:[`${i}-checkbox`,this.themeClass,this.rtlEnabled&&`${i}-checkbox--rtl`,c&&`${i}-checkbox--checked`,u&&`${i}-checkbox--disabled`,k&&`${i}-checkbox--indeterminate`,S&&`${i}-checkbox--inside-table`,p&&`${i}-checkbox--show-label`],tabindex:u||!t?void 0:0,role:"checkbox","aria-checked":k?"mixed":c,"aria-labelledby":f,style:h,onKeyup:a,onKeydown:m,onClick:$,onMousedown:()=>{Re("selectstart",window,y=>{y.preventDefault()},{once:!0})}},s("div",{class:`${i}-checkbox-box-wrapper`}," ",s("div",{class:`${i}-checkbox-box`},s(Se,null,{default:()=>this.indeterminate?s("div",{key:"indeterminate",class:`${i}-checkbox-icon`},ao()):s("div",{key:"check",class:`${i}-checkbox-icon`},io())}),s("div",{class:`${i}-checkbox-box__border`}))),p)}}),bo={class:"tasks"},vo={class:"add-row"},ho={key:1,class:"task-list"},fo={class:"task-title"},mo={key:0,class:"task-est"},po={class:"task-actions"},ko={class:"edit-form"},xo={class:"edit-actions"},go={__name:"TasksView",setup(e){const r=He(),{tasks:c,sortedTasks:u,ensureLoaded:k,addTask:S,toggleDone:h,togglePin:f,updateTask:v,removeTask:i}=We();Ie(k);const t=H("");function a(b){if(b!=null&&b.isComposing)return;const n=t.value.trim();n&&(S(n),t.value="")}async function m(b){const n=c.value.find(R=>R.id===b);await h(b),n&&!n.done&&r.success("任务完成 🎉")}async function $(b){await i(b),r.info("任务已删除")}const p=H(!1),y=H(null),M=H(""),I=H(null);function N(b){y.value=b.id,M.value=b.title,I.value=b.estPomodoros??null,p.value=!0}async function A(){const b=M.value.trim();b&&(await v(y.value,{title:b,estPomodoros:I.value||null}),p.value=!1,r.success("已保存"))}return(b,n)=>{const R=Oe,o=Ke,x=oo,g=uo,_=Ze,D=qe,T=Ne;return E(),j("div",bo,[U("div",vo,[z(R,{value:t.value,"onUpdate:value":n[0]||(n[0]=l=>t.value=l),placeholder:"添加一个任务，回车确认",style:{flex:"1"},onKeyup:Ee(a,["enter"])},null,8,["value"]),z(o,{type:"primary",disabled:!t.value.trim(),onClick:a},{default:V(()=>[...n[5]||(n[5]=[P("添加",-1)])]),_:1},8,["disabled"])]),q(c).length===0?(E(),je(x,{key:0,description:"还没有任务，先添加一个吧",style:{"margin-top":"48px"}})):(E(),j("div",ho,[(E(!0),j(Ue,null,Fe(q(u),l=>(E(),j("div",{key:l.id,class:Y(["task-row",{done:l.done}])},[z(g,{checked:l.done,"onUpdate:checked":()=>m(l.id)},null,8,["checked","onUpdate:checked"]),U("span",fo,W(l.title),1),l.estPomodoros?(E(),j("span",mo,"🍅"+W(l.estPomodoros),1)):Ae("",!0),U("div",po,[z(o,{quaternary:"",size:"tiny",class:Y(["pin-btn",{pinned:l.pinned}]),title:l.pinned?"取消置顶":"置顶",onClick:F=>q(f)(l.id)},{default:V(()=>[...n[6]||(n[6]=[P("📌",-1)])]),_:1},8,["class","title","onClick"]),z(o,{quaternary:"",size:"tiny",title:"编辑",onClick:F=>N(l)},{default:V(()=>[...n[7]||(n[7]=[P("✏️",-1)])]),_:1},8,["onClick"]),z(_,{"positive-text":"删除","negative-text":"取消","positive-button-props":{type:"error"},onPositiveClick:F=>$(l.id)},{trigger:V(()=>[z(o,{quaternary:"",size:"tiny",title:"删除",type:"error"},{default:V(()=>[...n[8]||(n[8]=[P("🗑️",-1)])]),_:1})]),default:V(()=>[P(" 确定删除「"+W(l.title)+"」？ ",1)]),_:2},1032,["onPositiveClick"])])],2))),128))])),z(T,{show:p.value,"onUpdate:show":n[4]||(n[4]=l=>p.value=l),preset:"card",title:"编辑任务",bordered:!1,style:{width:"320px"}},{default:V(()=>[U("div",ko,[z(R,{value:M.value,"onUpdate:value":n[1]||(n[1]=l=>M.value=l),placeholder:"任务标题"},null,8,["value"]),z(D,{value:I.value,"onUpdate:value":n[2]||(n[2]=l=>I.value=l),min:0,max:99,placeholder:"预估番茄数（可选）",style:{width:"100%"}},null,8,["value"]),U("div",xo,[z(o,{onClick:n[3]||(n[3]=l=>p.value=!1)},{default:V(()=>[...n[9]||(n[9]=[P("取消",-1)])]),_:1}),z(o,{type:"primary",disabled:!M.value.trim(),onClick:A},{default:V(()=>[...n[10]||(n[10]=[P(" 保存 ",-1)])]),_:1},8,["disabled"])])])]),_:1},8,["show"])])}}},_o=Be(go,[["__scopeId","data-v-84f6e7d8"]]);export{_o as default};
