/*   Riassence Framework
 *   Copyright 2007 Riassence Inc.
 *   http://riassence.com/
 *
 *   You should have received a copy of the GNU General Public License along
 *   with this software package. If not, contact licensing@riassence.com
 */

/** = Description
  * The interval to flush the buffer specified in milliseconds.
**/
ELEMTickerInterval = 10;

/** = Description
  * An object that contains the browser types detected as booleans.
**/
BROWSER_TYPE = {
  
/* Any version of Microsoft Internet Explorer */
  ie: false,
  
/* Microsoft Internet Explorer version 6 */
  ie6: false,
  
/* Microsoft Internet Explorer version 7 */
  ie7: false,
  
/* Microsoft Internet Explorer version 8 */
  ie8: false,
  
/* Any version of Opera */
  opera: false,
  
/* Any version of Safari (and other KHTML/WebKit -derived browsers) */
  safari: false,
  
/* The Symbian version of KHTML/WebKit/Safari, is also registered as +safari+ */
  symbian: false,
  
/* Any version of Google Chrome, is also registered as +safari+ */
  chrome: false,
  
/* Any version of Mozilla Firefox */
  firefox: false,

/* Mozilla Firefox version 2 */
  firefox2: false,

/* Mozilla Firefox version 3 */
  firefox3: false
};

