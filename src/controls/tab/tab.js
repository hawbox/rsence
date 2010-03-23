/*   Riassence Framework
 *   Copyright 2008 Riassence Inc.
 *   http://riassence.com/
 *
 *   You should have received a copy of the GNU General Public License along
 *   with this software package. If not, contact licensing@riassence.com
 */

/*** = Description
  ** HTabView
  **
  **
  ***/
HTabView = HView.extend({
/** = Description
  * draw function
  *
  **/
  draw: function(){
    var _isDrawn = this.drawn;
    this.base();
    if(!_isDrawn){
      var i=0,_styles = [
        ['overflow','auto']
      ];
      for(i;i<_styles.length;i++){
        this.setStyle(_styles[i][0],_styles[i][1]);
      }
      this.hide();
    }
  }
});

/** = Description
  * HTab
  *
  **/
HTab = HControl.extend({
  componentName: "tab",
  componentBehaviour: ['view','control','tab'],
  refreshOnValueChange: true,
  refreshOnLabelChange: false,
  
  controlDefaults: (HControlDefaults.extend({
    constructor: function(_ctrl){
      if(!this.events){
        this.events = {
          mouseDown: true
        };
      }
      this.tabInit(_ctrl);
    },
    tabInit: function(_ctrl){
      _ctrl.tabs = [];
      _ctrl.tabLabels = [];
      _ctrl.tabLabelBounds = [];
      _ctrl.tabLabelStrings = [];
    }
  })),
  
  rightmostPx: 0,
  selectIdx: -1,
  
  // overridden in the template
  tabLabelHeight: 20,
  
  // overridden in the template
  tabLabelLeftEdge: 4,
  
  // overridden in the template
  tabLabelRightEdge: 4,
  
  // overridden in the template
  fontStyle: 'font-family:Arial,sans-serif;font-size:13px;',
  
  tabLabelHTMLPrefix1: '<div class="edge-left"></div><div class="tablabel" style="width:',
  tabLabelHTMLPrefix2: 'px">',
  tabLabelHTMLSuffix: '</div><div class="edge-right"></div>',
  tabLabelParentElem: 'label',
  tabLabelElementTagName: 'div',
  tabLabelAlign: 'left',
  tabLabelFillBg: false,
  tabTriggerLink: false,
  tabLabelNoHTMLPrefix: false,
  
/** = Description
  * refreshValue function
  *
  **/
  refreshValue: function(){
    var _value = this.value;
    if(typeof _value === 'number'){
      var _index = parseInt(_value,10);
      if(_index<this.tabs.length){
        if(_index!==this.selectIdx){
          this.selectTab(_index);
        }
      }
    }
  },
  
/** = Description
  * Sets label for the tab.
  *
  * = Parameters
  * +_label+::  Label for the tab
  *
  **/
  setLabel: function(_label){
    this.label = _label;
  },
  
/** = Description
  * selectTab function
  *
  * = Parameters
  * +_tabIdx+::
  *
  **/
  selectTab: function(_tabIdx){
    if(_tabIdx instanceof HTabView){
      _tabIdx = _tabIdx.tabIndex;
    }
    if(this.selectIdx!==-1){
      var _tabSelectElemId = this.tabLabels[this.selectIdx],
          _tabSelectViewId = this.tabs[this.selectIdx];
      ELEM.removeClassName(_tabSelectElemId,'item-fg');
      ELEM.addClassName(_tabSelectElemId,'item-bg');
      HSystem.views[_tabSelectViewId].hide();
    }
    if(_tabIdx!==-1){
      var _tabLabelElemId = this.tabLabels[_tabIdx],
          _tabViewId = this.tabs[_tabIdx];
      ELEM.removeClassName(_tabLabelElemId,'item-bg');
      ELEM.addClassName(_tabLabelElemId,'item-fg');
      HSystem.views[_tabViewId].show();
    }
    this.selectIdx = _tabIdx;
    this.setValue(_tabIdx);
  },
  
/** = Description
  * addTab function
  *
  * = Parameters
  * +_tabLabel+::
  * +_doSelect+::
  *
  **/
  addTab: function(_tabLabel,_doSelect){
    var _tabIdx=this.tabs.length,
        _tabLabelHTML='',
        _labelTextWidth=this.stringWidth(_tabLabel),
        _labelWidth=_labelTextWidth+this.tabLabelLeftEdge+this.tabLabelRightEdge,
        _tab = HTabView.nu( [0,this.tabLabelHeight,null,null,0,0] ,this),
        _tabLabelElemId = ELEM.make(this.markupElemIds[this.tabLabelParentElem],this.tabLabelElementTagName);
    _tabIdx = this.tabs.length;
    if(this.tabLabelNoHTMLPrefix){
      _tabLabelHTML = _tabLabel;
    }
    else {
      _tabLabelHTML = this.tabLabelHTMLPrefix1+_labelTextWidth+this.tabLabelHTMLPrefix2+_tabLabel+this.tabLabelHTMLSuffix;
    }
    _tab.hide();
    ELEM.addClassName(_tabLabelElemId,'item-bg');
    ELEM.setStyle(_tabLabelElemId,'width',_labelWidth+'px');
    ELEM.setStyle(_tabLabelElemId,this.tabLabelAlign,this.rightmostPx+'px');
    ELEM.setHTML(_tabLabelElemId,_tabLabelHTML);
    this.tabLabelStrings.push(_tabLabel);
    if(this.tabTriggerLink&&this.tabLabelElementTagName==='a'){
      ELEM.setAttr(_tabLabelElemId,'href','javascript:HSystem.views['+this.viewId+'].selectTab('+_tabIdx+');');
    }
    else if (this.tabTriggerLink){
      ELEM.setAttr(_tabLabelElemId,'mouseup','HSystem.views['+this.viewId+'].selectTab('+_tabIdx+');');
    }
    else {
      this.tabLabelBounds.push([this.rightmostPx,this.rightmostPx+_labelWidth]);
    }
    this.rightmostPx+=_labelWidth;
    if(this.tabLabelAlign === 'right'){
      ELEM.setStyle(this.markupElemIds[this.tabLabelParentElem],'width',this.rightmostPx+'px');
    }
    else if (this.tabLabelFillBg) {
      ELEM.setStyle(this.markupElemIds.state,'left',this.rightmostPx+'px');
    }
    this.tabs.push(_tab.viewId);
    this.tabLabels.push(_tabLabelElemId);
    _tab.tabIndex = _tabIdx;
    if(_doSelect || (this.value === _tabIdx)){
      this.selectTab(_tabIdx);
    }
    return _tab;
  },
  
/** = Description
  * mouseDown function
  *
  * = Parameters
  * +_x+::
  * +_y+::
  *
  **/
  mouseDown: function(_x,_y){
    if(this.tabTriggerLink){
      this.setMouseDown(false);
      return;
    }
    _x -= this.pageX();
    _y -= this.pageY();
    if(_y<=this.tabLabelHeight){
      if (this.tabLabelAlign === 'right') {
        _x = this.rect.width - _x;
      }
      if(_x<=this.rightmostPx){
        var i=0,_labelBounds;
        for(i;i<this.tabLabelBounds.length;i++){
          _labelBounds = this.tabLabelBounds[i];
          if(_x<_labelBounds[1] && _x>=_labelBounds[0]){
            this.selectTab(i);
            return;
          }
        }
      }
      
    }
  },
  
/** = Description
  * removeTab function
  *
  * = Parameters
  * +_tabIdx+::
  *
  **/
  removeTab: function(_tabIdx){
    var _selIdx = this.selectIdx,
        _tabViewId = this.tabs[_tabIdx],
        _tabLabelElemId = this.tabViews[_tabIdx];
    this.tabs.splice(_tabIdx,1);
    this.tabLabels.splice(_tabIdx,1);
    this.tabLabelBounds.splice(_tabIdx,1);
    this.tabLabelStrings.splice(_tabIdx,1);
    if(_tabIdx===_selIdx){
      this.selectIdx=-1;
      if(_tabIdx===0&&this.tabs.length===0){
        this.selectTab(-1);
      }
      else if(_tabIdx===(this.tabs.length-1)){
        this.selectTab(_tabIdx-1);
      }
      else{
        this.selectTab(_tabIdx);
      }
    }
    else if(_tabIdx<_selIdx){
      this.selectIdx--;
    }
    ELEM.del(_tabLabelElemId);
    HSystem.views[_tabViewId].die();
  }
});

/** = Description
  * HTabItem is a wrapper for creating tabs as subviews when using JSONRenderer.
  * rect is ignored
  * parent is the HTab instance
  * options may contain the following:
  * select: true|false, passed on to addTab
  * label: true|false, passed on to addTab
  *
  * = Returns 
  * a new HTabView instance returned by addTab
  *
  **/
HTabItem = {
  nu: function(_rect, _parent, _options){
    return _parent.addTab( _options.label, _options.select );
  }
};


