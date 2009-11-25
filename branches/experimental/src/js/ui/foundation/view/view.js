/*   Riassence Framework
 *   Copyright 2006 Riassence Inc.
 *   http://riassence.com/
 *
 *   You should have received a copy of the GNU General Public License along
 *   with this software package. If not, contact licensing@riassence.com
 */

/*** = Description
  ** HView is the foundation class for all views. HView is useful for
  ** any type of view and control grouping. It is designed for easy extension
  ** and it's the foundation for HControl and all other controls.
  ** 
  ** The major differences between HView and HControl is that HView handles
  ** only visual representation and structurization. In addition to HView's
  ** features, HControl handles labels, values, events, states and such.
  ** However HControl is heavier, so use HView instead whenever you don't
  ** need the additional features of HControl. HView implements the HMarkupView
  ** interface for template-related task.
  **
  **
  ** = Instance variables:
  ** +themePath+:: Component specific theme path. Default null.
  ** +packageName+:: Prefix of the directory that contains set of
  **                 components in pre-build mode. Default null.
  ** +isAbsolute+:: Is the component using absolute positioning?
  **                Defaults to true.
  ** +flexRight+:: Does the HView flex right? Defaults to false.
  ** +flexLeft+:: Does the HView flex left? Defaults to true. 
  ** +flexTop+:: Does the HView flex top? Defaults to true.
  ** +flexBottom+:: Does the HView flex bottom? Defaults false.
  ** +flexRightOffset+:: Positioning mode offset to right. Defaults to 0.
  ** +flexBottomOffset+:: Positioning mode offset to bottom. Defaults to 0.
  ** +componentBehaviour+:: Component behaviour tells other classes what to
  **                        expect of the component's api and 
  **                        visual behaviour. 'view' by default.
  **
  ** = Usage
  **  myAppInstance = HApplication.nu();
  **  myViewInstance = HView.nu( [10, 10, 100, 100], myAppInstance );
  **  myViewInstance.setStyle('background-color','#ffcc00');
  **  mySubView1 = HView.nu( [10, 10, 70, 70], myViewIntance );
  **  mySubView2 = HView.nu( [20, 20, 50, 50], mySubView1 );
***/