/** = Description
  * The DOM Abstraction collection. Implements a managed buffer
  * for style properties.
**/
ELEM = {

  // stuff moved inside this function, because (surprise, surprise!) ie6 had some issues with it.
  _constructor: function() {
    var _this = ELEM;

    _this._enableRecycler = false;

    // pre-init queue
    _this._domLoadQueue = [];
    _this._domLoadTimer = null;

    // turns true when document is actually loaded:
    _this._domLoadStatus = false;

    // initial tasks
    _this._initDone = false;

    _this._makeCount = 0;

    _this._setStyleCount = 0;
    _this._setStyleDiffCount = 0;
    _this._getStyleCount = 0;
    _this._getStyleMissCount = 0;

    _this._flushLoopCount = 0;
    _this._flushLoopFlushedCount = 0;
    _this._flushStylCount = 0;

    _this._flushTime = 0;
    _this._flushCounter = 0;
    _this._idleDelay = 500;

    _this._timer = null;
    _this._minDelay = ELEMTickerInterval;
    _this._flushing = false;
    _this._needFlush = false;
    _this._slowness = 1;

    _this._elements = [];
    if (_this._enableRecycler) {
      _this._recycler = {
        _tagNames: []
      };
    } else {
      _this._freeElemIds = [];
    }
    _this._styleCache = {};
    _this._styleTodo = {};
    _this._attrTodo = {};
    _this._attrCache = {};
    _this._elemTodo = [];
    _this._elemTodoH = {};
    _this._blockElems = ",ADDRESS,BLOCKQUOTE,CENTER,DIR,DIV,DL,FIELDSET,FORM,H1,H2,H3,H4,H5,H6,HR,ISINDEX,MENU,NOFRAMES,NOSCRIPT,OL,P,PRE,TABLE,UL,";
  },


  _fillTrash: function(_count, _tagName) {
    if (!ELEM._enableRecycler) {
      return;
    }
    var _this = ELEM,
        i = 0,
        _toDel = [],
        _recycler = _this._initRecycler(_tagName),
        _trashId = _recycler._trashId;
    for (; i !== _count; i++) {
      _toDel.push(_this.make(_trashId, _tagName));
    }
    for (i = 0; i !== _count; i++) {
      _this.del(_toDel[i]);
    }
  },

  // adds an element reference
  // returns its id
  _add: function(_elem) {
    var _id,
        _this = ELEM,
        _elements = _this._elements,
        _hasFreeElemIds = (_this._freeElemIds.length !== 0);
    if (_hasFreeElemIds) {
      _id = _this._freeElemIds.pop();
      _elements[_id] = _elem;
    }
    else {
      // Adds the element to the cache
      _elements.push(_elem);
      // Get cache size == serial id
      _id = _elements.length - 1;
    }
    return _id;
  },

  // makes new style caches
  _initCache: function(_id) {
    var _this = ELEM;
    _this._styleTodo[_id] = [];
    _this._styleCache[_id] = {};
    _this._attrTodo[_id] = [];
    _this._attrCache[_id] = {};
    _this._elemTodoH[_id] = false;
  },

/** = Description
  * Binds a DOM element by the DOM ID-attribute.
  *
  * = Parameters
  * +_domId+::   The element's ID-attribute to bind.
  *
  * = Returns
  * The ELEM ID (to use with other ELEM methods.
  *
  **/
  bindId: function(_domId) {
    var _this = ELEM,
        _elem = document.getElementById(_domId),
        _elemId = _this._add(_elem);
    _this._initCache(_elemId);
    return _elemId;
  },

/** = Description
  * Binds a DOM element by the DOM Element Object itself.
  *
  * = Parameters
  * +_elem+::   The DOM Element object to bind.
  *
  * = Returns
  * The ELEM ID (to use with other ELEM methods.
  *
  **/
  bind: function(_elem) {
    var _this = ELEM,
        _id = _this._add(_elem);
    _this._initCache(_id);
    return _id;
  },

  // deprecated; backwards-compatibility
  _replace: function(_id, _elem) {
    ELEM._elements[_id] = _elem;
  },

/** = Description
  * Gets a DOM Element by its ELEM ID.
  *
  * = Parameters
  * +_id+::  The ELEM ID.
  *
  * = Returns
  * The DOM Element object.
  *
  **/
  get: function(_id) {
    return ELEM._elements[_id];
  },

/** = Description
  * Sets the innerHTML of an element by its ELEM ID.
  *
  * = Parameters
  * +_id+::   The ELEM ID.
  * +_html+:: The HTML Block as a string to set the innerHTMl property with.
  *
  **/
  setHTML: function(_id, _html) {
    try {
      var _this = ELEM;
      if (!_this._elements[_id]) {
        return;
      }
      if (! ((typeof _html === 'string') || (typeof _html === 'number'))) {
        return;
      }
      _this._elements[_id].innerHTML = _html;
    } catch(e) {}
    //_this._initCache(_id);
  },

/** = Description
  * Gets the innerHTML of an element by its ELEM ID.
  *
  * = Parameters
  * +_id+::   The ELEM ID.
  *
  * = Returns
  * The innerHTML of the element the ELEM ID is bound to.
  *
  **/
  getHTML: function(_id) {
    try {
      var _this = ELEM;
      if (_this._elements[_id]) {
        return _this._elements[_id].innerHTML;
      }
    } catch(e) {}
    //_this._initCache(_id);
    return '';
  },

  _initRecycler: function(_tagName) {
    if (!ELEM._enableRecycler) {
      return null;
    }
    var _this = ELEM,
        _recycler = _this._recycler;
    if (!_recycler[_tagName]) {
      _recycler._tagNames.push(_tagName);
      _recycler[_tagName] = [];
      _recycler[_tagName]._countIn = 1;
      _recycler[_tagName]._countOut = 0;
      _recycler[_tagName]._trashId = _this.make(_this._trashId, 'div');
    }
    return _recycler[_tagName]._trashId;
  },

/** = Description
  * Deletes an element and its associated buffers by ELEM ID.
  *
  * = Parameters
  * +_id+::   The ELEM Id to delete.
  *
  **/
  del: function(_id) {
    var _this = ELEM,
        _elem = _this._elements[_id];
    if (_this._flushing) {
      _this.del(_id);
    }
    _this._flushing = true;
    if (_this._enableRecycler) {
      var _tagName = _elem.tagName,
          _trashId = _this._initRecycler(_tagName),
          _recycler = _this._recycler[_tagName];
      _this.append(_id, _trashId);
    }

    var _elemTodoIdx = _this._elemTodo.indexOf(_id);
    if (_elemTodoIdx !== -1) {
      _this._elemTodo.splice(_elemTodoIdx, 1);
    }
    _this._initCache(_id);
    if (_this._enableRecycler) {
      _recycler._countIn++;
      _recycler.push(_id);
    } else {
      _this._freeElemIds.push(_id);
      var _parentNode = _elem.parentNode;
      if (_parentNode !== null) {
        _parentNode.removeChild(_elem);
      }
      _elem = null;
      _this._elements[_id] = null;
    }
    _this._flushing = false;
  },

/** = Description
  * Moves the source element inside the target element.
  *
  * = Parameters
  * +_sourceId+::   The source element's ELEM ID to move.
  * +_targetId+::   The target element's ELEM ID to move the source element into.
  *
  **/
  append: function(_sourceId, _targetId) {
    var _this = ELEM,
        _source = _this._elements[_sourceId],
        _target = _this._elements[_targetId];
    _target.appendChild(_source);
  },

/** = Description
  * Replaces all styles of the element with the string containing css source.
  *
  * = Parameters
  * +_id+::         The ELEM ID which all styles will be replaced
  *                 with the css source.
  * +_cssText+::    A string containing the CSS Text.
  *
  **/
  setCSS: function(_id, _cssText) {
    ELEM._elements[_id].style.cssText = _cssText;
  },

/** = Description
  * Returns the CSS source style of the element.
  * 
  * = Parameters
  * +_id+::   The ELEM ID which all styles will be returned as
  *           a string containing the CSS source.
  * 
  * = Returns
  * A string containing the CSS source of the element.
  *
  **/
  getCSS: function(_id) {
    return ELEM._elements[_id].style.cssText;
  },

/** = Description
  * Returns the visible size of an element.
  *
  * = Parameters
  * +_id+::  The ELEM ID.
  *
  * = Returns
  * An [ width, height ] pair as an Array.
  *
  **/
  getVisibleSize: function(_id) {
    var _parentOverflow,
        _this = ELEM,
        _elem = _this._elements[_id],
        w = _elem.offsetWidth,
        h = _elem.offsetHeight,
        _parent = _elem.parentNode;
    while (_parent && _parent.nodeName.toLowerCase() !== 'body') {
      if (!BROWSER_TYPE.ie) {
        _parentOverflow = document.defaultView.getComputedStyle(
        _parent, null
        ).getPropertyValue('overflow');
      }
      else {
        _parentOverflow = _parent.currentStyle.getAttribute('overflow');
      }
      _parentOverflow = _parentOverflow !== 'visible';
      if (w > _parent.clientWidth && _parentOverflow) {
        w = _parent.clientWidth - _elem.offsetLeft;
      }
      if (h > _parent.clientHeight && _parentOverflow) {
        h = _parent.clientHeight - _elem.offsetTop;
      }
      _elem = _elem.parentNode;
      _parent = _elem.parentNode;
    }
    return [w, h];
  },

/** = Description
  * Returns the full size of the element.
  *
  * = Parameters
  * +_id+::  The ELEM ID.
  *
  * = Returns
  * An [ width, height ] pair as an Array.
  *
  **/
  getSize: function(_id) {
    var _this = ELEM,
        _elem = _this._elements[_id],
        w = _elem.offsetWidth,
        h = _elem.offsetHeight;
    return [w, h];
  },

/** = Description
  * Returns the scroll size of the element.
  *
  * = Parameters
  * +_id+::  The ELEM ID.
  *
  * = Returns
  * An [ width, height ] pair as an Array.
  *
  **/
  getScrollSize: function(_id) {
    var _this = ELEM,
        _elem = _this._elements[_id],
        w = _elem.scrollWidth,
        h = _elem.scrollHeight;
    return [w, h];
  },
  
/** = Description
  * Returns the real position of the element, subtracting whatever
  * scroll bars do to the position..
  *
  * = Parameters
  * +_id+::  The ELEM ID.
  *
  * = Returns
  * An [ x, y ] coordinate pair as an Array.
  *
  **/
  getVisiblePosition: function(_id) {
    var _this = ELEM,
        x = 0,
        y = 0,
        _elem = _this._elements[_id];
    while (_elem !== document) {
      x += _elem.offsetLeft;
      y += _elem.offsetTop;
      x -= _elem.scrollLeft;
      y -= _elem.scrollTop;
      _elem = _elem.parentNode;
      if (!_elem) {
        break;
      }
    }
    return [x, y];
  },

/** = Description
  * Returns the opacity of the element.
  *
  * = Parameters
  * +_id+::  The ELEM ID.
  *
  * = Returns
  * The opacity as a floating point number between 0.0 (transparent) and 1.0 (opaque).
  *
  **/
  getOpacity: function(_id) {
    var _opacity,
        _try_opacity,
        _this = ELEM,
        _getStyle = _this.getStyle;
    // old safari (1.x):
    if (_opacity === _getStyle(_id, '-khtml-opacity')) {
      return parseFloat(_opacity);
    }
    // old mozilla (ff 1.0 and below):
    if (_opacity === _getStyle(_id, '-moz-opacity')) {
      return parseFloat(_opacity);
    }
    _try_opacity = _getStyle(_id, 'opacity', true);
    if (_opacity === _try_opacity || (_try_opacity === 0)) {
      return parseFloat(_opacity);
    }
    if (_opacity === (_this._elements[_id].currentStyle['filter'] || '').match(/alpha(opacity=(.*))/)) {
      if (_opacity[1]) {
        return parseFloat(_opacity[1]) / 100;
      }
    }
    return 1.0;
  },
  
/** = Description
  * Sets the opacity of the element.
  *
  * = Parameters
  * +_id+::       The ELEM ID.
  * +_opacity+::  The opacity as a floating point number between 0.0 (transparent) and 1.0 (opaque).
  *
  **/
  setOpacity: function(_id, _opacity) {
    var _this = ELEM;
    if (_opacity === 1 && BROWSER_TYPE.ie6) {
      _this._elements[_id].style.setAttribute('filter', _this.getStyle(_id, 'filter', true).replace(/alpha([^)]*)/gi, ''));
    }
    else {
      if (_opacity < 0.01) {
        _opacity = 0;
      }
      if (BROWSER_TYPE.ie6) {
        _this._elements[_id].style.setAttribute('filter', _this.getStyle(_id, 'filter', true).replace(/alpha([^)]*)/gi, '') + 'alpha(opacity=' + _opacity * 100 + ')');
      }
      else if (BROWSER_TYPE.ie) {
        (_this._elements[_id].style.setAttribute('opacity', _opacity));
      }
      else {
        _this._elements[_id].style.setProperty('opacity', _opacity, '');
      }
    }
  },

/** = Description
  * Like getStyle, but always return an integer number.
  *
  * = Parameters
  * +_id+::   The ELEM ID.
  * +_key+::  The style property name.
  *
  * = Returns
  * The value of the style property.
  *
  **/
  getIntStyle: function(_id, _key) {
    var _value = ELEM.getStyle(_id, _key);
    return parseInt(_value, 10);
  },
  
/** = Description
  * Sets the box coordinates (x,y,width,height) all at once.
  *
  * = Parameters
  * +_id+::      The ELEM ID.
  * +_coords+::  An array containing exactly four coordinates in the following
  *              order: x, y, width, height
  *
  **/
  setBoxCoords: function(_id, _coords) {
    ELEM.setStyle(_id, 'left', _coords[0] + 'px');
    ELEM.setStyle(_id, 'top', _coords[1] + 'px');
    ELEM.setStyle(_id, 'width', _coords[2] + 'px');
    ELEM.setStyle(_id, 'height', _coords[3] + 'px');
  },
  
/** = Description
  * Returns the amount of width of the element taken by 'extra' space: border
  * and padding size.
  *
  * = Parameters
  * +_id+::      The ELEM ID.
  *
  * = Returns
  * The amount of extra width as an integer.
  *
  **/
  getExtraWidth: function(_id) {
    var _int = ELEM.getIntStyle;
    return _int(_id, 'padding-left') + _int(_id, 'padding-right') + _int(_id, 'border-left-width') + _int(_id, 'border-right-width');
  },
  