HView = HClass.extend({
  themePath:   null,
  packageName: null,
  isAbsolute: true,
  flexRight:  false,
  flexLeft:   true,
  flexTop:    true,
  flexBottom: false,
  flexRightOffset:  0,
  flexBottomOffset: 0,
  componentBehaviour: ['view'],
  
/** = Description
  * Constructs the logic part of a HView.
  * The view still needs to be drawn on screen. To do that, call draw after
  * subcomponents of the view are initialized.
  *
  * = Parameters
  * +_rect+:: An instance of HRect, defines the position and size of views. 
  * +_parent+:: Another HView compatible instance, like HApplication,
  *             HControl and derived component classes.             
  *
  **/
  constructor: function(_rect, _parent) {
    // Moved these to the top to ensure safe themeing operation
    if(this.theme===undefined){
      this.theme = HThemeManager.currentTheme;
      this.preserveTheme = false;
    }
    else {
      this.preserveTheme = true;
    }
    
    // Used for smart template elements (resizing)
    
    this.optimizeWidthOnRefresh = true;
    
    // adds the parentClass as a "super" object
    this.parent = _parent;
    
    this.viewId = this.parent.addView(this);
    // the parent addView method adds this.parents
    
    this.appId = this.parent.appId;
    this.app = HSystem.apps[this.appId];
    
    // subview-ids, index of HView-derived objects that are found in HSystem.views[viewId]
    this.views = [];
    
    // Subviews in Z order.
    this.viewsZOrder = [];
    
    // Keep the view (and its subviews) hidden until its drawn.
    this._createElement();
    
    // Set the geometry
    this.setRect(_rect);
    this.isHidden = true;
    
    this.drawn = false;
    
    this._cachedLeft = _rect.left;
    this._cachedTop = _rect.top;
    
    // Additional DOM element bindings are saved into this array so they can be
    // deleted from the element manager when the view gets destroyed.
    this._domElementBindings = [];
    
    if(!this.isinherited) {
      this.draw();
      this.show();
    }
  },
  
  /** Set right side flexing.
    **/
  setFlexRight: function(_flag,_px){
    if(_flag===undefined){_flag=true;}
    this.flexRight = _flag;
    if(_px===undefined){_px=0;}
    this.flexRightOffset = _px;
    return this;
  },
  
  /** Set left side flexing.
    **/
  setFlexLeft: function(_flag,_px){
    if(_flag===undefined){_flag=true;}
    this.flexLeft = _flag;
    if((_px || _px === 0) && this.rect){
      this.rect.setLeft(_px);
    }
    return this;
  },
  
  /** Set top flexing.
    **/
  setFlexTop: function(_flag,_px){
    if(_flag===undefined){_flag=true;}
    this.flexTop = _flag;
    if((_px || _px === 0) && this.rect){
      this.rect.setTop(_px);
    }
    return this;
  },
  /** Set bottom flexing.
    **/
  setFlexBottom: function(_flag,_px){
    if(_flag===undefined){_flag=true;}
    this.flexBottom = _flag;
    if(_px===undefined){_px=0;}
    this.flexBottomOffset = _px;
    return this;
  },
  /** Set absolute coordinates true / false.
    **/
  setAbsolute: function(_flag){
    if(_flag===undefined){_flag=true;}
    this.isAbsolute = _flag;
    return this;
  },
  /** Set relative coordinates true / false.
    **/
  setRelative: function(_flag){
    if(_flag===undefined){_flag=true;}
    this.isAbsolute = (!_flag);
    return this;
  },
  
  /** Used by from html theme templates to get the theme-specific image path.
    **/
  getThemeGfxPath: function() {
    if( this.preserveTheme ){
      _themeName = this.theme;
    } else {
      _themeName = HThemeManager.currentTheme;
    }
    return HThemeManager._componentGfxPath( _themeName,  this.componentName, this.themePath, this.packageName );
  },
  /** Returns the full theme URL of the given filename. Used by HTML templates.
    **/
  
  getThemeGfxFile: function( _fileName ) {
    if( this.preserveTheme ){
      _themeName = this.theme;
    } else {
      _themeName = HThemeManager.currentTheme;
    }
    return HThemeManager._componentGfxFile( _themeName,  this.componentName, this.themePath, this.packageName, _fileName );
  },
  
  // provided solely for component extendability:
  _makeElem: function(_parentElemId){
    this.elemId = ELEM.make(_parentElemId,'div');
  },
  // provided solely for component extendability:
  _setCSS: function(_additional){
    var _cssStyle = 'display:none;overflow:hidden;visibility:hidden;';
    if(this.isAbsolute){
      _cssStyle += 'position:absolute;';
    } else {
      _cssStyle += 'position:relative;';
    }
    _cssStyle += _additional;
    ELEM.setCSS(this.elemId,_cssStyle);
  },
  
  _getParentElemId: function(){
    var _parentElemId;
    // if the parent does not have an element:
    if(this.parent.elemId === undefined) {
      _parentElemId = 0;
    }
    // if a subview element is defined in the template, use it:
    else if(this.parent.markupElemIds&&this.parent.markupElemIds['subview']){
      _parentElemId = this.parent.markupElemIds['subview'];
    }
    // otherwise, use main elemId
    else {
      _parentElemId = this.parent.elemId;
    }
    return _parentElemId;
  },
  
  // create the dom element
  _createElement: function() {
    if(!this.elemId) {
      
      this._makeElem(this._getParentElemId());
      this._setCSS('');
      
      // Theme name == CSS class name
      if(this.preserveTheme){
        ELEM.addClassName( this.elemId, this.theme );
      }
      else {
        ELEM.addClassName( this.elemId, HThemeManager.currentTheme );
      }
    }
  },
  
/** = Description
  * Handles automatically value management, Z-indexes, drawing and 
  * updating of HView upon alteration.
  *
  * = Returns
  * +self+
  *
  **/
  drawRect: function() {
    if (this.parent && this.rect.isValid) {
      var _this = this,
          _elemId = _this.elemId,
          _styl = ELEM.setStyle,
          _rect = _this.rect;
    
      _styl( _elemId, 'left', _this.flexLeft?(_rect.left+'px'):'auto', true);
      _styl( _elemId, 'top', _this.flexTop?(_rect.top+'px'):'auto', true);
      _styl( _elemId, 'right', _this.flexRight?(_this.flexRightOffset+'px'):'auto', true);
      _styl( _elemId, 'bottom', _this.flexBottom?(_this.flexBottomOffset+'px'):'auto', true);
      _styl( _elemId, 'width', (_this.flexLeft&&_this.flexRight)?'auto':(_rect.width+'px'), true);
      _styl( _elemId, 'height', (_this.flexTop&&_this.flexBottom)?'auto':(_rect.height+'px'), true);
    
      if(_this.flexLeft&&_this.flexRight){
        _styl( _elemId, 'min-width', _rect.width+'px', true);
      }
      if(_this.flexTop&&_this.flexBottom){
        _styl( _elemId, 'min-height', _rect.height+'px', true);
      }
    
      // Show the rectangle once it gets created, unless visibility was set to
      // hidden in the constructor.
      if(undefined === _this.isHidden || _this.isHidden === false) {
        _styl( _elemId, 'visibility', 'inherit', true);
      }
    
      _styl( _elemId, 'display', 'block', true);
    
      _this._updateZIndex();
    
      if (_this._cachedLeft !== _rect.left || _this._cachedTop !== _rect.top) {
        _this.invalidatePositionCache();
        _this._cachedLeft = _rect.left;
        _this._cachedTop = _rect.top;
      }
    
      _this.drawn = true;
    
      // right, bottom, opacity and png-transparency
      /*
      if (ELEM._is_ie6 && !this.ie_resizefixadded) {
        iefix._traverseTree(ELEM.get(this.elemId));
        this.ie_resizefixadded = true;
        HSystem.fix_ie = true;
      }
      */
    }
    return this;
  },
  
  /**
    * --
    * These methods update the z-index property of the actual element(s).
    * _updateZIndex updates this object only and it is used when the object is
    * initially drawn. _updateZIndexAllSiblings updates this object and all its
    * siblings. This is useful when modifying this object's z-order affects
    * other elements too.
    * ++
    */
  _updateZIndex: function() {
    // doing this via HSystem shaves 10% off the view creation time
    //ELEM.setStyle(this.elemId, 'z-index',this.parent.viewsZOrder.indexOf(this.viewId));
    HSystem.updateZIndexOfChildren(this.viewId);
  },
  
  /**
    * --
    * This function was really slow, that's why it's moved off to the system scheduler.
    *
    * According to benchmarking, with 1000 views, deletion
    * took over 2000 ms on average before, versus 50 ms after.
    * ++
    **/
  _updateZIndexAllSiblings: function() {
    HSystem.updateZIndexOfChildren(this.parent.viewId);
  },
  
/** = Description
  * Marks HView as drawn on the current frame and draws it.
  *
  * When extending HView, override this method, don't extend it. 
  * The new method should call at least drawRect.
  * 
  * = Returns
  * +self+
  *
  **/
  draw: function() {
    var _isDrawn = this.drawn;
    this.drawRect();
    if(!_isDrawn){
      if(this['componentName']!==undefined){
        this.drawMarkup();
      }
      this.drawSubviews();
    }
    this.refresh();
    return this;
  },
  
/** = Description
  * Called once, when the layout of the view is initially drawn.
  *
  * Doesn't do anything by itself, but provides an extension point for making
  * subviews.
  *
  **/
  drawSubviews: function(){
  },
  
  // Loads the markup from theme manager. If this.preserveTheme is set to true,
  // the this.theme is used for loading the markup. Otherwise the currently
  // active theme is used.
  _loadMarkup: function() {
    var _themeName, _markup;
    if (this.preserveTheme) {
      _themeName = this.theme;
    }
    else {
      _themeName = HThemeManager.currentTheme;
    }
    _markup = HThemeManager.getMarkup( _themeName, this.componentName, this.themePath, this.packageName );
    if(_markup === false){
      console.log('Warning: Markup template for "'+this.componentName+'" using theme "'+_themeName+'" not loaded.');
    }
    this.markup = _markup;
    return (_markup !== false);
  },
  
/** = Description
  * Replaces the contents of the view's DOM element with html from the theme specific html file.
  *
  * = Returns
  * +self+
  **/
  markupElemNames: ['bg', 'label', 'state', 'control', 'value', 'subview'],
  drawMarkup: function() {
    ELEM.setStyle(this.elemId, 'display', 'none', true);
    
    // continue processing from here on:
    var _markupStatus = this._loadMarkup();
    
    this.bindMarkupVariables();
    ELEM.setHTML(this.elemId, this.markup);
    
    this.markupElemIds = {};
    for(var i=0; i < this.markupElemNames.length; i++ ) {
      var _partName = this.markupElemNames[ i ],
          _elemName = _partName + this.elemId,
          _htmlIdMatch = ' id="' + _elemName + '"';
      if( this.markup.indexOf( _htmlIdMatch ) !== -1 ) {
        this.markupElemIds[ _partName ] = this.bindDomElement( _elemName );
      }
    }
    
    ELEM.setStyle(this.elemId, 'display', 'block' );
    
    // right, bottom, opacity and png-transparency
    //  - commented out, because the thing (IE6) is slow
    //  - enabled in ELEM at regular intervals, makes 
    //    advanced layout a little choppier, but overall
    //    much faster on IE6
    /*
    if (ELEM._is_ie6 && !this.ie_htmlresizefixadded) {
      iefix._traverseTree(ELEM.get(this.elemId));
      this.ie_htmlresizefixadded = true;
      HSystem.fix_ie = true;
    }
    */
    return this;
  },
  
/** = Description
  * Replaces the contents of the view's DOM element with custom html.
  *
  * = Parameters
  * +_html+::  The HTML (string-formatted) to replace the content with.
  *
  * = Returns
  * +self+
  *
  **/
  setHTML: function( _html ) {
    ELEM.setHTML( this.elemId, _html );
    return this;
  },
  
/** = Description
  *
  * This method should be extended in order to redraw only specific parts. The
  * base implementation calls optimizeWidth when optimizeWidthOnRefresh is set
  * to true.
  *
  * = Returns
  * +self+
  *
  **/
  refresh: function() {
    if(this.drawn) {
      // this.drawn is checked here so the rectangle doesn't get drawn by the
      // constructor when setRect() is initially called.
      this.drawRect();
    }
    if(this.optimizeWidthOnRefresh) {
      this.optimizeWidth();
    }
    return this;
  },

/** = Description
  *
  * Replaces the rect of the component with a new HRect instance and
  * then refreshes the display.
  *
  * = Parameters
  *  +_rect+ - The new HRect instance to replace the old rect instance with.
  *  +_rect+ - Array format:
  *    
  *    with 4 items, then left and top -aligned layout with numeric indexes at:
  *      0: left
  *      1: top
  *      2: width
  *      3: height
  *    
  *    with 6 items, then special layout with indexes at:
  *      0: left
  *         - right-aligned layout if null and valid number at index 2 and 4
  *      1: top
  *         - bottom-aligned layout if null and valid number at index 3 and 5
  *      2: width
  *         - auto-width if null and valid number at index 0 and 4
  *      4: height
  *         - auto-height if null and valid number at index 1 and 5
  *      5: right
  *         - right-aligned layout if valid number at index 2
  *         - auto-width if valid number at index 0
  *      6: bottom
  *         - bottom-aligned layout if valid number at index 3
  *                - auto-height if valid number at index 1
  **/
  setRect: function(_rect) {
    if (this.rect) {
      this.rect.release(this);
    }
    if(_rect instanceof Array){
      var _arrLen = _rect.length,
          _throwPrefix = 'HView.setRect: If the HRect instance is replaced by an array, ';
      if((_arrLen === 4) || (_arrLen === 6)){
        var _leftOffset   = _rect[0],
            _topOffset    = _rect[1],
            _width        = _rect[2],
            _height       = _rect[3],
            _rightOffset  = ((_arrLen === 6)?_rect[4]:null),
            _bottomOffset = ((_arrLen === 6)?_rect[5]:null),
            _validLeftOffset    = (typeof _leftOffset    === 'number'),
            _validTopOffset     = (typeof _topOffset     === 'number'),
            _validRightOffset   = (typeof _rightOffset   === 'number'),
            _validBottomOffset  = (typeof _bottomOffset  === 'number'),
            _validWidth   = (typeof _width   === 'number'),
            _validHeight  = (typeof _height  === 'number'),
            _right,
            _bottom;
        
        if( (!_validLeftOffset && !_validRightOffset) ||
            (!_validTopOffset && !_validBottomOffset) ){
          console.log(_throwPrefix + '(left or top) and (top or bottom) must be specified.');
        }
        else if( (!_validWidth   && !(_validLeftOffset && _validRightOffset)) ||
                 (!_validHeight  && !(_validTopOffset  && _validBottomOffset)) ){
          console.log(_throwPrefix + 'the (height or width) must be specified unless both (left and top) or (top and bottom) are specified.');
        }
        
        this.setFlexLeft(_validLeftOffset,_leftOffset);
        this.setFlexTop(_validTopOffset,_topOffset);
        this.setFlexRight(_validRightOffset,_rightOffset);
        this.setFlexBottom(_validBottomOffset,_bottomOffset);
        
        // default, makes a correct rect
        if(_validLeftOffset && _validWidth && !_validRightOffset){
          _right = _leftOffset + _width;
        }
        // can't be entirely correct rect unless parent size is calculated
        else if(!_validLeftOffset && _validWidth && _validRightOffset){
          _leftOffset = 0;
          _right = _width;
        }
        // can't be entirely correct rect unless parent size is calculated
        else if(_validLeftOffset && !_validWidth && _validRightOffset){
          _right = _leftOffset + _rightOffset;
        }
        
        // use minimum width based on the height information given
        else if(_validLeftOffset && _validWidth && _validRightOffset){
          _right = _leftOffset + _width;
        }
        
        // default, makes a correct rect
        if(_validTopOffset && _validHeight && !_validBottomOffset){
          _bottom = _topOffset + _height;
        }
        // can't be entirely correct rect unless parent size is calculated
        else if(!_validTopOffset && _validHeight && _validBottomOffset){
          _topOffset = 0;
          _bottom = _height;
        }
        // can't be entirely correct rect unless parent size is calculated
        else if(_validTopOffset && !_validHeight && _validBottomOffset){
          _bottom = _topOffset + _bottomOffset;
        }
        
        // use minimum height based on the height information given
        else if(_validTopOffset && _validHeight && _validBottomOffset){
          _bottom = _topOffset + _height;
        }
        
        this.rect = HRect.nu(_leftOffset,_topOffset,_right,_bottom);
      }
      else {
        console.log(_throwPrefix + 'the length has to be either 4 or 6.');
      }
    }
    else {
      this.rect = _rect;
    }
    this.rect.bind(this);
    this.refresh();
    return this;
  },
  
/** = Description
  * Sets any arbitary style of the main DOM element of the component.
  * Utilizes Element Manager's drawing queue/cache to perform the action.
  *
  * = Parameters
  * +_name+::           The style name (css syntax, eg. 'background-color')
  * +value+::           The style value (css syntax, eg. 'rgb(255,0,0)')
  * +_cacheOverride+::  Cache override flag.
  *
  * = Returns
  * +self+
  *
  **/
  setStyle: function(_name, _value, _cacheOverride) {
    if (this.elemId) {
      ELEM.setStyle(this.elemId, _name, _value, _cacheOverride);
    }
    return this;
  },

/** = Description
  * Returns a style of the main DOM element of the component.
  * Utilizes <Element Manager>'s cache to perform the action.
  *
  * = Parameters
  * +_name+:: The style name (css syntax, eg. 'background-color')
  *
  * = Returns
  * The style property value (css syntax, eg. 'rgb(255,0,0)')
  *
  **/
  style: function(_name) {
    if (this.elemId) {
      return ELEM.getStyle(this.elemId, _name);
    }
    return '';
  },
  
/** = Description
  * Sets a style for a specified markup element that has been bound to this
  * view.
  *
  * = Parameters
  *  +_partName+::  The identifier of the markup element.
  *  +_name+::      The style name
  *  +_value+::     The style value
  *
  * = Returns
  * +self+
  *
  **/
  setStyleOfPart: function(_partName, _name, _value, _cacheOverride) {
    if (!this.markupElemIds[_partName]) {
      console.log('Warning, setStyleOfPart: partName "'+_partName+'" does not exist for viewId '+this.viewId+'.');
    }
    else {
      ELEM.setStyle(this.markupElemIds[_partName], _name, _value, _cacheOverride);
    }
    return this;
  },
  
/** = Description
  * Returns a style of a specified markup element that has been bound to this
  * view.
  *
  * = Parameters
  *  +_partName+::  The identifier of the markup element.
  *  +_name+::      The style name
  *
  * = Returns
  * The style of a specified markup element.
  *
  **/
  styleOfPart: function(_partName, _name) {
    if (!this.markupElemIds[_partName]) {
      console.log('Warning, styleOfPart: partName "'+_partName+'" does not exist for viewId '+this.viewId+'.');
      return '';
    }
    return ELEM.getStyle(this.markupElemIds[_partName], _name);
  },
  
/** = Description
  * Sets a style of a specified markup element that has been bound to this
  * view.
  *
  * = Parameters
  *  +_partName+::  The identifier of the markup element.
  *  +_value+::     Value for markup element.
  *
  * = Returns
  * +self+
  *
  **/
  setMarkupOfPart: function( _partName, _value ) {
    if (!this.markupElemIds[_partName]) {
      console.log('Warning, setMarkupOfPart: partName "'+_partName+'" does not exist for viewId '+this.viewId+'.');
    }
    else {
      ELEM.setHTML( this.markupElemIds[_partName], _value );
    }
    return this;
  },
  
/** = Description
  * Returns a style of a specified markup element that has been bound to this
  * view.
  *
  * = Parameters
  *  +_partName+::  The identifier of the markup element.
  *  +_name+::      The style name
  *
  * = Returns
  * The style of a specified markup element.
  *
  **/
  markupOfPart: function(_partName) {
    if (!this.markupElemIds[_partName]) {
      console.log('Warning, markupOfPart: partName "'+_partName+'" does not exist for viewId '+this.viewId+'.');
      return '';
    }
    return ELEM.getHTML(this.markupElemIds[_partName]);
  },

/** = Description
  * Hides the component's main DOM element (and its children).
  *
  * = Returns
  * +self+
  *
  **/
  hide: function() {
    if(!this.isHidden) {
      var _setStyl = ELEM.setStyle,
          _elemId  = this.elemId;
      _setStyl(_elemId,'visibility', 'hidden');
      _setStyl(_elemId,'display', 'none');
      this.isHidden = true;
    }
    return this;
  },
  
/** = Description
  * Restores the visibility of the component's main DOM element (and its children).
  *
  * = Return
  * +self+
  *
  **/
  show: function() {
    if(this.isHidden) {
      var _setStyl = ELEM.setStyle,
          _elemId  = this.elemId;
      _setStyl(_elemId,'visibility', 'inherit');
      _setStyl(_elemId,'display', 'block');
      this.isHidden = false;
    }
    return this;
  },
  
/** = Description
  * Toggles between hide and show.
  *
  * = Returns
  * +self+
  *
  **/
  toggle: function() {
    if(this.isHidden) {
      this.show();
    } else {
      this.hide();
    }
    return this;
  },
  
/** = Description
  * Call this if you need to remove a component from its parent's <views> array without
  * destroying the DOM element itself, making it in effect a view without parent.
  * Useful, for example, for moving a view from one parent component to another.
  *
  * = Returns
  * +self+
  *
  **/
  remove: function() {
    if( this.parent ) {
      
      var _viewZIdx = this.parent.viewsZOrder.indexOf(this.viewId),
          _viewPIdx = this.parent.views.indexOf(this.viewId);
      
      this.parent.views.splice(_viewPIdx,1);
      HSystem.delView(this.viewId);
      
      // Drop the z-order from the parent's array
      this.parent.viewsZOrder.splice( _viewZIdx, 1 );
      
      // frees this view from zindex re-ordering, if added
      var _sysUpdateZIndexOfChildrenBufferIndex = HSystem._updateZIndexOfChildrenBuffer.indexOf( this.viewId );
      if(_sysUpdateZIndexOfChildrenBufferIndex !== -1){
        HSystem._updateZIndexOfChildrenBuffer.splice( _sysUpdateZIndexOfChildrenBufferIndex, 1 );
      }
      
      // Make sure the z-order array stays solid.
      this._updateZIndexAllSiblings();
      
      // Since were not in the parent's array anymore, we don't need a reference
      // to that object.
      this.parent  = null;
      this.parents = [];
    }
    return this;
  },
  
/** = Description
  *
  * Deletes the component and all its children.
  * Should normally be called from the parent.
  *
  **/
  die: function() {
    // hide self, makes destruction seem faster
    this.hide();
    this.drawn = false;
    this.stopAnimation();
    // Delete the children first.
    var _childViewId, i;
    while (this.views.length !== 0) {
      _childViewId = this.views[0];
      this.destroyView(_childViewId);
    }
    // Remove this object's bindings, except the DOM element.
    this.remove();
    // Remove the DOM element bindings.
    for ( i = 0; i < this._domElementBindings.length; i++) {
      ELEM.del(this._domElementBindings[i]);
    }
    this._domElementBindings = [];
    
    
    // Remove the DOM object itself
    ELEM.del(this.elemId);
    
    this.rect = null;
    var _this = this;
    for( i in _this ){
      _this[i] = null;
      delete _this[i];
    }
  },
  
/** Recursive idle poller. Should be extended if functionality is desired.
  **/
  onIdle: function() {
    for(var i = 0; i < this.views.length; i++) {
      HSystem.views[this.views[i]].onIdle();
    }
  },
  
/** Used by addView to build a parents array of parent classes.
  **/
  buildParents: function(_viewId){
    var _view = HSystem.views[_viewId];
    _view.parent = this;
    _view.parents = [];
    for(var _parentNum = 0; _parentNum < this.parents.length; _parentNum++) {
      _view.parents.push(this.parents[_parentNum]);
    }
    _view.parents.push(this);
  },
  
/** = Description
  * Adds a sub-view/component to the view.
  *
  * Called from inside the HView constructor and should be automatic for all 
  * components that accept the 'parent' parameter, usually the second argument,
  * after the HRect.
  *
  * May also be used to attach a freely floating component (removed with remove)
  * to another component.
  *
  * = Parameter
  * +_view+::   Usually this inside HView derivate components.
  *
  * = Returns
  * The view id.
  *
  **/
  addView: function(_view) {
    var _viewId = HSystem.addView(_view);
    this.views.push(_viewId);
    
    this.buildParents(_viewId);
    this.viewsZOrder.push(_viewId);
    
    return _viewId;
  },
  
/** = Description
  * Call this if you need to remove a child view from this view without
  * destroying its element, making it in effect a view without parent.
  * Useful, for example, for moving a view from one parent component to another.
  *
  * = Parameters
  * +_viewId+::  The parent-specific view id. Actually an array index.
  *
  * = Returns
  * +self+
  *
  **/
  removeView: function(_viewId) {
    HSystem.views[_viewId].remove();
    return this;
  },
  
/** = Description
  * Call this if you need to remove a child view from this view, destroying its
  * child elements recursively and removing all DOM elements too.
  *
  * = Parameters
  *  +_viewId+::  The parent-specific view id. Actually an array index.
  *
  * = Returns
  * +self+
  **/
  destroyView: function(_viewId) {
    HSystem.views[_viewId].die();
    return this;
  },
  
/** = Description
  *  Returns bounds rectangle that defines the size and coordinate system
  *  of the component. This should be identical to the rectangle used in
  *  constructing the object, unless it has been changed after construction.
  *
  * = Returns
  *  A new <HRect> instance with identical values to this component's rect.
  *
  **/
  bounds: function() {
    // Could be cached.
    var _bounds = new HRect(this.rect);
    
    _bounds.right -= _bounds.left;
    _bounds.left = 0;
    _bounds.bottom -= _bounds.top;
    _bounds.top = 0;
    
    return _bounds;
  },
  
  
/** = Description
  * This method resizes the view, without moving its left and top sides.
  * It adds horizontal coordinate units to the width and vertical units to
  * the height of the view.
  * 
  * Since a View's frame rectangle must be aligned on screen pixels, only
  * integral values should be passed to this method. Values with
  * fractional components will be rounded to the nearest whole integer.
  *
  * If the View is attached to a window, this method causes its parent view
  * to be updated, so the View is immediately displayed in its new size. If it
  * doesn't have a parent or isn't attached to a window, this method
  * merely alter its frame and bounds rectangle.
  *
  * = Parameters
  *  +_horizonal+::  Horizonal units to add to the width (negative units subtract)
  *  +_vertical+::   Vertical units to add to the height (negative units subtract)
  *
  * = Returns
  * +self+
  *
  **/
  resizeBy: function(_horizontal, _vertical) {
    var _rect = this.rect;
    _rect.right += _horizontal;
    _rect.bottom += _vertical;
    _rect.updateSecondaryValues();
    this.drawRect();
    return this;
  },

/** = Description
  * This method makes the view width units wide
  * and height units high. This method adjust the right and bottom
  * components of the frame rectangle accordingly.
  * 
  * Since a View's frame rectangle must be aligned on screen pixels, only
  * integral values should be passed to this method. Values with
  * fractional components will be rounded to the nearest whole integer.
  * 
  * If the View is attached to a window, this method causes its parent view
  * to be updated, so the View is immediately displayed in its new size. If it
  * doesn't have a parent or isn't attached to a window, this method
  * merely alter its frame and bounds rectangle.
  *
  * +Parameters+
  *  +_width+::  The new width of the view.
  *  +_height+:: The new height of the view.
  *
  * = Returns
  * +self+
  *
  **/
  resizeTo: function(_width, _height) {
    var _rect = this.rect;
    _rect.right = _rect.left + _width;
    _rect.bottom = _rect.top + _height;
    _rect.updateSecondaryValues();
    this.drawRect();
    return this;
  },

/** = Descripion
  * This method moves the view to a new coordinate. It adjusts the 
  * left and top components of the frame rectangle accordingly.
  * 
  * Since a View's frame rectangle must be aligned on screen pixels, only
  * integral values should be passed to this method. Values with
  * fractional components will be rounded to the nearest whole integer.
  * 
  * If the View is attached to a window, this method causes its parent view
  * to be updated, so the View is immediately displayed in its new size. If it
  * doesn't have a parent or isn't attached to a window, this method
  * merely alter its frame and bounds rectangle.
  *
  * = Parameters:
  *  +_x+::     The new x-coordinate of the view.
  *  +_y+::     The new y-coordinate of the view.
  *
  *  +_point+:: The new coordinate point of the view.
  *
  * = Returns
  * +self+
  *
  **/
  offsetTo: function() {
    this.rect.offsetTo.apply(this.rect, arguments);
    this.drawRect();
    return this;
  },
  
/** = Description
  * Alias method for offsetTo.
  * 
  * = Returns
  * +self+
  *
  **/
  moveTo: function() {
    this.offsetTo.apply(this, arguments);
    return this;
  },
  
/** = Description
  * This method re-positions the view without changing its size.
  * It adds horizontal coordinate units to the x coordinate and vertical
  * units to the y coordinate of the view.
  * 
  * Since a View's frame rectangle must be aligned on screen pixels, only
  * integral values should be passed to this method. Values with
  * fractional components will be rounded to the nearest whole integer.
  *
  * If the View is attached to a window, this method causes its parent view
  * to be updated, so the View is immediately displayed in its new size. If it
  * doesn't have a parent or isn't attached to a window, this method
  * merely alter its frame and bounds rectangle.
  *
  * = Parameters
  *  +_horizonal+::  Horizonal units to change the x coordinate (negative units subtract)
  *  +_vertical+::   Vertical units to add to change the y coordinate (negative units subtract)
  *
  * = Returns
  * +self+
  *
  **/
  offsetBy: function(_horizontal, _vertical) {
    this.rect.offsetBy(_horizontal, _vertical);
    this.drawRect();
    return this;
  },
  
/** = Description
  * Alias method for offsetBy.
  *
  * = Returns
  * +self+
  *
  **/
  moveBy: function() {
    this.offsetBy.apply(this, arguments);
    return this;
  },

/** = Description
  * Brings the view to the front by changing its Z-Index.
  *
  * = Returns
  * +self+
  *
  **/
  bringToFront: function() {
    if (this.parent) {
      var _index = this.zIndex();
      this.parent.viewsZOrder.splice(_index, 1);
      this.parent.viewsZOrder.push(this.viewId);
      this._updateZIndexAllSiblings();
    }
    return this;
  },
  
/** = Descripion
  * Brings itself to the front of the given view by changing its Z-Index.
  * Only works on sibling views.
  *
  * = Parameters
  *  +_view+::  The view to bring to the front of.
  *
  * = Returns
  * +self+
  *
  **/
  bringToFrontOf: function(_view){
    if(this.parent.viewId === _view.parent.viewId){
      this.parent.viewsZOrder.splice( this.zIndex(), 1 ); // removes selfs index from the array
      this.parent.viewsZOrder.splice( _view.zIndex()+1, 0, this.viewId); // sets itself in front of to _view
      this._updateZIndexAllSiblings();
    }
    return this;
  },
  
/** = Description
  * Sends itself to the back of the given view by changing its Z-Index.
  * Only works on sibling views.
  *
  * = Parameters
  *  +_view+::  The view to send to the back of.
  *
  * = Returns
  * +self+
  *
  **/
  sendToBackOf: function(_view){
    if(this.parent.viewId === _view.parent.viewId){
      this.parent.viewsZOrder.splice( this.zIndex(), 1 ); // removes selfs index from the array
      this.parent.viewsZOrder.splice( _view.zIndex(), 0, this.viewId); // sets itself in back of to _view
      this._updateZIndexAllSiblings();
    }
    return this;
  },
  
/** = Description
  * Sends itself one step backward by changing its Z-Index.
  *
  * = Returns
  * +self+
  *
  **/
  sendBackward: function(){
    var _index = this.zIndex();
    if(_index!==0){
      this.parent.viewsZOrder.splice( _index, 1 ); // removes selfs index from the array
      this.parent.viewsZOrder.splice( _index-1, 0, this.viewId); // moves selfs position to one step less than where it was
      this._updateZIndexAllSiblings();
    }
    return this;
  },
  
/** = Description
  * Brings itself one step forward by changing its Z-Index.
  *
  * = Returns
  * +self+
  *
  **/
  bringForward: function(){
    var _index = this.zIndex();
    if(_index!==this.parent.viewsZOrder.length-1){
      this.parent.viewsZOrder.splice( _index, 1 ); // removes selfs index from the array
      this.parent.viewsZOrder.splice( _index+1, 0, this.viewId); // moves selfs position to one step more than it was
      this._updateZIndexAllSiblings();
    }
    return this;
  },
  

/** = Description
  * Sends the view to the back by changing its Z-Index.
  *
  * = Returns
  * +self+
  *
  **/
  sendToBack: function() {
    if (this.parent) {
      var _index = this.zIndex();
      this.parent.viewsZOrder.splice(_index, 1); // removes this index from the arr
      this.parent.viewsZOrder.splice(0, 0, this.viewId); // unshifts viewId
      this._updateZIndexAllSiblings();
    }
    return this;
  },

/** = Description
  * Use this method to get the Z-Index of itself.
  *
  * = Returns
  *  The current Z-Index value.
  *
  **/
  zIndex: function() {
    if (!this.parent) {
      return -1;
    }
    // Returns the z-order of this item as seen by the parent.
    return this.parent.viewsZOrder.indexOf(this.viewId);
  },
  
/** = Description
  * Measures the characters encoded in length bytes of the string - or,
  * if no length is specified, the entire string up to the null character,
  * '0', which terminates it. The return value totals the width of all the
  * characters in coordinate units; it's the length of the baseline required
  * to draw the string.
  *
  * = Parameters
  * +_string+::  The string to measure.
  * +_length+::  optional, How many characters to count.
  * +_elemId+::  optional, The element ID where the temporary string is created
  *              in.
  *
  * = Returns
  * The width in pixels required to draw a string in the font.
  *
  **/
  stringSize: function(_string, _length, _elemId, _wrap, _extraCss) {
    if (_length || _length === 0) {
      _string = _string.substring(0, _length);
    }
    if (!_elemId && _elemId !== 0) {
      _elemId = this.elemId;
    }
    if (!_extraCss) {
      _extraCss = '';
    }
    if (!_wrap){
      _extraCss += 'white-space:nowrap;';
    }
    
    var _stringElem = ELEM.make(_elemId);
    ELEM.setCSS(_stringElem, "visibility:hidden;position:absolute;"+_extraCss);
    ELEM.setHTML(_stringElem, _string);
    ELEM.flushLoop();
    var _visibleSize=ELEM.getVisibleSize(_stringElem);
    ELEM.del(_stringElem);
    return _visibleSize;
  },
  
/** Returns the string width
  **/
  stringWidth: function(_string, _length, _elemId, _extraCss){
    return this.stringSize(_string, _length, _elemId, false, _extraCss)[0];
  },
  
  /** Returns the string height.
    **/
  stringHeight: function(_string, _length, _elemId, _extraCss){
    return this.stringSize(_string, _length, _elemId, true, _extraCss)[1];
  },
  
/** Returns the X coordinate that has the scrolled position calculated.
  **/
  pageX: function() {
    var _x = 0;
    var _elem = this;
    while(_elem) {
      if(_elem.elemId && _elem.rect) {
        _x += ELEM.get(_elem.elemId).offsetLeft;
        _x -= ELEM.get(_elem.elemId).scrollLeft;
      }
      if(_elem.markupElemIds&&_elem.markupElemIds.subview){
        _x += ELEM.get(_elem.markupElemIds.subview).offsetLeft;
        _x -= ELEM.get(_elem.markupElemIds.subview).scrollLeft;
      }
      _elem = _elem.parent;
    }
    return _x;
  },
  
/** Returns the Y coordinate that has the scrolled position calculated.
  **/
  pageY: function() {
    var _y = 0;
    var _elem = this;
    while(_elem) {
      if(_elem.elemId && _elem.rect) {
        _y += ELEM.get(_elem.elemId).offsetTop;
        _y -= ELEM.get(_elem.elemId).scrollTop;
      }
      if(_elem.markupElemIds&&_elem.markupElemIds.subview){
        _y += ELEM.get(_elem.markupElemIds.subview).offsetTop;
        _y -= ELEM.get(_elem.markupElemIds.subview).scrollTop;
      }
      _elem = _elem.parent;
    }
    return _y;
  },
  
/** Returns the HPoint that has the scrolled position calculated.
  **/
  pageLocation: function() {
    return new HPoint(this.pageX(), this.pageY());
  },
  
/** = Description
  * An abstract method that derived classes may implement, if they are able to
  * resize themselves so that their content fits nicely inside.
  * 
  **/
  optimizeWidth: function() {

  },
  
  
/** = Description
  * Invalidates event manager's element position cache for this view and its
  * subviews. Actual functionality is implemented in HControl.
  * 
  * = Returns
  * +self+
  * 
  **/
  invalidatePositionCache: function() {
    for(var i=0; i<this.views.length; i++) {
      HSystem.views[this.views[i]].invalidatePositionCache();
    }
    return this;
  },
  
  
/** = Description
  * Binds a DOM element to the element manager's cache. This is a wrapper for
  * the Element Manager.elem_bind that keeps track of the bound elements and
  * frees them from the element manager when the view is destroyed.
  * 
  * = Parameters
  * +_domElementId+:: The value of the DOM element's id attribute that is
  *                     to be bound to the element cache.
  * 
  * = Returns
  * The element index id of the bound element.
  * 
  **/
  bindDomElement: function(_domElementId) {
    var _cacheId = ELEM.bindId(_domElementId);
    if (_cacheId) {
      this._domElementBindings.push(_cacheId);
    }
    return _cacheId;
  },
  
  
/** = Description
  * Removes a DOM element from the element manager's cache. This is a wrapper
  * for the <Element Manager.elem_del>. This is used for safely removing DOM
  * nodes from the cache.
  * 
  * = Parameters
  *   +_elementId+:: The id of the element in the element manager's cache 
  *                  that is to be removed from the cache.
  * 
  **/
  unbindDomElement: function(_elementId) {
    var _indexOfElementId = this._domElementBindings.indexOf(_elementId);
    if (_indexOfElementId > -1) {
      ELEM.del(_elementId);
      this._domElementBindings.splice(_indexOfElementId, 1);
    }
  }
  
  
});

HView.implement(HMarkupView);
HView.implement(HMorphAnimation);