/** = Description
  * Returns the amount of height of the element taken by 'extra' space: border
  * and padding size.
  *
  * = Parameters
  * +_id+::      The ELEM ID.
  *
  * = Returns
  * The amount of extra height as an integer.
  *
  **/
  getExtraHeight: function(_id) {
    var _int = ELEM.getIntStyle;
    return _int(_id, 'padding-top') + _int(_id, 'padding-bottom') + _int(_id, 'border-top-width') + _int(_id, 'border-bottom-width');
  },
  
/** = Description
  * Re-calculates the amount of delay to achieve a new target frame rate.
  *
  * The DOM refreshes are typically the most expensive tasks of an Javascript
  * application, it's a good idea to set an optimal frame rate for the DOM
  * updates to let your logic code get as many cpu cycles as possible without
  * wasting most of them on more DOM refreshes than necessary.
  *
  * The default frame rate is 30 and the maximum frame rate allowed is 100.
  *
  * = Parameters
  * +_fps+::      The target frame rate (DOM updates per second).
  *
  **/
  setFPS: function(_fps) {
    var _this = ELEM;
    _this._minDelay = 1000 / _fps;
    if (_this._minDelay < ELEMTickerInterval) {
      _this._minDelay = ELEMTickerInterval;
    }
  },
  
/** = Description
  * An additional adjustment multiplier to offset the slowness of a
  * target browser.
  *
  * The default is 1.0 (no change to the flush delay calculated by setFPS)
  * A higher value than 1.0 means less frequent updates (slower than 
  * target machine).
  *
  * You'll need a benchmark in your application to calculate the multiplier
  * correctly depending on the tasks necessary. The multiplier is useless 
  * without a benchmark, unless you want to temporarily make updates very
  * infrequent (or frequent) depending on what your application needs to do.
  *
  * = Parameters
  * +_slowness+::      The multiplier used to offset the DOM update delay.
  *
  **/
  setSlowness: function(_slowness) {
    // we should replace this with an
    // actual browser speed benchmark
    ELEM._slowness = _slowness;
  },
  
/** = Description
  * Sets the idle delay.
  *
  * The idle delay is the amount of milliseconds between polling for something
  * to flush to DOM. This is the setting affecting how long (max) it takes to
  * start flushing the buffers after the buffers have been emptied.
  *
  * = Parameters
  * +_idleDelay+::     The amount of milliseconds to wait before re-checking
  *                    the buffers after going idle.
  *
  **/
  setIdleDelay: function(_idleDelay) {
    ELEM._idleDelay = _idleDelay;
  },
  
  // flag for IE6
  _ieFixesNeeded: false,
  
/** = Description
  * Flushes the buffers.
  * Call this method manually, if you need to ensure all changes are
  * flushed to the DOM before doing another operation.
  *
  * = Parameters:
  * +_delay+::  Time (ms) before retrying, if another flushLoop is busy.
  *
  **/
  flushLoop: function(_delay) {
    var _this = ELEM;
    _this._flushLoopCount++;
    if (BROWSER_TYPE.ie6 && /* (_this._flushLoopCount % 5 === 0) && */ _this._ieFixesNeeded) {
      //window.status = 'traversetree0:'+_this._flushLoopCount;
      iefix._traverseTree();
      _this._ieFixesNeeded = false;
    }
    clearTimeout(_this._timer);
    if (_this._flushing) {
      _delay *= 2;
      _this._timer = setTimeout(
        function(){
          ELEM.flushLoop( _delay );
        }, _delay
      );
      return;
    } else {
      if (!_this._needFlush) {
        // goto sleep mode
        if (BROWSER_TYPE.ie6 && _this._ieFixesNeeded) {
          //window.status = 'traversetree1:'+_this._flushLoopCount;
          iefix._traverseTree();
          _this._ieFixesNeeded = false;
        }
        _this._timer = setTimeout(
          function(){
            ELEM.flushLoop(_delay);
          }, _this._idleDelay
        );
        return;
      }
      _delay = parseInt(_this._slowness * (_this._flushTime / _this._flushCounter), ELEMTickerInterval);
      if (_delay < _this._minDelay || !_delay) {
        _delay = _this._minDelay;
      }
      _this._flushing = true;
      _this._timer = setTimeout(
        function(){
          ELEM.flushLoop(_delay);
        }, _delay
      );
    }
    _this._flushTime -= new Date().getTime();
    var i,
        _id,
        _elemTodo = _this._elemTodo,
        _loopMaxL = _elemTodo.length,
        _currTodo = _elemTodo.splice(0, _loopMaxL),
        _flushStartTime = new Date().getTime();
    for (i = 0; i < _loopMaxL; i++) {
      _this._flushLoopFlushed++;
      _id = _currTodo.pop();
      _this._elemTodoH[_id] = false;
      _this._flushStyleCache(_id);
      _this._flushAttrCache(_id);
    }
    _this._flushCounter++;
    _this._flushTime += new Date().getTime();
    if (_this._elemTodo.length === 0 && _this._needFlush) {
      _this._needFlush = false;
    }
    _this._flushing = false;
  },
  
  /* Method for flushing the attribute cache */
  _flushAttrCache: function(_id) {
    var _this = ELEM,
        _attrTodo = _this._attrTodo[_id],
        _attrCache = _this._attrCache[_id],
        _elem = _this._elements[_id],
        //_elemP=_elem.setAttribute,
        _key,
        _val,
        i,
        _iMax = _attrTodo.length,
        _currTodo = _attrTodo.splice(0, _iMax);
    for (i = 0; i !== _iMax; i++) {
      _key = _currTodo.pop();
      _val = _attrCache[_key];
      _elem.setAttribute(_key, _val);
      //_elem[_key]=_val;
    }
  },
  
/** = Description
  * Gets a named element attribute.
  *
  * Regular element attributes are cached like the style attributes.
  * Use this method to get an attribute from the element.
  *
  * = Parameters
  * +_id+::       The ELEM ID.
  * +_key+::      The Attribute name.
  * +_bypass+::   A flag used to bypass the buffers (Optional, default: false)
  *
  * = Returns
  * The attribute value.
  *
  **/
  getAttr: function(_id, _key, _bypass) {
    var _this = ELEM,
        _attrVal = _this._attrCache[_id][_key],
        _val;
    if (_attrVal !== undefined && !_bypass) {
      return _attrVal;
    }
    var _elem = _this._elements[_id];
    if (_elem.getAttribute(_key) === null) {
      _elem[_key] = '';
    }
    _val = _elem.getAttribute(_key);
    _this._attrCache[_id][_key] = _val;
    return _val;
  },
  
/** = Description
  * Sets a named element attribute value.
  *
  * Regular element attributes are cached like the style attributes.
  * Use this method to set an attribute value to the element.
  *
  * = Parameters
  * +_id+::       The ELEM ID.
  * +_key+::      The Attribute name.
  * +_value+::    The Attribute value.
  * +_bypass+::   A flag used to bypass the buffers (Optional, default: false)
  *
  **/
  setAttr: function(_id, _key, _value, _bypass) {
    var _this = ELEM,
        _attrTodo = _this._attrTodo[_id],
        _attrCache = _this._attrCache[_id],
        _differs = _value !== _this.getAttr(_id, _key);
    if (_differs) {
      _attrCache[_key] = _value;
      if (_bypass) {
        _this._elements[_id].setAttribute(_key, _value);
      }
      else {
        if (_attrTodo.indexOf(_key) === -1) {
          _attrTodo.push(_key);
        }
        if (!_this._elemTodoH[_id]) {
          _this._elemTodo.push(_id);
          _this._elemTodoH[_id] = true;
          _this._checkNeedFlush();
        }
      }
    }
  },
  
/** = Description
  * Deletes a named element attribute
  *
  * = Parameters
  * +_id+::       The ELEM ID.
  * +_key+::      The Attribute name.
  *
  **/
  delAttr: function(_id, _key) {
    var _differs,
        _this = ELEM,
        _attrTodo = _this._attrTodo[_id],
        _attrCache = _this._attrCache[_id];
    delete _attrCache[_key];
    _this._elements[_id].removeAttribute(_key);
    if (_attrTodo.indexOf(_key) !== -1) {
      _attrTodo.splice(_attrTodo.indexOf(_key, 1));
    }
    if (_this._elemTodoH[_id]) {
      _this._elemTodo.splice(_this._elemTodo.indexOf(_id, 1));
      _this._elemTodoH[_id] = false;
      _this._checkNeedFlush();
    }
  },

/** = Description
  * Checks if a element has a CSS class name.
  *
  * = Parameters
  * +_elemId+::       The ELEM ID.
  * +_className+::    The CSS class name to check.
  *
  * = Returns
  * Returns null, if the element does not exist
  * Returns true, if the element has the class name set
  * Returns false otherwise
  *
  **/
  hasClassName: function(_elemId, _className) {
    var _element = ELEM.get(_elemId);
    if (!_element) {
      return null;
    }
    var _classNames = _element.className.split(' ');
    return (_classNames.indexOf(_className) !== -1);
  },
  
/** = Description
  * Adds a CSS class name to the element.
  *
  * = Parameters
  * +_elemId+::       The ELEM ID.
  * +_className+::    The CSS class name to add.
  *
  **/
  addClassName: function(_elemId, _className) {
    var _this = ELEM,
        _element = _this.get(_elemId);
    if (!_element) {
      return;
    }
    
    if(_element.className === '' || _element.className === ' '){
      _element.className = _className;
    }
    else{
      var _classNames = _element.className.split(' '),
          _index = _classNames.indexOf(_className);
      if(_index===-1){
        _classNames.push(_className);
        _element.className = _classNames.join(' ');
      }
    }
  },
  
/** = Description
  * Removes the CSS class name from the element.
  *
  * = Parameters
  * +_elemId+::       The ELEM ID.
  * +_className+::    The CSS class name to remove.
  *
  **/
  removeClassName: function(_elemId, _className) {
    var _this = ELEM,
        _element = _this.get(_elemId);
    if (!_element) {
      return;
    }
    
    if(!_this.hasClassName(_elemId, _className)){
      return;
    }
    
    var _classNames = _element.className.split(' '),
        _index = _classNames.indexOf(_className);
    if(_index!==-1){
      _classNames.splice(_index,1);
      _element.className = _classNames.join(' ');
    }
  },
  
  /* Checks, if the buffers need to be flushed. */
  _checkNeedFlush: function() {
    var _this = ELEM;
    if (!_this._needFlush) {
      _this._needFlush = true;
      if (!_this._flushing) {
        clearTimeout(_this._timer);
        _this._timer = setTimeout( function(){ELEM.flushLoop(ELEM._minDelay);}, _this._minDelay);
      }
    }
  },
  
/** = Description
  * Sets the named element style attribute value.
  *
  * Use this method to set a style attribute value optimally.
  * Element style attributes are buffered.
  * The buffers are flushed on regular intervals.
  *
  * = Parameters
  * +_id+::       The ELEM ID.
  * +_key+::      The Style Attribute name.
  * +_value+::    The Style Attribute value.
  * +_bypass+::   A flag used to bypass the buffers (Optional, default: false)
  *
  **/
  setStyle: function(_id, _key, _value, _bypass) {
    var _this = ELEM,
        _cached = _this._styleCache[_id],
        _elems = _this._elements,
        _differs,
        _styleTodo;
    _this._setStyleCount++;
    if (_cached === undefined) {
      _this._initCache(_id);
      _cached = _this._styleCache[_id];
    }
    _differs = _value !== _cached[_key];
    if (_differs) {
      _this._setStyleDiffCount++;
      _cached[_key] = _value;
      if (_bypass) {
        if (_key === 'opacity') {
          _this.setOpacity(_id, _value);
        }
        else {
          if( BROWSER_TYPE.ie ) {
            var _camelKey = _key.replace(
              /((-)([a-z])(\w))/g,
              function($0, $1, $2, $3, $4) {
                return $3.toUpperCase() + $4;
              }
            );
            _elems[_id].style[_camelKey] = _cached[_key];
          }
          else {
            _elems[_id].style.setProperty(_key, _cached[_key], '');
          }
        }
        if (BROWSER_TYPE.ie6) {
          if (iefix._traverseStyleProperties.indexOf(_key) !== -1) {
            _this._ieFixesNeeded = true;
          }
        }
      }
      else {
        _elemTodoH = _this._elemTodoH;
        _styleTodo = _this._styleTodo[_id];
        if (_styleTodo.indexOf(_key) === -1) {
          _styleTodo.push(_key);
        }
        if (!_elemTodoH[_id]) {
          _this._elemTodo.push(_id);
          _elemTodoH[_id] = true;
          _this._checkNeedFlush();
        }
      }
    }
  },

/** = Description
  * Creates a new element inside another.
  *
  * Use this method to create a new DOM element.
  *
  * = Parameters
  * +_targetId+:: The ELEM ID of the parent element.
  *               (Optional, default: 0; the document body)
  *
  * +_tagName+::  The tag name of the element.
  *               (Optional, default: 'DIV')
  *
  * = Returns
  * The new ELEM ID.
  *
  **/
  make: function(_targetId, _tagName) {
    if (_targetId === undefined) {
      _targetId = 0;
    }
    if (_tagName === undefined) {
      _tagName = 'DIV';
    } else {
      _tagName = _tagName.toUpperCase();
    }
    var _this = ELEM,
        _elem,
        _id;
    _this._makeCount++;
    if (_this._enableRecycler) {
      if (_this._recycler[_tagName]) {
        if (_this._recycler[_tagName].length !== 0) {
          // Recycle the id of a previously deleted element
          _id = _this._recycler[_tagName].pop();
          _this._recycler[_tagName]._countOut++;
          _elem = _this._elements[_id];
          //_elem.innerHTML='';
          /*
      if(_elem.tagName!==_tagName){
      _elem.outerHTML='<'+_tagName+'></'+_tagName+'>';
      }
      */
          if (_this._blockElems.indexOf(',' + _tagName + ',') !== -1) {
            _this.setCSS(_id, 'display:block;');
          } else {
            _this.setCSS(_id, 'display:inline;');
          }
          _this.append(_id, _targetId);
          return _id;
        }
      }
    }
    _elem = document.createElement(_tagName);
    _this._elements[_targetId].appendChild(_elem);
    _id = _this._add(_elem);
    _this._initCache(_id);
    return _id;
  },
  
/** = Description
  * Returns the inner size of the browser window.
  *
  * = Returns
  * An [ width, height ] pair as an Array.
  *
  **/
  windowSize: function() {
    return [
      (window.innerWidth) ? window.innerWidth: document.documentElement.clientWidth,
      (window.innerHeight) ? window.innerHeight: document.documentElement.clientHeight
   ];
  },
  
/** = Description
  * Gets the named element style attribute value.
  *
  * Use this method to get a style attribute value optimally.
  * Element style attributes are buffered.
  *
  * = Parameters
  * +_id+::       The ELEM ID.
  * +_key+::      The Style Attribute name.
  * +_bypass+::   A flag used to bypass the buffers (Optional, default: false)
  *
  * = Returns
  * The element style attribute value.
  *
  **/
  getStyle: function(_id, _key, _bypass){
    var _this=ELEM,
        _cached=_this._styleCache[_id],
        _retval;
        _this._getStyleCount++;
    if ((_cached[_key] === undefined) || _bypass) {
      if (!_bypass) {
        _this._getStyleMissCount++;
      }
      if ((_key === 'opacity') && _bypass) {
        _retval = _this.getOpacity(_id);
      }
      else {
        _retval = document.defaultView.getComputedStyle(_this._elements[_id], null).getPropertyValue(_key);
      }
      _cached[_key] = _retval;
    }
    return _cached[_key];
  },
  
  /* The Internet Explorer version of getStyle */
  _getStyleIE: function( _id, _key, _bypass){
    var _this=ELEM,
        _cached=_this._styleCache[_id],
        _retval;
        _this._getStyleCount++;
    if ((_cached[_key] === undefined) || _bypass) {
      if (!_bypass) {
        _this._getStyleMissCount++;
      }
      if ((_key === 'opacity') && _bypass) {
        _retval = _this.getOpacity(_id);
      }
      else {
        _camelName = _key.replace(
          /((-)([a-z])(\w))/g,
          function($0, $1, $2, $3, $4) {
            return $3.toUpperCase() + $4;
          }
        );
        _this._elements[_id].currentStyle[_camelName];
      }
      _cached[_key] = _retval;
    }
    return _cached[_key];
  },
  
  /* Style buffer flushing algorithm */
  _flushStyleCache: function(_id) {
    var _this = ELEM,
        _styleTodo = _this._styleTodo[_id],
        _cached = _this._styleCache[_id],
        _elem = _this._elements[_id],
        _elemS,
        _loopMaxP,
        _cid,
        _key,
        _currTodo,
        _retval;
    if (!_elem) {
      return;
    }
    _elemS = _elem.style;
    _loopMaxP = _styleTodo.length;
    _currTodo = _styleTodo.splice(0, _loopMaxP);
    for (_cid = 0; _cid !== _loopMaxP; _cid++) {
      _key = _currTodo.pop();
      _this._flushStylCount++;
      if (_key === 'opacity') {
        _retval = _this.setOpacity(_id, _cached[_key]);
      }
      else {
        _elemS.setProperty(_key, _cached[_key], '');
      }
    }
  },
  
  /* Internet Explorer version of _flushStyleCache */
  _flushStyleCacheIE: function(_id) {
    var _this = ELEM,
        _styleTodo = _this._styleTodo[_id],
        _cached = _this._styleCache[_id],
        _elem = _this._elements[_id];
    if (!_elem) {
      return;
    }
    var _elemS = _elem.style,
        _loopMaxP = _styleTodo.length,
        i = 0,
        _key,
        _currTodo = _styleTodo.splice(0, _loopMaxP);
    for (; i !== _loopMaxP; i++) {
      _key = _currTodo.pop();
      _this._flushStylCount++;
      if (_key === 'opacity') {
        _this.setOpacity(_id, _cached[_key]);
      }
      else {
        if (BROWSER_TYPE.ie6) {
          if (iefix._traverseStyleProperties.indexOf(_key) !== -1) {
            _this._ieFixesNeeded = true;
          }
        }
        try {
          var _camelKey = _key.replace(
            /((-)([a-z])(\w))/g,
            function($0, $1, $2, $3, $4) {
              return $3.toUpperCase() + $4;
            }
          );
          // _elemS[_camelKey] = _cached[_key];
          _elemS.setAttribute(
            _camelKey,
            _cached[_key]
          );
        }
        catch(e) {
          console.log(e);
        }
      }
    }
  },
  
  /* The ELEM "post-constructor" */
  _init: function() {
    
    var _this = ELEM;
    
    if (BROWSER_TYPE.ie6) {
      _this.getStyle = _this._getStyleIE;
    }
    if (BROWSER_TYPE.ie) {
      _this._flushStyleCache = _this._flushStyleCacheIE;
    }
    
    if(!_this['_timer']){
      _this.bind(document.body);
    }
    
    if (_this._enableRecycler) {
      _this._trashId = _this.make(0, 'div');
      _this.setCSS(_this._trashId, "display:none;visibility:hidden;");
      _this.setAttr(_this._trashId, 'id', 'trashcan_' + _this._trashId);
    }
    
    if(BROWSER_TYPE.symbian){
      var TestClass = HClass.extend({
        test: true,
        constructor: null
      });
      // Symbian dies in the loop when loading itself cached on reload, restart loop by re-calling this function in 1 second.
      if(!TestClass.test){
        var _gotoOpera = confirm('Your Web Browser fails. Please restart the S60 Web Browser or install a better browser.\nDo you want to download and install Opera Mobile now?');
        if(_gotoOpera){
          location.href = 'http://www.opera.com/download/get.pl?sub=++++&id=32792&location=270&nothanks=yes';
        }
        // Can't do anything wightout proper JS support.
        return;
      }
    }
    
    _this._flushDomLoadQueueBusy = false;
    while(!ELEM._initDone){
      ELEM._flushDomLoadQueue();
    }
    _this._timer = setTimeout( function(){ if(!ELEM._flushDomLoadQueueBusy){ELEM.flushLoop(ELEM._minDelay); }}, ELEM._minDelay );
    // _this._flushDomLoadQueueTimer = setInterval( function(){ELEM._flushDomLoadQueue();}, 10 );
    
    // alert(_this._minDelay);
  },
  
  _flushDomLoadQueue: function(){
    var _cmd,
        _type,
        _cmdResult;
    if(ELEM._domLoadQueue.length === 0){
      ELEM._initDone = true;
    }
    else {
      _cmd = ELEM._domLoadQueue.shift();
      _type = (typeof _cmd);
      if (_type === 'function') {
        _cmd.call();
      }
      else if (_type === 'string') {
        _cmdResult = eval(_cmd);
        if (typeof _cmdResult === 'string') {
          ELEM._domLoadQueue.push(_cmdResult);
        }
      }
    }
  },
  
  /* Checks browser versions and starts the document load check */
  _warmup: function() {
    var _this = ELEM,
        _ua = navigator.userAgent,
        _isIE = (document.all && (_ua.indexOf("Opera") === -1)),
        _browserType = BROWSER_TYPE;
    _browserType.opera    = _ua.indexOf("Opera") !== -1;
    _browserType.safari   = _ua.indexOf("KHTML") !== -1;
    _browserType.symbian  = _ua.indexOf("SymbianOS") !== -1;
    _browserType.chrome   = _ua.indexOf("Chrome") !== -1;
    _browserType.ie       = _isIE;
    _browserType.ie6      = _isIE && (_ua.indexOf("MSIE 6") !== -1);
    _browserType.ie7      = _isIE && (_ua.indexOf("MSIE 7") !== -1);
    _browserType.ie8      = _isIE && (_ua.indexOf("MSIE 8") !== -1);
    _browserType.firefox  = _ua.indexOf("Firefox") !== -1;
    _browserType.firefox2 = _ua.indexOf("Firefox/2.") !== -1;
    _browserType.firefox3 = _ua.indexOf("Firefox/3.") !== -1;
    _this._domWaiter();
  },
  
  /* Adds commands to be run when the document load check turns true */
  _domLoader: function(_cmd) {
    var _type = (typeof _cmd);
    if (ELEM._initDone === true) {
      if( _type === 'string' ) {
        eval(_cmd);
      }
      else if (_type === 'function'){
        _cmd.call();
      }
    }
    else {
      ELEM._domLoadQueue.push(_cmd);
    }
  },
  
  /* Checks if the document is fully loaded */
  _domWaiter: function() {
    var _isloaded = false,
        _this = ELEM;
    // A hack for ie (ripped from DomLoaded.js)
    // http://www.cherny.com/demos/onload/domloaded.js
    if (BROWSER_TYPE.ie) {
      var _ie_proto = "javascript:void(0)";
      if (location.protocol === "https:") {
        _ie_proto = "src=//0";
      }
      document.write("<scr" + "ipt id=__ie_onload defer src=" + _ie_proto + "></scr" + "ipt>");
      var _ie_script = document.getElementById("__ie_onload");
      _ie_script.onreadystatechange = function() {
        if ((this.readyState === "complete") && true) {
          clearTimeout(ELEM._domLoadTimer);
          ELEM._domLoadStatus = true;
          ELEM._init();
        }
      };
      // the event will trigger on ie, so we don't have to keep on polling:
      return;
    }

    // Safari / KHTML readyness detection:
    else if (BROWSER_TYPE.safari && document.readyState === 'complete'){
    // (/loaded|complete/.test(document.readyState))) {
    // (/loaded|complete/.test(document.readyState))) {
      _this._domLoadStatus = true;
    }

    // Works for Mozilla:
    else if (document.body) {
      _this._domLoadStatus = true;
    }

    if (_this._domLoadStatus) {
      clearTimeout(_this._domLoadTimer);
      if(BROWSER_TYPE.symbian){
        // document.body.innerHTML produces beyond-wtf "fastinnerhtml!", maybe they "fixed" an unit test?
        // see: http://trac.webkit.org/browser/S60/trunk/WebCore/khtml/html/html_elementimpl.cpp#L750
        //document.body.innerHTML += '';
        
        // This check ensures we are use actually testing the beyond buggy S60 Web Browser.
        // Better versions are handled like regular safari/webkit/chrome/khtml
        BROWSER_TYPE.symbian = document.body.innerHTML === "fastinnerhtml!";
        // var _timer = setTimeout(_this._init, 5000);
      }
      // else {
        _this._init();
      // }
    }
    else {
      _this._domLoadTimer = setTimeout('ELEM._domWaiter()', ELEMTickerInterval * 10);
    }
  }
};
ELEM._constructor();

LOAD = ELEM._domLoader;

ELEM._warmup();

